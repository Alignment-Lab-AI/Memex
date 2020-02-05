import 'babel-polyfill'
import { RemoteFunctionRegistry } from './util/webextensionRPC'
import 'src/activity-logger/content_script'
import 'src/page-analysis/content_script'
import 'src/search-injection/content_script'
import AnnotationsManager from 'src/annotations/annotations-manager'
import initContentTooltip from 'src/content-tooltip/content_script'
import 'src/direct-linking/content_script'
import initRibbonAndSidebar from './sidebar-overlay/content_script'
import 'src/backup-restore/content_script'
import ToolbarNotifications from 'src/toolbar-notification/content_script'
import initSocialIntegration from 'src/social-integration/content_script'
import configureStore from './sidebar-overlay/store'
import { initKeyboardShortcuts } from 'src/content_script_keyboard_shortcuts'
import { fetchAnnotationsForPageUrl } from 'src/annotations/actions'

const remoteFunctionRegistry = new RemoteFunctionRegistry()
const toolbarNotifications = new ToolbarNotifications()
const annotationsManager = new AnnotationsManager()
const rootStore = configureStore()

toolbarNotifications.registerRemoteFunctions(remoteFunctionRegistry)
window['toolbarNotifications'] = toolbarNotifications

initContentTooltip({ toolbarNotifications, store: rootStore })
initRibbonAndSidebar({
    annotationsManager,
    toolbarNotifications,
    store: rootStore,
})
initSocialIntegration({ annotationsManager })
initKeyboardShortcuts({ store: rootStore }) // N.B. Keyboard shortcuts must be setup after RibbonAndSidebar due to ref? maybe
initHighlights()

function initHighlights() {
    rootStore.dispatch(fetchAnnotationsForPageUrl(false, true) as any)
}
