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

  // Competitor specific states
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');

  // NEW: File States for Competitor Mode
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [competitorFile, setCompetitorFile] = useState<File | null>(null);

  const MAX_INPUTS = 5;
  const remainingSlots = MAX_INPUTS - queue.length;

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

  const isDuplicateFile = (newFile: File) => {
    return queue.some(item =>
      item.files?.some(f => f.name === newFile.name && f.size === newFile.size)
    );
  };

  // Custom helper for competitor file handling
  const handleCompetitorFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'primary' | 'competitor') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'primary') {
        setPrimaryFile(file);
        setPrimaryUrl(''); // Clear URL if file is selected
      } else {
        setCompetitorFile(file);
        setCompetitorUrl(''); // Clear URL if file is selected
      }
      setErrorMsg(null);
    }
    e.target.value = ''; // Reset input
  };

  // --- LOGIC: STANDARD MODE ---

  const addToQueue = () => {
    setErrorMsg(null);
    const trimmedUrl = currentUrl.trim();

    if (!trimmedUrl) return;

    // 1. Validate: Format
    if (!isValidUrl(trimmedUrl)) {
      setErrorMsg("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    // 2. Validate: Limit
    if (remainingSlots <= 0) {
      setErrorMsg("Limit reached! You can only add 5 items.");
      return;
    }

    // 3. Validate: Duplicate URL
    const isDuplicate = queue.some(item => item.url?.toLowerCase() === trimmedUrl.toLowerCase());
    if (isDuplicate) {
      setErrorMsg("This URL is already in the queue.");
      return;
    }

    // 4. Validate: Same Domain Policy
    const existingUrlItem = queue.find(item => item.type === 'url');
    if (existingUrlItem && existingUrlItem.url) {
      const existingDomain = getDomain(existingUrlItem.url);
      const newDomain = getDomain(trimmedUrl);

      if (existingDomain && newDomain && existingDomain !== newDomain) {
        setErrorMsg(`Please stick to one domain. You are analyzing ${existingDomain}.`);
        return;
      }
    }

    // Add to Queue
    const newInput: AuditInput = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      type: 'url',
      url: trimmedUrl,
    };

    setQueue(prev => [...prev, newInput]);
    setCurrentUrl('');
  };

  const addFileToQueue = (file: File) => {
    setErrorMsg(null);
    if (remainingSlots <= 0) {
      setErrorMsg("Limit reached!");
      return;
    }

    if (isDuplicateFile(file)) {
      setErrorMsg("This screenshot is already added.");
      return;
    }

    const newInput: AuditInput = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      type: 'upload',
      url: '',
      files: [file],
      file: file
    };
    setQueue(prev => [...prev, newInput]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFileToQueue(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  // --- HANDLER: SUBMIT ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);

    if (competitorMode) {
      // Competitor Mode Validation
      const hasPrimary = primaryUrl.trim() || primaryFile;
      const hasCompetitor = competitorUrl.trim() || competitorFile;

      if (!hasPrimary) {
        setErrorMsg("Please enter your website URL or upload a screenshot.");
        return;
      }
      if (primaryUrl && !isValidUrl(primaryUrl.trim())) {
        setErrorMsg("Your website URL is invalid.");
        return;
      }
      if (!hasCompetitor) {
        setErrorMsg("Please enter the competitor's URL or upload a screenshot.");
        return;
      }
      if (competitorUrl && !isValidUrl(competitorUrl.trim())) {
        setErrorMsg("Competitor website URL is invalid.");
        return;
      }

      // Check for same input
      // If both are URLs, check strings. If files, assume different unless exactly same ref (unlikely).
      if (primaryUrl && competitorUrl && primaryUrl.trim() === competitorUrl.trim()) {
        setErrorMsg("Please enter two different URLs.");
        return;
      }

      const inputs: AuditInput[] = [
        primaryFile
          ? { id: 'primary', type: 'upload', files: [primaryFile], file: primaryFile }
          : { id: 'primary', type: 'url', url: primaryUrl.trim() },
        competitorFile
          ? { id: 'competitor', type: 'upload', files: [competitorFile], file: competitorFile }
          : { id: 'competitor', type: 'url', url: competitorUrl.trim() }
      ];

      onAnalyze(inputs, 'competitor');

    } else {
      // Standard Mode Logic
      let finalQueue = [...queue];

      // Smart Submit: Auto-add pending URL if valid
      if (currentUrl.trim() && isValidUrl(currentUrl.trim())) {
        const existingUrlItem = queue.find(item => item.type === 'url');
        const newDomain = getDomain(currentUrl.trim());
        let allow = true;

        if (existingUrlItem && existingUrlItem.url) {
          const existingDomain = getDomain(existingUrlItem.url);
          if (existingDomain !== newDomain) allow = false;
        }

        if (allow && remainingSlots > 0) {
          finalQueue.push({
            id: 'instant-submit',
            type: 'url',
            url: currentUrl.trim()
          });
        }
      }

      if (finalQueue.length === 0) {
        setErrorMsg("Please add at least one URL or screenshot.");
        return;
      }

      onAnalyze(finalQueue, 'standard');
    }
  };

  const handleSaveLogo = (logoData: string) => {
    onWhiteLabelLogoChange(logoData || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!competitorMode && currentUrl.trim()) {
        addToQueue();
      }
    }
  };

  // Helper Component for Input/File Combo
  const CompetitorInputGroup = ({ label, url, setUrl, file, setFile, onFileChange, icon: Icon, colorClass, placeholder }: any) => (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{label}</label>
      <div className="flex items-center bg-white border border-slate-300 rounded-xl focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-500 hover:border-indigo-300 transition-all p-3 relative h-[52px]">

        {!file ? (
          <>
            <Icon className={`w-5 h-5 mr-3 opacity-50 ${colorClass}`} />
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setErrorMsg(null); }}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-base"
            />
            <label className="cursor-pointer p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Upload Screenshot">
              <ImagePlus className="w-5 h-5" />
              <input type="file" hidden accept="image/*" onChange={onFileChange} />
            </label>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                <FileImage className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{file.name}</span>
            </div>
            <button type="button" onClick={() => setFile(null)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

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

          <form onSubmit={handleSubmit} className="space-y-4">

            {competitorMode ? (
              // --- COMPETITOR MODE INPUTS ---
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <CompetitorInputGroup
                  label="Your Website"
                  url={primaryUrl}
                  setUrl={setPrimaryUrl}
                  file={primaryFile}
                  setFile={setPrimaryFile}
                  onFileChange={(e: any) => handleCompetitorFileChange(e, 'primary')}
                  icon={Globe}
                  colorClass="text-indigo-500"
                  placeholder="https://yoursite.com"
                />
                <CompetitorInputGroup
                  label="Competitor Website"
                  url={competitorUrl}
                  setUrl={setCompetitorUrl}
                  file={competitorFile}
                  setFile={setCompetitorFile}
                  onFileChange={(e: any) => handleCompetitorFileChange(e, 'competitor')}
                  icon={Swords}
                  colorClass="text-red-500"
                  placeholder="https://competitor.com"
                />
              </div>
            ) : (
              // --- STANDARD MODE INPUTS ---
              <>
                <div className={`group relative flex items-center bg-white border rounded-xl shadow-sm transition-all duration-200 focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-500 ${remainingSlots === 0 ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed' : 'border-slate-300 hover:border-indigo-400'}`}>
                  {/* Left: Text Input */}
                  <input
                    type="url"
                    value={currentUrl}
                    onChange={(e) => { setCurrentUrl(e.target.value); setErrorMsg(null); }}
                    onKeyDown={handleKeyDown}
                    disabled={remainingSlots === 0}
                    placeholder={remainingSlots === 0 ? "Limit reached (5 items max)" : "Paste URL (e.g. https://google.com)..."}
                    className="flex-1 py-4 pl-4 pr-32 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-base disabled:cursor-not-allowed"
                  />

                  {/* Right: Controls Container */}
                  <div className="absolute right-2 flex items-center gap-2 h-full py-2">
                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* Image Upload Icon */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={remainingSlots === 0}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload Screenshot"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>

                    {/* Add Button */}
                    <button
                      type="button"
                      onClick={addToQueue}
                      disabled={remainingSlots === 0 || !currentUrl.trim()}
                      className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 disabled:cursor-not-allowed shadow-sm"
                      title="Add to queue"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* QUEUE PILLS */}
                {queue.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-2">
                    {queue.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors">
                        {item.type === 'url' ? (
                          <Globe className="w-3.5 h-3.5 opacity-70 text-indigo-600" />
                        ) : (
                          <FileImage className="w-3.5 h-3.5 opacity-70 text-emerald-600" />
                        )}
                        <span className="max-w-[200px] truncate">
                          {item.url ? new URL(item.url).hostname + new URL(item.url).pathname : item.files?.[0]?.name}
                        </span>
                        <button type="button" onClick={() => removeFromQueue(index)} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Validation Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1 px-1">
                <X className="w-3 h-3" />
                {errorMsg}
              </div>
            )}

            {/* 3. Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 mt-2">

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
                disabled={isLoading || (!competitorMode && queue.length === 0 && !currentUrl.trim()) || (competitorMode && (!primaryUrl && !primaryFile || !competitorUrl && !competitorFile))}
                className="flex-1 sm:flex-none pl-2 pr-6 py-2 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 min-w-[180px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Running...
                  </>
                ) : (
                  <>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm transition-colors ${(queue.length === 0 && !currentUrl.trim() && !competitorMode)
                      ? 'bg-slate-300 text-slate-500'
                      : 'bg-white text-indigo-600'
                      }`}>
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