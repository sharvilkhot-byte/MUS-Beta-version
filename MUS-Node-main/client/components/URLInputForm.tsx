import React, { useState, useRef } from 'react';
import { WhiteLabelModal } from './WhiteLabelModal';
import { AuditInput } from '../types';
// ✅ Using Lucide React for consistent, high-quality icons
import {
  Zap,
  ImagePlus,
  Globe,
  FileImage,
  X,
  Settings2,
  Plus,
  Loader2,
  Swords // For Competitor Icon
} from 'lucide-react';

interface URLInputFormProps {
  onAnalyze: (inputs: AuditInput[], auditMode: 'standard' | 'competitor') => void;
  isLoading: boolean;
  whiteLabelLogo: string | null;
  onWhiteLabelLogoChange: (logo: string | null) => void;
}

export const URLInputForm: React.FC<URLInputFormProps> = ({
  onAnalyze,
  isLoading,
  whiteLabelLogo,
  onWhiteLabelLogoChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode State
  const [competitorMode, setCompetitorMode] = useState(false);

  // Queue State
  const [queue, setQueue] = useState<AuditInput[]>([]);

  // Input State
  const [currentUrl, setCurrentUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queue States
  const [primaryQueue, setPrimaryQueue] = useState<AuditInput[]>([]);
  const [competitorQueue, setCompetitorQueue] = useState<AuditInput[]>([]);
  const [primaryError, setPrimaryError] = useState<string | null>(null);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  const MAX_INPUTS = 5;
  const remainingSlots = MAX_INPUTS - queue.length;

  const [primaryUrl, setPrimaryUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');

  // --- HELPER: VALIDATORS ---

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string.startsWith('http') ? string : `https://${string}`);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };

  const getDomain = (urlString: string) => {
    try {
      return new URL(urlString).hostname.replace('www.', '');
    } catch (e) {
      return null;
    }
  };

  const handleSaveLogo = (logoData: string) => {
    onWhiteLabelLogoChange(logoData || null);
  };

  // --- REUSABLE INPUT CONTROL ---
  const StandardInputControl = ({
    queue,
    setQueue,
    currentUrl,
    setCurrentUrl,
    errorMsg,
    setErrorMsg
  }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const MAX_INPUTS = 5;
    const remainingSlots = MAX_INPUTS - queue.length;

    // Logic extracted effectively
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentUrl.trim()) addItem();
      }
    };

    const addItem = () => {
      setErrorMsg(null);
      const trimmedUrl = currentUrl.trim();
      if (!trimmedUrl) return;

      if (!isValidUrl(trimmedUrl)) {
        setErrorMsg("Invalid URL.");
        return;
      }
      if (remainingSlots <= 0) {
        setErrorMsg("Limit reached!");
        return;
      }
      const isDuplicate = queue.some((item: any) => item.url?.toLowerCase() === trimmedUrl.toLowerCase());
      if (isDuplicate) {
        setErrorMsg("Duplicate URL.");
        return;
      }

      setQueue((prev: any) => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        type: 'url',
        url: trimmedUrl
      }]);
      setCurrentUrl('');
    };

    const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setErrorMsg(null);

      if (remainingSlots <= 0) {
        setErrorMsg("Limit reached!");
        return;
      }
      // Check duplicate file
      if (queue.some((item: any) => item.files?.some((f: File) => f.name === file.name && f.size === file.size))) {
        setErrorMsg("File already added.");
        return;
      }

      setQueue((prev: any) => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        type: 'upload',
        files: [file],
        file: file
      }]);
      e.target.value = '';
    };

    const remove = (index: number) => {
      setQueue((prev: any) => prev.filter((_: any, i: number) => i !== index));
      setErrorMsg(null);
    };

    return (
      <div className="space-y-3">
        <div className={`group relative flex items-center bg-white border rounded-xl shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 ${remainingSlots === 0 ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed' : 'border-slate-300 hover:border-indigo-300'}`}>
          <input
            type="url"
            value={currentUrl}
            onChange={(e) => { setCurrentUrl(e.target.value); setErrorMsg(null); }}
            onKeyDown={handleKeyDown}
            disabled={remainingSlots === 0}
            placeholder={remainingSlots === 0 ? "Limit reached" : "Paste URL..."}
            className="flex-1 py-3 pl-4 pr-24 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 flex items-center gap-1 h-full py-1.5">
            <div className="w-px h-5 bg-slate-200 mx-1"></div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={addFile} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={remainingSlots === 0} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors" title="Upload Screenshot">
              <ImagePlus className="w-4 h-4" />
            </button>
            <button type="button" onClick={addItem} disabled={remainingSlots === 0 || !currentUrl.trim()} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded hover:bg-indigo-600 hover:text-white transition-colors shadow-sm disabled:opacity-50">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Validation Error Message (Specific) */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1 px-1">
            <X className="w-3 h-3" />
            {errorMsg}
          </div>
        )}

        {/* QUEUE PILLS */}
        {queue.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {queue.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 shadow-sm">
                {item.type === 'url' ? <Globe className="w-3 h-3 text-indigo-500" /> : <FileImage className="w-3 h-3 text-emerald-500" />}
                <span className="max-w-[120px] truncate">{item.url ? getDomain(item.url) || item.url : item.files?.[0]?.name}</span>
                <button type="button" onClick={() => remove(index)} className="ml-1 text-slate-300 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CompetitorMultiInput = ({
    queue, setQueue, currentUrl, setCurrentUrl, errorMsg, setErrorMsg, placeholder, colorClass
  }: any) => {
    // Wrapper to inject props into StandardInputControl
    // We could make StandardInputControl fully generic, which it is.
    return <StandardInputControl
      queue={queue} setQueue={setQueue}
      currentUrl={currentUrl} setCurrentUrl={setCurrentUrl}
      errorMsg={errorMsg} setErrorMsg={setErrorMsg}
    />;
  };

  // --- HANDLER: SUBMIT ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Clear global errors
    setErrorMsg(null);
    setPrimaryError(null);
    setCompetitorError(null);

    if (competitorMode) {
      // Auto-add any pending inputs
      let finalPrimaryQueue = [...primaryQueue];
      if (primaryUrl.trim() && isValidUrl(primaryUrl.trim())) {
        finalPrimaryQueue.push({ id: `p_pending`, type: 'url', url: primaryUrl.trim() });
      }

      let finalCompetitorQueue = [...competitorQueue];
      if (competitorUrl.trim() && isValidUrl(competitorUrl.trim())) {
        finalCompetitorQueue.push({ id: `c_pending`, type: 'url', url: competitorUrl.trim() });
      }

      if (finalPrimaryQueue.length === 0) {
        setPrimaryError("Please add at least one URL or screenshot.");
        return;
      }
      if (finalCompetitorQueue.length === 0) {
        setCompetitorError("Please add at least one URL or screenshot.");
        return;
      }

      // Merge with roles
      const mergedInputs: AuditInput[] = [
        ...finalPrimaryQueue.map(i => ({ ...i, role: 'primary' as const })),
        ...finalCompetitorQueue.map(i => ({ ...i, role: 'competitor' as const }))
      ];

      onAnalyze(mergedInputs, 'competitor');

    } else {
      // Standard Mode Logic (Existing + Auto Add)
      let finalQueue = [...queue];
      if (currentUrl.trim() && isValidUrl(currentUrl.trim())) {
        if (remainingSlots > 0 && !queue.some(i => i.url?.toLowerCase() === currentUrl.trim().toLowerCase())) {
          finalQueue.push({ id: 'instant-submit', type: 'url', url: currentUrl.trim() });
        }
      }

      if (finalQueue.length === 0) {
        setErrorMsg("Please add at least one URL or screenshot.");
        return;
      }

      onAnalyze(finalQueue, 'standard');
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-['DM_Sans']">
        <div className="p-6 md:p-8 space-y-6">

          {/* Header & Mode Switch */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {competitorMode ? "Competitor Analysis" : "Start Your Audit"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {competitorMode
                  ? "Compare your site against a competitor to find gaps."
                  : "Add URLs or upload screenshots for AI-powered UX analysis"}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCompetitorMode(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!competitorMode ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setCompetitorMode(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${competitorMode ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Swords className="w-3.5 h-3.5" />
                Competitor
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {competitorMode ? (
              // --- COMPETITOR MODE INPUTS (DUAL QUEUES) ---
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">

                {/* PRIMARY QUEUE */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-500" /> Your Website
                  </h3>
                  <CompetitorMultiInput
                    queue={primaryQueue}
                    setQueue={setPrimaryQueue}
                    currentUrl={primaryUrl}
                    setCurrentUrl={setPrimaryUrl}
                    errorMsg={primaryError}
                    setErrorMsg={setPrimaryError}
                    placeholder="Your URL..."
                    colorClass="indigo"
                  />
                </div>

                {/* COMPETITOR QUEUE */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Swords className="w-4 h-4 text-red-500" /> Competitor Website
                  </h3>
                  <CompetitorMultiInput
                    queue={competitorQueue}
                    setQueue={setCompetitorQueue}
                    currentUrl={competitorUrl}
                    setCurrentUrl={setCompetitorUrl}
                    errorMsg={competitorError}
                    setErrorMsg={setCompetitorError}
                    placeholder="Competitor URL..."
                    colorClass="red"
                  />
                </div>
              </div>
            ) : (
              // --- STANDARD MODE INPUTS (SINGLE QUEUE) ---
              <>
                <StandardInputControl
                  queue={queue}
                  setQueue={setQueue}
                  currentUrl={currentUrl}
                  setCurrentUrl={setCurrentUrl}
                  errorMsg={errorMsg}
                  setErrorMsg={setErrorMsg}
                />
              </>
            )}

            {/* Validation Error Message (Global) */}
            {errorMsg && !competitorMode && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1 px-1">
                <X className="w-3 h-3" />
                {errorMsg}
              </div>
            )}

            {/* 3. Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 mt-2 border-t border-slate-100">

              {/* Left: White Label Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {whiteLabelLogo ? (
                  <>
                    <img src={whiteLabelLogo} alt="Logo" className="h-4 w-auto object-contain max-w-[80px]" />
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Edit Label</span>
                  </>
                ) : (
                  <>
                    <Settings2 className="w-4 h-4" />
                    <span>White Label</span>
                  </>
                )}
              </button>

              {/* Right: Run Analysis Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none pl-2 pr-6 py-2 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 min-w-[180px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Running...
                  </>
                ) : (
                  <>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm transition-colors bg-white text-indigo-600`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <span>{competitorMode ? "Run Comparison" : "Run Analysis"}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>

      <WhiteLabelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLogo}
        initialLogo={whiteLabelLogo}
      />
    </>
  );
};