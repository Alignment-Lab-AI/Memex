import type { AutoPk } from '@worldbrain/memex-common/lib/storage/types'
import type { UserReference } from '@worldbrain/memex-common/lib/web-interface/types/users'
import type Storex from '@worldbrain/storex'
import fromPairs from 'lodash/fromPairs'
import * as Raven from 'src/util/raven'
import type { ServerStorageModules } from 'src/storage/types'
import type {
    FollowedList,
    RemotePageActivityIndicatorInterface,
} from './types'
import type {
    SharedList,
    SharedListReference,
} from '@worldbrain/memex-common/lib/content-sharing/types'
import { normalizeUrl } from '@worldbrain/memex-common/lib/url-utils/normalize'
import PageActivityIndicatorStorage from './storage'
import {
    getFollowedListEntryIdentifier,
    sharedListEntryToFollowedListEntry,
    sharedListToFollowedList,
} from './utils'
import type { JobScheduler } from 'src/job-scheduler/background/job-scheduler'
import { LIST_TIMESTAMP_WORKER_URLS } from '@worldbrain/memex-common/lib/content-sharing/storage/constants'
import type {
    SharedListTimestamp,
    SharedListTimestampGetRequest,
} from '@worldbrain/memex-common/lib/page-activity-indicator/backend/types'
import { SHARED_LIST_TIMESTAMP_GET_ROUTE } from '@worldbrain/memex-common/lib/page-activity-indicator/backend/constants'

export interface PageActivityIndicatorDependencies {
    fetch: typeof fetch
    storageManager: Storex
    jobScheduler: JobScheduler
    getCurrentUserId: () => Promise<AutoPk | null>
    getServerStorage: () => Promise<
        Pick<ServerStorageModules, 'activityFollows' | 'contentSharing'>
    >
}

export const PERIODIC_SYNC_JOB_NAME = 'followed-list-entry-sync'

export class PageActivityIndicatorBackground {
    storage: PageActivityIndicatorStorage
    remoteFunctions: RemotePageActivityIndicatorInterface

    constructor(private deps: PageActivityIndicatorDependencies) {
        this.storage = new PageActivityIndicatorStorage({
            storageManager: deps.storageManager,
        })

        this.remoteFunctions = {
            getAllFollowedLists: this.getAllFollowedLists,
            getPageFollowedLists: this.getPageFollowedLists,
            getPageActivityStatus: this.getPageActivityStatus,
            getEntriesForFollowedLists: this.getEntriesForFollowedLists,
        }
    }

    async setup(): Promise<void> {
        await this.deps.jobScheduler.scheduleJob({
            name: PERIODIC_SYNC_JOB_NAME,
            periodInMinutes: 2,
            job: this.syncFollowedListEntriesWithNewActivity,
        })
    }

    private syncFollowedListEntriesWithNewActivity = async (opts?: {
        now?: number
    }) => {
        const existingFollowedListsLookup = await this.storage.findAllFollowedLists()
        if (!existingFollowedListsLookup.size) {
            return
        }

        const workerUrl =
            process.env.NODE_ENV === 'production'
                ? LIST_TIMESTAMP_WORKER_URLS.production
                : LIST_TIMESTAMP_WORKER_URLS.staging
        const requestBody: SharedListTimestampGetRequest = {
            sharedListIds: [...existingFollowedListsLookup.keys()].map((id) =>
                id.toString(),
            ),
        }
        const response = await this.deps.fetch(
            workerUrl + SHARED_LIST_TIMESTAMP_GET_ROUTE,
            {
                method: 'POST',
                body: JSON.stringify(requestBody),
            },
        )

        if (!response.ok) {
            Raven.captureException(
                new Error(
                    `Could not reach Cloudflare worker to check sharedLists' timestamp - response text: ${await response.text()}`,
                ),
            )
            return
        }

        const activityTimestamps: SharedListTimestamp[] = await response.json()
        if (!Array.isArray(activityTimestamps)) {
            Raven.captureException(
                new Error(
                    `Received unexpected response data from Cloudflare worker - data: ${activityTimestamps}`,
                ),
            )
            return
        }

        if (!activityTimestamps.length) {
            return
        }

        // Filter out lists which do have updates
        const listActivityTimestampLookup = new Map(activityTimestamps)
        const followedListsWithUpdates: FollowedList[] = []
        for (const [
            sharedListId,
            followedList,
        ] of existingFollowedListsLookup) {
            if (
                followedList.lastSync == null ||
                listActivityTimestampLookup.get(sharedListId.toString()) >
                    followedList.lastSync
            ) {
                followedListsWithUpdates.push(followedList)
            }
        }

        if (followedListsWithUpdates.length > 0) {
            await this.syncFollowedListEntries({
                forFollowedLists: followedListsWithUpdates,
                now: opts?.now,
            })
        }
    }

