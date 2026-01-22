import React, { useState, useMemo, useEffect } from 'react';
import { Share2, Download, Loader2 } from 'lucide-react';
import { AnalysisReport, Screenshot, CriticalIssue } from '../types';
import { SkeletonLoader } from './SkeletonLoader';
import { Logo } from './Logo';
import { UserBadge } from './UserBadge';
import toast from 'react-hot-toast';

// --- PARTNER FEATURES (Logic) ---
import { saveSharedAudit } from '../services/auditStorage';
import { AuthBlocker } from './AuthBlocker';
import { useAuth } from '../contexts/AuthContext';

// --- YOUR UI COMPONENTS ---
import { StandardAuditOverview } from './report/StandardAuditOverview';
import { ScoreDisplayCard } from './report/ScoreComponents';
import { CriticalIssueCard } from './report/AuditCards';
import { DetailedAuditView, DetailedAuditType } from './report/DetailedAuditView';
import { AccessibilityAuditView } from './report/AccessibilityAuditView';
import { CompetitorAnalysisView } from './report/CompetitorAnalysisView';

// --- ASSETS & HOOKS ---
import { ASSETS } from './report/constants';
import { useReportPdf } from '../hooks/useReportPdf';

// --- TYPES ---
interface ReportDisplayProps {
    report: AnalysisReport | null;
    url: string;
    screenshots: Screenshot[];
    screenshotMimeType: string;
    performanceError: string | null;
    auditId: string | null;
    onRunNewAudit: () => void;
    whiteLabelLogo: string | null;
}

// ... (previous imports)

