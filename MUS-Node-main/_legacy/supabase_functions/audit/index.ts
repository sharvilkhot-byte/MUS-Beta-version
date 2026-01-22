import { createClient } from "npm:@supabase/supabase-js@^2.45.2";
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "npm:@google/genai@^1.21.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encode, decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

declare const Deno: any;

// --- START PROMPTS (Refactored for Lazy Loading) ---
const getWebsiteContextPrompt = (url: string, performanceData: any, performanceAnalysisError: any, animationData: any, accessibilityData: any, isMultiPage = false) => {
  let prompt = `
### Website Context ###
- Website URL: ${url}
${isMultiPage ? '- Note: This audit is based on a crawl of multiple pages. The provided text content is aggregated from all crawled pages. Look for site-wide patterns.' : ''}
`;
  if (performanceData || performanceAnalysisError) {
    prompt += `
### Core Web Vitals & Performance Metrics (Lab Data for Homepage) ###
`;
    if (performanceData) {
      prompt += `
- Largest Contentful Paint: ${performanceData.lcp}
- Cumulative Layout Shift: ${performanceData.cls}
- Total Blocking Time: ${performanceData.tbt}
- First Contentful Paint: ${performanceData.fcp}
- Time to Interactive: ${performanceData.tti}
- Speed Index: ${performanceData.si}
`;
    } else {
      prompt += `IMPORTANT: Data could not be retrieved from the PageSpeed Insights API.\n`;
      if (performanceAnalysisError) {
        prompt += `Reason: ${performanceAnalysisError}\n`;
      } else {
        prompt += `The service may have been unavailable, the URL may not be publicly accessible for analysis, or it may be a single-page application that requires more interaction to load fully.\n`;
      }
    }
  }
  if (animationData) {
    prompt += `
### Discovered CSS Animations & Transitions (from Homepage) ###
`;
    if (animationData.length > 0) {
      prompt += `The following elements were found to have CSS properties suggesting motion. Analyze these to infer the quality and purpose of the site's animations.
${animationData.map((item: any) => `- ${item}`).join('\n')}
`;
    } else {
      prompt += `No significant CSS animations or transitions were automatically detected on the page. This analysis will be based on the static screenshot.
`;
    }
  }
  if (accessibilityData) {
    prompt += `
### Automated Accessibility Check (from Homepage) ###
This data was extracted from the page's HTML and indicates potential accessibility issues.
- Images without descriptive alt text: ${accessibilityData.imagesMissingAlt}
- Form inputs without corresponding labels: ${accessibilityData.inputsMissingLabels}
- Presence of semantic HTML5 elements (main, nav, header, etc.): ${accessibilityData.hasSemanticElements ? 'Yes' : 'No'}
- Presence of ARIA attributes (roles, properties): ${accessibilityData.hasAriaAttributes ? 'Yes' : 'No'}
`;
  }
  return prompt;
};

