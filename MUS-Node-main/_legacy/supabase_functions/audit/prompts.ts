import { Type } from "npm:@google/genai@^1.21.0";

export const getWebsiteContextPrompt = (
    url: string, 
    performanceData?: Record<string, string> | null, 
    performanceAnalysisError?: string | null, 
    animationData?: any[] | null,
    accessibilityData?: Record<string, any> | null,
    isMultiPage: boolean = false
) => {
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
${animationData.map((item: string) => `- ${item}`).join('\n')}
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

const BASE_SYSTEM_INSTRUCTION = `You are a world-class website auditor. Your task is to conduct a comprehensive audit of the provided website based on its screenshot(s) and text content. You must fill out all sections in the requested nested JSON schema completely and critically.

GIVE A VERY CRITICAL RATING:
Use a rating scale from 1 to 10 for all scored parameters, where 1 represents poor quality and 10 is excellent.
- 1-4 (Poor/Needs Improvement): Major flaws.
- 5-6 (Average): Functional but uninspired.
- 7-8 (Good): Well-executed with minor issues.
- 9-10 (Excellent): Outstanding.

MANDATORY INSTRUCTIONS FOR ALL AUDITS:
1.  **Infer Context**: First, analyze the provided content to infer the website's type (e.g., SaaS, E-commerce) and primary purpose. This context must guide your entire audit.
2.  **Dynamic Parameter Relevance**: For each parameter, determine if it is relevant. If NOT APPLICABLE (e.g., 'CheckoutPaymentFlow' for a portfolio), you MUST assign a \`Score\` of \`0\` and the \`Analysis\` must briefly explain why (e.g., 'Not applicable for a non-e-commerce site.').
3.  **Score Calculation**: When calculating each \`SectionScore\` and \`CategoryScore\`, you MUST exclude any parameters with a \`Score\` of \`0\` from the average.
4.  **Complete All Fields**: For all applicable parameters (score 1-10), you must provide a response for every single field in the schema.
5.  **Mandatory Citations**: For EVERY applicable 'ScoredParameter' and 'CriticalIssue', provide at least one full, descriptive sentence as a citation from the website's content that supports your analysis.
6.  **Be Concise**: Keep \`Analysis\`, \`Recommendation\`, and \`KeyFinding\` to a maximum of 3 sentences to be direct and actionable.
7.  **Critical Issues**: You MUST populate 'Analysis', 'Confidence', and 'KeyFinding' for every issue in the 'Top 5' lists.`;


export const getStrategySystemInstruction = () => `
  ### Role ###
  You are an advanced UX auditor and domain analyst. Your task is to analyze the provided text to determine strategic insights. Your analysis MUST be based exclusively on the provided "Live Website Text Content". Do not use your internal knowledge of the website.

  ### Analysis Guidelines ###
  - **Purpose Analysis**: CRITICAL - Focus strictly on the **purpose of the website itself**, not the broader mission of the company. Identify the primary actions the website wants users to take (e.g., "to sell products directly to consumers," "to generate leads for a service," "to inform readers about a specific topic"). The "Key objectives" should be a concise summary (2-3 sentences) of the specific goals that support the primary purpose.

  ### Persona Generation ###
  After completing the strategic analysis (Domain, Purpose, Target Audience), you MUST generate 3 realistic user personas based on your findings. Fill out all fields for each persona. For each persona, keep the \`UserNeedsBehavior\` and \`PainPointOpportunity\` descriptions to 3-4 concise sentences to ensure the report can be saved successfully.
`;

export const getUXSystemInstruction = (mobileCaptureSucceeded: boolean, isMultiPage: boolean) => {
    let specificInstructions = `You are a world-class **UX Auditor**. Your specific task is to evaluate the website's usability and accessibility.\n- Your analysis for 'ScreenReaderCompatibility' MUST reference the "Automated Accessibility Check" data.`;

    if (isMultiPage) {
        specificInstructions += `\n- **Multi-Page Context**: This is a multi-page audit. Identify patterns and inconsistencies across pages.`;
    }
    if (!mobileCaptureSucceeded) {
        specificInstructions += `\n- **Mobile Screenshot**: The mobile screenshot capture FAILED. Base your mobile analysis on an inference from the desktop view and explicitly state that the mobile view was not available.`;
    }
    
    return `${BASE_SYSTEM_INSTRUCTION}\n\n${specificInstructions}`;
};

export const getProductSystemInstruction = (isMultiPage: boolean) => {
    let specificInstructions = `You are a world-class **Product Auditor**. Your specific task is to evaluate the website's market fit, user engagement, and conversion effectiveness.`;
    
    if (isMultiPage) {
        specificInstructions += `\n- **Multi-Page Context**: This is a multi-page audit. Identify patterns and inconsistencies across pages.`;
    }

    return `${BASE_SYSTEM_INSTRUCTION}\n\n${specificInstructions}`;
};

export const getVisualSystemInstruction = (mobileCaptureSucceeded: boolean, isMultiPage: boolean) => {
    let specificInstructions = `You are a world-class **Visual Designer**. Your specific task is to evaluate the website's aesthetics, branding, and responsiveness.\n- Your analysis for 'ActualLoadTimeAndCoreWebVitals' MUST directly reference the provided performance metrics. If data could not be retrieved, you MUST assign a \`Score\` of \`0\` and the \`Analysis\` must state that the check failed (e.g., 'Not applicable. The automated performance check failed to retrieve data.').`;

    if (isMultiPage) {
        specificInstructions += `\n- **Multi-Page Context**: This is a multi-page audit. Identify patterns and inconsistencies across pages.`;
    }
    if (mobileCaptureSucceeded) {
        specificInstructions += `\n- You MUST compare the desktop and mobile screenshots for the 'MobileOptimization' analysis.`;
    } else {
        specificInstructions += `\n- **Mobile Screenshot**: The mobile screenshot capture FAILED. For 'MobileOptimization', base your analysis on an inference from the desktop view and explicitly state that the mobile view was not available.`;
    }

    return `${BASE_SYSTEM_INSTRUCTION}\n\n${specificInstructions}`;
};


export const getSchemas = () => {
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
    required: ['DomainAnalysis', 'PurposeAnalysis', 'TargetAudience', 'UserPersonas']
  };

  return { uxAuditSchema, productAuditSchema, visualAuditSchema, strategyAuditSchema, criticalIssueSchema };
};