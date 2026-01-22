import React, { useMemo } from 'react';
import { AnalysisReport, Screenshot } from '../../types';
import { SkeletonLoader } from '../SkeletonLoader';
import { CriticalIssueCard } from './AuditCards';
import { ScoreDisplayCard } from './ScoreComponents';
import { DetailedAuditView, DetailedAuditType } from './DetailedAuditView';
import { AccessibilityAuditView } from './AccessibilityAuditView';
import { CompetitorAnalysisView } from './CompetitorAnalysisView';

interface ReportPDFTemplateProps {
    report: AnalysisReport;
    url: string;
    screenshots: Screenshot[];
}

export const ReportPDFTemplate: React.FC<ReportPDFTemplateProps> = ({ report, url, screenshots }) => {
    const { "UX Audit expert": ux, "Product Audit expert": product, "Visual Audit expert": visual, "Strategy Audit expert": strategy, Top5ContextualIssues } = report;
    const primaryScreenshot = screenshots.find(s => !s.isMobile);
    const primaryScreenshotSrc = primaryScreenshot?.url || (primaryScreenshot?.data ? `data:image/jpeg;base64,${primaryScreenshot.data}` : undefined);

    const overallScore = useMemo(() => {
        const scores = [ux?.CategoryScore, product?.CategoryScore, visual?.CategoryScore].filter(s => typeof s === 'number') as number[];
        if (scores.length === 0) return 0;
        return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }, [ux, product, visual]);

    // Safety check for Top 5 Issues
    const safeIssues = Top5ContextualIssues || [];
    const firstIssue = safeIssues[0];
    const remainingIssues = safeIssues.slice(1, 5);

    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    return (
        <div className="flex flex-col bg-white p-6 gap-5 font-['DM_Sans'] text-slate-900 leading-normal relative">

            {/* --- HERO SECTION --- */}
            <div className="flex flex-col self-stretch">
                <div className="flex justify-between items-end self-stretch mb-3 border-b border-slate-100 pb-2 break-inside-avoid pdf-item">
                    <div>
                        <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">
                            <span className="text-[#CE8100]">UX Assessment of</span> <span className="text-[#24312D]">{cleanUrl}</span>
                        </h1>
                        <p className="text-[#7F7F7F] text-xs font-medium mt-0.5">Here’s your AI-powered UX diagnosis with actionable recommendations</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mb-5 break-inside-avoid pdf-item">
                    <div className="w-full max-w-[400px] mx-auto">
                        <ScoreDisplayCard score={overallScore} label="Overall Score" isHero={true} isPdf={true} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {product ? <ScoreDisplayCard score={product.CategoryScore} label="Product Audit" isPdf={true} /> : <SkeletonLoader className="h-28 rounded-lg" />}
                        {ux ? <ScoreDisplayCard score={ux.CategoryScore} label="UX Audit" isPdf={true} /> : <SkeletonLoader className="h-28 rounded-lg" />}
                        {visual ? <ScoreDisplayCard score={visual.CategoryScore} label="Visual Design" isPdf={true} /> : <SkeletonLoader className="h-28 rounded-lg" />}
                    </div>
                </div>

                {primaryScreenshotSrc ? (
                    <div className="self-stretch w-full mb-4 break-inside-avoid pdf-item">
                        <div className="text-xs font-bold uppercase text-slate-500 mb-3 text-left">
                            ANALYZED PAGE VIEW
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm relative overflow-hidden" style={{ height: '360px' }}>
                            <img src={primaryScreenshotSrc} className="w-full absolute top-0 left-0" style={{ height: 'auto' }} alt="website screenshot" />
                        </div>
                    </div>
                ) : <SkeletonLoader className="h-[300px] w-full mb-6 rounded-xl" />}

                {/* Executive Summary in PDF Hero */}
                {strategy?.ExecutiveSummary && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 text-sm leading-relaxed mb-4 break-inside-avoid pdf-item">
                        <p className="whitespace-pre-line"><strong className="text-slate-900">Executive Summary:</strong> {strategy.ExecutiveSummary}</p>
                    </div>
                )}
            </div>

            {/* --- COMPETITOR ANALYSIS (EXCLUSIVE) --- */}
            {report['Competitor Analysis expert'] ? (
                <div className="mt-2 text-slate-900">
                    <CompetitorAnalysisView data={report['Competitor Analysis expert']} isPdf={true} />
                </div>
            ) : (
                <>
                    {/* --- TOP 5 ISSUES --- */}
                    <div className="flex flex-col self-stretch gap-2">
                        <div className="flex flex-col gap-2 break-inside-avoid pdf-item">
                            <h2 className="text-[20px] font-bold text-slate-900 mb-6 pdf-section-title">
                                Top 5 Impactful Issues
                            </h2>
                            {firstIssue ? <CriticalIssueCard issue={firstIssue} isPdf={true} /> : <SkeletonLoader className="h-40 w-full" />}
                        </div>

                        {remainingIssues.map((issue, index) => (
                            <div key={index} className="break-inside-avoid pdf-item">
                                <CriticalIssueCard issue={issue} isPdf={true} />
                            </div>
                        ))}
                    </div>

                    {/* --- STRATEGY (Force Break) --- */}
                    {strategy && (
                        <div className="mt-2">
                            {/* Strategy has internal break logic */}
                            <DetailedAuditView auditData={strategy} auditType={'Strategic Foundation'} isPdf={true} />
                        </div>
                    )}

                    {/* --- DETAILED AUDITS --- */}
                    {[
                        { data: ux, type: 'UX Audit' },
                        { data: product, type: 'Product Audit' },
                        { data: visual, type: 'Visual Design' },
                    ].map(({ data, type }) => (
                        data ? (
                            <div key={type} className="mt-2">
                                <DetailedAuditView auditData={data} auditType={type as DetailedAuditType} isPdf={true} forcePageBreak={true} />
                            </div>
                        ) : null
                    ))}

                    {/* --- ACCESSIBILITY AUDIT --- */}
                    {report['Accessibility Audit expert'] && (
                        <div className="mt-2 text-slate-900">
                            <AccessibilityAuditView data={report['Accessibility Audit expert']} isPdf={true} />
                        </div>
                    )}
                </>
            )}

            <div className="mb-4"></div>
        </div>
    );
};