const getIndividualExpertSystemInstruction = (expertRole: string, mobileCaptureSucceeded: boolean, isMultiPage: boolean, hasMultipleScreenshots: boolean) => {
  const instructions = [
    "**Infer Context**: Your first step is to analyze the provided text and screenshots to infer the website's type (e.g., SaaS, E-commerce, Portfolio) and primary purpose. Use this inferred context to guide the rest of your audit.",
    "**Dynamic Parameter Relevance**: First, analyze the website context. For each parameter in the schema, determine if it is relevant. If a parameter is NOT APPLICABLE (e.g., 'CheckoutPaymentFlow' for a portfolio site), you MUST assign it a `Score` of `0` and the `Analysis` field MUST briefly explain why it's not relevant (e.g., 'Not applicable as this is not an e-commerce site.'). Do not omit the parameter object.",
    "**Score Calculation**: When calculating each `SectionScore` and the final `CategoryScore`, you MUST exclude any parameters with a `Score` of `0` from the average. The average should only be based on relevant, scored parameters (scores 1-10). Do not round these averages; return them as numbers with decimal places if necessary.",
    "**Complete All Relevant Fields**: For all applicable parameters (score 1-10), you must provide a response for every single field in the schema. For non-applicable parameters (score 0), you only need to provide `ParameterName`, `Score`, and `Analysis`.",
    "**Confidence Level**: For each applicable parameter, provide a `Confidence` level ('high', 'medium', 'low') indicating your certainty.",
    "**Contextual Analysis**: For `KeyFinding` and `Recommendation`, your response MUST be contextual to the score. High scores (>7) should focus on strengths; low scores (<=7) must identify the issue and provide an actionable suggestion.",
    "**Mandatory Citations**: For every applicable 'ScoredParameter' and 'CriticalIssue', provide at least one full, descriptive sentence as a citation, explaining the evidence from the website that supports your analysis.",
    "**Be Specific**: Your recommendations must be actionable and directly related to the website's content and design.",
    "**Be Concise**: To ensure the report can be saved, keep your text for `Analysis`, `Recommendation`, and `KeyFinding` to a maximum of 3 sentences. Be direct and actionable.",
    "**Critical Issues Details**: For the 'Top 5 Critical Issues' list, you MUST populate the 'Analysis', 'Confidence', and 'KeyFinding' fields for every issue. Do not leave them empty. The 'Analysis' should briefly explain why this is a critical issue."
  ];
  
  if (hasMultipleScreenshots) {
    instructions.push("**Multiple Screenshot Analysis**: You are receiving multiple screenshots. The FIRST screenshot is from the live website URL. Subsequent screenshots are user-uploaded images that may show additional pages, states, or specific issues the user wants analyzed. Your analysis MUST synthesize findings across ALL screenshots. When citing evidence, specify which screenshot you're referencing (e.g., 'In the live website screenshot...' or 'In the uploaded screenshot...'). Look for consistency and discrepancies across all provided images.");
  }
  if (isMultiPage) {
    instructions.push("**Holistic, Site-Wide Analysis**: You have been provided with aggregated text from multiple pages of the site. Your audit should be holistic. Identify patterns and inconsistencies across pages. For citations, you MUST specify the page if the evidence is from a specific one (e.g., 'Citation: On the /about page, the header font differs from the homepage.'). If the issue is site-wide, state that (e.g., 'Citation: The footer is missing a privacy policy link on all analyzed pages.').");
  }
  if (expertRole === 'UX Auditor') {
    instructions.push("**Analyze Accessibility Data**: Your analysis for 'ScreenReaderCompatibility' MUST directly reference the \"Automated Accessibility Check\" data. A high number of issues (e.g., missing alt text, missing labels) should result in a lower score. Your citation must refer to this data, for example: \"The automated check found several images missing alt text, which is a critical issue for screen reader users.\"", "**Evaluate Error Prevention**: For the 'HelpUsersRecoverFromErrors' parameter, your analysis should focus on *error prevention* rather than observed errors, since none will be visible. Analyze the design of forms and interactive elements for features that prevent mistakes, such as clear labels, helpful placeholder text, and visible indicators for required fields. A lack of these features indicates poor error prevention and should result in a lower score. Your citation must describe a specific form or input element, e.g., \"The contact form's input fields lack clear labels or placeholders, making it easy for users to make mistakes.\"");
  }
  if (expertRole === 'Product Auditor' && isMultiPage) {
    instructions.push("**Leverage Multi-Page Context**: Since you have text from multiple pages, pay close attention to the user journey. Look for clear paths to conversion, consistent value propositions across pages (e.g., from homepage to a features page), and evidence of user feedback mechanisms (like testimonials or review sections).");
  }
  if (expertRole === 'Visual Designer') {
    instructions.push("**Analyze Performance Data**: Your analysis for the 'ActualLoadTimeAndCoreWebVitals' parameter MUST directly reference the provided performance metrics. If performance metrics are present: Explain their impact on user experience and brand perception, and score them critically based on standard web performance benchmarks (e.g., LCP under 2.5s is good). Your citation should describe the overall performance feel. If the prompt explicitly states that performance data could not be retrieved: You MUST assign a score of 0. Your analysis MUST state that the automated check failed. If a \"Reason\" for the failure is provided in the context, you MUST incorporate that reason into your analysis. CRITICAL EXCEPTION: In this specific case, the 'Citations' array for 'ActualLoadTimeAndCoreWebVitals' MUST be empty (e.g., `\"Citations\": []`).", "**Multi-Modal Animation Analysis**: You are receiving three forms of evidence: a static screenshot, a full text dump, and a list of elements with CSS animations. The screenshot was taken after a controlled scrolling process designed to trigger content. Your task is to synthesize this data. **Analyze discrepancies**: If you see evidence of a section in the text dump or animation data that is NOT fully rendered in the screenshot, you MUST flag this as a potential failure of the lazy-loading or on-scroll animation. Acknowledge that the *motion itself* isn't visible, but the final *result* is. A complete, well-aligned screenshot suggests success. A visually incomplete or broken layout suggests failure. Your citation must justify your conclusion, e.g., 'The text dump mentions a \"customer reviews\" section, but it appears as an empty space in the screenshot, indicating a likely on-scroll loading failure.'");
    if (mobileCaptureSucceeded) {
      instructions.push("**Compare Mobile vs. Desktop**: You will be provided with TWO screenshots: a full-page desktop view and a full-page mobile screenshot. Your analysis for the 'MobileOptimization' parameter MUST explicitly compare these two images. Comment on layout changes, element scaling, readability, and touch-target suitability visible in the full mobile view. Your citation must reference a specific observation from the mobile screenshot.");
    } else {
      instructions.push("**Mobile Analysis Inferred**: The automated capture of the mobile screenshot FAILED. You must base your analysis for the 'MobileOptimization' parameter on an *inferential* review of the desktop screenshot only. Look for signs of a responsive design (e.g., fluid layouts, use of relative units, lack of fixed-width elements). Your analysis must explicitly state that the mobile screenshot was not available. Your citation should reflect this, for example: \"Based on the fluid layout seen on desktop, the site appears to be responsive, but this could not be visually confirmed.\"");
    }
  }
  const numberedInstructions = instructions.map((inst, index) => `${index + 1}. ${inst}`).join('\n');
  return `
You are an expert ${expertRole}. Your task is to conduct a comprehensive audit of the provided website based on its screenshot(s) and text content. You must fill out all sections in the requested JSON schema completely and critically.

GIVE A VERY CRITICAL RATING:
Use a rating scale from 1 to 10 for all scored parameters, where 1 represents poor quality and 10 is excellent. Follow this guideline:
- 1-4 (Poor/Needs Improvement): Major flaws requiring significant changes.
- 5-6 (Average): Functional but uninspired, with clear room for improvement.
- 7-8 (Good): Well-executed with only minor issues.
- 9-10 (Excellent): Outstanding, meets the highest standards.

MANDATORY INSTRUCTIONS:
${numberedInstructions}
`;
};

