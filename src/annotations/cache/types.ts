import type TypedEventEmitter from 'typed-emitter'
import type { NormalizedState } from '@worldbrain/memex-common/lib/common-ui/utils/normalized-state'
import type { UserReference } from '@worldbrain/memex-common/lib/web-interface/types/users'
import type { SharedAnnotation } from '@worldbrain/memex-common/lib/content-sharing/types'
import type { AnnotationsSorter } from 'src/sidebar/annotations-sidebar/sorting'
import type { Anchor } from 'src/highlighting/types'
import type { Annotation } from '../types'
import type { AnnotationPrivacyLevels } from '@worldbrain/memex-common/lib/annotations/types'

export interface PageAnnotationsCacheEvents {
    updatedPageData: (
        normalizedPageUrl: string,
        pageListIds: Set<UnifiedList['unifiedId']>,
    ) => void
    newListsState: (lists: NormalizedState<UnifiedList>) => void
    newAnnotationsState: (
        annotations: NormalizedState<UnifiedAnnotation>,
    ) => void
    addedAnnotation: (annotation: UnifiedAnnotation) => void
    updatedAnnotation: (annotation: UnifiedAnnotation) => void
    removedAnnotation: (annotation: UnifiedAnnotation) => void
    addedList: (annotation: UnifiedList) => void
    updatedList: (annotation: UnifiedList) => void
    removedList: (annotation: UnifiedList) => void
}

export interface PageAnnotationsCacheInterface {
    setPageData: (
        normalizedPageUrl: string,
        unifiedListIds: UnifiedList['unifiedId'][],
    ) => void
    setAnnotations: (
        annotations: UnifiedAnnotationForCache[],
        opts?: { now?: number },
    ) => { unifiedIds: UnifiedAnnotation['unifiedId'][] }
    setLists: (
        lists: UnifiedListForCache[],
    ) => { unifiedIds: UnifiedList['unifiedId'][] }
    addAnnotation: (
        annotation: UnifiedAnnotationForCache,
        opts?: { now?: number },
    ) => { unifiedId: UnifiedAnnotation['unifiedId'] }
    addList: <T extends UnifiedListType>(
        list: UnifiedListForCache<T>,
    ) => { unifiedId: UnifiedList['unifiedId'] }
    updateAnnotation: (
        updates: Pick<
            UnifiedAnnotation,
            | 'unifiedId'
            | 'remoteId'
            | 'comment'
            | 'unifiedListIds'
            | 'privacyLevel'
        >,
        opts?: {
            updateLastEditedTimestamp?: boolean
            keepListsIfUnsharing?: boolean
            now?: number
        },
    ) => void
    updateList: (
        updates: Pick<UnifiedList, 'unifiedId'> &
            Partial<Pick<UnifiedList, 'remoteId' | 'description' | 'name'>>,
    ) => void
    removeAnnotation: (annotation: Pick<UnifiedAnnotation, 'unifiedId'>) => void
    removeList: (list: Pick<UnifiedList, 'unifiedId'>) => void
    sortLists: (sortingFn?: any) => void
    sortAnnotations: (sortingFn?: AnnotationsSorter) => void

    getAnnotationsArray: () => UnifiedAnnotation[]
    getAnnotationByLocalId: (localId: string) => UnifiedAnnotation | null
    getAnnotationByRemoteId: (remoteId: string) => UnifiedAnnotation | null
    getListByLocalId: (localId: number) => UnifiedList | null
    getListByRemoteId: (remoteId: string) => UnifiedList | null

    readonly isEmpty: boolean
    readonly events: TypedEventEmitter<PageAnnotationsCacheEvents>
    readonly annotations: NormalizedState<UnifiedAnnotation>
    readonly lists: NormalizedState<UnifiedList>
    /**
     * Kept so annotations can "inherit" shared lists from their parent pages upon becoming public.
     * A map of normalized page URLs to their Set of cached list IDs.
     */
    readonly pageListIds: Map<string, Set<UnifiedList['unifiedId']>>
}

export type UnifiedAnnotation = Pick<
    Annotation & SharedAnnotation,
    'body' | 'comment'
> & {
    // Core annotation data
    unifiedId: string
    localId?: string
    remoteId?: string
    selector?: Anchor
    normalizedPageUrl: string
    lastEdited: number
    createdWhen: number
    creator?: UserReference

    // Misc annotation feature state
    privacyLevel: AnnotationPrivacyLevels
    unifiedListIds: UnifiedList['unifiedId'][]
}

export type UnifiedAnnotationForCache = Omit<
    UnifiedAnnotation,
    'unifiedId' | 'unifiedListIds' | 'createdWhen' | 'lastEdited'
> &
    Partial<
        Pick<UnifiedAnnotation, 'unifiedListIds' | 'createdWhen' | 'lastEdited'>
    > & {
        localListIds: number[]
    }

type CoreUnifiedList<T> = {
    // Core list data
    unifiedId: string
    localId?: number
    remoteId?: string
    name: string
    description?: string
    creator?: UserReference
    hasRemoteAnnotationsToLoad: boolean
    type: T

    /** Denotes whether or not this list was loaded via a web UI page link AND has no locally available data. */
    isForeignList?: boolean

    // Misc list feature state
    unifiedAnnotationIds: UnifiedAnnotation['unifiedId'][]
}

type UnifiedListType = 'user-list' | 'special-list' | 'page-link'

export type UnifiedList<
    T extends UnifiedListType = UnifiedListType
> = T extends 'page-link'
    ? CoreUnifiedList<'page-link'> & {
          normalizedPageUrl: string // Used in the sidebar logic, affording a way to relate page link lists to a given page the sidebar is open for
          pageTitle: string // Used for display, replacing the list name
          remoteId: string // This makes up the first part of the page link
          sharedListEntryId: string // This makes up the last part of the page link
      }
    : CoreUnifiedList<T>

export type UnifiedListForCache<
    T extends UnifiedListType = UnifiedListType
> = Omit<UnifiedList<T>, 'unifiedId'>
