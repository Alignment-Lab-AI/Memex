import type Storex from '@worldbrain/storex'

import { getNoteShareUrl, getPageShareUrl } from 'src/content-sharing/utils'
import type ContentSharingBackground from 'src/content-sharing/background'
import type { TemplateDataFetchers, UrlMappedData } from '../types'
import fromPairs from 'lodash/fromPairs'
import flatten from 'lodash/flatten'
import type { ContentLocator } from '@worldbrain/memex-common/lib/page-indexing/types'
import {
    isMemexPageAPdf,
    pickBestLocator,
} from '@worldbrain/memex-common/lib/page-indexing/utils'
import type { PageListEntry } from 'src/custom-lists/background/types'
import type { AnnotListEntry, Annotation } from 'src/annotations/types'
import type {
    AnnotationPrivacyLevel,
    SharedListMetadata,
} from 'src/content-sharing/background/types'
import type { Visit, Bookmark, Tag, Page } from 'src/search'
import { AnnotationPrivacyLevels } from '@worldbrain/memex-common/lib/annotations/types'
import { sortByPagePosition } from 'src/sidebar/annotations-sidebar/sorting'
import TurndownService from 'turndown'
import replaceImgSrcWithFunctionOutput from '@worldbrain/memex-common/lib/annotations/replaceImgSrcWithCloudAddress'
import { ImageSupportInterface } from 'src/image-support/background/types'

