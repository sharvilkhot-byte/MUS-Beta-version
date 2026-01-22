
import { Type } from '@google/genai';

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
