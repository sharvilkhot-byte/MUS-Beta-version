import React, { useState, useEffect } from 'react';
import { StrategyAudit } from '../../types';
import { ASSETS } from './constants';
// ✅ Using Lucide Icons for clean, scalable visuals
import {
    Globe,
    Target,
    Lightbulb,
    MapPin,
    Briefcase
} from 'lucide-react';

// --- STYLING CONSTANTS ---
const SECTION_LABEL = "text-xs font-bold text-slate-900 mb-1"; // Black Header
const BODY_STYLE = "text-sm leading-relaxed text-slate-600 font-medium";
const HEADING_STYLE = "text-lg font-bold text-slate-900 leading-tight";

// Helper for Confidence Text (Text Only, No Pill)
const getConfidenceColor = (confidence: string = 'High') => {
    const norm = confidence.toLowerCase();
    if (norm === 'high') return '#059669'; // Emerald-600
    if (norm === 'medium') return '#D97706'; // Amber-600
    return '#DC2626'; // Red-600
};

const ConfidenceText = ({ label }: { label: string }) => {
    const color = getConfidenceColor(label);
    return (
        <span
            className="text-[10px] font-bold uppercase tracking-wider ml-auto whitespace-nowrap"
            style={{ color: color }}
        >
            {label} Confidence
        </span>
    );
};

// --- HELPER: PDF AVATAR (Handles CORS for PDF Generation) ---
const PDFAvatar = ({ url }: { url: string }) => {
    const [imgData, setImgData] = useState<string | null>(null);

    useEffect(() => {
        const toBase64 = (url: string) => {
            return new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else reject(new Error("Canvas context is null"));
                };
                img.onerror = (e) => reject(e);
            });
        };

        const convert = async () => {
            try {
                // Cache busting to ensure fresh fetch
                const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                const base64 = await toBase64(fetchUrl);
                setImgData(base64);
            } catch (e) {
                console.warn("PDFAvatar conversion failed:", e);
            }
        };

        convert();
    }, [url]);

    if (!imgData) return <div className="w-full h-full bg-slate-200" />;
    return <img src={imgData} alt="avatar" className="w-full h-full object-cover block" />;
};

