

export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CriticalIssue {
  Issue: string;
  ImpactLevel: ImpactLevel;
  Score: number;
  Recommendation: string;
  Citations: string[];
  source?: string;
  Confidence?: ConfidenceLevel;
  Analysis?: string;
  KeyFinding?: string;
}

export interface ScoredParameter {
  ParameterName?: string;
  Score: number;
  ImpactLevel: ImpactLevel;
  Confidence: ConfidenceLevel;
  Analysis?: string;
  Recommendation?: string;
  Citations: string[];
  KeyFinding?: string;
}

// UX Audit Expert Types
export interface UsabilityHeuristics {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface UsabilityMetrics {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface AccessibilityCompliance {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface UXAudit {
  CategoryScore: number;
  Top5CriticalUXIssues: CriticalIssue[];
  UsabilityHeuristics: UsabilityHeuristics;
  UsabilityMetrics: UsabilityMetrics;
  AccessibilityCompliance: AccessibilityCompliance;
  OverallRecommendations: string[];
}

// Product Audit Expert Types
export interface MarketFitAndBusinessAlignment {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface UserRetentionAndEngagement {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface ConversionOptimization {
    SectionScore: number;
    Parameters: ScoredParameter[];
}

export interface ProductAudit {
  CategoryScore: number;
  Top5CriticalProductIssues: CriticalIssue[];
  MarketFitAndBusinessAlignment: MarketFitAndBusinessAlignment;
  UserRetentionAndEngagement: UserRetentionAndEngagement;
  ConversionOptimization: ConversionOptimization;
  OverallRecommendations: string[];
}

// Visual Audit Expert Types
export interface UIConsistencyAndBranding {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface AestheticAndEmotionalAppeal {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface ResponsivenessAndAdaptability {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface VisualAudit {
  CategoryScore: number;
  Top5CriticalVisualIssues: CriticalIssue[];
  UIConsistencyAndBranding: UIConsistencyAndBranding;
  AestheticAndEmotionalAppeal: AestheticAndEmotionalAppeal;
  ResponsivenessAndAdaptability: ResponsivenessAndAdaptability;
  OverallRecommendations: string[];
}

// Strategy Audit Types
export interface DomainAnalysisData {
  Items: string[];
  Confidence: ConfidenceLevel;
}

export interface PurposeAnalysisData {
  PrimaryPurpose: string[];
  KeyObjectives: string;
  Confidence: ConfidenceLevel;
}

export interface TargetAudienceData {
    WebsiteType: string;
    Primary: string[];
    DemographicsPsychographics: string;
    MarketSegmentation: string;
    Confidence: ConfidenceLevel;
}

export interface UserPersona {
  Name: string;
  Age: number;
  Location: string;
  Occupation: string;
  UserNeedsBehavior: string;
  PainPointOpportunity: string;
}

export interface StrategyAudit {
  DomainAnalysis: DomainAnalysisData;
  PurposeAnalysis: PurposeAnalysisData;
  TargetAudience: TargetAudienceData;
  UserPersonas: UserPersona[];
}


// Main Report Type
export type ExpertKey = "UX Audit expert" | "Product Audit expert" | "Visual Audit expert" | "Strategy Audit expert";
export type AnalysisReport = {
  [key in ExpertKey]?: any;
} & {
    Top5ContextualIssues?: CriticalIssue[];
};

export interface Screenshot {
  path: string;
  data?: string; // Base64 data is now optional, as it will be removed after upload
  isMobile: boolean;
  url?: string; // The public URL after uploading to Supabase Storage
}

// Types for streaming from backend
export interface StatusChunk {
  type: 'status';
  message: string;
}

export interface DataChunk {
  type: 'data';
  payload: {
    key: ExpertKey | 'Top5ContextualIssues';
    data: any;
  };
}

export interface CompleteChunk {
  type: 'complete',
  payload: {
    auditId: string;
    screenshotUrl: string;
  }
}

export interface ScrapeCompleteChunk {
  type: 'scrape-complete';
  payload: {
    screenshots: Screenshot[];
    screenshotMimeType: string;
    liveText: string;
    performanceData?: Record<string, string> | null;
    performanceAnalysisError?: string | null;
    animationData: any[] | null;
    accessibilityData: Record<string, any> | null;
  };
}


export interface ErrorChunk {
  type: 'error';
  message: string;
}

export type StreamChunk = StatusChunk | DataChunk | ErrorChunk | CompleteChunk | ScrapeCompleteChunk;