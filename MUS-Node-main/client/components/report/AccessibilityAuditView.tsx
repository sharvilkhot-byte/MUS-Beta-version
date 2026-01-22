import React from 'react';
import { AccessibilityAudit, ScoredParameter } from '../../types';
import { SkeletonLoader } from '../SkeletonLoader';
import { AuditSubSectionHeader, ScoredParameterCard, CriticalIssueCard } from './AuditCards';

interface Props {
    data: AccessibilityAudit;
    isPdf?: boolean;
}

export const AccessibilityAuditView: React.FC<Props> = ({ data, isPdf = false }) => {
    if (!data) return <SkeletonLoader className="h-96 w-full" />;

    const sections = [
        { title: 'Automated Compliance (WCAG)', data: data.AutomatedCompliance },
        { title: 'Screen Reader Experience', data: data.ScreenReaderExperience },
        { title: 'Visual Accessibility', data: data.VisualAccessibility },
    ];

    // Robust counting logic
    const allFailures = [
        ...(data.AutomatedCompliance?.Parameters || []),
        ...(data.ScreenReaderExperience?.Parameters || []),
        ...(data.VisualAccessibility?.Parameters || []),
        ...(data.Top5CriticalAccessibilityIssues?.map(i => ({ ParameterName: i.Issue, Score: 0 })) || [])
    ].filter(p => (p.Score !== undefined && p.Score < 10) || (p as any).Score === undefined); // Catch failures or missing scores

    // Deduplicate by name/issue to get identifying count
    const uniqueViolations = new Set(allFailures.map(f => f.ParameterName || (f as any).Issue)).size;
    const passedCount = data.PassedAudits?.Parameters?.length || 0;
    const complianceScore = !isNaN(Number(data.ComplianceScore)) ? Math.round(data.ComplianceScore!) : 0;

    return (
        <div className={`flex flex-col self-stretch gap-2 font-['DM_Sans'] ${isPdf ? 'text-slate-900' : ''}`}>
            {/* Header with Risk & Compliance */}
            <div className={`flex flex-col gap-4 mb-6 relative overflow-hidden bg-slate-50 p-6 rounded-xl border border-slate-200 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Detailed Accessibility Audit
                        </h2>
                        <p className="text-slate-500 max-w-lg">
                            Evaluation of WCAG 2.1 AA compliance using automated Axe-Core testing and visual analysis.
                        </p>
                    </div>
                    {data.RiskLevel && (
                        <div className={`px-4 py-2 rounded-lg border flex flex-col items-center ${data.RiskLevel === 'Critical' ? 'bg-red-50 border-red-200 text-red-700' :
                            data.RiskLevel === 'High' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                'bg-green-50 border-green-200 text-green-700'
                            }`}>
                            <span className="text-xs font-semibold uppercase tracking-wider">Legal Risk</span>
                            <span className="text-lg font-bold">{data.RiskLevel}</span>
                        </div>
                    )}
                </div>

                {(data.ComplianceScore !== undefined || uniqueViolations > 0) && (
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-slate-800">{complianceScore}%</span>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Compliance Score</span>
                        </div>
                        <div className="h-12 w-px bg-slate-200 mx-2"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-red-600">
                                {uniqueViolations}
                            </span>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Violations</span>
                        </div>
                        <div className="h-12 w-px bg-slate-200 mx-2"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-emerald-600">
                                {passedCount}
                            </span>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Passed Checks</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Critical Issues Section */}
            {data.Top5CriticalAccessibilityIssues?.length > 0 && (
                <div className={`mb-2 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                    <AuditSubSectionHeader title="Critical Compliance Failures" className="mb-4" />
                    <div className="flex flex-col self-stretch gap-2">
                        {data.Top5CriticalAccessibilityIssues.map((issue, idx) => (
                            <CriticalIssueCard key={idx} issue={{ ...issue, source: 'Axe-Core Detection' }} isPdf={isPdf} />
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Sections (Failures) */}
            {sections.map((section, index) => (
                section.data && section.data.Parameters && section.data.Parameters.length > 0 && (
                    <div key={section.title} className={`mb-4 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                        <AuditSubSectionHeader title={section.title} score={section.data.SectionScore * 10} />
                        <div className="flex flex-col self-stretch gap-2">
                            {section.data.Parameters.map((p: ScoredParameter, i: number) => (
                                <ScoredParameterCard key={i} parameter={p} isPdf={isPdf} />
                            ))}
                        </div>
                    </div>
                )
            ))}

            {/* Passed Checks Section */}
            {data.PassedAudits && data.PassedAudits.Parameters && data.PassedAudits.Parameters.length > 0 && (
                <div className={`mb-4 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                    <AuditSubSectionHeader title={`Passed Audits (${data.PassedAudits.Parameters.length})`} className="text-emerald-700" />
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {data.PassedAudits.Parameters.map((p, i) => (
                            <div key={i} className="p-4 border-b border-slate-100 last:border-0 flex justify-between items-start hover:bg-slate-50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-1 min-w-[20px] h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-800 text-sm">{p.ParameterName}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{p.Analysis || "Compliant with standards."}</p>
                                        {p.FailingElements && p.FailingElements.length > 0 && (
                                            <div className="mt-2 text-[10px] font-mono bg-slate-50 p-1.5 rounded text-slate-600 border border-slate-100 inline-block">
                                                Code: {p.FailingElements[0].slice(0, 50)}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Passed</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Checks Section */}
            {data.ManualChecks && data.ManualChecks.length > 0 && (
                <div className={`mb-4 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                    <AuditSubSectionHeader title={`Manual Checks Required (${data.ManualChecks.length})`} className="text-amber-700" />
                    <div className="bg-amber-50/30 rounded-xl border border-amber-200 overflow-hidden">
                        {data.ManualChecks.map((item, i) => (
                            <div key={i} className="p-4 border-b border-amber-100 last:border-0">
                                <div className="flex gap-3">
                                    <div className="mt-1 min-w-[20px] h-5 rounded-full bg-amber-100 flex items-center justify-center">
                                        <span className="text-amber-700 text-xs font-bold">?</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-800 text-sm">{item.id}</h4>
                                        <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
                                        {item.nodes && item.nodes.length > 0 && (
                                            <div className="mt-2 flex flex-col gap-1">
                                                {item.nodes.slice(0, 2).map((n, idx) => (
                                                    <div key={idx} className="text-[10px] font-mono bg-white p-1.5 rounded border border-amber-100 text-slate-600">
                                                        {n.failureSummary || n.html}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Not Applicable Section */}
            {data.NotApplicable && data.NotApplicable.length > 0 && (
                <div className={`mb-8 ${isPdf ? 'break-inside-avoid pdf-item' : ''}`}>
                    {isPdf ? (
                        <div className="text-xs text-slate-400">
                            <div className="font-medium mb-2 border-b border-slate-100 pb-1">Not Applicable Tests ({data.NotApplicable.length})</div>
                            <div className="grid grid-cols-2 gap-2">
                                {data.NotApplicable.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                        {item.id}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <details className="group">
                            <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Show {data.NotApplicable.length} Not Applicable Tests
                            </summary>
                            <div className="mt-3 pl-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {data.NotApplicable.map((item, i) => (
                                    <div key={i} className="text-xs text-slate-400 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                        {item.id}: {item.description}
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};
