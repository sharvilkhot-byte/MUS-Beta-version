import React from 'react';
import { UXAudit, ProductAudit, VisualAudit, StrategyAudit, ScoredParameter } from '../../types';
import { SkeletonLoader } from '../SkeletonLoader';
import { AuditSubSectionHeader, ScoredParameterCard } from './AuditCards';
import { StrategyAuditDisplay } from './StrategyComponents';

export type DetailedAuditType = 'UX Audit' | 'Product Audit' | 'Visual Design' | 'Strategic Foundation';

function mapAuditToSections(audit: UXAudit | ProductAudit | VisualAudit, type: DetailedAuditType) {
    if (!audit) return [];
    switch (type) {
        case 'UX Audit': return [
            { title: 'Usability Heuristics', data: (audit as UXAudit).UsabilityHeuristics },
            { title: 'Usability Metrics', data: (audit as UXAudit).UsabilityMetrics },
            { title: 'Accessibility Compliance', data: (audit as UXAudit).AccessibilityCompliance },
        ];
        case 'Product Audit': return [
            { title: 'Market Fit & Business Alignment', data: (audit as ProductAudit).MarketFitAndBusinessAlignment },
            { title: 'User Retention & Engagement', data: (audit as ProductAudit).UserRetentionAndEngagement },
            { title: 'Conversion Optimization', data: (audit as ProductAudit).ConversionOptimization },
        ];
        case 'Visual Design': return [
            { title: 'UI Consistency & Branding', data: (audit as VisualAudit).UIConsistencyAndBranding },
            { title: 'Aesthetic & Emotional Appeal', data: (audit as VisualAudit).AestheticAndEmotionalAppeal },
            { title: 'Responsiveness & Adaptability', data: (audit as VisualAudit).ResponsivenessAndAdaptability },
        ];
        default: return [];
    }
}

export function DetailedAuditView({ auditData, auditType, isPdf = false, forcePageBreak = false }: { auditData: UXAudit | ProductAudit | VisualAudit | StrategyAudit | undefined, auditType: DetailedAuditType, isPdf?: boolean, forcePageBreak?: boolean }) {
    if (!auditData) {
        return <SkeletonLoader className="h-96 w-full" />;
    }

    if (auditType === 'Strategic Foundation') {
        return (
            <div className="self-stretch">
                <StrategyAuditDisplay audit={auditData as StrategyAudit} isPdf={isPdf} forcePageBreak={forcePageBreak} />
            </div>
        );
    }

    // Cast to generic type that has the common fields for UX, Product, Visual
    const audit = auditData as (UXAudit | ProductAudit | VisualAudit);
    const sections = mapAuditToSections(audit, auditType);

    // Split sections to group the first one with the header
    const [firstSection, ...remainingSections] = sections;

    // ✅ PDF Spacing Constants
    const mainGap = isPdf ? "gap-2" : "gap-2";
    const headerWrapperGap = isPdf ? "gap-0" : "gap-0"; // Tightened gap between Main Title and First Subtitle
    const cardGap = isPdf ? "gap-0" : "gap-2"; // Tighter cards for PDF
    const sectionMargin = isPdf ? "mb-2" : "mb-2"; // Use user's preferred margin

    // Split parameters for the first section to allow breaking
    const firstParams = firstSection?.data?.Parameters || [];
    const [param1, ...restParams] = firstParams;
    const hasRestParams = restParams.length > 0;

    return (
        <div className={`flex flex-col self-stretch ${mainGap} font-['DM_Sans']`}>

            {/* HEADER + SUBHEADER + FIRST CARD (Unbreakable Unit) */}
            <div className={`break-inside-avoid pdf-item flex flex-col ${headerWrapperGap} ${forcePageBreak ? 'force-page-break-before' : ''}`}>
                <h2 className="text-2xl font-bold text-slate-800 mb-0 break-inside-avoid pdf-section-title">
                    Detailed {auditType}
                </h2>

                {/* First Section Part 1 */}
                {firstSection && (
                    <div className={hasRestParams ? "mb-0" : sectionMargin}>
                        <AuditSubSectionHeader title={firstSection.title} score={firstSection.data?.SectionScore * 10 || 0} forceBreak={false} isPdf={isPdf} />
                        <div className={`flex flex-col self-stretch ${cardGap}`}>
                            {param1 && <ScoredParameterCard parameter={param1} isPdf={isPdf} />}
                        </div>
                    </div>
                )}
            </div>

            {/* First Section Part 2 (Breakable) */}
            {hasRestParams && (
                <div className={`flex flex-col self-stretch ${cardGap} ${isPdf ? '-mt-2' : ''} ${sectionMargin}`}>
                    {restParams.map((p: ScoredParameter, i: number) => (
                        <ScoredParameterCard key={i} parameter={p} isPdf={isPdf} />
                    ))}
                </div>
            )}

            {/* Remaining Detailed Sections */}
            {remainingSections.map((section, index) => (
                section.data && section.data.Parameters && (
                    <div key={section.title} className={sectionMargin}>
                        <AuditSubSectionHeader title={section.title} score={section.data?.SectionScore * 10 || 0} forceBreak={false} isPdf={isPdf} />
                        <div className={`flex flex-col self-stretch ${cardGap}`}>
                            {section.data.Parameters.map((p: ScoredParameter, i: number) => <ScoredParameterCard key={i} parameter={p} isPdf={isPdf} />)}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}
