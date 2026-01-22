import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from '@google/genai';
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { jsonrepair } from 'jsonrepair';
import {
    getWebsiteContextPrompt,
    getStrategySystemInstruction,
    getUXSystemInstruction,
    getProductSystemInstruction,
    getVisualSystemInstruction,
    getAccessibilitySystemInstruction,
    getCompetitorSystemInstruction,
    getSchemas
} from './prompts';

// --- HELPERS ---

class Semaphore {
    private tasks: (() => void)[] = [];
    private count = 0;

    constructor(private max: number, private name: string) { }

    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return;
        }
        console.log(`[SEMAPHORE] ${this.name} limit reached (${this.count}/${this.max}). Queuing request...`);
        await new Promise<void>(resolve => this.tasks.push(resolve));
        this.count++;
        console.log(`[SEMAPHORE] ${this.name} slot acquired. Active: ${this.count}`);
    }

    release() {
        this.count--;
        console.log(`[SEMAPHORE] ${this.name} released. Active: ${this.count}`);
        if (this.tasks.length > 0) {
            const next = this.tasks.shift();
            next?.();
        }
    }
}

// Global Semaphores
const aiSemaphore = new Semaphore(10, "GeminiAI");
const scrapeSemaphore = new Semaphore(3, "PuppeteerScrape"); // Puppeteer is heavy, limit to 3

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRetryDelay(error: any) {
    const text = error.message || JSON.stringify(error);
    const match = text.match(/retry in (\d+(\.\d+)?)s/i) || text.match(/retry-after.*?(\d+)/i);
    if (match) {
        return parseFloat(match[1]) * 1000;
    }
    return null;
}

async function retryWithBackoff(operation: any, retries = 15, initialDelay = 2000, operationName = "AI Operation") {
    let attempt = 0;
    while (true) {
        try {
            attempt++;
            return await operation();
        } catch (error: any) {
            const msg = error.message || JSON.stringify(error);
            const isRetriable = msg.includes('503') || msg.includes('429') || msg.includes('500') || msg.includes('overloaded') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('UNAVAILABLE') || msg.includes('Timeout') || msg.includes('internal error') || msg.includes('fetch failed') || msg.includes('EPIPE') || msg.includes('ECONNRESET');

            if (attempt > retries || !isRetriable) {
                console.error(`${operationName} failed permanently on attempt ${attempt}. Error: ${msg}`);
                throw error;
            }

            const base = initialDelay;
            const max = 60000;
            const slot = Math.pow(2, attempt - 1);
            const cap = Math.min(max, base * slot);
            let delay = Math.floor(Math.random() * cap);
            if (delay < initialDelay) delay = initialDelay + Math.random() * 1000;

            const serverDelay = getRetryDelay(error);
            if (serverDelay) {
                delay = serverDelay + 1000;
                console.warn(`${operationName} hit limit. Server requested wait of ${serverDelay / 1000}s.`);
            }

            console.warn(`${operationName} failed (Attempt ${attempt}/${retries}). Retrying in ${delay / 1000}s... Error: ${msg.substring(0, 150)}...`);
            await sleep(delay);
        }
    }
}