    private getAllFollowedLists: RemotePageActivityIndicatorInterface['getAllFollowedLists'] = async () => {
        const followedLists = await this.storage.findAllFollowedLists()
        return fromPairs(
            [...followedLists.values()].map((list) => [
                list.sharedList,
                {
                    sharedList: list.sharedList,
                    creator: list.creator,
                    name: list.name,
                    type: list.type,
                },
            ]),
        )
    }

    private getPageFollowedLists: RemotePageActivityIndicatorInterface['getPageFollowedLists'] = async (
        fullPageUrl,
        extraFollowedListIds,
    ) => {
        const normalizedPageUrl = normalizeUrl(fullPageUrl)
        const followedListEntries = await this.storage.findFollowedListEntriesByPage(
            { normalizedPageUrl },
        )

        const followedListHasAnnotsById = new Map(
            followedListEntries.map((entry) => [
                entry.followedList,
                entry.hasAnnotationsFromOthers,
            ]),
        )
        const followedLists = await this.storage.findFollowedListsByIds([
            ...followedListHasAnnotsById.keys(),
            ...(extraFollowedListIds ?? []),
        ])
        return fromPairs(
            [...followedLists.values()].map((list) => [
                list.sharedList,
                {
                    hasAnnotationsFromOthers:
                        followedListHasAnnotsById.get(list.sharedList) ?? false,
                    sharedList: list.sharedList,
                    creator: list.creator,
                    name: list.name,
                    type: list.type,
                },
            ]),
        )
    }

    private getPageActivityStatus: RemotePageActivityIndicatorInterface['getPageActivityStatus'] = async (
        fullPageUrl,
    ) => {
        const normalizedPageUrl = normalizeUrl(fullPageUrl)
        const followedListEntries = await this.storage.findFollowedListEntriesByPage(
            { normalizedPageUrl },
        )

        const currentUser = await this.getCurrentUser()
        if (currentUser == null) {
            return 'no-activity'
        }

        if (
            followedListEntries.some(
                (entry) =>
                    !entry.hasAnnotationsFromOthers &&
                    entry.creator !== currentUser.id,
            )
        ) {
            return 'no-annotations'
        }

        if (
            followedListEntries.some((entry) => entry.hasAnnotationsFromOthers)
        ) {
            return 'has-annotations'
        }

        return 'no-activity'
    }

    private getEntriesForFollowedLists: RemotePageActivityIndicatorInterface['getEntriesForFollowedLists'] = async (
        followedListIds,
    ) => {
        return this.storage.findFollowedListEntriesForLists(followedListIds)
    }

    private async getCurrentUser(): Promise<UserReference | null> {
        const userId = await this.deps.getCurrentUserId()
        if (userId == null) {
            return null
        }

        return { type: 'user-reference', id: userId }
    }

