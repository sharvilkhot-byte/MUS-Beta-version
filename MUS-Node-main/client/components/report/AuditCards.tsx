import React from 'react';
import { CriticalIssue, ScoredParameter } from '../../types';
import { ScoreGauge, getThemeStyles } from './ScoreComponents';

// --- TYPOGRAPHY CONSTANTS ---
const LABEL_STYLE = "text-xs font-bold text-slate-700 uppercase tracking-wider mb-1";
const BODY_STYLE = "text-sm leading-relaxed text-slate-600 font-medium";
const HEADING_STYLE = "text-lg font-bold text-slate-900 leading-tight mb-2";

// Helper: Format ParameterName (camelCase -> Spaced Title)
const formatTitle = (text: string) => {
    if (!text) return "";
    return text.replace(/([A-Z])/g, ' $1').trim();
};

// Helper: Check if string is a valid ID
const toId = (text: string) => {
    return text ? `param-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined;
};

// --- CORE EDITORIAL CARD (The Unified UI) ---
const EditorialCard = ({
    title,
    analysis,
    score,
    confidence,
    source,
    findings,
    recommendation,
    citations,
    failingElements,
    isPdf = false,
    id // New ID Prop
}: any) => {
    // 🎨 Get Theme Colors based on Score
    const isCritical = score < 5;
    const isWarning = score >= 5 && score < 8;
    const theme = isCritical
        ? { soft: '#FEF2F2', solid: '#EF4444', label: 'Critical' } // Red
        : isWarning
            ? { soft: '#FFFBEB', solid: '#F59E0B', label: 'Needs Improvement' } // Amber
            : { soft: '#F0FDF4', solid: '#22C55E', label: 'Satisfactory' }; // Green

    // Padding control (Tighter for PDF to save space)
    const cardPadding = isPdf ? "p-4" : "p-5";
    const bottomMargin = isPdf ? "mb-2" : "mb-3";

    // --- TYPOGRAPHY CONSTANTS ---
    const HEADING_STYLE = "text-[15px] font-bold text-slate-900 leading-snug mb-2";
    const BODY_STYLE = "text-[13px] text-slate-600 leading-relaxed font-normal";
    const LABEL_STYLE = "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1";

    return (
        <div id={id} className={`bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden break-inside-avoid ${bottomMargin} pdf-item pdf-card scroll-mt-24`}>

            {/* --- TOP SECTION: ANALYSIS & SCORE --- */}
            <div className="flex flex-col min-[550px]:flex-row items-stretch border-b border-slate-100 pl-1.5 relative ">

                {/* Left Accent Strip (Color Coded) */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 z-10" style={{ backgroundColor: theme.solid }}></div>

                {/* Left Content: Analysis */}
                <div className={`flex-1 ${cardPadding} flex flex-col gap-2`}>

                    {/* Metadata Row: Confidence & Source */}
                    <div className="flex flex-row items-center gap-3 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: theme.solid }}>
                            {confidence} Confidence
                        </span>
                        {source && (
                            <span className="text-[10px] font-bold text-slate-400 tracking-wide">
                                • {source}
                            </span>
                        )}
                    </div>

                    <h3 className={HEADING_STYLE}>{title}</h3>
                    <p className={BODY_STYLE}>{analysis}</p>
                </div>

                {/* Right Content: Score Box */}
                <div
                    className={`flex flex-col items-center justify-center ${cardPadding} border-t min-[550px]:border-t-0 min-[550px]:border-l border-slate-100 min-[550px]:w-[160px] shrink-0`}
                    style={{ backgroundColor: theme.soft }}
                >
                    <div className="relative w-[100px] h-[50px] mb-2">
                        <div className="absolute top-0 left-0">
                            {/* Using the Premium Gauge */}
                            <ScoreGauge score={score} size={100} strokeWidth={10} />
                        </div>
                        <span className="absolute bottom-0 inset-x-0 text-center text-slate-900 text-[24px] font-bold leading-none translate-y-1">
                            {Math.round(score)}<span className="text-slate-400 text-[12px] font-normal">/10</span>
                        </span>
                    </div>

                    <span className="text-[11px] font-bold uppercase tracking-wide text-center" style={{ color: theme.solid }}>
                        {theme.label}
                    </span>
                </div>
            </div>

            {/* --- BOTTOM SECTION: DETAILS GRID --- */}
            {(findings || recommendation || (citations && citations.length > 0) || (failingElements && failingElements.length > 0)) && (
                <div className="flex flex-col bg-slate-50/50">

                    {/* Findings & Recommendations Row */}
                    <div className={`flex flex-col min-[550px]:flex-row ${citations?.length || failingElements?.length ? 'border-b border-slate-200' : ''}`}>

                        {/* Findings Column */}
                        {findings && findings.toLowerCase() !== 'n/a' && (
                            <div className={`flex-1 ${cardPadding} border-b min-[550px]:border-b-0 min-[550px]:border-r border-slate-200`}>
                                <div className={LABEL_STYLE}>Observation</div>
                                <p className={BODY_STYLE}>{findings}</p>
                            </div>
                        )}

                        {/* Recommendation Column */}
                        {recommendation && recommendation.toLowerCase() !== 'n/a' && (
                            <div className={`flex-1 ${cardPadding}`}>
                                <div className={LABEL_STYLE} style={{ color: '#4F46E5' }}>Recommendation</div>
                                <p className={BODY_STYLE}>{recommendation}</p>
                            </div>
                        )}
                    </div>

                    {/* Failing Elements Code Snippets */}
                    {/* Element Code Snippets (Dynamic: Red if Score < 10, Neutral otherwise) */}
                    {failingElements && failingElements.length > 0 && (
                        <div className={`w-full ${cardPadding} border-b border-slate-200 ${score < 10 ? 'bg-red-50/50' : 'bg-slate-50/50'}`}>
                            <div className={LABEL_STYLE} style={{ color: score < 10 ? '#EF4444' : '#64748B' }}>
                                {score < 10 ? 'Failing Elements Code' : 'Element Source'}
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                {failingElements.slice(0, 3).map((code, i) => (
                                    <div key={i} className="font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                        {code}
                                    </div>
                                ))}
                                {failingElements.length > 3 && (
                                    <p className="text-[10px] text-slate-500 italic mt-1">+ {failingElements.length - 3} more elements...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Citations Row */}
                    {citations && citations.length > 0 && (
                        <div className={`w-full ${cardPadding}`}>
                            <div className={LABEL_STYLE}>Citations</div>
                            <div className="flex flex-col gap-2">
                                {citations.map((cite, i) => (
                                    <div key={i} className="flex gap-2 items-start pl-2 border-l-2 border-slate-200">
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium italic">"{cite}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- EXPORT WRAPPERS (Matching Partner's Interface) ---

export const CriticalIssueCard: React.FC<{ issue: CriticalIssue & { source?: string }, isPdf?: boolean }> = ({ issue, isPdf }) => {
    return (
        <EditorialCard
            title={issue.Issue}
            analysis={issue.Analysis}
            score={issue.Score}
            confidence={issue.Confidence || 'High'}
            source={issue.source}
            findings={issue.KeyFinding}
            recommendation={issue.Recommendation}
            citations={issue.Citations}
            isPdf={isPdf}
        />
    );
};

export const ScoredParameterCard: React.FC<{ parameter: ScoredParameter, isPdf?: boolean }> = ({ parameter, isPdf }) => {
    // Safety guard
    if (!parameter) return null;

    // If N/A (Score 0) AND Analysis explicitly says N/A, don't render.
    // Otherwise render it (it might be a critical failure with Score 0).
    const isNotApplicable = parameter.Score === 0 &&
        (parameter.Analysis?.toLowerCase().includes('not applicable') ||
            parameter.Analysis?.toLowerCase().includes('n/a') ||
            parameter.Analysis?.toLowerCase().includes('irrelevant'));

    if (isNotApplicable) return null;

    return (
        <EditorialCard
            id={toId(parameter.ParameterName)}
            title={formatTitle(parameter.ParameterName || 'Audit Parameter')}
            analysis={parameter.Analysis}
            score={parameter.Score}
            confidence={parameter.Confidence || 'Low'}
            source=""
            findings={parameter.KeyFinding}
            recommendation={parameter.Recommendation}
            citations={parameter.Citations}
            failingElements={parameter.FailingElements} // Pass it down
            isPdf={isPdf}
        />
    );
};

export const AuditSubSectionHeader: React.FC<{ title: string; score?: number; forceBreak?: boolean; className?: string, isPdf?: boolean }> = ({ title, score, forceBreak, className = "", isPdf = false }) => {
    const marginClasses = isPdf ? "mb-2 mt-4" : "mb-4 mt-6";

    return (
        <div className={`flex items-end justify-between border-b border-slate-200 pb-2 ${marginClasses} break-inside-avoid pdf-item pdf-section-header ${forceBreak ? 'force-page-break-before' : ''} ${className}`}>
            <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">{title}</h3>
            {/* Optional Score Badge for Section */}
            {score !== undefined && (
                <div className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">
                    {score.toFixed(0)}/100
                </div>
            )}
        </div>
    );
};