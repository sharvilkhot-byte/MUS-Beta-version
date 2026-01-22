
import { Type } from "@google/genai";

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
2.  **Dynamic Parameter Relevance**: For each parameter, determine if it is relevant. If NOT APPLICABLE (e.g., 'CheckoutPaymentFlow' for a portfolio), you MUST assign it a \`Score\` of \`0\` and the \`Analysis\` must briefly explain why (e.g., 'Not applicable for a non-e-commerce site.').
3.  **Score Calculation**: When calculating each \`SectionScore\` and \`CategoryScore\`, you MUST exclude any parameters with a \`Score\` of \`0\` from the average.
4.  **Complete All Fields**: For all applicable parameters (score 1-10), you must provide a response for every single field in the schema.
5.  **Mandatory Citations**: For EVERY applicable 'ScoredParameter' and 'CriticalIssue', provide at least one full, descriptive sentence as a citation from the website's content that supports your analysis.
6.  **Be Concise**: Keep \`Analysis\`, \`Recommendation\`, and \`KeyFinding\` to a maximum of 3 sentences to be direct and actionable.
7.  **Critical Issues**: You MUST populate 'Analysis', 'Confidence', and 'KeyFinding' for every issue in the 'Top 5' lists.`;


export const getStrategySystemInstruction = () => `
  ### Role ###
  You are an advanced UX auditor and domain analyst. Your task is to analyze the provided text to determine strategic insights. Your analysis MUST be based exclusively on the provided "Live Website Text Content". Do not use your internal knowledge of the website.

  ### Analysis Guidelines ###
  - **Executive Summary (MANDATORY)**: You MUST produce a field called 'ExecutiveSummary' in the root of your JSON response. This should be a 7-8 line "Audit Diagnosis" structured exactly as follows:
    
    WHAT IS WORKING: [Point 1], [Point 2] (Citation: "[Quote]")
    WHAT IS NOT WORKING: [Point 1], [Point 2] (Citation: "[Quote]")

    **STRICT RULES**:
    1. **NO INTRODUCTIONS**: Jump straight into the points.
    2. **LENGTH**: Must stay within 7-8 lines total. Be concise but detailed enough to fill the space.
    3. **CITATIONS**: You must strictly provide a brief citation from the text for every point.
    4. **FORBIDDEN WORDS**: Do NOT use the words "website", "site", "platform", "app", or "portal". Valid subjects are: "The user experience", "The interface", "Navigation", "Visual hierarchy", "Content strategy", "Performance".
    
    Example: "WHAT IS WORKING: Clear value proposition in hero section (Citation: 'Automate your workflow...'), consistent color palette (Citation: 'Primary blue #007Bz'). WHAT IS NOT WORKING: Mobile navigation is broken (Citation: 'Menu toggle fails'), low contrast on footer links (Citation: 'Gray text on black background')."
  - **Purpose Analysis**: CRITICAL - Focus strictly on the **purpose of the website itself**, not the broader mission of the company. Identify the primary actions the website wants users to take (e.g., "to sell products directly to consumers," "to generate leads for a service," "to inform readers about a specific topic"). The "Key objectives" should be a concise summary (2-3 sentences) of the specific goals that support the primary purpose.

  ### Persona Generation ###
  After completing the strategic analysis (Domain, Purpose, Target Audience), you MUST generate 3 realistic user personas based on your findings. Fill out all fields for each persona. For each persona, keep the \`UserNeedsBehavior\` and \`PainPointOpportunity\` descriptions to 3-4 concise sentences to ensure the report can be saved successfully.

  ### Scored Strategic Parameters ###
  You must also evaluate the website's strategic execution by scoring the following sections:
  1. **TrustSignalsAndCredibility**: Evaluate social proof, authority markers (awards, certs), security assurances, and brand consistency.
  2. **TargetAudienceAlignment**: Evaluate how well content matches the identified audience's needs, tone, and user journey.
  3. **CompetitiveDifferentiation**: Evaluate the UVP, distinct features, and market positioning.
  4. **CallToActionStrategy**: Evaluate CTA placement, copy, urgency, and friction.
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
    let specificInstructions = `You are a world-class **Product Auditor**. Your specific task is to evaluate the website's market fit, user engagement, and conversion effectiveness.\n- Your analysis for 'PageSpeedAPI_ActualLoadTime_CoreWebVitals' MUST directly reference the provided performance metrics. If data could not be retrieved, you MUST assign a \`Score\` of \`0\` and the \`Analysis\` must state that the check failed (e.g., 'Not applicable. The automated performance check failed to retrieve data.').`;

    if (isMultiPage) {
        specificInstructions += `\n- **Multi-Page Context**: This is a multi-page audit. Identify patterns and inconsistencies across pages.`;
    }

    return `${BASE_SYSTEM_INSTRUCTION}\n\n${specificInstructions}`;
};