export function ReportDisplay({
    report,
    url,
    screenshots,
    screenshotMimeType,
    performanceError,
    auditId,
    onRunNewAudit,
    whiteLabelLogo
}: ReportDisplayProps) {

    // --- HOOKS ---
    const { isLocked, isLoading: isAuthLoading } = useAuth();

    // --- DERIVED STATE ---
    const isReportReady = !!report;
    const primaryScreenshotSrc = (screenshots && screenshots.length > 0 && screenshots[0].data)
        ? `data:${screenshotMimeType || 'image/png'};base64,${screenshots[0].data}`
        : null;

    // Helper: Calculate Overall Score
    const overallScore = useMemo(() => {
        if (!report) return 0;
        const categories = [
            report["UX Audit expert"]?.CategoryScore,
            report["Product Audit expert"]?.CategoryScore,
            report["Visual Audit expert"]?.CategoryScore,
            report["Strategy Audit expert"]?.CategoryScore,
            report["Accessibility Audit expert"]?.CategoryScore
        ].filter(s => typeof s === 'number');

        if (categories.length === 0) return 0;
        return categories.reduce((a, b) => a + b, 0) / categories.length;
    }, [report]);

    // --- DATA ---
    const {
        "UX Audit expert": ux,
        "Product Audit expert": product,
        "Visual Audit expert": visual,
        "Strategy Audit expert": strategy,
        "Accessibility Audit expert": accessibility,
        "Competitor Analysis expert": competitorAnalysis,
        Top5ContextualIssues
    } = report || {};

    const isCompetitorReport = !!competitorAnalysis;

    // --- STATE ---
    // Default tab
    const [activeTab, setActiveTab] = useState(isCompetitorReport ? 'Competitor Analysis' : 'Overview'); // Changed default to Overview for Standard
    const [isSharing, setIsSharing] = useState(false);

    // Scroll Target State for Navigation
    const [scrollToId, setScrollToId] = useState<string | null>(null);

    // Dynamic Tabs
    const TABS = useMemo(() => {
        if (isCompetitorReport) return ['Competitor Analysis'];
        // Added Overview as first tab
        return ['Overview', 'Executive Summary'];
    }, [isCompetitorReport]);

    // Effect: Handle Scrolling after Tab Change
    useEffect(() => {
        if (scrollToId) {
            // Tiny timeout to ensure DOM is rendered after tab switch
            const timer = setTimeout(() => {
                const element = document.getElementById(scrollToId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight effect (optional, implies adding class)
                    element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4'), 2000);
                }
                setScrollToId(null); // Reset
            }, 150); // 150ms delay for React render cycle
            return () => clearTimeout(timer);
        }
    }, [activeTab, scrollToId]); // Trigger when activeTab updates AND we have a target

    // Navigation Handler
    const handleOverviewNavigate = (tabName: string, parameterId: string) => {
        setActiveTab(tabName);
        setScrollToId(parameterId);
    };

    // ... (rest of effects and auth logic)

    // ...

    // Share Handler
    const handleShareReport = async () => {
        if (!report) return;
        setIsSharing(true);
        try {
            const id = await saveSharedAudit({
                url,
                report,
                screenshots,
                screenshotMimeType,
                whiteLabelLogo
            });
            // Construct Link
            const shareUrl = `${window.location.origin}/overview/${id}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Report link copied to clipboard!');
        } catch (error) {
            console.error('Share error:', error);
            toast.error('Failed to generate share link.');
        } finally {
            setIsSharing(false);
        }
    };

    // PDF Hook
    const { generatePdf, isPdfGenerating } = useReportPdf({
        report,
        url,
        screenshots,
        whiteLabelLogo
    });

    return (
        <div>
            {/* ... Header ... */}

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* ... Error/Loading checks ... */}

                {isReportReady && (
                    <>
                        {/* Tab Navigation */}
                        <div className="px-4 sm:px-6 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center py-4 gap-4 bg-slate-50/50">
                            <nav className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === tab
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {/* Share Button */}
                                <button
                                    onClick={handleShareReport}
                                    disabled={isSharing}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Share Report"
                                >
                                    {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                                </button>

                                {/* PDF Download Button */}
                                <button
                                    onClick={generatePdf}
                                    disabled={isPdfGenerating}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Download PDF"
                                >
                                    {isPdfGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            {/* ... Auth Blocker ... */}

                            <div className={`p-6 font-['DM_Sans'] transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none select-none h-[600px] overflow-hidden' : ''}`}>

                                {/* --- COMPETITOR ANALYSIS VIEW --- */}
                                {activeTab === 'Competitor Analysis' && competitorAnalysis && (
                                    <CompetitorAnalysisView data={competitorAnalysis} />
                                )}

                                {/* --- STANDARD AUDIT OVERVIEW (NEW) --- */}
                                {activeTab === 'Overview' && !isCompetitorReport && report && (
                                    <StandardAuditOverview report={report} onNavigate={handleOverviewNavigate} />
                                )}

                                {/* --- STANDARD EXECUTIVE SUMMARY --- */}
                                {activeTab === 'Executive Summary' && !isCompetitorReport && (
                                    // ... (Existing Exec Summary Content)
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex flex-col self-stretch">
                                            <div className="w-full max-w-md mx-auto mb-6">
                                                <ScoreDisplayCard score={overallScore} label="Overall Score" isHero={true} />
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                                {product ? <ScoreDisplayCard score={product.CategoryScore} label="Product Audit" /> : <SkeletonLoader className="h-32" />}
                                                {ux ? <ScoreDisplayCard score={ux.CategoryScore} label="UX Audit" /> : <SkeletonLoader className="h-32" />}
                                                {visual ? <ScoreDisplayCard score={visual.CategoryScore} label="Visual Design" /> : <SkeletonLoader className="h-32" />}
                                                {accessibility ? <ScoreDisplayCard score={accessibility.CategoryScore} label="Accessibility" /> : <SkeletonLoader className="h-32" />}
                                            </div>
                                            {primaryScreenshotSrc ? (
                                                <div className="self-stretch w-full mb-8">
                                                    <div className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-left">Analyzed Page View</div>
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm relative overflow-hidden h-[450px]">
                                                        <img src={primaryScreenshotSrc} className="w-full absolute top-0 left-0 h-auto" alt="Preview" />
                                                    </div>
                                                </div>
                                            ) : <SkeletonLoader className="h-[400px] w-full mb-8 rounded-xl" />}
                                        </div>

                                        {strategy?.ExecutiveSummary && (
                                            <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-xl relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <h3 className="text-indigo-900 font-bold text-xl mb-3">Executive Summary</h3>
                                                    <p className="text-indigo-900/90 leading-relaxed text-base font-medium whitespace-pre-line">
                                                        {strategy.ExecutiveSummary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <DetailedAuditView auditData={strategy} auditType={'Strategic Foundation'} />
                                        <div className="mt-8">
                                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Top 5 Impactful Issues</h2>
                                            <div className="flex flex-col gap-4">
                                                {Top5ContextualIssues?.map((issue, index) => (
                                                    <CriticalIssueCard key={index} issue={issue} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- OTHER STANDARD TABS --- */}
                                {activeTab !== 'Overview' && activeTab !== 'Executive Summary' && activeTab !== 'Competitor Analysis' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4">
                                        {activeTab === 'Accessibility' ? (
                                            <AccessibilityAuditView data={accessibility} />
                                        ) : (
                                            <DetailedAuditView
                                                auditData={activeTab === 'UX Audit' ? ux : activeTab === 'Product Audit' ? product : activeTab === 'Visual Design' ? visual : strategy}
                                                auditType={activeTab as DetailedAuditType}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}