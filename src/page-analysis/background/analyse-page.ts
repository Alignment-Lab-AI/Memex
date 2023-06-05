import {
    extractPageMetadataFromRawContent,
    getPageFullText,
} from '@worldbrain/memex-common/lib/page-indexing/content-extraction/extract-page-content'
import type { PageContent } from '@worldbrain/memex-common/lib/page-indexing/content-extraction/types'
import type { InPDFPageUIContentScriptRemoteInterface } from 'src/in-page-ui/content_script/types'
import type TabManagementBackground from 'src/tab-management/background'
import type { ExtractedPDFData } from './content-extraction/types'
import { runInTab } from 'src/util/webextensionRPC'

export interface PageAnalysis {
    content: PageContent
    favIconURI?: string
    htmlBody?: string
    pdfMetadata?: { [key: string]: any }
    pdfPageTexts?: string[]
}

export type PageAnalyzer = (args: {
    tabId: number
    tabManagement: Pick<
        TabManagementBackground,
        'extractRawPageContent' | 'getFavIcon'
    >
    fetch?: typeof fetch
    includeContent?: 'metadata-only' | 'metadata-with-full-text'
    includeFavIcon?: boolean
    url?: string
}) => Promise<PageAnalysis>

/**
 * Performs page content analysis on a given Tab's ID.
 *
 * CONTEXT: This needs to be called on a tab that is ready to be indexed.
 */
const analysePage: PageAnalyzer = async (options) => {
    const { tabId, url } = options
    options.includeFavIcon = options.includeFavIcon ?? true

    let pdfMetadata: PageAnalysis['pdfMetadata']
    let pdfPageTexts: PageAnalysis['pdfPageTexts']
    if (!options.includeContent) {
        return
    }

    const ytVideoUrlPattern = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??(?:v=)?([^#&?]*).*/
    const [, videoId] = options.url.match(ytVideoUrlPattern) ?? []

    const rawContent = await options.tabManagement.extractRawPageContent(
        options.tabId,
    )
    if (!rawContent) {
        throw new Error(`Could extract raw page content`)
    }

    let content: PageContent | ExtractedPDFData
    if (rawContent.type === 'pdf') {
        const pdfContent = await runInTab<
            InPDFPageUIContentScriptRemoteInterface
        >(options.tabId).extractPDFContents()
        pdfMetadata = pdfContent.pdfMetadata
        pdfPageTexts = pdfContent.pdfPageTexts
        delete pdfContent.pdfMetadata
        delete pdfContent.pdfPageTexts
        content = pdfContent
    } else {
        content = extractPageMetadataFromRawContent(rawContent)
    }

    if (options.includeContent === 'metadata-with-full-text') {
        content.fullText = getPageFullText(rawContent, content)
    }

    if (videoId) {
        const isStaging =
            process.env.REACT_APP_FIREBASE_PROJECT_ID?.includes('staging') ||
            process.env.NODE_ENV === 'development'

        const baseUrl = isStaging
            ? 'https://cloudflare-memex-staging.memex.workers.dev'
            : 'https://cloudfare-memex.memex.workers.dev'

        const normalisedYoutubeURL =
            'https://www.youtube.com/watch?v=' + videoId

        const response = await fetch(baseUrl + '/youtube-transcripts', {
            method: 'POST',
            body: JSON.stringify({
                originalUrl: normalisedYoutubeURL,
            }),
            headers: { 'Content-Type': 'application/json' },
        })

        let responseContent = await response.text()

        let transcriptText = JSON.parse(responseContent).transcriptText

        if (transcriptText != null) {
            content.fullText =
                content.fullText + JSON.parse(responseContent).transcriptText
        }
    }
    const favIconURI =
        options.includeFavIcon && rawContent.type !== 'pdf'
            ? await options.tabManagement.getFavIcon({ tabId })
            : undefined
    const htmlBody = rawContent.type === 'html' ? rawContent.body : undefined

    return {
        content,
        htmlBody,
        favIconURI,
        pdfMetadata,
        pdfPageTexts,
    }
}

export default analysePage