const callApi = async (ai: any, systemInstruction: string, contents: string, schema: any, imageBase64: string | null = null, mimeType = 'image/png', secondaryImageBase64: string | null = null) => {
    const parts: any[] = [];
    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType,
                data: imageBase64
            }
        });
    }
    if (secondaryImageBase64) {
        parts.push({
            inlineData: {
                mimeType,
                data: secondaryImageBase64
            }
        });
    }
    parts.push({
        text: contents
    });

    const requestContents = (imageBase64 || secondaryImageBase64) ? { parts } : contents;

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: requestContents,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            maxOutputTokens: 8192,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        }
    });

    try {
        await aiSemaphore.acquire();
        const response = await retryWithBackoff(apiCall, 10, 2000, "Generate Content");
        // We handle response processing here, but must release semaphore in finally
        try {
            let outputText = "";
            if (typeof response.text === 'function') {
                outputText = response.text();
            } else if (response.response && typeof response.response.text === 'function') {
                outputText = response.response.text();
            } else if (typeof response.text === 'string') {
                outputText = response.text;
            } else {
                outputText = JSON.stringify(response);
            }

            if (!outputText) throw new Error("Response text is undefined");

            let text = outputText.trim();

            // 1. Try stripping markdown code blocks first
            if (text.startsWith('```json')) {
                text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (text.startsWith('```')) {
                text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            try {
                return JSON.parse(text);
            } catch (initialError) {
                // 2. Try jsonrepair (handles truncated JSON, missing quotes, etc.)
                try {
                    const repaired = jsonrepair(text);
                    return JSON.parse(repaired);
                } catch (repairError) {
                    // 3. Fallback: Try finding the first '{' and last '}'
                    const firstOpen = text.indexOf('{');
                    const lastClose = text.lastIndexOf('}');

                    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                        const extracted = text.substring(firstOpen, lastClose + 1);
                        try {
                            return JSON.parse(extracted);
                        } catch (secondaryError) {
                            try {
                                // Try repairing the extracted part too
                                return JSON.parse(jsonrepair(extracted));
                            } catch (finalError) {
                                throw initialError;
                            }
                        }
                    }
                    throw initialError;
                }
            }
        } catch (e: any) {
            console.error("Failed to parse AI response as JSON.", e);
            const outputText = response.text ? (typeof response.text === 'function' ? response.text() : response.text) : 'undefined';
            throw new Error(`The AI model returned a response that could not be parsed as JSON (${e.message}). Raw output: \n---\n${outputText ? outputText.trim() : 'undefined'}\n---`);
        }
    } finally {
        aiSemaphore.release();
    }
};

const handleSingleAnalysisStream = async (res: Response, expertKey: string, analysisFn: any) => {
    const write = (chunk: any) => {
        res.write(JSON.stringify(chunk) + '\n');
    };

    try {
        write({ type: 'status', message: `Running ${expertKey.replace(' expert', '')} analysis...` });
        const data = await analysisFn();
        if (!data) {
            throw new Error("The AI model returned an empty or invalid response for this audit section.");
        }
        if (expertKey === 'Visual Audit expert') {
            console.log("---------- VISUAL AUDIT RESPONSE ----------");
            console.log(JSON.stringify(data, null, 2));
            console.log("-------------------------------------------");
        }
        if (expertKey === 'Strategy Audit expert') {
            console.log("---------- STRATEGY AUDIT RESPONSE ----------");
            console.log(JSON.stringify(data, null, 2));
            console.log("-------------------------------------------");
        }
        write({ type: 'data', payload: { key: expertKey, data } });
        write({ type: 'status', message: `✓ ${expertKey.replace(' expert', '')} analysis complete.` });
    } catch (error: any) {
        console.error(`Analysis failed for ${expertKey}:`, error);
        const errorMessage = error.stack ? `${error.message}\n${error.stack}` : error.message;
        write({ type: 'error', message: `Error in ${expertKey}: ${errorMessage}` });
    }
};

// --- MAIN HANDLER ---

