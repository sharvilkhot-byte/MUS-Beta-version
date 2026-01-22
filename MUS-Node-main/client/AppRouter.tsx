
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ReportDisplay } from './components/ReportDisplay';
import { Logo } from './components/Logo';
import { getSharedAudit } from './services/auditStorage';
import { AnalysisReport, Screenshot } from './types';
import { AuthProvider } from './contexts/AuthContext';

// Shared Audit View Component
function SharedAuditView() {
    const { auditId } = useParams<{ auditId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<AnalysisReport | null>(null);
    const [url, setUrl] = useState<string>('');
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [screenshotMimeType, setScreenshotMimeType] = useState<string>('image/png');
    const [whiteLabelLogo, setWhiteLabelLogo] = useState<string | null>(null);

    useEffect(() => {
        async function loadAudit() {
            if (!auditId) {
                setError('No audit ID provided');
                setLoading(false);
                return;
            }

            try {
                const data = await getSharedAudit(auditId);

                if (!data) {
                    setError('Audit not found');
                    setLoading(false);
                    return;
                }

                setReport(data.report);
                setUrl(data.url);
                setScreenshots(data.screenshots);
                setScreenshotMimeType(data.screenshotMimeType);
                setWhiteLabelLogo(data.whiteLabelLogo || null);
                setLoading(false);
            } catch (err) {
                console.error('Error loading shared audit:', err);
                setError('Failed to load audit');
                setLoading(false);
            }
        }

        loadAudit();
    }, [auditId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center">
                <Logo className="mb-8 animate-pulse" />
                <p className="text-lg text-slate-600">Loading shared audit...</p>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center px-4">
                <Logo className="mb-8" />
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">Audit Not Found</h1>
                    <p className="text-slate-600 mb-6">{error || 'This audit link may be invalid or expired.'}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Run Your Own Audit
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-2 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <ReportDisplay
                    report={report}
                    url={url}
                    screenshots={screenshots}
                    screenshotMimeType={screenshotMimeType}
                    performanceError={null}
                    auditId={auditId || null}
                    onRunNewAudit={() => { }} // No-op in shared view
                    whiteLabelLogo={whiteLabelLogo}
                    isSharedView={true} // New prop to indicate shared/read-only mode
                />
            </div>
        </div>
    );
}

// Root component with routing
function AppWithRouting() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-center" />
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/shared/:auditId" element={<SharedAuditView />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppWithRouting;