export const getVisualSystemInstruction = (mobileCaptureSucceeded: boolean, isMultiPage: boolean) => {
    let specificInstructions = `You are a world-class **Visual Designer**. Your specific task is to evaluate the website's aesthetics, branding, and responsiveness.`;

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


export const getAccessibilitySystemInstruction = (isMultiPage: boolean) => {
    let specificInstructions = `You are a world-class **Accessibility Auditor** (CPACC/WebAIM Certified). Your task is to interpretation the provided automated Axe-Core audit data and combine it with visual/structural analysis to evaluate WCAG 2.1 AA compliance.

    You MUST Populate the schema with a comprehensive list of parameters. DO NOT Summarize.

    MANDATORY PARAMETERS:
    Ensures these specific parameters are ALWAYS present in their respective sections.
    
    1. **AutomatedCompliance** (Fixed List - DO NOT ADD OTHERS):
       - 'WCAG_A_Compliance': General adherence to Level A standards.
       - 'WCAG_AA_Compliance': General adherence to Level AA standards.
       - 'BestPractices': Adherence to accessibility best practices.
       - 'ARIANavigation': Proper use of ARIA roles, labels, and landmarks.
       - 'ImageAltText': Presence and quality of alt text for images.
       - 'FormLabels': Presence of labels for inputs and form controls.
       - 'LinkPurpose': Clarity of link text and context (e.g. avoiding "click here").

    2. **Screen Reader Experience**:
       - 'StructureAndHeadings' (Analyze heading hierarchy h1-h6)
       - 'AlternativeTextQuality' (Analyze image context)
       - 'KeyboardFlow' (Infer logical order)
       - 'AriaLiveUsage' (Check for dynamic content)

    3. **Visual Accessibility**:
       - 'ColorContrast Ratios'
       - 'ResizableText' (Analyze if text seems legible)
       - 'FocusIndicators' (Infer from button styles)
       - 'LayoutStability'

    - **CRITICAL**: You MUST reference the specific 'axeViolations' provided in the context. 
      - Map specific Axe rule failures (e.g., 'image-alt') to the most relevant fixed parameter above (e.g., 'ImageAltText').
      - If 'axeViolations' is empty, acknowledge that automated checks passed but emphasize manual/visual verification need.
    - For 'AutomatedCompliance', Base your score HEAVILY on the number and severity of Axe violations mapped to that category.`;

    if (isMultiPage) {
        specificInstructions += `\n- **Multi-Page Context**: Identify accessibility patterns across pages.`;
    }

    return `${BASE_SYSTEM_INSTRUCTION}\n\n${specificInstructions}
    
    IMPORTANT FORMATTING RULES:
    1. For EVERY scored parameter, you MUST provide a specific 'Recommendation'. If the score is 10/10, suggest "Maintain current implementation" or a future-proofing tip.
    2. You MUST provide 'Citations' for EVERY parameter. 
       - If there are violations, cite the specific Axe rule or WCAG criterion failed.
       - If the score is high/perfect, cite the WCAG 2.1 Success Criterion that is being satisfied (e.g., "Compliant with WCAG 2.1 SC 1.4.3").
    3. GRANULAR REPORTING (CRITICAL):
       - **SCORE**: Every parameter must have an integer 'Score' (0-10). Never return NaN or null.
       - **EXTRACT CODE**:
         - For Failures: Extract HTML from 'axeViolations' (nodes[].html) into 'FailingElements'.
         - For Passes: Extract HTML from 'axePasses' (html field) into 'FailingElements' (label will be "Element Source" in UI).
       - Ensure EVERY passed check gets a "Satisfactory" (10/10) card in 'PassedAudits' section.
          - For Partially Completed: Populate 'ManualChecks' list using 'axeIncomplete' data.
          - For N/A: Populate 'NotApplicable' list using 'axeInapplicable' data.
       - 'ComplianceScore' should be a calculated percentage (Passed / (Passed + Failed)) * 100.
       - 'RiskLevel' should be Critical if > 0 Critical violations, High if > 2 Serious, Moderate if > 2 Minor, else Low.

    4. LEGAL & COMPLIANCE FOCUS:
       - For every failure, explicitly state the "Legal Risk" (e.g., "High risk of lawsuit under ADA/Section 508").
       - Frame recommendations as "Compliance Fixes" required for WCAG 2.1 AA.
       - Use strict, objective language suited for a legal audit.
    `;
};

export const getCompetitorSystemInstruction = () => `
  ### Role ###
  You are a Strategic Competitive Analyst. Your task is to compare two websites (Primary vs. Competitor) based on their text content and screenshots.

  ### Analysis Guidelines ###
  - **Objective**: Identify where the Competitor outperforms the Primary website and vice-versa.
  - **Data Source**: You will be provided with:
    1.  Primary Website Context (URL, text, screenshot analysis)
    2.  Competitor Website Context (URL, text, screenshot analysis)
  - **Scoring**: Use a 1-10 scale for all scores (1=Poor, 10=Excellent).
  
  ### Output Requirements ###
  - **Executive Summary**: A concise 5-6 line summary of the key competitive difference.
  
    1. **Strategic & Accessibility Comparison**:
       - Strategy: 'DomainClarity', 'PurposeClarity', 'TargetAudienceAlignment', 'TrustSignals', 'MarketPositioning', 'BrandAuthority'
       - Accessibility: 'WCAG_A_Compliance', 'WCAG_AA_Compliance', 'BestPractices', 'ARIANavigation', 'StructureAndHeadings', 'AlternativeTextQuality', 'KeyboardFlow', 'AriaLiveUsage', 'ColorContrast Ratios', 'ResizableText', 'FocusIndicators', 'LayoutStability'

    2. **UXComparison**:
       - 'VisibilityOfSystemStatus', 'MatchBetweenSystemAndRealWorld', 'UserControlAndFreedom'
       - 'ConsistencyAndStandards', 'ErrorPrevention', 'RecognitionVsRecall'
       - 'FlexibilityAndEfficiencyOfUse', 'AestheticAndMinimalistDesign'
       - 'HelpUsersRecoverFromErrors', 'HelpAndDocumentation'
       - 'TaskCompletionTime', 'ClickDepth', 'NavigationClarity', 'CognitiveLoad', 'ErrorRate'
       - 'ScreenReaderCompatibility', 'TouchTargetSize'

    3. **ProductComparison**:
       - 'ClearValueProposition', 'OnboardingEffectiveness', 'FeatureDiscoverability', 'MonetizationModelClarity'
       - 'GamificationIncentives', 'PersonalizationAdaptability', 'FrictionPoints', 'UserFeedbackIteration'
       - 'CTAClarityPlacement', 'CheckoutPaymentFlow', 'LeadGenerationForms', 'MicrocopyMessaging'
       - 'PageSpeedAPI_ActualLoadTime_CoreWebVitals'

    4. **VisualComparison**:
       - 'ColorPaletteContrast', 'TypographyReadability', 'IconographySymbolism', 'SpacingAlignment'
       - 'VisualHierarchy', 'ImageryIllustrations', 'AnimationMotionUI', 'WhitespaceMinimalism'
       - 'MobileOptimization', 'DarkModeTheming'

    *For each parameter, provide a 'PrimaryScore', 'CompetitorScore', a brief 'Analysis' (1 sentence), and declare a 'Winner'.*

  - **Competitor Strengths**: You MUST identify exactly 3 specific things the competitor does BETTER.
  - **Primary Strengths**: You MUST identify exactly 3 specific things the Primary site does BETTER.
  **CRITICAL**: You must complete ALL sections.
  - 'CompetitorStrengths', 'PrimaryStrengths', and 'Opportunities' MUST each contain exactly 3 items.
  - **NO EMPTY ARRAYS**. If you cannot find explicit differences, you MUST INFER them from general UX/UI best practices and the visual comparison.
  - **VALUE**: These sections are the most important part of the report. Provide specific, actionable insights, not generic advice.
  - **IMPACT**: For 'Impact', use values like "High", "Critical", or "Strategic".
`;

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
                            ParameterName: { type: Type.STRING },
                            Score: { type: Type.INTEGER },
                            ImpactLevel: { type: Type.STRING },
                            Confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                            Analysis: { type: Type.STRING },
                            Recommendation: { type: Type.STRING },
                            Citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                            KeyFinding: { type: Type.STRING },
                            FailingElements: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['ParameterName', 'Score', 'ImpactLevel', 'Confidence', 'Analysis', 'Citations', 'Recommendation', 'KeyFinding']
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
            ExecutiveSummary: { type: Type.STRING },
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
            },
            // NEW: Scored Sections for Overview Compatibility
            TrustSignalsAndCredibility: createScoredSectionSchema([
                'SocialProofIntegration', 'AuthorityMarkers', 'SecurityAssurances', 'BrandConsistency'
            ]),
            TargetAudienceAlignment: createScoredSectionSchema([
                'contentRelevance', 'ToneAndVoiceFit', 'PainPointAddressing', 'UserJourneyLogic'
            ]),
            CompetitiveDifferentiation: createScoredSectionSchema([
                'UniqueValueProposition', 'FeatureDistinctiveness', 'MarketPositioningClarity', 'InnovationFactor'
            ]),
            CallToActionStrategy: createScoredSectionSchema([
                'CTAPlacement', 'ActionOrientedCopy', 'UrgencyAndIncentives', 'FrictionReduction'
            ])
        },
        required: ['ExecutiveSummary', 'DomainAnalysis', 'PurposeAnalysis', 'TargetAudience', 'UserPersonas', 'TrustSignalsAndCredibility', 'TargetAudienceAlignment', 'CompetitiveDifferentiation', 'CallToActionStrategy']
    };

    const accessibilityAuditSchema = {
        type: Type.OBJECT,
        properties: {
            CategoryScore: { type: Type.NUMBER },
            ComplianceScore: { type: Type.NUMBER },
            RiskLevel: { type: Type.STRING, enum: ['Critical', 'High', 'Moderate', 'Low'] },
            Top5CriticalAccessibilityIssues: { type: Type.ARRAY, items: criticalIssueSchemaForExperts },
            AutomatedCompliance: createScoredSectionSchema([
                'WCAG_A_Compliance', 'WCAG_AA_Compliance', 'BestPractices', 'ARIANavigation',
                'ImageAltText', 'FormLabels', 'LinkPurpose'
            ]),
            ScreenReaderExperience: createScoredSectionSchema([
                'StructureAndHeadings', 'AlternativeTextQuality', 'KeyboardFlow', 'AriaLiveUsage'
            ]),
            VisualAccessibility: createScoredSectionSchema([
                'ColorContrast Ratios', 'ResizableText', 'FocusIndicators', 'LayoutStability'
            ]),
            PassedAudits: createScoredSectionSchema([]), // Using same schema for consistency
            ManualChecks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        description: { type: Type.STRING },
                        nodes: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['id', 'description']
                }
            },
            NotApplicable: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ['id', 'description']
                }
            },
            OverallRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
            'CategoryScore', 'ComplianceScore', 'RiskLevel',
            'Top5CriticalAccessibilityIssues', 'AutomatedCompliance',
            'ScreenReaderExperience', 'VisualAccessibility',
            'PassedAudits', 'ManualChecks', 'NotApplicable',
            'OverallRecommendations'
        ]
    };

    const competitorAuditSchema = {
        type: Type.OBJECT,
        properties: {
            ExecutiveSummary: { type: Type.STRING },
            // CRITICAL SECTIONS MOVED TO TOP FOR PRIORITY
            CompetitorStrengths: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Strength: { type: Type.STRING },
                        Description: { type: Type.STRING },
                        Impact: { type: Type.STRING }
                    },
                    required: ['Strength', 'Description', 'Impact']
                }
            },
            PrimaryStrengths: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Strength: { type: Type.STRING },
                        Description: { type: Type.STRING },
                        Impact: { type: Type.STRING }
                    },
                    required: ['Strength', 'Description', 'Impact']
                }
            },
            Opportunities: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Opportunity: { type: Type.STRING },
                        ActionPlan: { type: Type.STRING }
                    },
                    required: ['Opportunity', 'ActionPlan']
                }
            },
            // Comparisons - REORDERED: Strategy & Accessibility First
            StrategyComparison: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Parameter: { type: Type.STRING },
                        PrimaryScore: { type: Type.INTEGER },
                        CompetitorScore: { type: Type.INTEGER },
                        Analysis: { type: Type.STRING },
                        Winner: { type: Type.STRING, enum: ['Primary', 'Competitor', 'Tie'] }
                    },
                    required: ['Parameter', 'PrimaryScore', 'CompetitorScore', 'Analysis', 'Winner']
                }
            },
            AccessibilityComparison: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Parameter: { type: Type.STRING },
                        PrimaryScore: { type: Type.INTEGER },
                        CompetitorScore: { type: Type.INTEGER },
                        Analysis: { type: Type.STRING },
                        Winner: { type: Type.STRING, enum: ['Primary', 'Competitor', 'Tie'] }
                    },
                    required: ['Parameter', 'PrimaryScore', 'CompetitorScore', 'Analysis', 'Winner']
                }
            },
            UXComparison: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Parameter: { type: Type.STRING },
                        PrimaryScore: { type: Type.INTEGER },
                        CompetitorScore: { type: Type.INTEGER },
                        Analysis: { type: Type.STRING },
                        Winner: { type: Type.STRING, enum: ['Primary', 'Competitor', 'Tie'] }
                    },
                    required: ['Parameter', 'PrimaryScore', 'CompetitorScore', 'Analysis', 'Winner']
                }
            },
            ProductComparison: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Parameter: { type: Type.STRING },
                        PrimaryScore: { type: Type.INTEGER },
                        CompetitorScore: { type: Type.INTEGER },
                        Analysis: { type: Type.STRING },
                        Winner: { type: Type.STRING, enum: ['Primary', 'Competitor', 'Tie'] }
                    },
                    required: ['Parameter', 'PrimaryScore', 'CompetitorScore', 'Analysis', 'Winner']
                }
            },
            VisualComparison: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        Parameter: { type: Type.STRING },
                        PrimaryScore: { type: Type.INTEGER },
                        CompetitorScore: { type: Type.INTEGER },
                        Analysis: { type: Type.STRING },
                        Winner: { type: Type.STRING, enum: ['Primary', 'Competitor', 'Tie'] }
                    },
                    required: ['Parameter', 'PrimaryScore', 'CompetitorScore', 'Analysis', 'Winner']
                }
            },
        },
        required: ['ExecutiveSummary', 'CompetitorStrengths', 'PrimaryStrengths', 'Opportunities', 'UXComparison', 'ProductComparison', 'VisualComparison', 'StrategyComparison', 'AccessibilityComparison']
    };


    const competitorAuditSchemaStrategic = {
        type: Type.OBJECT,
        properties: {
            ExecutiveSummary: { type: Type.STRING },
            CompetitorStrengths: competitorAuditSchema.properties.CompetitorStrengths,
            PrimaryStrengths: competitorAuditSchema.properties.PrimaryStrengths,
            Opportunities: competitorAuditSchema.properties.Opportunities,
            StrategyComparison: competitorAuditSchema.properties.StrategyComparison,
            AccessibilityComparison: competitorAuditSchema.properties.AccessibilityComparison
        },
        required: ['ExecutiveSummary', 'CompetitorStrengths', 'PrimaryStrengths', 'Opportunities', 'StrategyComparison', 'AccessibilityComparison']
    };

    const competitorAuditSchemaTactical = {
        type: Type.OBJECT,
        properties: {
            UXComparison: competitorAuditSchema.properties.UXComparison,
            ProductComparison: competitorAuditSchema.properties.ProductComparison,
            VisualComparison: competitorAuditSchema.properties.VisualComparison
        },
        required: ['UXComparison', 'ProductComparison', 'VisualComparison']
    };

    return { uxAuditSchema, productAuditSchema, visualAuditSchema, strategyAuditSchema, accessibilityAuditSchema, criticalIssueSchema, competitorAuditSchema, competitorAuditSchemaStrategic, competitorAuditSchemaTactical };
};