// --- COMPONENT: USER PERSONAS ---
export function UserPersonasDisplay({ personas, isPdf = false }: { personas?: StrategyAudit['UserPersonas'], isPdf?: boolean }) {
    // Using Partner's ASSETS for avatars
    const personaAvatars = [ASSETS.personas.one, ASSETS.personas.two, ASSETS.personas.three];

    if (!personas) return null;

    // ✅ PDF Specific Spacing
    const cardPadding = isPdf ? "p-4" : "p-6";
    const gapClass = isPdf ? "gap-4" : "gap-4";
    const containerClass = isPdf ? "flex flex-col gap-4 mb-4" : "flex flex-col gap-4";

    return (
        <div className={`${containerClass} font-['DM_Sans']`}>
            {personas.map((p, i) => (
                <div key={i} className={`flex flex-col bg-white border border-slate-200 rounded-xl ${cardPadding} break-inside-avoid pdf-item pdf-card shadow-sm ${isPdf ? 'mb-3' : ''}`}>

                    {/* Header: Avatar + Info */}
                    <div className={`flex flex-row items-center gap-4 border-b border-slate-100 ${isPdf ? 'pb-3 mb-3' : 'pb-4 mb-4'}`}>
                        <div className="shrink-0 w-12 h-12 rounded-full border border-slate-100 bg-slate-50 overflow-hidden relative">
                            {isPdf ? (
                                <PDFAvatar url={personaAvatars[i % 3]} />
                            ) : (
                                <img src={personaAvatars[i % 3]} className="w-full h-full object-cover" alt={p.Name} />
                            )}
                        </div>

                        {/* ✅ PDF FIX: Negative margin wrapper for text alignment */}
                        <div className={`flex flex-col flex-1 ${isPdf ? 'mt-[-12px]' : ''}`}>

                            {/* Name and Age Row */}
                            <div className="flex flex-row items-baseline gap-2">
                                <span className={HEADING_STYLE}>{p.Name}</span>
                                {/* Age next to name, Text Only */}
                                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
                                    Age {p.Age}
                                </span>
                            </div>

                            {/* Subtitle */}
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {p.Occupation}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.Location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Stack */}
                    <div className={`flex flex-col ${gapClass}`}>
                        <div>
                            <div className={SECTION_LABEL}>Needs & Behavior</div>
                            <p className={BODY_STYLE}>{p.UserNeedsBehavior}</p>
                        </div>
                        <div>
                            <div className={SECTION_LABEL}>Pain Points & Opportunities</div>
                            <p className={BODY_STYLE}>{p.PainPointOpportunity}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- COMPONENT: STRATEGY AUDIT ---
export function StrategyAuditDisplay({ audit, isPdf = false, forcePageBreak = false }: { audit: StrategyAudit, isPdf?: boolean, forcePageBreak?: boolean }) {
    const { DomainAnalysis, PurposeAnalysis, TargetAudience, UserPersonas } = audit || {};

    // ✅ PDF Specific Spacing
    const cardPadding = isPdf ? "p-4" : "p-5";
    const cardGap = isPdf ? "gap-3" : "gap-5"; // Tighter gap for PDF cards
    const wrapperClass = isPdf ? "flex flex-col gap-4 mb-4" : "flex flex-col gap-6 mb-8";
    const cardsContainerClass = isPdf ? "flex flex-col gap-3" : "flex flex-col gap-4";

    return (
        <div className={`${wrapperClass} font-['DM_Sans']`}>

            {/* Section 1: Context Capture */}
            <div>
                <h3 className={`text-lg font-bold text-slate-800 tracking-tight break-inside-avoid pdf-item pdf-section-header ${isPdf ? 'mb-3' : 'mb-4'} ${forcePageBreak ? 'force-page-break-before' : ''}`}>
                    Context Capture
                </h3>

                <div className={cardsContainerClass}>
                    {/* ... (Content remains same) ... */}
                    {/* 1. Domain Analysis */}
                    {DomainAnalysis && (
                        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl ${cardPadding} gap-4 break-inside-avoid pdf-item pdf-card shadow-sm ${isPdf ? 'mb-2' : ''}`}>
                            {/* Header */}
                            <div className={`flex items-center gap-3 border-b border-slate-100 ${isPdf ? 'pb-2' : 'pb-3'}`}>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="flex flex-1 items-center justify-between">
                                    {/* ✅ PDF FIX: Wrapper div with negative margin for alignment */}
                                    <div className={isPdf ? "-mt-[14px] leading-none" : ""}>
                                        <span className={HEADING_STYLE}>Domain Analysis</span>
                                    </div>
                                    <ConfidenceText label={DomainAnalysis.Confidence || "High"} />
                                </div>
                            </div>
                            {/* Content */}
                            <div className="flex flex-col gap-2">
                                {DomainAnalysis.Items?.map((item, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <span className="text-slate-300 mt-1.5 text-[6px] shrink-0">●</span>
                                        <span className={BODY_STYLE}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Purpose Analysis */}
                    {PurposeAnalysis && (
                        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl ${cardPadding} ${cardGap} break-inside-avoid pdf-item pdf-card shadow-sm ${isPdf ? 'mb-2' : ''}`}>
                            {/* Header */}
                            <div className={`flex items-center gap-3 border-b border-slate-100 ${isPdf ? 'pb-2' : 'pb-3'}`}>
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                                    <Lightbulb className="w-5 h-5" />
                                </div>
                                <div className="flex flex-1 items-center justify-between">
                                    {/* ✅ PDF FIX: Wrapper div with negative margin for alignment */}
                                    <div className={isPdf ? "-mt-[14px] leading-none" : ""}>
                                        <span className={HEADING_STYLE}>Purpose Analysis</span>
                                    </div>
                                    <ConfidenceText label={PurposeAnalysis.Confidence || "High"} />
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`flex flex-col ${cardGap}`}>
                                <div>
                                    <div className={SECTION_LABEL}>Primary Purpose</div>
                                    <p className={`${BODY_STYLE} whitespace-pre-line`}>
                                        {PurposeAnalysis.PrimaryPurpose?.join('\n')}
                                    </p>
                                </div>
                                <div>
                                    <div className={SECTION_LABEL}>Key Objectives</div>
                                    <p className={BODY_STYLE}>{PurposeAnalysis.KeyObjectives}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Target Audience */}
                    {TargetAudience && (
                        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl ${cardPadding} ${cardGap} break-inside-avoid pdf-item pdf-card shadow-sm ${isPdf ? 'mb-2' : ''}`}>
                            {/* Header */}
                            <div className={`flex items-center gap-3 border-b border-slate-100 ${isPdf ? 'pb-2' : 'pb-3'}`}>
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="flex flex-1 items-center justify-between">
                                    {/* ✅ PDF FIX: Wrapper div with negative margin for alignment */}
                                    <div className={isPdf ? "-mt-[14px] leading-none" : ""}>
                                        <span className={HEADING_STYLE}>Target Audience</span>
                                    </div>
                                    <ConfidenceText label={TargetAudience.Confidence || "High"} />
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`flex flex-col ${cardGap}`}>
                                <div>
                                    <div className={SECTION_LABEL}>Website Type</div>
                                    <p className={BODY_STYLE}>{TargetAudience.WebsiteType}</p>
                                </div>
                                <div>
                                    <div className={SECTION_LABEL}>Primary Audience</div>
                                    <div className="flex flex-col gap-1">
                                        {TargetAudience.Primary.map((p, i) => (
                                            <p key={i} className={BODY_STYLE}>• {p}</p>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className={SECTION_LABEL}>Demographics</div>
                                    <p className={BODY_STYLE}>{TargetAudience.DemographicsPsychographics}</p>
                                </div>
                                <div>
                                    <div className={SECTION_LABEL}>Market Segmentation</div>
                                    <p className={BODY_STYLE}>{TargetAudience.MarketSegmentation}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: User Personas */}
            {UserPersonas?.length > 0 && (
                <div className="flex flex-col self-stretch gap-4 mt-4">
                    <h3 className={`text-lg font-bold text-slate-800 tracking-tight break-inside-avoid pdf-item pdf-section-header ${isPdf ? 'mb-3' : 'mb-4'}`}>
                        User Personas
                    </h3>
                    <UserPersonasDisplay personas={UserPersonas} isPdf={isPdf} />
                </div>
            )}
        </div>
    );
}