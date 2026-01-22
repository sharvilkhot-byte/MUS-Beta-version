import React, { useMemo, useState } from 'react';
import { AnalysisReport, ScoredParameter } from '../../types';
import { Layers, Rocket, Palette, BrainCircuit, ScanEye, ChevronDown, ChevronUp } from 'lucide-react';
import { ScoredParameterCard } from './AuditCards';

interface Props {
    report: AnalysisReport;
    onNavigate?: (tab: string, parameterId: string) => void;
}

interface OverviewRow {
    id: string;
    category: string;
    categoryIcon: React.ElementType;
    tabName: string;
    parameter: string;
    score: number;
    description: string;
    // Store full object for creating the card
    data: ScoredParameter;
}

const TABS = [
    { id: 'all', label: 'All Parameters', icon: null },
    { id: 'ux', label: 'UX Audit', icon: Layers },
    { id: 'visual', label: 'Visual Design', icon: Palette },
    { id: 'product', label: 'Product Audit', icon: Rocket },
    { id: 'accessibility', label: 'Accessibility', icon: ScanEye },
];

export const StandardAuditOverview: React.FC<Props> = ({ report }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const rows = useMemo(() => {
        const all: OverviewRow[] = [];
        const toId = (text: string) => text ? `param-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';

        const add = (items: { Parameters?: ScoredParameter[] } | undefined, category: string, icon: any, tab: string) => {
            if (items?.Parameters) {
                items.Parameters.forEach(p => {
                    // Show if it has a valid score OR if it's not explicitly skipped/N/A
                    // Some N/A parameters might have score 0 or null.
                    // We hide if Score is explicitly 0 AND Analysis contains "Not Applicable" or similar.
                    // Show ALL parameters, even N/A ones, as requested.
                    const analysisLower = p.Analysis?.toLowerCase() || '';
                    // const isNotApplicable = p.Score === 0 && (analysisLower.includes("not applicable") || analysisLower.includes("n/a") || analysisLower.includes("irrelevant"));

                    // if (!isNotApplicable) {
                    all.push({
                        id: toId(p.ParameterName) + Math.random().toString(36).substr(2, 5),
                        category,
                        categoryIcon: icon,
                        tabName: tab,
                        parameter: p.ParameterName || 'Unknown Parameter',
                        score: p.Score,
                        description: p.KeyFinding || p.Analysis,
                        data: p
                    });
                    // }
                });
            }
        };

        if (report['UX Audit expert']) {
            const ux = report['UX Audit expert'];
            add(ux.UsabilityHeuristics, 'UX', Layers, 'UX Audit');
            add(ux.UsabilityMetrics, 'UX', Layers, 'UX Audit');
            add(ux.AccessibilityCompliance, 'UX', Layers, 'UX Audit');
        }

        if (report['Product Audit expert']) {
            const prod = report['Product Audit expert'];
            add(prod.MarketFitAndBusinessAlignment, 'Product', Rocket, 'Product Audit');
            add(prod.UserRetentionAndEngagement, 'Product', Rocket, 'Product Audit');
            add(prod.ConversionOptimization, 'Product', Rocket, 'Product Audit');
        }

        if (report['Visual Audit expert']) {
            const vis = report['Visual Audit expert'];
            add(vis.UIConsistencyAndBranding, 'Visual', Palette, 'Visual Design');
            add(vis.AestheticAndEmotionalAppeal, 'Visual', Palette, 'Visual Design');
            add(vis.ResponsivenessAndAdaptability, 'Visual', Palette, 'Visual Design');
        }



        if (report['Accessibility Audit expert']) {
            const acc = report['Accessibility Audit expert'];
            add(acc.AutomatedCompliance, 'Access.', ScanEye, 'Accessibility');
            add(acc.ScreenReaderExperience, 'Access.', ScanEye, 'Accessibility');
            add(acc.VisualAccessibility, 'Access.', ScanEye, 'Accessibility');
        }

        return all;
    }, [report]);

    const filteredRows = useMemo(() => {
        if (activeTab === 'all') return rows;
        // Map tab IDs to the categories used in 'add' function helper labels (roughly)
        const catMap: Record<string, string> = {
            'ux': 'UX',
            'product': 'Product',
            'visual': 'Visual',
            'accessibility': 'Access.'
        };
        return rows.filter(r => r.category === catMap[activeTab]);
    }, [rows, activeTab]);

    const toggleExpand = (id: string) => {
        setExpandedId(current => current === id ? null : id);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">

            {/* Header & Tabs */}
            <div className="border-b border-slate-100">
                <div className="p-6 pb-4">
                    <h3 className="text-xl font-bold text-slate-900">Score Breakdown</h3>
                    <p className="text-slate-500 text-sm mt-1">Detailed analysis of {rows.length} parameters.</p>
                </div>

                {/* Scrollable Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar px-6 gap-2 pb-4">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
                                    ${isActive
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                                `}
                            >
                                {Icon && <Icon className="w-4 h-4" />}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-4 w-16"></th>
                            <th className="p-4 w-1/3">Parameter</th>
                            <th className="p-4 text-center w-24">Score</th>
                            <th className="p-4">Key Insight</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRows.map((row) => {
                            const isExpanded = expandedId === row.id;
                            const scoreColor = row.score >= 8 ? 'bg-green-100 text-green-700' : row.score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

                            return (
                                <React.Fragment key={row.id}>
                                    <tr
                                        onClick={() => toggleExpand(row.id)}
                                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="p-4 text-slate-400">
                                            <div className="flex flex-col items-center gap-1" title={row.category}>
                                                <row.categoryIcon className={`w-5 h-5 ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-900">
                                            {(row.parameter || 'Unknown Parameter').replace(/([A-Z])/g, ' $1').trim()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${scoreColor}`}>
                                                {row.score}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 truncate max-w-xs md:max-w-md">
                                            {row.description}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                                        </td>
                                    </tr>

                                    {/* Expanded Detail Card - EXACT REPLICA OF DETAILED VIEW */}
                                    {isExpanded && (
                                        <tr className="bg-indigo-50/10">
                                            <td colSpan={5} className="p-4 pt-1 pb-6">
                                                <div className="ml-4 mr-4 animate-in slide-in-from-top-2">
                                                    <ScoredParameterCard parameter={row.data} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredRows.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    <p>No parameters found for this section.</p>
                </div>
            )}
        </div>
    );
};
