import React from 'react';
import { SkeletonLoader } from '../SkeletonLoader';

// --- 🎨 PREMIUM THEME PALETTE ---
// Logic: Custom colors based on score range (Matches your UI design)
export const getThemeStyles = (score: number) => {
    // 9-10: Very Good (Emerald)
    if (score >= 9) return {
        solid: "#059669",
        soft: "#ECFDF5",
        pill: "#D1FAE5",
        label: "Very Good"
    };
    // 7-8.9: Satisfactory (Amber) - Custom Soft Yellows
    if (score >= 7) return {
        solid: "#D97706",
        soft: "#FFFBEB",
        pill: "#F6E0C4",  // Your custom amber
        label: "Satisfactory"
    };
    // 5-6.9: Needs Improvement (Orange) - Custom Soft Orange
    if (score >= 5) return {
        solid: "#EA580C",
        soft: "#FFF7ED",
        pill: "#FADCB5",  // Your custom orange
        label: "Needs Improvement"
    };
    // 0-4.9: Critical (Red)
    return {
        solid: "#DC2626",
        soft: "#FEF2F2",
        pill: "#FEE2E2",
        label: "Critical"
    };
};

// Helper for other components (Keeping Partner's function signature for compatibility)
export const getScoreIndicatorData = (score: number) => {
    const theme = getThemeStyles(score);
    return {
        text: theme.label,
        textColor: theme.solid,
        bgColor: "#FFFFFF",
        boxColor: theme.soft
    };
};

// --- GAUGE COMPONENT (SVG Ring) ---
export function ScoreGauge({ score, size = 74, strokeWidth = 8, isHero = false }: { score: number; size?: number; strokeWidth?: number; isHero?: boolean }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half circle
    const cappedScore = Math.max(0, Math.min(10, score));
    const offset = circumference - (cappedScore / 10) * circumference;

    const theme = getThemeStyles(score);

    return (
        <svg
            width={size}
            height={size / 2 + strokeWidth / 2}
            viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}
            style={{ overflow: 'visible' }}
        >
            {/* Background Track */}
            <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke={isHero ? "#F1F5F9" : "#E2E8F0"} // Lighter track for Hero
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            {/* Progress Arc */}
            <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke={theme.solid}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                    transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />
        </svg>
    );
}

// --- INDICATOR COMPONENT (Small) ---
export function ScoreIndicator({ score }: { score: number }) {
    const theme = getThemeStyles(score);
    const scoreText = Math.round(score);

    return (
        <div
            className="flex flex-col shrink-0 items-center py-3 px-6 gap-2 rounded-xl"
            style={{ backgroundColor: theme.soft }}
        >
            <div className="relative w-[74px] h-[41px]">
                <div className="absolute top-0 left-0">
                    <ScoreGauge score={score} />
                </div>
                <span className="text-slate-900 text-[13px] font-bold absolute bottom-[5px] inset-x-0 text-center leading-none">
                    {scoreText}<span className="text-[10px] text-slate-500 font-normal">/10</span>
                </span>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: theme.solid }}>
                {theme.label}
            </span>
        </div>
    );
}

// --- MAIN CARD COMPONENT (Hero & Mini) ---
// --- MAIN CARD COMPONENT (Hero & Mini) ---
export function ScoreDisplayCard({ score, label, isHero = false, isPdf = false }: { score?: number; label: string, isHero?: boolean, isPdf?: boolean }) {
    if (score === undefined) return <SkeletonLoader className="h-32 flex-1 rounded-lg" />;

    const theme = getThemeStyles(score);

    // --- SIZING LOGIC ---
    const gaugeSize = isHero ? 200 : 90;
    const gaugeStroke = isHero ? 18 : 9;
    const fontSize = isHero ? "text-[56px]" : "text-[22px]";
    const labelSize = isHero ? "text-[16px]" : "text-[12px]";
    const badgeSize = isHero ? "text-[14px] px-6 py-2" : "text-[10px] px-2 py-1";

    // Hero Specific Styles (Dark Text, Dark Badge)
    const heroTextColor = "#24312D";
    const heroPillBg = "#24312D";
    const heroPillText = "#FFFFFF";

    // Container Style
    const containerClasses = isHero
        ? `flex flex-col items-center justify-center ${isPdf ? 'pt-0 pb-1' : 'py-6'} w-full h-full`
        : "flex flex-1 flex-col items-center justify-center py-5 px-2 rounded-xl h-full";

    const containerStyle = isHero
        ? { backgroundColor: 'transparent' }
        : { backgroundColor: theme.soft };

    return (
        <div className={containerClasses} style={containerStyle}>

            {/* 1. Gauge & Score Number */}
            {/* PDF Fix: Added 'mb-4' for Hero to push text down safely */}
            <div className={`flex flex-col items-center relative ${isHero ? (isPdf ? 'mb-2' : 'mb-4') : 'mb-1'}`}>
                <div style={{ width: `${gaugeSize}px`, height: `${gaugeSize / 2}px`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0 }}>
                        <ScoreGauge score={score} size={gaugeSize} strokeWidth={gaugeStroke} isHero={isHero} />
                    </div>
                    {/* Centered Number */}
                    {/* PDF Fix: Removed 'transform' which causes overlap. Used 'bottom' positioning. */}
                    <span
                        className={`absolute inset-x-0 text-center font-extrabold leading-none ${fontSize}`}
                        style={{
                            bottom: isHero ? (isPdf ? '5px' : '-5px') : '0px',
                            color: isHero ? heroTextColor : '#0F172A'
                        }}
                    >
                        {score.toFixed(1)}
                    </span>
                </div>
            </div>

            {/* 2. Label */}
            {/* PDF Fix: Added 'mt-2' for Hero */}
            <span
                className={`font-bold text-center uppercase tracking-wide mb-3 ${labelSize} ${isHero ? (isPdf ? 'mt-1' : 'mt-2') : ''}`}
                style={{
                    color: isHero ? heroTextColor : '#475569'
                }}
            >
                {label}
            </span>

            {/* 3. Rating Pill */}
            <div className={`rounded-full font-bold uppercase tracking-widest ${badgeSize} shadow-sm`}
                style={{
                    backgroundColor: isHero ? heroPillBg : theme.pill,
                    color: isHero ? heroPillText : theme.solid,
                    // ✅ PDF FIX: These styles ensure the pill text is centered vertically in PDF generation
                    display: isPdf ? 'inline-block' : 'block',
                    lineHeight: isPdf ? '1' : undefined,
                    paddingTop: isPdf ? '8px' : undefined
                }}>
                {/* ✅ PDF FIX: Relative positioning to nudge text up slightly if needed in PDF mode */}
                {isPdf ? (
                    <span style={{ position: 'relative', top: '-7px', display: 'inline-block' }}>
                        {theme.label}
                    </span>
                ) : (
                    theme.label
                )}
            </div>
        </div>
    );
}