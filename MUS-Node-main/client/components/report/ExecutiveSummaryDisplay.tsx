import React from 'react';
import { CheckCircle2, XCircle, Swords, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ExecutiveSummaryDisplayProps {
    summaryText: string;
    isPdf?: boolean;
}

export const ExecutiveSummaryDisplay: React.FC<ExecutiveSummaryDisplayProps> = ({ summaryText, isPdf = false }) => {

    // --- PARSING LOGIC ---
    const parseSummary = (text: string) => {
        if (!text) return { working: [], notWorking: [], raw: '' };

        // Normalize text
        const safeText = text.replace(/\*\*/g, '').trim();

        let working: string[] = [];
        let notWorking: string[] = [];
        let raw = safeText;

        // Try to split by known headers
        // AI usually outputs: "WHAT IS WORKING: ... WHAT IS NOT WORKING: ..."
        // Regex to find "WHAT IS WORKING:" (case insensitive) and everything after until "WHAT IS NOT WORKING:"
        const workingMatch = safeText.match(/WHAT IS WORKING:([\s\S]*?)(?=WHAT IS NOT WORKING:|$)/i);
        const notWorkingMatch = safeText.match(/WHAT IS NOT WORKING:([\s\S]*?)$/i);

        if (workingMatch || notWorkingMatch) {
            // Helper to clean and split content into sentences/points
            const extractPoints = (sectionText: string) => {
                if (!sectionText) return [];
                // Split by commas or periods that look like list separators, but be careful not to split inside quotes if possible.
                // For simplicity, let's split by regex that looks for typical sentence endings followed by space or newline.
                // Or simply split by commas if it's a comma separated list.
                // The prompt asks for: "Point 1, Point 2 (Citation: ...)"

                // Let's try splitting by newlines first if available
                let lines = sectionText.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);

                if (lines.length <= 1) {
                    // If not newlines, try splitting by specific patterns like "(Citation:" or just sentences.
                    // Actually, the prompt example is: "Clear value proposition... (Citation: '...'), consistent color palette..."
                    // Splitting by "), " seems like a good heuristic.
                    const points = sectionText.split(/\),\s*(?=[A-Z])/); // Split by closing paren, comma, space, and lookahead for Capital letter
                    return points.map(p => {
                        let clean = p.trim();
                        if (!clean.endsWith(')') && clean.includes('(Citation:')) clean += ')'; // Restore closing paren if lost
                        return clean;
                    });
                }
                return lines;
            };

            if (workingMatch && workingMatch[1]) {
                working = extractPoints(workingMatch[1]);
            }
            if (notWorkingMatch && notWorkingMatch[1]) {
                notWorking = extractPoints(notWorkingMatch[1]);
            }
            raw = ''; // We successfully parsed
        }

        return { working, notWorking, raw };
    };

    const { working, notWorking, raw } = parseSummary(summaryText);

    // --- RENDER HELPERS ---
    const Card = ({ title, items, type }: { title: string, items: string[], type: 'working' | 'notWorking' }) => {
        const isWorking = type === 'working';
        const bgClass = isWorking ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100';
        const titleClass = isWorking ? 'text-emerald-900' : 'text-rose-900';
        const iconBg = isWorking ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600';
        const Icon = isWorking ? ThumbsUp : ThumbsDown;
        const BulletIcon = isWorking ? CheckCircle2 : XCircle;
        const bulletClass = isWorking ? 'text-emerald-600' : 'text-rose-600';

        return (
            <div className={`p-6 rounded-xl border ${bgClass} flex-1 min-w-[300px] break-inside-avoid pdf-item`}>
                <div className="flex items-center gap-3 mb-4 border-b border-black/5 pb-4">
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h4 className={`font-bold text-lg ${titleClass}`}>{title}</h4>
                </div>
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <BulletIcon className={`w-5 h-5 shrink-0 mt-0.5 ${bulletClass}`} />
                            <p className="text-slate-700 text-sm leading-relaxed font-medium">
                                {item.replace(/^\W+/, '')} {/* Remove any leading non-word chars like bullets */}
                            </p>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <p className="text-slate-400 italic text-sm">No specific points identified.</p>
                    )}
                </div>
            </div>
        );
    };

    if (raw) {
        // Fallback layout if parsing failed
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 break-inside-avoid pdf-item">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <Swords className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Executive Summary</h3>
                        <p className="text-slate-500 text-sm mt-1">High-level strategic analysis.</p>
                    </div>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100">
                    {raw}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid pdf-item ${!isPdf ? 'animate-in fade-in slide-in-from-bottom-2' : ''}`}>

            <div className="p-6 md:p-8 border-b border-slate-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <Swords className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Strategic Executive Summary</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Key strengths and critical weaknesses identified during the audit.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/50">
                <div className="flex flex-col md:flex-row gap-6">
                    <Card title="What is Working" items={working} type="working" />
                    <Card title="What is Not Working" items={notWorking} type="notWorking" />
                </div>
            </div>
        </div>
    );
};
