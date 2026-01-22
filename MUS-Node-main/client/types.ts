export type Screenshot = {
  path: string;
  url?: string;
  data: string; // Base64
  isMobile: boolean;
};

export type StreamChunk = {
  type: 'status' | 'data' | 'error' | 'complete';
  message?: string;
  payload?: any;
};

export type DataChunk = {
  type: 'data';
  payload: {
    key: ExpertKey;
    data: any;
  };
};

export type CompleteChunk = {
  type: 'complete';
  payload: {
    auditId: string;
    screenshotUrl: string;
  };
};

export type AnalysisReport = Record<string, any>;

export type ExpertKey =
  | 'Strategy Audit expert'
  | 'UX Audit expert'
  | 'Product Audit expert'
  | 'Visual Audit expert'
  | 'Accessibility Audit expert'
  | 'Competitor Analysis expert';


// NEW Types for Mixed Inputs
export type AuditInputType = 'url' | 'upload';

export interface AuditInput {
  type: AuditInputType;
  url?: string; // For type='url'
  file?: File; // For backward compatibility / single mode
  files?: File[]; // For multiple uploads
  fileData?: string; // Base64 (Service)
  filesData?: string[]; // Array of Base64 strings (Service)
  id: string; // Unique ID for React lists
  role?: 'primary' | 'competitor';
}

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
  FailingElements?: string[]; // Array of HTML strings for failing nodes
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
  ExecutiveSummary?: string; // Added for top-level summary
  DomainAnalysis: DomainAnalysisData;
  PurposeAnalysis: PurposeAnalysisData;
  TargetAudience: TargetAudienceData;
  UserPersonas: UserPersona[];
  // Scored Sections
  TrustSignalsAndCredibility: { SectionScore: number; Parameters: ScoredParameter[] };
  TargetAudienceAlignment: { SectionScore: number; Parameters: ScoredParameter[] };
  CompetitiveDifferentiation: { SectionScore: number; Parameters: ScoredParameter[] };
  CallToActionStrategy: { SectionScore: number; Parameters: ScoredParameter[] };
}
// Accessibility Audit Types
export interface AutomatedCompliance {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface ScreenReaderExperience {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface VisualAccessibility {
  SectionScore: number;
  Parameters: ScoredParameter[];
}

export interface AccessibilityAudit {
  CategoryScore: number;
  ComplianceScore?: number;
  RiskLevel?: 'Critical' | 'High' | 'Moderate' | 'Low';
  Top5CriticalAccessibilityIssues: CriticalIssue[];
  AutomatedCompliance: AutomatedCompliance;
  ScreenReaderExperience: ScreenReaderExperience;
  VisualAccessibility: VisualAccessibility;
  PassedAudits?: AutomatedCompliance; // Reusing structure
  ManualChecks?: { id: string; description: string; nodes?: { html: string; failureSummary?: string }[] }[];
  NotApplicable?: { id: string; description: string; }[];
  OverallRecommendations: string[];
}

// Competitor Analysis Types
export interface CompetitorComparisonItem {
  Parameter: string;
  PrimaryScore: number;
  CompetitorScore: number;
  Analysis: string;
  Winner: 'Primary' | 'Competitor' | 'Tie';
}

export interface CompetitorStrength {
  Strength: string;
  Description: string;
  Impact: string;
}

export interface CompetitorOpportunity {
  Opportunity: string;
  ActionPlan: string;
}

export interface CompetitorAnalysisData {
  ExecutiveSummary: string;
  UXComparison: CompetitorComparisonItem[];     // New
  ProductComparison: CompetitorComparisonItem[]; // New
  VisualComparison: CompetitorComparisonItem[];  // New
  StrategyComparison: CompetitorComparisonItem[]; // New
  AccessibilityComparison: CompetitorComparisonItem[]; // New
  CompetitorStrengths: CompetitorStrength[];
  PrimaryStrengths: CompetitorStrength[];
  Opportunities: CompetitorOpportunity[];
}