    createFollowedList: PageActivityIndicatorStorage['createFollowedList'] = (
        data,
        opts,
    ) => this.storage.createFollowedList(data, opts)
    createFollowedListEntry: PageActivityIndicatorStorage['createFollowedListEntry'] = (
        data,
        opts,
    ) => this.storage.createFollowedListEntry(data, opts)
    updateFollowedListEntryHasAnnotations: PageActivityIndicatorStorage['updateFollowedListEntryHasAnnotations'] = (
        data,
    ) => this.storage.updateFollowedListEntryHasAnnotations(data)
    deleteFollowedListEntry: PageActivityIndicatorStorage['deleteFollowedListEntry'] = (
        data,
    ) => this.storage.deleteFollowedListEntry(data)
    deleteFollowedListAndAllEntries: PageActivityIndicatorStorage['deleteFollowedListAndAllEntries'] = (
        data,
    ) => this.storage.deleteFollowedListAndAllEntries(data)
    deleteAllFollowedListsData: PageActivityIndicatorStorage['deleteAllFollowedListsData'] = () =>
        this.storage.deleteAllFollowedListsData()

    private async getAllUserFollowedSharedListsFromServer(
        userReference: UserReference,
    ): Promise<Array<SharedList & { id: AutoPk; creator: AutoPk }>> {
        const {
            activityFollows,
            contentSharing,
        } = await this.deps.getServerStorage()

        const [sharedListFollows, ownedSharedLists] = await Promise.all([
            activityFollows.getAllFollowsByCollection({
                collection: 'sharedList',
                userReference,
            }),
            contentSharing.getListsByCreator(userReference),
        ])

        // A user can follow their own shared lists, so filter them out to reduce reads
        const ownedSharedListIds = new Set(
            ownedSharedLists.map((list) => list.id),
        )
        const followedSharedLists = await contentSharing.getListsByReferences(
            sharedListFollows
                .filter((follow) => !ownedSharedListIds.has(follow.objectId))
                .map((follow) => ({
                    type: 'shared-list-reference',
                    id: follow.objectId,
                })),
        )

        return [
            ...ownedSharedLists,
            ...followedSharedLists.map((list) => ({
                ...list,
                id: list.reference.id,
                creator: list.creator.id,
            })),
        ]
    }

    async syncFollowedLists(): Promise<void> {
        const user = await this.getCurrentUser()
        if (user == null) {
            return
        }
        const sharedLists = await this.getAllUserFollowedSharedListsFromServer(
            user,
        )
        const existingFollowedListsLookup = await this.storage.findAllFollowedLists()

        // Remove any local followedLists that don't have an associated remote sharedList (carry over from old implementation, b)
        for (const followedList of existingFollowedListsLookup.values()) {
            if (
                !sharedLists.find((list) => list.id === followedList.sharedList)
            ) {
                await this.storage.deleteFollowedListAndAllEntries({
                    sharedList: followedList.sharedList,
                })
            }
        }

        for (const sharedList of sharedLists) {
            if (!existingFollowedListsLookup.get(sharedList.id)) {
                const data = sharedListToFollowedList(sharedList)
                // NOTE: This created followedList should NOT invoke cloud sync or things will go wrong
                await this.storage.createFollowedList(data, {
                    invokeCloudSync: false,
                })
            }
        }
    }