export function getTemplateDataFetchers({
    storageManager,
    contentSharing,
    imageSupport,
}: {
    storageManager: Storex
    contentSharing: Pick<
        ContentSharingBackground,
        'shareAnnotations' | 'storage' | 'ensureRemotePageId'
    >
    imageSupport: ImageSupportInterface<'caller'>
}): TemplateDataFetchers {
    const getTagsForUrls = async (
        urls: string[],
    ): Promise<UrlMappedData<string[]>> => {
        const tags: Tag[] = await storageManager
            .collection('tags')
            .findObjects({ url: { $in: urls } })

        const tagsForUrls: UrlMappedData<string[]> = {}
        for (const tag of tags) {
            tagsForUrls[tag.url] = [...(tagsForUrls[tag.url] ?? []), tag.name]
        }
        return tagsForUrls
    }

    const getSpacesForUrls = (
        getEntries: (
            urls: string[],
        ) => Promise<Array<{ listId: number; url: string }>>,
    ) => async (urls: string[]): Promise<UrlMappedData<string[]>> => {
        const spacesForUrls: UrlMappedData<string[]> = {}
        const entries = await getEntries(urls)

        const uniqueListIds = new Set<number>()
        entries.forEach((entry) => uniqueListIds.add(entry.listId))

        if (!uniqueListIds.size) {
            return spacesForUrls
        }

        const lists: {
            id: number
            name: string
        }[] = await storageManager
            .collection('customLists')
            .findObjects({ id: { $in: [...uniqueListIds] } })

        const listNamesById = new Map<number, string>()
        lists.forEach((list) => listNamesById.set(list.id, list.name))

        entries.forEach((entry) => {
            const listName = listNamesById.get(entry.listId)
            if (
                listName != null &&
                !spacesForUrls[entry.url]?.includes(listName)
            ) {
                spacesForUrls[entry.url] = [
                    ...(spacesForUrls[entry.url] ?? []),
                    listName,
                ]
            }
        })

        return spacesForUrls
    }

    return {
        getPages: async (normalizedPageUrls) => {
            const pages: Page[] = await storageManager
                .collection('pages')
                .findObjects({ url: { $in: normalizedPageUrls } })

            const allLocators: ContentLocator[] = await storageManager
                .collection('locators')
                .findObjects({ normalizedUrl: { $in: normalizedPageUrls } })

            return pages.reduce((acc, page) => {
                let fullUrl = page.fullUrl
                if (isMemexPageAPdf(page)) {
                    const pageLocators = allLocators.filter(
                        (l) => l.normalizedUrl === page.url,
                    )
                    const mainLocator = pickBestLocator(pageLocators)
                    fullUrl = mainLocator?.originalLocation
                        ? encodeURI(mainLocator.originalLocation)
                        : page.fullUrl
                }
                return {
                    ...acc,
                    [page.url]: {
                        fullTitle: page.fullTitle,
                        fullUrl,
                    },
                }
            }, {})
        },
        getNotes: async (annotationUrls) => {
            const notes: Annotation[] = await storageManager
                .collection('annotations')
                .findObjects({ url: { $in: annotationUrls } })

            const sortedNotes = notes.sort(sortByPagePosition)

            const result = {}

            for (const note of sortedNotes) {
                result[note.url] = {
                    url: note.url,
                    body:
                        note.body != null
                            ? await convertHTMLintoMarkdown(
                                  note.body,
                                  imageSupport,
                              )
                            : '',
                    comment:
                        note.comment != null
                            ? await convertHTMLintoMarkdown(
                                  note.comment,
                                  imageSupport,
                              )
                            : '',
                    pageUrl: note.pageUrl,
                    createdAt: note.createdWhen,
                }
            }

            return result
        },

        getNoteIdsForPages: async (normalizedPageUrls) => {
            const notes: Annotation[] = await storageManager
                .collection('annotations')
                .findObjects({ pageUrl: { $in: normalizedPageUrls } })

            return notes.sort(sortByPagePosition).reduce(
                (acc, note) => ({
                    ...acc,
                    [note.pageUrl]: [...(acc[note.pageUrl] ?? []), note.url],
                }),
                {},
            )
        },
        getNoteLinks: async (annotationUrls) => {
            await contentSharing.shareAnnotations({
                annotationUrls,
                shareToParentPageLists: true,
            })
            const remoteIds = await contentSharing.storage.getRemoteAnnotationIds(
                {
                    localIds: annotationUrls,
                },
            )
            const noteLinks: UrlMappedData<string> = {}
            for (const [annotationUrl, remoteId] of Object.entries(remoteIds)) {
                noteLinks[annotationUrl] = getNoteShareUrl({
                    remoteAnnotationId:
                        typeof remoteId === 'string'
                            ? remoteId
                            : remoteId.toString(),
                })
            }
            return noteLinks
        },
        getPageLinks: async (notes) => {
            const annotationUrls = flatten(
                Object.values(notes).map((note) => note.annotationUrls),
            )
            await contentSharing.shareAnnotations({
                annotationUrls,
                shareToParentPageLists: true,
            })
            const pairs = await Promise.all(
                Object.keys(notes).map(async (normalizedPageUrl) => [
                    normalizedPageUrl,
                    getPageShareUrl({
                        remotePageInfoId: await contentSharing.ensureRemotePageId(
                            normalizedPageUrl,
                        ),
                    }),
                ]),
            )
            return fromPairs(pairs)
        },
        getCreatedAtForPages: async (normalizedPageUrls) => {
            const visits: Visit[] = await storageManager
                .collection('visits')
                .findObjects({ url: { $in: normalizedPageUrls } })
            const createdAt: UrlMappedData<Date> = {}

            // Set oldest visit time as createdAt time
            for (const visit of visits) {
                if (
                    !createdAt[visit.url] ||
                    visit.time < createdAt[visit.url]?.getTime()
                ) {
                    createdAt[visit.url] = new Date(visit.time)
                }
            }

            // If no visit was found for some pages, look up and use bookmark times
            const missingUrls = normalizedPageUrls.filter(
                (url) => !createdAt[url],
            )

            if (!missingUrls.length) {
                return createdAt
            }

            const bookmarks: Bookmark[] = await storageManager
                .collection('bookmarks')
                .findObjects({ url: { $in: missingUrls } })
            for (const bookmark of bookmarks) {
                createdAt[bookmark.url] = new Date(bookmark.time)
            }

            return createdAt
        },
        getTagsForPages: getTagsForUrls,
        getTagsForNotes: getTagsForUrls,
        getSpacesForPages: getSpacesForUrls(async (urls) => {
            const entries: PageListEntry[] = await storageManager
                .collection('pageListEntries')
                .findObjects({ pageUrl: { $in: urls } })
            return entries.map((e) => ({ url: e.pageUrl, listId: e.listId }))
        }),
        getSpacesForNotes: getSpacesForUrls(async (urls) => {
            const entries: AnnotListEntry[] = await storageManager
                .collection('annotListEntries')
                .findObjects({ url: { $in: urls } })

            // Non-public annotations don't have explicit list entries for shared spaces, instead inheriting them from the parent page
            const privacyLevels: AnnotationPrivacyLevel[] = await storageManager
                .collection('annotationPrivacyLevels')
                .findObjects({ annotation: { $in: urls } })

            for (const privacyLevel of privacyLevels) {
                if (
                    ![
                        AnnotationPrivacyLevels.SHARED,
                        AnnotationPrivacyLevels.SHARED_PROTECTED,
                    ].includes(privacyLevel.privacyLevel)
                ) {
                    continue
                }
                const annotation: Annotation = await storageManager
                    .collection('annotations')
                    .findObject({ url: privacyLevel.annotation })
                if (annotation == null) {
                    continue
                }

                const parentPageEntries: PageListEntry[] = await storageManager
                    .collection('pageListEntries')
                    .findObjects({ pageUrl: annotation.pageUrl })

                const sharedListMetadata: SharedListMetadata[] = await storageManager
                    .collection('sharedListMetadata')
                    .findObjects({
                        localId: {
                            $in: parentPageEntries.map((e) => e.listId),
                        },
                    })

                const sharedListIds = new Set([
                    ...sharedListMetadata.map((d) => d.localId),
                ])

                entries.push(
                    ...parentPageEntries
                        .filter((e) => sharedListIds.has(e.listId))
                        .map((e) => ({
                            url: privacyLevel.annotation,
                            listId: e.listId,
                        })),
                )
            }

            return entries
        }),
    }
}

async function convertHTMLintoMarkdown(inputHtml, imageSupport) {
    const html = await replaceImgSrcWithFunctionOutput(inputHtml, imageSupport)
    if (html) {
        let turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            codeBlockStyle: 'fenced',
        })
        const markdown = turndownService.turndown(html)
        return markdown
    } else {
        return
    }
}
