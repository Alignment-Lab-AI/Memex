import type { HighlightRendererInterface } from '@worldbrain/memex-common/lib/in-page-ui/highlighting/types'
import type AnnotationsManager from 'src/annotations/annotations-manager'
import type { BookmarksInterface } from 'src/bookmarks/background/types'
import type { RemoteCollectionsInterface } from 'src/custom-lists/background/types'
import type { RemoteTagsInterface } from 'src/tags/background/types'
import type { AnnotationInterface } from 'src/annotations/background/types'
import type { PageAnnotationsCacheInterface } from 'src/annotations/cache/types'
import type { ContentSharingInterface } from 'src/content-sharing/background/types'
import type { MaybePromise } from 'src/util/types'
import type { ActivityIndicatorInterface } from 'src/activity-indicator/background'
import type { SyncSettingsStore } from 'src/sync-settings/util'
import type { UserReference } from '@worldbrain/memex-common/lib/web-interface/types/users'
import type { RemoteBGScriptInterface } from 'src/background-script/types'
import type { AuthRemoteFunctionsInterface } from 'src/authentication/background/types'
import type { RemotePageActivityIndicatorInterface } from 'src/page-activity-indicator/background/types'

interface FlagSetterInterface {
    getState(): Promise<boolean>
    setState(value: boolean): Promise<void>
}

export interface RibbonContainerDependencies {
    currentTab: { id?: number; url?: string }
    getFullPageUrl: () => MaybePromise<string>
    highlighter: HighlightRendererInterface
    annotationsManager: AnnotationsManager
    setSidebarEnabled: (value: boolean) => Promise<void>
    getSidebarEnabled: () => Promise<boolean>
    bookmarks: BookmarksInterface
    customLists: RemoteCollectionsInterface
    activityIndicatorBG: ActivityIndicatorInterface
    tags: RemoteTagsInterface
    authBG: AuthRemoteFunctionsInterface
    pageActivityIndicatorBG: RemotePageActivityIndicatorInterface
    contentSharing: ContentSharingInterface
    annotations: AnnotationInterface<'caller'>
    annotationsCache: PageAnnotationsCacheInterface
    bgScriptBG: RemoteBGScriptInterface
    tooltip: FlagSetterInterface
    highlights: FlagSetterInterface
    syncSettings: SyncSettingsStore<'extension'>
    currentUser?: UserReference
    openPDFinViewer: (url: string) => Promise<void>
}