    async syncFollowedListEntries(opts?: {
        now?: number
        /** If defined, will constrain the sync to only these followedLists. Else will sync all. */
        forFollowedLists?: Array<Pick<FollowedList, 'sharedList' | 'lastSync'>>
    }): Promise<void> {
        // adding this timestamp here to fix race condition where the sync finishes after a new item has been added tot he sync entries and therefore is skipped on the next sync
        const timeAtSyncStart = opts?.now ?? Date.now()

        const currentUser = await this.getCurrentUser()
        if (currentUser == null) {
            return
        }

        const { contentSharing } = await this.deps.getServerStorage()

        const followedLists =
            opts?.forFollowedLists ??
            (await this.storage.findAllFollowedLists()).values()

        for (const followedList of followedLists) {
            let shouldUpdateLastSyncTimestamp = false

            const listReference: SharedListReference = {
                type: 'shared-list-reference',
                id: followedList.sharedList,
            }
            const existingFollowedListEntryLookup = await this.storage.findAllFollowedListEntries(
                {
                    sharedList: followedList.sharedList,
                },
            )
            const sharedListEntries = await contentSharing.getListEntriesByList(
                {
                    listReference,
                    from: followedList.lastSync,
                },
            )
            shouldUpdateLastSyncTimestamp = sharedListEntries.length > 0

            const sharedAnnotationListEntries = await contentSharing.getAnnotationListEntries(
                {
                    listReference,
                    ignoreFromUser: currentUser,
                    // NOTE: We have to always get all the annotation entries as there's way to determine the true->false case for `followedListEntry.hasAnnotationsFromOthers` if you only have partial results
                    // from: localFollowedList?.lastSync,
                },
            )

            for (const entry of sharedListEntries) {
                const hasAnnotationsFromOthers = !!sharedAnnotationListEntries[
                    entry.normalizedUrl
                ]?.length
                const localFollowedListEntry = existingFollowedListEntryLookup.get(
                    getFollowedListEntryIdentifier({
                        ...entry,
                        sharedList: entry.sharedList.id,
                    }),
                )

                if (!localFollowedListEntry) {
                    const data = sharedListEntryToFollowedListEntry(
                        {
                            ...entry,
                            id: entry.reference.id,
                            creator: entry.creator.id,
                            sharedList: entry.sharedList.id,
                        },
                        { hasAnnotationsFromOthers },
                    )

                    // NOTE: This created followedListEntry should NOT invoke cloud sync or things will go wrong
                    await this.storage.createFollowedListEntry(data, {
                        invokeCloudSync: false,
                    })
                } else if (
                    localFollowedListEntry.hasAnnotationsFromOthers !==
                    hasAnnotationsFromOthers
                ) {
                    await this.storage.updateFollowedListEntryHasAnnotations({
                        normalizedPageUrl: entry.normalizedUrl,
                        followedList: entry.sharedList.id,
                        hasAnnotationsFromOthers,
                        updatedWhen: timeAtSyncStart,
                    })
                }
            }

            // This handles the case where a new annotation was created, but the assoc. sharedListEntry didn't get their updatedWhen timestamp updated
            const recentAnnotationEntries = Object.values(
                sharedAnnotationListEntries,
            )
                .flat()
                .filter(
                    (annotationEntry) =>
                        !sharedListEntries.find(
                            (entry) =>
                                entry.normalizedUrl ===
                                annotationEntry.normalizedPageUrl,
                        ),
                )
            for (const entry of recentAnnotationEntries) {
                const localFollowedListEntry = existingFollowedListEntryLookup.get(
                    getFollowedListEntryIdentifier({
                        normalizedUrl: entry.normalizedPageUrl,
                        sharedList: entry.sharedList.id,
                    }),
                )
                if (localFollowedListEntry?.hasAnnotationsFromOthers) {
                    continue
                }
                shouldUpdateLastSyncTimestamp = true

                await this.storage.updateFollowedListEntryHasAnnotations({
                    normalizedPageUrl: entry.normalizedPageUrl,
                    followedList: entry.sharedList.id,
                    updatedWhen: timeAtSyncStart,
                    hasAnnotationsFromOthers: true,
                })
            }

            // This handles the case where the last annotation for an entry was deleted
            for (const localEntry of existingFollowedListEntryLookup.values()) {
                if (
                    localEntry.hasAnnotationsFromOthers &&
                    !sharedAnnotationListEntries[localEntry.normalizedPageUrl]
                        ?.length
                ) {
                    shouldUpdateLastSyncTimestamp = true
                    await this.storage.updateFollowedListEntryHasAnnotations({
                        normalizedPageUrl: localEntry.normalizedPageUrl,
                        followedList: localEntry.followedList,
                        updatedWhen: timeAtSyncStart,
                        hasAnnotationsFromOthers: false,
                    })
                }
            }

            if (shouldUpdateLastSyncTimestamp) {
                await this.storage.updateFollowedListLastSync({
                    sharedList: followedList.sharedList,
                    lastSync: timeAtSyncStart,
                })
            }
        }
    }
}