export const handleAuditRequest = async (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '..', 'debug_error.log');

    try {
        const { mode } = req.body;
        console.log(`[AUDIT] Request received for mode: ${mode}`);
        fs.appendFileSync(logPath, `[AUDIT] Request received for mode: ${mode}\n`);
    } catch (e) {
        console.error("Logging failed", e);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        try { fs.appendFileSync(logPath, `[ERROR] Missing Env Vars: URL=${!!supabaseUrl}, KEY=${!!supabaseServiceRoleKey}\n`); } catch (e) { }
        console.error(`[ERROR] Missing Env Vars: URL=${!!supabaseUrl}, KEY=${!!supabaseServiceRoleKey}`);
        return res.status(500).json({ message: `Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` });
    }

    // Initialize Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const { mode } = req.body;
        // console.log already done

        const { data: secretData, error: secretError } = await supabaseAdmin
            .from('app_secrets')
            .select('key_name, key_value')
            .in('key_name', ['API_KEY', 'PUPPETEER_BROWSER_ENDPOINT', 'PAGESPEED_API_KEY']);

        if (secretError || !secretData) {
            console.error("Failed to fetch secrets from Supabase:", secretError);
            return res.status(500).json({ message: "Failed to retrieve app credentials." });
        }

        const secrets = secretData.reduce((acc: any, item: any) => {
            acc[item.key_name] = item.key_value;
            return acc;
        }, {});

        let apiKey = secrets['API_KEY'];
        if (!apiKey) {
            // Fallback to process.env
            apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        }

        if (!apiKey) {
            console.error("API_KEY not found in Supabase secrets or environment variables.");
            return res.status(500).json({ message: "Missing AI API Key." });
        }

        const browserEndpoint = secrets['PUPPETEER_BROWSER_ENDPOINT'] || process.env.BROWSER_ENDPOINT; // Combine logic

        // Explicitly check for AI key before init
        const ai = new GoogleGenAI({ apiKey });

        // Set streaming headers for analysis modes
        if (mode.startsWith('analyze-')) {
            res.setHeader('Content-Type', 'text/event-stream'); // Or application/x-ndjson
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            // We use standard JSON streaming with newlines as per client expectation (NDJSON-ish)
            // Client uses `onData` callback processing chunks.
        }

        // --- SCRAPING HELPER ---
        async function scrapeUrlWithRetry(url: string, isMobile: boolean, isFirstPage: boolean, browserEndpoint?: string, retries = 2) {
            await scrapeSemaphore.acquire();
            try {
                let attempt = 0;
                while (attempt <= retries) {
                    attempt++;
                    let browser;
                    let isLocalBrowser = false;
                    try {
                        if (browserEndpoint) {
                            browser = await puppeteer.connect({ browserWSEndpoint: browserEndpoint });
                        } else {
                            browser = await puppeteer.launch({
                                headless: true, // Revert to legacy headless for stability
                                protocolTimeout: 300000,
                                args: [
                                    '--no-sandbox',
                                    '--disable-setuid-sandbox',
                                    '--disable-dev-shm-usage',
                                    '--disable-gpu',
                                    '--disable-software-rasterizer', // Added for Windows stability
                                    '--window-size=1920,1080',
                                    '--disable-features=IsolateOrigins,site-per-process',
                                    '--blink-settings=imagesEnabled=true',
                                    '--disable-extensions',
                                    '--disable-infobars',
                                    '--no-zygote',
                                    '--mute-audio',
                                ]
                            });
                        }

                        const page = await browser.newPage();
                        page.setDefaultNavigationTimeout(300000); // 5 mins

                        // VITAL: Set a real User Agent to prevent anti-bot connection drops
                        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                        const viewport = isMobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1920, height: 1080 };
                        await page.setViewport(viewport);

                        console.log(`[SCRAPE] Attempt ${attempt}: Navigating to ${url}...`);

                        // Navigation
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
                        try { await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => { }); } catch (e) { }

                        // Fix fixed positions
                        await page.evaluate(() => {
                            document.querySelectorAll('*').forEach((el: any) => {
                                const style = window.getComputedStyle(el);
                                if (style.position === 'fixed' || style.position === 'sticky') {
                                    el.style.position = 'absolute';
                                }
                            });
                            window.scrollTo(0, 0);
                        });

                        // Scroll
                        console.log(`[SCRAPE] Scrolling...`);
                        await page.evaluate(async () => {
                            await new Promise<void>((resolve) => {
                                let totalHeight = 0;
                                const distance = 250;
                                const maxScrolls = 40; // maintain limit
                                let scrolls = 0;
                                const timer = setInterval(() => {
                                    const scrollHeight = document.body.scrollHeight;
                                    window.scrollBy(0, distance);
                                    totalHeight += distance;
                                    scrolls++;
                                    if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
                                        clearInterval(timer);
                                        resolve();
                                    }
                                }, 500); // Slower scroll (500ms) for stability
                            });
                        });

                        // Screenshot
                        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 50, fullPage: true });
                        const pagePath = new URL(url).pathname;

                        const screenshot = {
                            path: pagePath,
                            data: Buffer.from(screenshotBuffer).toString('base64'),
                            isMobile
                        };

                        // Data Extraction
                        const pageData = await page.evaluate((isFirstPageDesktop: boolean) => {
                            const text = document.body.innerText;
                            let animationData = null;
                            let accessibilityData = null;

                            if (isFirstPageDesktop) {
                                // @ts-ignore
                                animationData = Array.from(document.querySelectorAll('*')).filter((el: any) => {
                                    const style = window.getComputedStyle(el);
                                    return style.getPropertyValue('animation-name') !== 'none' || (style.getPropertyValue('transition-property') !== 'all' && style.getPropertyValue('transition-property') !== '');
                                }).map((el: any) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter((c: any) => c).join('.')}` : ''}`).slice(0, 20);

                                // @ts-ignore
                                accessibilityData = {
                                    imagesMissingAlt: Array.from(document.querySelectorAll('img:not([alt])')).length,
                                    inputsMissingLabels: Array.from(document.querySelectorAll('input:not([id]), textarea:not([id])')).filter((el: any) => !el.closest('label')).length + Array.from(document.querySelectorAll('input[id], textarea[id]')).filter((el: any) => !document.querySelector(`label[for="${el.id}"]`)).length,
                                    hasSemanticElements: !!document.querySelector('main, nav, header, footer, article, section, aside'),
                                    hasAriaAttributes: !!document.querySelector('[role], [aria-label], [aria-labelledby], [aria-describedby]')
                                };
                            }
                            return { liveText: text, animationData, accessibilityData };
                        }, isFirstPage && !isMobile);

                        // Axe-Core
                        let axeViolations: any[] = [];
                        let axePasses: any[] = [];
                        let axeIncomplete: any[] = [];
                        let axeInapplicable: any[] = [];

                        if (isFirstPage && !isMobile) {
                            // ... Axe logic ...
                            try {
                                // Wait for animations/react to settle
                                await new Promise(r => setTimeout(r, 2000)); // Reduced from 5000
                                console.log(`[AXE] Running analysis...`);

                                const results = await new AxePuppeteer(page)
                                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
                                    .analyze();

                                axeViolations = results.violations;

                                // Capture passes
                                const axePassesRaw = results.passes || [];
                                axePasses = axePassesRaw.map((p: any) => ({
                                    id: p.id,
                                    help: p.help,
                                    html: (p.nodes && p.nodes.length > 0 && p.nodes[0].html) ? p.nodes[0].html : null
                                }));

                                // Capture incomplete
                                const axeIncompleteRaw = results.incomplete || [];
                                axeIncomplete = axeIncompleteRaw.map((p: any) => ({
                                    id: p.id,
                                    help: p.help,
                                    nodes: p.nodes ? p.nodes.map((n: any) => ({ html: n.html, failureSummary: n.failureSummary })) : []
                                }));

                                // Capture inapplicable
                                const axeInapplicableRaw = results.inapplicable || [];
                                axeInapplicable = axeInapplicableRaw.map((p: any) => ({
                                    id: p.id,
                                    help: p.help
                                }));
                            } catch (axeError) {
                                console.error("Axe-Core failed:", axeError);
                                // Don't fail the whole scrape for Axe errors
                            }
                        }

                        try {
                            if (page && !page.isClosed()) await page.close();
                        } catch (e) {
                            console.warn("[SCRAPE] Warning: Failed to close page (might be already closed):", e);
                        }

                        if (browser) {
                            try {
                                if (isLocalBrowser) await browser.close();
                                else await browser.disconnect();
                            } catch (e) {
                                console.warn("[SCRAPE] Warning: Failed to close/disconnect browser:", e);
                            }
                        }

                        return { screenshot, ...pageData, axeViolations, axePasses, axeIncomplete, axeInapplicable };

                    } catch (error: any) {
                        console.error(`[SCRAPE] Attempt ${attempt} failed: ${error.message}`);

                        // Ensure cleanup on failure
                        if (browser) {
                            try {
                                if (isLocalBrowser) await browser.close();
                                else await browser.disconnect();
                            } catch (e) { }
                        }

                        if (attempt > retries) throw error;
                        console.log(`[SCRAPE] Retrying...`);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            } finally {
                scrapeSemaphore.release();
            }
        }

        switch (mode) {
            case 'scrape-single-page': {
                try {
                    const { url, isMobile, isFirstPage } = req.body;
                    const result = await scrapeUrlWithRetry(url, isMobile, isFirstPage, browserEndpoint);
                    res.json(result);
                } catch (error: any) {
                    console.error("Scraping failed permanently:", error);
                    const fs = require('fs');
                    fs.writeFileSync('debug_error.log', `Error: ${error.message}\nStack: ${error.stack}\n`);
                    res.status(500).json({ message: `Scraping failed: ${error.message}` });
                }
                break;
            }

            case 'scrape-performance': {
                try {
                    const { url } = req.body;
                    let pageSpeedApiKey = secrets['PAGESPEED_API_KEY'];
                    if (!pageSpeedApiKey) {
                        pageSpeedApiKey = process.env.PAGESPEED_API_KEY; // Fallback to env
                    }
                    const usedKey = pageSpeedApiKey || apiKey; // Fallback to main API key if specific one missing

                    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${usedKey}&category=performance&strategy=desktop`;

                    const maskedKey = usedKey ? `...${usedKey.slice(-4)}` : 'undefined';
                    console.log(`[Performance] Starting audit for: ${url}`);
                    console.log(`[Performance] Using API Key: ${maskedKey}`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

                    console.log(`[Performance] Fetching PageSpeed data...`);
                    const psiResponse = await fetch(psiUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    console.log(`[Performance] Response Status: ${psiResponse.status}`);

                    let performanceData = null;
                    let error = null;

                    if (!psiResponse.ok) {
                        const errorText = await psiResponse.text();
                        console.error(`[Performance] API Error Body:`, errorText);
                        try {
                            const errorBody = JSON.parse(errorText);
                            error = errorBody?.error?.message || `API Error ${psiResponse.status}`;
                        } catch (e) {
                            error = `API Error ${psiResponse.status}: ${errorText}`;
                        }
                    } else {
                        const psiData: any = await psiResponse.json();
                        console.log(`[Performance] Data received. Lighthouse Result Present: ${!!psiData.lighthouseResult}`);

                        if (psiData.lighthouseResult) {
                            const audits = psiData.lighthouseResult.audits;
                            performanceData = {
                                lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
                                cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
                                tbt: audits['total-blocking-time']?.displayValue || 'N/A',
                                fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
                                tti: audits['interactive']?.displayValue || 'N/A',
                                si: audits['speed-index']?.displayValue || 'N/A'
                            };
                            console.log(`[Performance] Extracted metrics:`, performanceData);
                        } else {
                            console.warn(`[Performance] No lighthouseResult found in response.`);
                            error = psiData.error ? psiData.error.message : "Lighthouse returned an empty result.";
                        }
                    }
                    res.json({ performanceData, error });
                } catch (e: any) {
                    const error = e.name === 'AbortError' ? "Google PageSpeed Insights API timed out after 1 minute." : e.message;
                    res.json({ performanceData: null, error });
                }
                break;
            }

            case 'analyze-ux':
            case 'analyze-product':
            case 'analyze-visual':
            case 'analyze-strategy':
            case 'analyze-accessibility': {
                const schemas = getSchemas();
                const expertMap: any = {
                    'analyze-ux': { key: 'UX Audit expert', role: 'UX Auditor', schema: schemas.uxAuditSchema },
                    'analyze-product': { key: 'Product Audit expert', role: 'Product Auditor', schema: schemas.productAuditSchema },
                    'analyze-visual': { key: 'Visual Audit expert', role: 'Visual Designer', schema: schemas.visualAuditSchema },
                    'analyze-strategy': { key: 'Strategy Audit expert', role: 'Strategy Auditor', schema: schemas.strategyAuditSchema },
                    'analyze-accessibility': { key: 'Accessibility Audit expert', role: 'Accessibility Auditor', schema: schemas.accessibilityAuditSchema }
                };

                const expertConfig = expertMap[mode];
                const analysisFn = async () => {
                    if (mode === 'analyze-strategy') {
                        const { liveText, screenshotBase64, screenshotMimeType, mobileScreenshotBase64 } = req.body;
                        return callApi(ai, getStrategySystemInstruction(), liveText, expertConfig.schema, screenshotBase64, screenshotMimeType, mobileScreenshotBase64);
                    } else {
                        const { url, screenshotBase64, mobileScreenshotBase64, liveText, performanceData, screenshotMimeType, performanceAnalysisError, animationData, accessibilityData, axeViolations } = req.body;

                        const mobileCaptureSucceeded = !!mobileScreenshotBase64;
                        const isMultiPage = liveText.includes("--- START CONTENT FROM");

                        let systemInstruction = "";
                        let contextPrompt = getWebsiteContextPrompt(url, performanceData, performanceAnalysisError, animationData, accessibilityData, isMultiPage);

                        if (mode === 'analyze-ux') {
                            systemInstruction = getUXSystemInstruction(mobileCaptureSucceeded, isMultiPage);
                        } else if (mode === 'analyze-product') {
                            systemInstruction = getProductSystemInstruction(isMultiPage);
                        } else if (mode === 'analyze-visual') {
                            systemInstruction = getVisualSystemInstruction(mobileCaptureSucceeded, isMultiPage);
                        } else if (mode === 'analyze-accessibility') {
                            systemInstruction = getAccessibilitySystemInstruction(isMultiPage);
                            if (axeViolations) {
                                contextPrompt += `\n### Automated Axe-Core Accessibility Violations ###\n${JSON.stringify(axeViolations, null, 2)}\n`;
                            }
                        }

                        const fullContent = `${contextPrompt}\n### Live Website Text Content ###\n${liveText}`;

                        return callApi(ai, systemInstruction, fullContent, expertConfig.schema, screenshotBase64, screenshotMimeType, mobileScreenshotBase64);
                    }
                };

                await handleSingleAnalysisStream(res, expertConfig.key, analysisFn);
                res.end(); // End the stream
                break;
            }

            case 'analyze-competitor': {
                const schemas = getSchemas();
                const analysisFn = async () => {
                    const {
                        primaryUrl, primaryScreenshotBase64, primaryLiveText,
                        competitorUrl, competitorScreenshotBase64, competitorLiveText,
                        screenshotMimeType
                    } = req.body;

                    const systemInstruction = getCompetitorSystemInstruction();
                    const fullContent = `
### PRIMARY WEBSITE ###
- URL: ${primaryUrl}
- Content: ${primaryLiveText.substring(0, 15000)}... (truncated)

### COMPETITOR WEBSITE ###
- URL: ${competitorUrl}
- Content: ${competitorLiveText.substring(0, 15000)}... (truncated)
`;

                    console.log("[COMPETITOR] Starting parallel analysis (Strategic + Tactical)...");

                    // Run both analyses in parallel
                    const [strategicData, tacticalData] = await Promise.all([
                        callApi(ai, systemInstruction + "\n\nFOCUS: Focus ONLY on Strategy, Accessibility, Strengths, Opportunities, and Executive Summary.", fullContent, schemas.competitorAuditSchemaStrategic, primaryScreenshotBase64, screenshotMimeType, competitorScreenshotBase64),
                        callApi(ai, systemInstruction + "\n\nFOCUS: Focus ONLY on UX, Product, and Visual comparisons.", fullContent, schemas.competitorAuditSchemaTactical, primaryScreenshotBase64, screenshotMimeType, competitorScreenshotBase64)
                    ]);

                    console.log("[COMPETITOR] Parallel analysis complete. Merging results...");

                    // Merge results
                    return {
                        ...strategicData,
                        ...tacticalData
                    };
                };

                await handleSingleAnalysisStream(res, "Competitor Analysis expert", analysisFn);
                res.end();
                break;
            }

            case 'contextual-rank': {
                try {
                    const { report } = req.body;
                    const allIssues = [
                        ...report['UX Audit expert']?.Top5CriticalUXIssues?.map((i: any) => ({ ...i, source: 'UX Audit' })) || [],
                        ...report['Product Audit expert']?.Top5CriticalProductIssues?.map((i: any) => ({ ...i, source: 'Product Audit' })) || [],
                        ...report['Visual Audit expert']?.Top5CriticalVisualIssues?.map((i: any) => ({ ...i, source: 'Visual Design' })) || [],
                        ...report['Accessibility Audit expert']?.Top5CriticalAccessibilityIssues?.map((i: any) => ({ ...i, source: 'Accessibility Audit' })) || []
                    ];

                    if (!report['Strategy Audit expert'] || allIssues.length === 0) {
                        // Fallback sort
                        const impactOrder: any = { High: 3, Medium: 2, Low: 1 };
                        allIssues.sort((a: any, b: any) => impactOrder[b.ImpactLevel] - impactOrder[a.ImpactLevel] || a.Score - b.Score);
                        return res.json(allIssues.slice(0, 5));
                    }

                    const strategyAudit = report['Strategy Audit expert'];
                    const strategyContext = `
- Website Purpose: ${strategyAudit.PurposeAnalysis?.PrimaryPurpose?.join(', ')}
- Key Objectives: ${strategyAudit.PurposeAnalysis?.KeyObjectives}
- Target Audience: ${strategyAudit.TargetAudience?.Primary?.join(', ')} (${strategyAudit.TargetAudience?.DemographicsPsychographics})
- Website Type: ${strategyAudit.TargetAudience?.WebsiteType}`;

                    const systemInstruction = `You are a Chief Product Strategist. Your task is to analyze a list of critical issues identified for a website, considering the site's strategic context. Re-rank these issues based on which ones have the most significant impact on the website's primary purpose and ability to serve its target audience.`;

                    const contents = `
### Strategic Context ###
${strategyContext}
### Your Task ###
1. Review the strategic context and each issue in the provided JSON list.
2. Select the TOP 5 issues that represent the most critical barriers to the website's success.
3. Return ONLY these 5 issues, sorted from most to least critical.
4. You MUST return the issues in the exact same JSON structure as they were provided, including all original fields.
5. EXCLUSION CRITERIA: Do NOT select any issues primarily related to "Screen Reader Compatibility", "Missing Alt Text", or "Missing Form Labels".
### Critical Issues List (JSON) ###
${JSON.stringify(allIssues, null, 2)}`;

                    const schemas = getSchemas();
                    // We need to use 'responseMimeType' etc. callApi logic but we are not sending image.
                    const callContextRank = () => ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: contents,
                        config: {
                            systemInstruction,
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.ARRAY,
                                items: schemas.criticalIssueSchema
                            }
                        }
                    });

                    const response = await retryWithBackoff(callContextRank, 10, 2000, "Contextual Rank");
                    // Same parsing logic as callApi
                    let outputText = "";
                    if (typeof response.text === 'function') {
                        outputText = response.text();
                    } else if (response.response && typeof response.response.text === 'function') {
                        outputText = response.response.text();
                    } else if (typeof response.text === 'string') {
                        outputText = response.text;
                    } else {
                        outputText = JSON.stringify(response); // limit
                    }

                    // Strip markdown for contextual rank too
                    let text = outputText.trim();
                    if (text.startsWith('```json')) {
                        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (text.startsWith('```')) {
                        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }

                    res.json(JSON.parse(text));

                } catch (error: any) {
                    console.error("Contextual rank failed:", error);
                    res.status(500).json({ message: `Contextual ranking failed: ${error.message}` });
                }
                break;
            }

            case 'finalize': {
                try {
                    const { report, screenshots, url } = req.body;
                    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
                    const auditUUID = crypto.randomUUID();

                    const uploadedScreenshots = await Promise.all(screenshots.map(async (screenshot: any, index: number) => {
                        if (!screenshot.data) return { ...screenshot, data: undefined };

                        const filePath = `public/${auditUUID}/${index}-${screenshot.isMobile ? 'mobile' : 'desktop'}.jpeg`;
                        const screenshotBuffer = Buffer.from(screenshot.data, 'base64');

                        const { error: uploadError } = await supabaseAdmin.storage.from('screenshots').upload(filePath, screenshotBuffer, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                        if (uploadError) throw new Error(`Supabase upload failed for screenshot ${index}: ${uploadError.message}`);

                        const { data: { publicUrl } } = supabaseAdmin.storage.from('screenshots').getPublicUrl(filePath);
                        return {
                            path: screenshot.path,
                            isMobile: screenshot.isMobile,
                            url: publicUrl
                        };
                    }));

                    const reportToSave = { ...report, screenshots: uploadedScreenshots };
                    const primaryScreenshot = uploadedScreenshots.find((s) => s.url && !s.isMobile);

                    const { data: auditRecord, error: insertError } = await supabaseAdmin.from('audits').insert({
                        url,
                        report_data: reportToSave,
                        screenshot_url: primaryScreenshot?.url
                    }).select('id').single();

                    if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

                    res.json({ auditId: auditRecord.id, screenshotUrl: primaryScreenshot?.url });

                } catch (error: any) {
                    console.error("Finalization failed:", error);
                    res.status(500).json({ message: `Finalization failed: ${error.message}` });
                }
                break;
            }

            case 'get-audit': {
                try {
                    const { auditId } = req.body;
                    if (!auditId) return res.status(400).json({ message: "auditId is required." });

                    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
                    const { data, error } = await supabaseAdmin.from('audits').select('report_data, url, screenshot_url').eq('id', auditId).single();

                    if (error) throw error;
                    if (!data) return res.status(404).json({ message: "Audit not found." });

                    res.json({
                        report: data.report_data,
                        url: data.url,
                        screenshotUrl: data.screenshot_url
                    });
                } catch (error: any) {
                    console.error(`Error getting audit ${req.body.auditId}:`, error);
                    res.status(500).json({ message: `Get audit failed: ${error.message}` });
                }
                break;
            }

            default:
                res.status(400).json({ message: "Invalid mode specified." });
        }
    } catch (error: any) {
        console.error("Global audit handler error:", error);
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', 'debug_error.log');
        try {
            fs.appendFileSync(logPath, `[GLOBAL ERROR] ${error.message}\n${error.stack}\n`);
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }

        if (!res.headersSent) {
            res.status(500).json({ message: `Internal Server Error: ${error.message}` });
        }
    }
};
