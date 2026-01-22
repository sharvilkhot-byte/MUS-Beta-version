import { StreamChunk, AnalysisReport, ExpertKey, Screenshot, AuditInput } from '../types';

// --- Supabase Client Details ---
// These values have been configured with your Supabase project details.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sobtfbplbpvfqeubjxex.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYnRmYnBsYnB2ZnFldWJqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDgzMDYsImV4cCI6MjA3NDcyNDMwNn0.ewfxDwlapmRpfyvYD3ALb-WyL12ty1eP8nzKyrc66ho';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// -----------------------------

interface StreamCallbacks {
  onScrapeComplete: (screenshots: Screenshot[], screenshotMimeType: string) => void;
  onPerformanceError?: (message: string) => void;
  onStatus: (message: string) => void;
  onData: (chunk: any) => void;
  onComplete: (payload: any) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

interface AnalyzeParams {
  inputs: AuditInput[];
  auditMode?: 'standard' | 'competitor';
}

const commonHeaders = {
  'Content-Type': 'application/json',
  // 'Authorization': `Bearer ${supabaseAnonKey}`, // Node server might not need this or might expect it
  // 'apikey': supabaseAnonKey,
};
const functionUrl = `${apiUrl}/api/audit`;


// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const processSingleAnalysisStream = async (
  body: any,
  key: ExpertKey,
  { onStatus, onData, onError }: StreamCallbacks,
  finalReport: AnalysisReport
) => {
  const expertName = key.split(' ')[0];
  try {
    onStatus(`Running ${expertName} Audit`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis request failed for ${expertName}: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error(`Response body is null for ${expertName} analysis.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        let parsedChunk: StreamChunk;
        try {
          parsedChunk = JSON.parse(line);
        } catch (e) {
          console.error(`Failed to parse stream chunk for ${expertName}:`, line, e);
          continue;
        }

        if (parsedChunk.type === 'data') {
          onData(parsedChunk.payload);
          finalReport[parsedChunk.payload.key] = parsedChunk.payload.data;
        } else if (parsedChunk.type === 'error') {
          throw new Error(parsedChunk.message);
        }
      }
    }
    onStatus(`✓ ${expertName} Audit analysis complete`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    onError(`An error occurred during the ${expertName} Audit: ${errorMessage}`);
    throw e;
  }
};

export const analyzeWebsiteStream = async (
  { inputs, auditMode = 'standard' }: AnalyzeParams,
  callbacks: StreamCallbacks
): Promise<void> => {
  const { onScrapeComplete, onStatus, onData, onComplete, onError, onClose, onPerformanceError } = callbacks;
  const finalReport: AnalysisReport = {};

  try {
    const allScreenshots: Screenshot[] = [];
    let aggregatedLiveText = '';
    let performanceData = null;
    let performanceAnalysisError = null;
    let animationData: any[] = [];
    let accessibilityData: any = null;

    // --- Phase 1: Data Acquisition ---
    onStatus(auditMode === 'competitor' ? 'Scraping Primary and Competitor sites...' : 'Processing inputs...');

    // COMPETITOR MODE SPECIFIC DATA
    let primaryData: any = null;
    let competitorData: any = null;

    if (auditMode === 'competitor') {
      if (inputs.length < 2) throw new Error("Competitor analysis requires 2 URLs.");

      const primaryInput = inputs[0];
      const competitorInput = inputs[1];

      // Helper: Acquire Logic for One Input (Hybrid: URL Scrape or File Base64)
      const acquireData = async (input: AuditInput, label: string) => {
        onStatus(`Processing ${label}...`);

        if (input.type === 'upload' && (input.file || input.files?.length)) {
          // HANDLE FILE
          const file = input.file || input.files?.[0];
          if (!file) throw new Error(`No file provided for ${label}`);

          const base64 = await fileToBase64(file);
          return {
            screenshot: {
              path: 'upload',
              data: base64,
              isMobile: false
            } as Screenshot,
            liveText: ''
          };
        } else if (input.type === 'url' && input.url) {
          // HANDLE URL
          onStatus(`Scraping ${label}: ${input.url}...`);
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify({ url: input.url, isMobile: false, isFirstPage: true, mode: 'scrape-single-page' }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to scrape ${label}: ${response.status} ${errorText}`);
          }
          return await response.json(); // Returns { screenshot, liveText, ... }
        }
        throw new Error(`Invalid input for ${label}`);
      };

      // ACQUIRE SEQUENTIALLY TO AVOID 429 ERRORS
      try {
        const primaryResult = await acquireData(primaryInput, "Primary Site");
        primaryData = primaryResult;

        // Short pause to be safe (increased to 3s for stability)
        await new Promise(r => setTimeout(r, 3000));

        const competitorResult = await acquireData(competitorInput, "Competitor Site");
        competitorData = competitorResult;

        allScreenshots.push(primaryData.screenshot);
        allScreenshots.push(competitorData.screenshot);

      } catch (e) {
        throw new Error(`Data acquisition failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      onScrapeComplete(allScreenshots, 'image/png');
      onStatus('✓ input data acquired. Beginning Comparative Analysis...');

      // --- RUN COMPETITOR ANALYSIS ---
      const analysisBody = {
        mode: 'analyze-competitor',
        primaryUrl: primaryInput.url,
        primaryScreenshotBase64: primaryData.screenshot.data,
        primaryLiveText: primaryData.liveText || '',
        competitorUrl: competitorInput.url,
        competitorScreenshotBase64: competitorData.screenshot.data,
        competitorLiveText: competitorData.liveText || '',
        screenshotMimeType: 'image/png'
      };

      await processSingleAnalysisStream(analysisBody, 'Competitor Analysis expert', callbacks, finalReport);

      onStatus('✓ Analysis complete. Finalizing...');
      onComplete({
        auditId: 'temp-competitor-id', // Or handle saving differently
        report: finalReport,
        // We might not save to Supabase for competitor analysis yet or handle logic differently
        // For now, let's skip the heavy 'finalize' call that upserts standard audits unless requested 
      });

    } else {
      // --- STANDARD AUDIT LOGIC (Existing) ---
      let successfulAcquisitions = 0;

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const isPrimary = i === 0;

        if (input.type === 'url' && input.url) {
          // --- URL SCRAPING ---
          onStatus(`Scraping URL ${i + 1}/${inputs.length}: ${input.url}`);

          const tasks = [{ url: input.url, isMobile: false, isFirstPage: isPrimary }];
          if (isPrimary) tasks.push({ url: input.url, isMobile: true, isFirstPage: false });

          for (const task of tasks) {
            try {
              const response = await fetch(functionUrl, {
                method: 'POST',
                headers: commonHeaders,
                body: JSON.stringify({ ...task, mode: 'scrape-single-page' }),
              });

              if (!response.ok) throw new Error("Scrape failed");

              const result = await response.json();

              allScreenshots.push(result.screenshot);
              if (!result.screenshot.isMobile) {
                aggregatedLiveText += `\n\n--- CONTENT FROM ${input.url} ---\n${result.liveText || '(No text found)'}\n\n`;
                if (isPrimary) {
                  animationData = result.animationData;
                  accessibilityData = result.accessibilityData;
                  // @ts-ignore
                  window.axeViolations = result.axeViolations;
                  // @ts-ignore
                  window.axePasses = result.axePasses;
                  // @ts-ignore
                  window.axeIncomplete = result.axeIncomplete;
                  // @ts-ignore
                  window.axeInapplicable = result.axeInapplicable;
                }
              }
              successfulAcquisitions++;
            } catch (e) {
              console.error(e);
              onStatus(`⚠️ Failed to scrape ${input.url}. Skipping.`);
            }
          }
        } else if (input.type === 'upload' && (input.file || (input.files && input.files.length > 0))) {
          // --- FILE UPLOAD HANDLING ---
          onStatus(`Processing uploaded image(s)...`);

          // Handle single 'file' or array 'files'
          const filesToProcess = input.files && input.files.length > 0 ? input.files : (input.file ? [input.file] : []);

          for (const file of filesToProcess) {
            try {
              const base64Data = await fileToBase64(file);
              const screenshot: Screenshot = {
                path: 'upload', // Markup for upload
                data: base64Data,
                isMobile: false // Assume desktop/general for uploads
              };
              allScreenshots.push(screenshot);
              successfulAcquisitions++;
            } catch (e) {
              console.error("Failed to process file upload:", e);
              onStatus(`⚠️ Failed to process an uploaded image.`);
            }
          }
        }
      }

      if (successfulAcquisitions === 0) {
        throw new Error("Failed to acquire data from any source.");
      }

      const primaryUrl = inputs[0].type === 'url' && inputs[0].url ? inputs[0].url : 'Manual Input';

      onScrapeComplete(allScreenshots, 'image/png');
      onStatus('✓ Data acquired. Beginning AI analysis...');

      const primaryScreenshot = allScreenshots[0];
      const primaryMobileScreenshot = allScreenshots.find(s => s.isMobile);
      const allDesktopScreenshots = allScreenshots.filter(s => !s.isMobile);
      const allDesktopScreenshotsBase64 = allDesktopScreenshots.map(s => s.data).filter(Boolean);

      const analysisExperts: ExpertKey[] = [
        'Strategy Audit expert',
        'UX Audit expert',
        'Product Audit expert',
        'Visual Audit expert',
        'Accessibility Audit expert',
      ];

      const bufferedUpdates: any[] = [];
      const internalOnData = (payload: any) => {
        bufferedUpdates.push(payload);
      };
      const bufferedCallbacks = { ...callbacks, onData: internalOnData };

      // Use p-limit to restrict parallel requests
      // @ts-ignore
      const pLimit = (await import('p-limit')).default;
      const limit = pLimit(2); // Limit to 2 concurrent sections

      const analysisPromises = analysisExperts.map((expertKey) => limit(async () => {
        const expertShortName = expertKey.split(' ')[0].toLowerCase();
        const mode = `analyze-${expertShortName}`;

        const analysisBody = {
          url: primaryUrl,
          screenshotBase64: primaryScreenshot?.data,
          allScreenshotsBase64: allDesktopScreenshotsBase64,
          mobileScreenshotBase64: primaryMobileScreenshot?.data,
          liveText: aggregatedLiveText,
          performanceData,
          screenshotMimeType: 'image/png',
          performanceAnalysisError,
          animationData,
          accessibilityData,
          // @ts-ignore
          axeViolations: window.axeViolations,
          // @ts-ignore
          axePasses: window.axePasses,
          // @ts-ignore
          axeIncomplete: window.axeIncomplete,
          // @ts-ignore
          axeInapplicable: window.axeInapplicable,
          mode,
        };

        try {
          await processSingleAnalysisStream(analysisBody, expertKey, bufferedCallbacks, finalReport);
        } catch (error) {
          console.error(`Analysis failed for ${expertKey}:`, error);
          onStatus(`⚠️ ${expertKey.split(' ')[0]} analysis skipped due to error.`);
        }
      }));

      onStatus('Running comprehensive AI analysis on all sections (throttled)...');
      await Promise.all(analysisPromises);

      // Contextual Ranking
      onStatus('Analyzing issues for strategic impact...');
      try {
        const contextualRankResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify({ report: finalReport, mode: 'contextual-rank' }),
        });

        if (contextualRankResponse.ok) {
          const contextualIssues = await contextualRankResponse.json();
          internalOnData({ key: 'Top5ContextualIssues', data: contextualIssues });
        }
      } catch (e) {
        console.warn(e);
      }

      onStatus('Compiling final report view...');
      bufferedUpdates.forEach(payload => {
        onData(payload);
      });

      onStatus('✓ All analyses complete. Finalizing report...');

      const finalizeResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          report: finalReport,
          screenshots: allScreenshots,
          url: primaryUrl,
          mode: 'finalize'
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error("Finalize failed");
      }

      const finalData = await finalizeResponse.json();
      onComplete(finalData);
    }

  } catch (e) {
    console.error('Audit process failed:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    onError(errorMessage);
  } finally {
    onClose();
  }
};
