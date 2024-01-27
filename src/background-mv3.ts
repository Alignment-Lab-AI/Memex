import browser from 'webextension-polyfill'
import XMLHttpRequest from 'xhr-shim'
import { getToken } from 'firebase/messaging'
import { onBackgroundMessage, getMessaging } from 'firebase/messaging/sw'
import {
    setupRpcConnection,
    setupRemoteFunctionsImplementations,
} from './util/webextensionRPC'
import { StorageChangesManager } from './util/storage-changes'
import initSentry, { captureException } from './util/raven'
import {
    createServerStorage,
    createServerStorageManager,
} from './storage/server'
import createNotification from 'src/util/notifications'
import initStorex from './search/memex-storex'
import { createPersistentStorageManager } from './storage/persistent-storage'
import { getFirebase } from './util/firebase-app-initialized'
import { createServices } from './services'
import {
    createBackgroundModules,
    registerBackgroundModuleCollections,
    setupBackgroundModules,
} from './background-script/setup'
import analytics from './analytics'
import { setStorageMiddleware } from './storage/middleware'
import { setStorex } from './search/get-db'
import { createAuthServices } from './services/local-services'
import type {
    DexieStorageBackend,
    IndexedDbImplementation,
} from '@worldbrain/storex-backend-dexie'
import type { PushMessagePayload } from '@worldbrain/memex-common/lib/push-messaging/types'
import PushMessagingClient from './push-messaging/background'
import { setupOmnibar } from 'src/omnibar'
import { fetchPageData } from '@worldbrain/memex-common/lib/page-indexing/fetch-page-data'
import fetchAndExtractPdfContent from '@worldbrain/memex-common/lib/page-indexing/fetch-page-data/fetch-pdf-data.browser'
import { CloudflareImageSupportBackend } from '@worldbrain/memex-common/lib/image-support/backend'
import { getOnlineBackendEnv } from './util/env'

// This is here so the correct Service Worker `self` context is available. Maybe there's a better way to set this via tsconfig.
declare var self: ServiceWorkerGlobalScope & {
    IDBKeyRange: IndexedDbImplementation['range']
}

// TODO mv3: remove this once firebase/storage is updated to use fetch API: https://github.com/firebase/firebase-js-sdk/issues/6595
global['XMLHttpRequest'] = XMLHttpRequest

async function main() {
    const rpcManager = setupRpcConnection({
        sideName: 'background',
        role: 'background',
        paused: true,
    })

    const firebase = getFirebase()

    const localStorageChangesManager = new StorageChangesManager({
        storage: browser.storage,
    })
    initSentry({})

    if (process.env.USE_FIREBASE_EMULATOR === 'true') {
        // TODO mv3: FB emulator setup
    }

    const serverStorageManager = createServerStorageManager()
    const serverStorage = await createServerStorage(serverStorageManager, {
        autoPkType: 'string',
    })

    const storageManager = initStorex()
    const persistentStorageManager = createPersistentStorageManager({
        idbImplementation: {
            factory: self.indexedDB,
            range: self.IDBKeyRange,
        },
    })
    const authServices = createAuthServices({
        backend: process.env.NODE_ENV === 'test' ? 'memory' : 'firebase',
    })
    const servicesPromise = createServices({
        backend: process.env.NODE_ENV === 'test' ? 'memory' : 'firebase',
        serverStorage,
        authService: authServices.auth,
    })

    const fetch = globalThis.fetch.bind(globalThis)

    const backgroundModules = createBackgroundModules({
        manifestVersion: '3',
        services: servicesPromise,
        serverStorage,
        analyticsManager: analytics,
        localStorageChangesManager,
        fetchPageData: async (url) =>
            fetchPageData({
                url,
                fetch,
                domParser: (html) =>
                    new DOMParser().parseFromString(html, 'text/html'),
                opts: { includePageContent: true, includeFavIcon: true },
            }).run(),
        fetchPDFData: async (url) =>
            fetchAndExtractPdfContent(url, {
                fetch,
                pdfJSWorkerSrc: browser.runtime.getURL('/build/pdf.worker.js'),
            }),
        fetch,
        browserAPIs: browser,
        captureException,
        authServices,
        storageManager,
        persistentStorageManager,
        callFirebaseFunction: async <Returns>(name: string, ...args: any[]) => {
            const callable = firebase.functions().httpsCallable(name)
            const result = await callable(...args)
            return result.data as Promise<Returns>
        },
        getFCMRegistrationToken: () =>
            getToken(getMessaging(), {
                vapidKey: process.env.FCM_VAPID_KEY,
                serviceWorkerRegistration: self.registration,
            }),
        imageSupportBackend: new CloudflareImageSupportBackend({
            env:
                process.env.NODE_ENV === 'production'
                    ? 'production'
                    : 'staging',
        }),
        backendEnv: getOnlineBackendEnv(),
    })
    registerBackgroundModuleCollections({
        storageManager,
        persistentStorageManager,
        backgroundModules,
    })

    setStorageMiddleware(storageManager, backgroundModules)

    // NOTE: This is a hack to manually init Dexie, which is synchronous, before needing to do the async storex init calls.
    //  Doing this as all event listeners need to be set up synchronously, before any async logic happens. AND to avoid needing to update storex yet.
    ;(storageManager.backend as DexieStorageBackend)._onRegistryInitialized()

    // Set up incoming FCM handling logic (`onBackgroundMessage` wraps the SW `push` event)
    const pushMessagingClient = new PushMessagingClient({
        bgModules: backgroundModules,
    })
    onBackgroundMessage(getMessaging(), async (message) => {
        const payload = message.data as PushMessagePayload
        if (payload == null) {
            return
        }

        await pushMessagingClient.handleIncomingMessage(payload)
    })

    await setupBackgroundModules(backgroundModules, storageManager)

    await storageManager.finishInitialization()
    await persistentStorageManager.finishInitialization()

    setStorex(storageManager)
    setupOmnibar({
        browserAPIs: browser,
        bgModules: backgroundModules,
    })

    setupRemoteFunctionsImplementations({
        auth: backgroundModules.auth.remoteFunctions,
        analytics: backgroundModules.analytics.remoteFunctions,
        subscription: {
            getCheckoutLink:
                backgroundModules.auth.subscriptionService.getCheckoutLink,
            getManageLink:
                backgroundModules.auth.subscriptionService.getManageLink,
            getCurrentUserClaims:
                backgroundModules.auth.subscriptionService.getCurrentUserClaims,
        },
        notifications: { create: createNotification } as any,
        bookmarks: backgroundModules.bookmarks.remoteFunctions,
        featuresBeta: backgroundModules.featuresBeta,
        tags: backgroundModules.tags.remoteFunctions,
        collections: backgroundModules.customLists.remoteFunctions,
        readablePageArchives: backgroundModules.readable.remoteFunctions,
        copyPaster: backgroundModules.copyPaster.remoteFunctions,
        contentSharing: backgroundModules.contentSharing.remoteFunctions,
        personalCloud: backgroundModules.personalCloud.remoteFunctions,
        pageActivityIndicator:
            backgroundModules.pageActivityIndicator.remoteFunctions,
        pdf: backgroundModules.pdfBg.remoteFunctions,
        analyticsBG: backgroundModules.analyticsBG,
    })
    rpcManager.unpause()

    const services = await servicesPromise
    global['bgModules'] = backgroundModules
    global['bgServices'] = services
    global['storageManager'] = storageManager
    global['persistentStorageManager'] = persistentStorageManager
}

main().catch((err) => {
    captureException(err)
    throw err
})