const getStrategySystemInstruction = () => `
  ### Role ###
  You are an advanced UX auditor and domain analyst. Your task is to analyze the provided text to determine strategic insights. Your analysis MUST be based exclusively on the provided "Live Website Text Content". Do not use your internal knowledge of the website.

  ### Analysis Guidelines ###
  - **Purpose Analysis**: CRITICAL - Focus strictly on the **purpose of the website itself**, not the broader mission of the company. Identify the primary actions the website wants users to take (e.g., "to sell products directly to consumers," "to generate leads for a service," "to inform readers about a specific topic"). The "Key objectives" should be a concise summary (2-3 sentences) of the specific goals that support the primary purpose.
  - **Executive Summary (CRITICAL)**: Write an electrical, high-impact audit takeaway. **LENGTH CONSTRAINT**: You must write EQUIVALENT TO 5-6 LINES of text (approx. 80-100 words). **TONE**: Imagine you are a world-class consultant giving the "bottom line" to a CEO over coffee. Be conversational but razor-sharp. **BAN THESE WORDS**: "effectively," "leveraging," "positions itself," "aligns with," "showcases." **DO NOT** describe the site. **DO**: Jump straight into the insight. Example: "Your conversion path is broken because X is missing. While your visuals are strong, they don't solve the user's need for Y..." Make it sound human, specific, and impossible to ignore.,

  ### Persona Generation ###
  After completing the strategic analysis (Domain, Purpose, Target Audience), you MUST generate 3 realistic user personas based on your findings. Fill out all fields for each persona. For each persona, keep the \`UserNeedsBehavior\` and \`PainPointOpportunity\` descriptions to 3-4 concise sentences to ensure the report can be saved successfully.
`;

