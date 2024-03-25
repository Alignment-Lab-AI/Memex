import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import ConnHandler from './connection-handler'
import getImportStateManager from './state-manager'
import { IMPORT_CONN_NAME as MAIN_CONN } from 'src/options/imports/constants'
import TagsBackground from 'src/tags/background'
import CustomListBackground from 'src/custom-lists/background'
import { PageIndexingBackground } from 'src/page-indexing/background'
import BookmarksBackground from 'src/bookmarks/background'
import type { Runtime, Storage } from 'webextension-polyfill-ts'

// Constants
export const importStateStorageKey = 'import_items'

export function setupImportBackgroundModule(options: {
    pages: PageIndexingBackground
    tagsModule: TagsBackground
    customListsModule: CustomListBackground
    bookmarks: BookmarksBackground
    runtimeAPI: Runtime.Static
    storageAPI: Storage.Static
}) {
    // Allow UI scripts to dirty estimates cache
    makeRemotelyCallable({
        dirtyEstsCache: () => getImportStateManager().dirtyEstsCache(),
    })

    // Allow content-script or UI to connect and communicate control of imports
    options.runtimeAPI.onConnect.addListener((port) => {
        // Make sure to only handle connection logic for imports (allows other use of runtime.connect)
        if (port.name === MAIN_CONN) {
            return new ConnHandler({ port, ...options })
        }
    })
}
