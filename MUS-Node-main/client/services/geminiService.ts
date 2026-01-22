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
    let primaryDataResult: any = null;
    let competitorDataResult: any = null;

    // Helper: Process a list of inputs (reusing logic from standard mode essentially)
    const processInputList = async (inputList: AuditInput[], labelPrefix: string) => {
      const screenshots: Screenshot[] = [];
      let liveText = "";

      for (let i = 0; i < inputList.length; i++) {
        const input = inputList[i];
        const label = `${labelPrefix} ${i + 1}`;
        onStatus(`Processing ${label}...`);

        try {
          if (input.type === 'upload' && (input.file || (input.filesData && input.filesData.length > 0) || input.files?.length)) {
            // HANDLE FILE (Legacy or Multi)
            // Note: App.tsx pre-converts keys to filesData/fileData. 
            const dataArray = input.filesData || (input.fileData ? [input.fileData] : []);
            // Check if we need to convert fresh files (should be done in App.tsx but safety check)
            if (dataArray.length === 0 && (input.files || input.file)) {
              const rawFiles = input.files || [input.file!];
              for (const f of rawFiles) {
                if (f) dataArray.push(await fileToBase64(f));
              }
            }

            for (const base64 of dataArray) {
              screenshots.push({
                path: 'upload',
                data: base64,
                isMobile: false
              });
            }
          } else if (input.type === 'url' && input.url) {
            // HANDLE URL
            onStatus(`Scraping ${label}: ${input.url}...`);
            // Desktop
            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: commonHeaders,
              body: JSON.stringify({ url: input.url, isMobile: false, isFirstPage: screenshots.length === 0, mode: 'scrape-single-page' }),
            });
            if (!response.ok) throw new Error(`Failed to scrape ${input.url}`);
            const result = await response.json();
            screenshots.push(result.screenshot);
            if (!result.screenshot.isMobile) {
              liveText += `\n\n--- CONTENT FROM ${input.url} ---\n${result.liveText || '(No text found)'}\n\n`;
            }

            // Mobile (Optional: Only if requested or for first URL? Standard mode does both for first URL. 
            // For competitor mode, let's skip mobile scrape to save time/tokens unless we really want it. 
            // Let's stick to desktop for multi-input competitor to reduce overload risk as requested).
          }
        } catch (e) {
          console.error(`Failed to process ${label}`, e);
          onStatus(`⚠️ Failed to process ${label}. Skipping.`);
        }
      }
      return { screenshots, liveText };
    };

    if (auditMode === 'competitor') {
      const primaryInputs = inputs.filter(i => i.role === 'primary');
      const competitorInputs = inputs.filter(i => i.role === 'competitor');

      if (primaryInputs.length === 0 || competitorInputs.length === 0) {
        // Fallback for legacy calls without roles? Assume first is primary, rest competitor?
        // No, App.tsx now guarantees roles.
        throw new Error("Competitor analysis requires at least one Primary and one Competitor input.");
      }

      // ACQUIRE PRIMARY
      primaryDataResult = await processInputList(primaryInputs, "Primary Site");

      // ACQUIRE COMPETITOR
      competitorDataResult = await processInputList(competitorInputs, "Competitor Site");

      if (primaryDataResult.screenshots.length === 0 || competitorDataResult.screenshots.length === 0) {
        throw new Error("Failed to acquire valid data for comparison.");
      }

      allScreenshots.push(...primaryDataResult.screenshots);
      allScreenshots.push(...competitorDataResult.screenshots);

      onScrapeComplete(allScreenshots, 'image/png');
      onStatus('✓ Input data acquired. Beginning Comparative Analysis...');

      // --- RUN COMPETITOR ANALYSIS ---
      // Pass arrays to backend
      const analysisBody = {
        mode: 'analyze-competitor',
        primaryUrl: primaryInputs[0].url || 'Primary Inputs',
        primaryScreenshotsBase64: primaryDataResult.screenshots.map((s: Screenshot) => s.data), // Array
        primaryLiveText: primaryDataResult.liveText,
        competitorUrl: competitorInputs[0].url || 'Competitor Inputs',
        competitorScreenshotsBase64: competitorDataResult.screenshots.map((s: Screenshot) => s.data), // Array
        competitorLiveText: competitorDataResult.liveText,
        screenshotMimeType: 'image/png'
      };

      await processSingleAnalysisStream(analysisBody, 'Competitor Analysis expert', callbacks, finalReport);

      onStatus('✓ Analysis complete. Finalizing...');
      onComplete({
        auditId: 'temp-competitor-id',
        report: finalReport,
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