const getSchemas = () => {
  const criticalIssueSchema = {
    type: Type.OBJECT,
    properties: {
      Issue: { type: Type.STRING },
      ImpactLevel: { type: Type.STRING },
      Score: { type: Type.INTEGER },
      Recommendation: { type: Type.STRING },
      Citations: { type: Type.ARRAY, items: { type: Type.STRING } },
      source: { type: Type.STRING },
      Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      Analysis: { type: Type.STRING },
      KeyFinding: { type: Type.STRING }
    },
    required: ['Issue', 'ImpactLevel', 'Score', 'Recommendation', 'Citations', 'source', 'Confidence', 'Analysis', 'KeyFinding']
  };

  const criticalIssueSchemaForExperts = {
    type: Type.OBJECT,
    properties: {
      Issue: { type: Type.STRING },
      ImpactLevel: { type: Type.STRING },
      Score: { type: Type.INTEGER },
      Recommendation: { type: Type.STRING },
      Citations: { type: Type.ARRAY, items: { type: Type.STRING } },
      Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      Analysis: { type: Type.STRING },
      KeyFinding: { type: Type.STRING }
    },
    required: ['Issue', 'ImpactLevel', 'Score', 'Recommendation', 'Citations', 'Confidence', 'Analysis', 'KeyFinding']
  };

  const createScoredSectionSchema = (parameterKeys: string[]) => {
    return {
      type: Type.OBJECT,
      properties: {
        SectionScore: { type: Type.NUMBER },
        Parameters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ParameterName: { type: Type.STRING, enum: parameterKeys },
              Score: { type: Type.INTEGER },
              ImpactLevel: { type: Type.STRING },
              Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              Analysis: { type: Type.STRING },
              Recommendation: { type: Type.STRING },
              Citations: { type: Type.ARRAY, items: { type: Type.STRING } },
              KeyFinding: { type: Type.STRING }
            },
            required: ['ParameterName', 'Score', 'ImpactLevel', 'Confidence', 'Analysis', 'Citations']
          },
        }
      },
      required: ['SectionScore', 'Parameters']
    };
  };

  const uxAuditSchema = {
    type: Type.OBJECT,
    properties: {
      CategoryScore: { type: Type.NUMBER },
      Top5CriticalUXIssues: { type: Type.ARRAY, items: criticalIssueSchemaForExperts },
      UsabilityHeuristics: createScoredSectionSchema([
        'VisibilityOfSystemStatus', 'MatchBetweenSystemAndRealWorld', 'UserControlAndFreedom',
        'ConsistencyAndStandards', 'ErrorPrevention', 'RecognitionVsRecall',
        'FlexibilityAndEfficiencyOfUse', 'AestheticAndMinimalistDesign',
        'HelpUsersRecoverFromErrors', 'HelpAndDocumentation'
      ]),
      UsabilityMetrics: createScoredSectionSchema([
        'TaskCompletionTime', 'ClickDepth', 'NavigationClarity', 'CognitiveLoad', 'ErrorRate'
      ]),
      AccessibilityCompliance: createScoredSectionSchema([
        'ContrastAndReadability', 'KeyboardNavigation', 'ScreenReaderCompatibility', 'TouchTargetSize'
      ]),
      OverallRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['CategoryScore', 'Top5CriticalUXIssues', 'UsabilityHeuristics', 'UsabilityMetrics', 'AccessibilityCompliance', 'OverallRecommendations']
  };

  const productAuditSchema = {
    type: Type.OBJECT,
    properties: {
      CategoryScore: { type: Type.NUMBER },
      Top5CriticalProductIssues: { type: Type.ARRAY, items: criticalIssueSchemaForExperts },
      MarketFitAndBusinessAlignment: createScoredSectionSchema([
        'ClearValueProposition', 'OnboardingEffectiveness', 'FeatureDiscoverability', 'MonetizationModelClarity'
      ]),
      UserRetentionAndEngagement: createScoredSectionSchema([
        'GamificationIncentives', 'PersonalizationAdaptability', 'FrictionPoints', 'UserFeedbackIteration'
      ]),
      ConversionOptimization: createScoredSectionSchema([
        'CTAClarityPlacement', 'CheckoutPaymentFlow', 'LeadGenerationForms', 'MicrocopyMessaging'
      ]),
      OverallRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['CategoryScore', 'Top5CriticalProductIssues', 'MarketFitAndBusinessAlignment', 'UserRetentionAndEngagement', 'ConversionOptimization', 'OverallRecommendations']
  };

  const visualAuditSchema = {
    type: Type.OBJECT,
    properties: {
      CategoryScore: { type: Type.NUMBER },
      Top5CriticalVisualIssues: { type: Type.ARRAY, items: criticalIssueSchemaForExperts },
      UIConsistencyAndBranding: createScoredSectionSchema([
        'ColorPaletteContrast', 'TypographyReadability', 'IconographySymbolism', 'SpacingAlignment'
      ]),
      AestheticAndEmotionalAppeal: createScoredSectionSchema([
        'VisualHierarchy', 'ImageryIllustrations', 'AnimationMotionUI', 'WhitespaceMinimalism'
      ]),
      ResponsivenessAndAdaptability: createScoredSectionSchema([
        'MobileOptimization', 'DarkModeTheming', 'ActualLoadTimeAndCoreWebVitals'
      ]),
      OverallRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['CategoryScore', 'Top5CriticalVisualIssues', 'UIConsistencyAndBranding', 'AestheticAndEmotionalAppeal', 'ResponsivenessAndAdaptability', 'OverallRecommendations']
  };

  const strategyAuditSchema = {
    type: Type.OBJECT,
    properties: {
      ExecutiveSummary: { type: Type.STRING }, // NEW FIELD
      DomainAnalysis: {
        type: Type.OBJECT,
        properties: {
          Items: { type: Type.ARRAY, items: { type: Type.STRING } },
          Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
        },
        required: ["Items", "Confidence"]
      },
      PurposeAnalysis: {
        type: Type.OBJECT,
        properties: {
          PrimaryPurpose: { type: Type.ARRAY, items: { type: Type.STRING } },
          KeyObjectives: { type: Type.STRING },
          Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
        },
        required: ["PrimaryPurpose", "KeyObjectives", "Confidence"]
      },
      TargetAudience: {
        type: Type.OBJECT,
        properties: {
          WebsiteType: { type: Type.STRING },
          Primary: { type: Type.ARRAY, items: { type: Type.STRING } },
          DemographicsPsychographics: { type: Type.STRING },
          MarketSegmentation: { type: Type.STRING },
          Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
        },
        required: ["WebsiteType", "Primary", "DemographicsPsychographics", "MarketSegmentation", "Confidence"]
      },
      UserPersonas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            Name: { type: Type.STRING },
            Age: { type: Type.INTEGER },
            Location: { type: Type.STRING },
            Occupation: { type: Type.STRING },
            UserNeedsBehavior: { type: Type.STRING },
            PainPointOpportunity: { type: Type.STRING }
          },
          required: ['Name', 'Age', 'Location', 'Occupation', 'UserNeedsBehavior', 'PainPointOpportunity']
        }
      }
    },
    required: ['ExecutiveSummary', 'DomainAnalysis', 'PurposeAnalysis', 'TargetAudience', 'UserPersonas']
  };

  return { uxAuditSchema, productAuditSchema, visualAuditSchema, strategyAuditSchema, criticalIssueSchema };
};

