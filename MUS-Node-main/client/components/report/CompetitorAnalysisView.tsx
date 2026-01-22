import React, { useState } from 'react';
import { CompetitorAnalysisData, CompetitorComparisonItem } from '../../types';
import { Trophy, TrendingUp, Target, Swords, CheckCircle2, XCircle, MinusCircle, Layers, Rocket, Palette, LayoutDashboard, BrainCircuit, ScanEye } from 'lucide-react';

interface CompetitorAnalysisViewProps {
    data: CompetitorAnalysisData;
    isPdf?: boolean;
}

export const CompetitorAnalysisView: React.FC<CompetitorAnalysisViewProps> = ({ data, isPdf = false }) => {
    const [activeTab, setActiveTab] = useState<'Summary' | 'UX' | 'Product' | 'Visual' | 'Strategy' | 'Accessibility'>('Summary');

    if (!data) return null;

    // Helper to render comparison table
    const ComparisonTable = ({ items, title }: { items: CompetitorComparisonItem[], title: string }) => {
        if (!items || items.length === 0) return null;
        return (
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${!isPdf ? 'animate-in fade-in slide-in-from-bottom-4' : 'mb-8 break-inside-avoid pdf-item'}`}>
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900">{title} Face-off</h3>
                    <p className="text-slate-500 text-sm mt-1">Direct scoring comparison.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b border-slate-200">Parameter</th>
                                <th className="p-4 font-semibold border-b border-slate-200 w-24 text-center">You</th>
                                <th className="p-4 font-semibold border-b border-slate-200 w-24 text-center">Them</th>
                                <th className="p-4 font-semibold border-b border-slate-200 w-24 text-center">Winner</th>
                                <th className="p-4 font-semibold border-b border-slate-200 min-w-[300px]">Analysis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm md:text-base">
                            {items?.filter(item => !(item.PrimaryScore === 0 && item.CompetitorScore === 0 && (item.Analysis.includes('N/A') || item.Analysis.includes('Not Applicable'))))
                                .map((item, idx) => (
                                    <tr key={idx} className={!isPdf ? "hover:bg-slate-50 transition-colors" : ""}>
                                        <td className="p-4 font-medium text-slate-900">{item.Parameter}</td>
                                        <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">{item.PrimaryScore}/10</td>
                                        <td className="p-4 text-center font-bold text-slate-600">{item.CompetitorScore}/10</td>
                                        <td className="p-4 text-center">
                                            {item.Winner === 'Primary' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">You</span>}
                                            {item.Winner === 'Competitor' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Them</span>}
                                            {item.Winner === 'Tie' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Tie</span>}
                                        </td>
                                        <td className="p-4 text-slate-600 leading-relaxed">{item.Analysis}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">

            {/* Internal Tab Navigation - Hide if PDF */}
            {!isPdf && (
                <div className="bg-slate-100/50 p-1.5 rounded-xl flex overflow-x-auto space-x-1 border border-slate-200">
                    {[
                        { id: 'Summary', icon: LayoutDashboard, label: 'Overview' },
                        { id: 'UX', icon: Layers, label: 'UX Face-off' },
                        { id: 'Product', icon: Rocket, label: 'Product Face-off' },
                        { id: 'Visual', icon: Palette, label: 'Visual Face-off' },
                        { id: 'Strategy', icon: BrainCircuit, label: 'Strategy Face-off' },
                        { id: 'Accessibility', icon: ScanEye, label: 'Accessibility Face-off' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}


            {(activeTab === 'Summary' || isPdf) && (
                <div className={`space-y-8 ${!isPdf ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
                    {/* 1. Executive Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 break-inside-avoid pdf-item">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <Swords className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Head-to-Head Executive Summary</h3>
                                <p className="text-slate-500 text-sm mt-1">High-level strategic comparison between your site and the competitor.</p>
                            </div>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100">
                            {data.ExecutiveSummary}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Your Advantages */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 break-inside-avoid pdf-item">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Your Key Advantages</h3>
                            </div>
                            <div className="space-y-4">
                                {(!data.PrimaryStrengths || data.PrimaryStrengths.length === 0) && (
                                    <p className="text-slate-400 italic text-sm">No specific advantages identified.</p>
                                )}
                                {data.PrimaryStrengths?.map((str, i) => (
                                    <div key={i} className="group p-4 rounded-xl border border-green-100 bg-green-50/30 hover:bg-green-50 hover:border-green-200 transition-all">
                                        <h4 className="font-bold text-green-900 mb-1 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            {str.Strength}
                                        </h4>
                                        <p className="text-slate-700 text-sm mb-2">{str.Description}</p>
                                        <div className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded w-fit uppercase tracking-wide">
                                            Impact: {str.Impact}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Competitor Strengths */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 break-inside-avoid pdf-item">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <Target className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Competitor's Winning Moves</h3>
                            </div>
                            <div className="space-y-4">
                                {(!data.CompetitorStrengths || data.CompetitorStrengths.length === 0) && (
                                    <p className="text-slate-400 italic text-sm">No specific competitor strengths identified.</p>
                                )}
                                {data.CompetitorStrengths?.map((str, i) => (
                                    <div key={i} className="group p-4 rounded-xl border border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200 transition-all">
                                        <h4 className="font-bold text-red-900 mb-1 flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-red-600" />
                                            {str.Strength}
                                        </h4>
                                        <p className="text-slate-700 text-sm mb-2">{str.Description}</p>
                                        <div className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded w-fit uppercase tracking-wide">
                                            Impact: {str.Impact}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Opportunities */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg text-white overflow-hidden relative break-inside-avoid pdf-item">
                        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="p-8 relative z-10">
                            <div className="flex items-center gap-4 mb-8 border-b border-indigo-400/30 pb-6">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <TrendingUp className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">How to Beat Them</h3>
                                    <p className="text-indigo-100 mt-1">Strategic opportunities to regain the lead.</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {(!data.Opportunities || data.Opportunities.length === 0) && (
                                    <div className="col-span-full p-6 text-center text-indigo-200 italic">
                                        No specific opportunities identified.
                                    </div>
                                )}
                                {data.Opportunities?.map((opp, idx) => (
                                    <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-xl hover:bg-white/15 transition-all">
                                        <h4 className="font-bold text-lg mb-3 text-white flex items-start gap-2">
                                            <span className="opacity-60 font-mono text-sm mt-1">0{idx + 1}</span>
                                            {opp.Opportunity}
                                        </h4>
                                        <p className="text-indigo-100 text-sm leading-relaxed border-t border-white/10 pt-3">
                                            {opp.ActionPlan}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'UX' || isPdf) && <ComparisonTable items={data.UXComparison} title="User Experience (UX)" />}
            {(activeTab === 'Product' || isPdf) && <ComparisonTable items={data.ProductComparison} title="Product & Value" />}
            {(activeTab === 'Visual' || isPdf) && <ComparisonTable items={data.VisualComparison} title="Visual Design & Branding" />}
            {(activeTab === 'Strategy' || isPdf) && <ComparisonTable items={data.StrategyComparison} title="Strategic Positioning" />}
            {(activeTab === 'Accessibility' || isPdf) && <ComparisonTable items={data.AccessibilityComparison} title="Accessibility Compliance" />}

        </div>
    );
};