// --- END SCHEMAS ---

const COMMON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Helper to extract specific wait time from error messages
function getRetryDelay(error: any) {
  const text = error.message || JSON.stringify(error);
  // Look for "retry after X seconds" or standard headers in text representation
  const match = text.match(/retry in (\d+(\.\d+)?)s/i) || text.match(/retry-after.*?(\d+)/i);
  if (match) {
    return parseFloat(match[1]) * 1000;
  }
  return null;
}
async function retryWithBackoff(operation: any, retries = 10, initialDelay = 1000, operationName = "AI Operation") {
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      return await operation();
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      // Filter for errors that are worth retrying (Rate Limits or Overloaded servers)
      const isRetriable = msg.includes('503') || msg.includes('429') || msg.includes('overloaded') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('UNAVAILABLE') || msg.includes('Timeout') || msg.includes('internal error');
      if (attempt > retries || !isRetriable) {
        console.error(`${operationName} failed permanently on attempt ${attempt}. Error: ${msg}`);
        throw error;
      }

      // SUPABASE RECOMMENDED: Exponential Backoff with Jitter
      const base = initialDelay;
      const max = 60000; // Cap at 60s
      // Calculate retry slot
      const slot = Math.pow(2, attempt - 1);
      const cap = Math.min(max, base * slot);
      // Full Jitter: delay = random_between(0, cap)
      // We ensure at least 'initialDelay' to avoid instant hammering
      let delay = Math.floor(Math.random() * cap);
      if (delay < initialDelay) delay = initialDelay + Math.random() * 1000;

      // Check for specific server instruction (Retry-After)
      const serverDelay = getRetryDelay(error);
      if (serverDelay) {
        delay = serverDelay + 1000; // Add 1s buffer
        console.warn(`${operationName} hit limit. Server requested wait of ${serverDelay / 1000}s.`);
      }

      console.warn(`${operationName} failed (Attempt ${attempt}/${retries}). Retrying in ${delay / 1000}s... Error: ${msg.substring(0, 150)}...`);
      await sleep(delay);
    }
  }
}
const callApi = async (ai: any, systemInstruction: string, contents: string, schema: any, imageBase64Array: string[] = [], mimeType = 'image/png', mobileImageBase64 = null) => {
  const parts = [];
  
  // Add all desktop screenshots (from URL scraping and/or uploads)
  if (imageBase64Array && imageBase64Array.length > 0) {
    for (const imageData of imageBase64Array) {
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType,
            data: imageData
          }
        });
      }
    }
  }
  
  // Add mobile screenshot separately (if available)
  if (mobileImageBase64) {
    parts.push({
      inlineData: {
        mimeType,
        data: mobileImageBase64
      }
    });
  }
  
  parts.push({
    text: contents
  });
  
  const requestContents = (imageBase64Array && imageBase64Array.length > 0) || mobileImageBase64 ? {
    parts
  } : contents;
  const apiCall = () => ai.models.generateContent({
    model: "gemini-2.5-flash", // Using user-provided working model
    contents: requestContents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    }
  });
  // Increased retries to 10 significantly
  const response = await retryWithBackoff(apiCall, 10, 2000, "Generate Content");
  try {
    const text = response.text;
    if (!text) throw new Error("Response text is undefined");
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse AI response as JSON.", e);
    const text = response.text;
    throw new Error(`The AI model returned a non-JSON response. Raw output: \n---\n${text ? text.trim() : 'undefined'}\n---`);
  }
};
const handleSingleAnalysisStream = (expertKey: string, analysisFn: any) => {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const writeStream = (chunk: any) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        } catch (e) {
          console.warn("Stream closed before write.", e);
        }
      };
      try {
        writeStream({
          type: 'status',
          message: `Running ${expertKey.replace(' expert', '')} analysis...`
        });
        const data = await analysisFn();
        if (!data) {
          throw new Error("The AI model returned an empty or invalid response for this audit section.");
        }
        writeStream({
          type: 'data',
          payload: {
            key: expertKey,
            data
          }
        });
        writeStream({
          type: 'status',
          message: `✓ ${expertKey.replace(' expert', '')} analysis complete.`
        });
      } catch (error: any) {
        console.error(`Analysis failed for ${expertKey}:`, error);
        const errorMessage = error.stack ? `${error.message}\n${error.stack}` : error.message;
        writeStream({
          type: 'error',
          message: `Error in ${expertKey}: ${errorMessage}`
        });
      } finally {
        controller.close();
      }
    }
  });
};
serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: COMMON_HEADERS
    });
  }
  const apiKey = Deno.env.get("API_KEY");
  const browserEndpoint = Deno.env.get("PUPPETEER_BROWSER_ENDPOINT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !browserEndpoint || !supabaseUrl || !supabaseServiceRoleKey) {
    const missing = [
      !apiKey && 'API_KEY',
      !browserEndpoint && 'PUPPETEER_BROWSER_ENDPOINT',
      !supabaseUrl && 'SUPABASE_URL',
      !supabaseServiceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY'
    ].filter(Boolean).join(', ');
    return new Response(JSON.stringify({
      message: `Missing environment variables in Supabase: ${missing}`
    }), {
      status: 500,
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
  const body = await req.json();
  const { mode } = body;
  const ai = new GoogleGenAI({
    apiKey
  });
  switch (mode) {
    case 'scrape-single-page':
      {
        const { default: puppeteer } = await import("npm:puppeteer-core@^22.12.1");
        const { url, isMobile, isFirstPage } = body;
        let browser;
        try {
          browser = await puppeteer.connect({
            browserWSEndpoint: browserEndpoint
          });
          const pagePath = new URL(url).pathname;
          let page = null;
          try {
            page = await browser.newPage();
            page.setDefaultNavigationTimeout(30000);
            const viewport = isMobile ? {
              width: 390,
              height: 844,
              isMobile: true,
              hasTouch: true
            } : {
              width: 1920,
              height: 1080
            };
            await page.setViewport(viewport);
            await page.goto(url, {
              waitUntil: 'networkidle2',
              timeout: 30000
            });
            // Scroll logic
            await page.evaluate(async () => {
              await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 250;
                const maxScrolls = 40;
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
                }, 100);
              });
            });
            await page.evaluate(() => {
              document.querySelectorAll('*').forEach((el: any) => {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                  el.style.position = 'absolute';
                }
              });
              window.scrollTo(0, 0);
            });
            const screenshotBuffer = await page.screenshot({
              type: 'jpeg',
              quality: 50, // Reduced quality to prevent payload size issues
              fullPage: true
            });
            const screenshot = {
              path: pagePath,
              data: encode(screenshotBuffer),
              isMobile
            };
            const pageData = await page.evaluate((isFirstPageDesktop: boolean) => {
              const text = document.body.innerText;
              let animationData = null;
              let accessibilityData = null;
              if (isFirstPageDesktop) {
                animationData = Array.from(document.querySelectorAll('*')).filter((el: any) => {
                  const style = window.getComputedStyle(el);
                  return style.getPropertyValue('animation-name') !== 'none' || style.getPropertyValue('transition-property') !== 'all' && style.getPropertyValue('transition-property') !== '';
                }).map((el: any) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter((c: any) => c).join('.')}` : ''}`).slice(0, 20);
                accessibilityData = {
                  imagesMissingAlt: Array.from(document.querySelectorAll('img:not([alt])')).length,
                  inputsMissingLabels: Array.from(document.querySelectorAll('input:not([id]), textarea:not([id])')).filter((el: any) => !el.closest('label')).length + Array.from(document.querySelectorAll('input[id], textarea[id]')).filter((el: any) => !document.querySelector(`label[for="${el.id}"]`)).length,
                  hasSemanticElements: !!document.querySelector('main, nav, header, footer, article, section, aside'),
                  hasAriaAttributes: !!document.querySelector('[role], [aria-label], [aria-labelledby], [aria-describedby]')
                };
              }
              return {
                liveText: text,
                animationData,
                accessibilityData
              };
            }, isFirstPage && !isMobile);
            return new Response(JSON.stringify({
              screenshot,
              ...pageData
            }), {
              status: 200,
              headers: {
                ...COMMON_HEADERS,
                'Content-Type': 'application/json'
              }
            });
          } catch (error: any) {
            console.error(`Failed to scrape ${url} (${isMobile ? 'mobile' : 'desktop'}): ${error.message}`);
            throw error;
          } finally {
            if (page) await page.close().catch((e) => console.error("Failed to close page:", e));
          }
        } catch (error: any) {
          console.error("Scraping process failed:", error);
          const errorMessage = error.stack ? `${error.message}\n${error.stack}` : error.message;
          return new Response(JSON.stringify({
            message: `Scraping failed: ${errorMessage}`
          }), {
            status: 500,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        } finally {
          if (browser) await browser.disconnect();
        }
      }
    case 'scrape-performance':
      {
        try {
          const { url } = body;
          const apiKey = Deno.env.get("API_KEY");
          let performanceResult = {
            performanceData: null,
            error: null
          };
          const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&strategy=desktop`;
          const psiResponse = await fetch(psiUrl, {
            signal: AbortSignal.timeout(60000)
          });
          if (!psiResponse.ok) {
            const errorBody = await psiResponse.json();
            performanceResult.error = errorBody?.error?.message || `API Error ${psiResponse.status}`;
          } else {
            const psiData = await psiResponse.json();
            if (psiData.lighthouseResult) {
              const audits = psiData.lighthouseResult.audits;
              performanceResult.performanceData = {
                lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
                cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
                tbt: audits['total-blocking-time']?.displayValue || 'N/A',
                fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
                tti: audits['interactive']?.displayValue || 'N/A',
                si: audits['speed-index']?.displayValue || 'N/A'
              };
            } else {
              performanceResult.error = psiData.error ? psiData.error.message : "Lighthouse returned an empty result.";
            }
          }
          return new Response(JSON.stringify(performanceResult), {
            status: 200,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        } catch (e: any) {
          const error = e.name === 'TimeoutError' ? "Google PageSpeed Insights API timed out after 1 minute." : e.message;
          return new Response(JSON.stringify({
            performanceData: null,
            error
          }), {
            status: 200,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    case 'analyze-ux':
    case 'analyze-product':
    case 'analyze-visual':
    case 'analyze-strategy':
      {
        const schemas = getSchemas();
        const expertMap: any = {
          'analyze-ux': {
            key: 'UX Audit expert',
            role: 'UX Auditor',
            schema: schemas.uxAuditSchema
          },
          'analyze-product': {
            key: 'Product Audit expert',
            role: 'Product Auditor',
            schema: schemas.productAuditSchema
          },
          'analyze-visual': {
            key: 'Visual Audit expert',
            role: 'Visual Designer',
            schema: schemas.visualAuditSchema
          },
          'analyze-strategy': {
            key: 'Strategy Audit expert',
            role: 'Strategy Auditor',
            schema: schemas.strategyAuditSchema
          }
        };
        const expertConfig = expertMap[mode];
        const analysisFn = async () => {
          if (mode === 'analyze-strategy') {
            const { liveText } = body;
            return callApi(ai, getStrategySystemInstruction(), liveText, expertConfig.schema);
          } else {
            const { url, screenshotBase64, allScreenshotsBase64, mobileScreenshotBase64, liveText, performanceData, screenshotMimeType, performanceAnalysisError, animationData, accessibilityData } = body;
            const mobileCaptureSucceeded = !!mobileScreenshotBase64;
            const isMultiPage = liveText.includes("--- START CONTENT FROM");
            
            // Use allScreenshotsBase64 if provided (array of all desktop screenshots), otherwise fallback to single screenshotBase64
            const screenshotsArray = allScreenshotsBase64 || (screenshotBase64 ? [screenshotBase64] : []);
            const hasMultipleScreenshots = screenshotsArray.length > 1;
            
            const systemInstruction = getIndividualExpertSystemInstruction(expertConfig.role, mobileCaptureSucceeded, isMultiPage, hasMultipleScreenshots);
            const contextPrompt = getWebsiteContextPrompt(url, performanceData, performanceAnalysisError, animationData, accessibilityData, isMultiPage);
            const fullContent = `${contextPrompt}\n### Live Website Text Content ###\n${liveText}`;
            return callApi(ai, systemInstruction, fullContent, expertConfig.schema, screenshotsArray, screenshotMimeType, mobileScreenshotBase64);
          }
        };
        const stream = handleSingleAnalysisStream(expertConfig.key, analysisFn);
        return new Response(stream, {
          headers: {
            ...COMMON_HEADERS,
            'Content-Type': 'application/json'
          }
        });
      }
    case 'contextual-rank':
      {
        try {
          const { report } = body;
          const allIssues = [
            ...report['UX Audit expert']?.Top5CriticalUXIssues?.map((i: any) => ({
              ...i,
              source: 'UX Audit'
            })) || [],
            ...report['Product Audit expert']?.Top5CriticalProductIssues?.map((i: any) => ({
              ...i,
              source: 'Product Audit'
            })) || [],
            ...report['Visual Audit expert']?.Top5CriticalVisualIssues?.map((i: any) => ({
              ...i,
              source: 'Visual Design'
            })) || []
          ];
          if (!report['Strategy Audit expert'] || allIssues.length === 0) {
            const impactOrder: any = {
              High: 3,
              Medium: 2,
              Low: 1
            };
            allIssues.sort((a: any, b: any) => impactOrder[b.ImpactLevel] - impactOrder[a.ImpactLevel] || a.Score - b.Score);
            return new Response(JSON.stringify(allIssues.slice(0, 5)), {
              status: 200,
              headers: {
                ...COMMON_HEADERS,
                'Content-Type': 'application/json'
              }
            });
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
          const callContextRank = () => ai.models.generateContent({
            model: "gemini-2.5-flash", // Corrected model name
            contents: contents,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                maxItems: 5,
                items: schemas.criticalIssueSchema
              },
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              ]
            }
          });
          const response = await retryWithBackoff(callContextRank, 10, 2000, "Contextual Rank");
          const text = response.text;
          if (!text) throw new Error("Response text is undefined");
          return new Response(JSON.stringify(JSON.parse(text.trim())), {
            status: 200,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        } catch (error: any) {
          console.error("Contextual ranking failed:", error);
          return new Response(JSON.stringify({
            message: `Contextual ranking failed: ${error.stack ? `${error.message}\n${error.stack}` : error.message}`
          }), {
            status: 500,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    case 'finalize':
      {
        try {
          const { report, screenshots, url } = body;
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
          const auditUUID = crypto.randomUUID();
          const uploadedScreenshots = await Promise.all(screenshots.map(async (screenshot: any, index: number) => {
            if (!screenshot.data) return {
              ...screenshot,
              data: undefined
            };
            const filePath = `public/${auditUUID}/${index}-${screenshot.isMobile ? 'mobile' : 'desktop'}.jpeg`;
            const screenshotBuffer = decode(screenshot.data);
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
          const reportToSave = {
            ...report,
            screenshots: uploadedScreenshots
          };
          const primaryScreenshot = uploadedScreenshots.find((s) => s.url && !s.isMobile);
          const { data: auditRecord, error: insertError } = await supabaseAdmin.from('audits').insert({
            url,
            report_data: reportToSave,
            screenshot_url: primaryScreenshot?.url
          }).select('id').single();
          if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);
          return new Response(JSON.stringify({
            auditId: auditRecord.id,
            screenshotUrl: primaryScreenshot?.url
          }), {
            status: 200,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        } catch (error: any) {
          console.error("Finalization failed:", error);
          return new Response(JSON.stringify({
            message: `Finalization failed: ${error.message}`
          }), {
            status: 500,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    case 'get-audit':
      {
        try {
          const { auditId } = body;
          if (!auditId) return new Response(JSON.stringify({
            message: "auditId is required."
          }), {
            status: 400,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
          const { data, error } = await supabaseAdmin.from('audits').select('report_data, url, screenshot_url').eq('id', auditId).single();
          if (error) throw error;
          if (!data) return new Response(JSON.stringify({
            message: "Audit not found."
          }), {
            status: 404,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
          return new Response(JSON.stringify({
            report: data.report_data,
            url: data.url,
            screenshotUrl: data.screenshot_url
          }), {
            status: 200,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        } catch (error: any) {
          console.error(`Error getting audit ${body.auditId}:`, error);
          return new Response(JSON.stringify({
            message: `Get audit failed: ${error.message}`
          }), {
            status: 500,
            headers: {
              ...COMMON_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    default:
      return new Response(JSON.stringify({
        message: "Invalid mode specified."
      }), {
        status: 400,
        headers: {
          ...COMMON_HEADERS,
          'Content-Type': 'application/json'
        }
      });
  }
});
