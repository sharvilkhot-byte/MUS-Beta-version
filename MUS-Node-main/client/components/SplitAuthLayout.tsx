import React from 'react';
import { LottieAnimation } from './LottieAnimation';
import { ProgressBar } from './ProgressBar';
import { Logo } from './Logo';
import { Lock } from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';

interface SplitAuthLayoutProps {
    progress: number;
    loadingMessage: string;
    microcopy: string;
    isAnalysisComplete: boolean;
    children: React.ReactNode;
    animationData: any;
}

export const SplitAuthLayout: React.FC<SplitAuthLayoutProps> = ({
    progress,
    loadingMessage,
    microcopy,
    isAnalysisComplete,
    children,
    animationData
}) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['DM_Sans']">
            {/* LEFT SIDE: Progress / Preview */}
            <div className={`w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative overflow-hidden transition-all duration-700 ${isAnalysisComplete ? 'bg-slate-100' : 'bg-white'}`}>

                {/* Logo (Top Left) */}
                <div className="absolute top-8 left-8">
                    <Logo />
                </div>

                <div className="max-w-md mx-auto w-full relative z-10">
                    {isAnalysisComplete ? (
                        // BLURRED PREVIEW STATE
                        <div className="relative">
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                                <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                        <Lock className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Analysis Complete!</h2>
                                    <p className="text-slate-600 mb-6">
                                        We've identified critical UX gaps. Login to unlock your full comprehensive report.
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce"></div>
                                        <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce delay-75"></div>
                                        <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Blurred Mock Content */}
                            <div className="filter blur-sm opacity-50 pointer-events-none select-none" aria-hidden="true">
                                <h1 className="text-3xl font-bold text-slate-300 mb-6">UX Audit Report</h1>
                                <div className="space-y-4">
                                    <SkeletonLoader className="h-64 rounded-xl" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <SkeletonLoader className="h-32 rounded-xl" />
                                        <SkeletonLoader className="h-32 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // PROGRESS STATE
                        <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="mb-8">
                                <LottieAnimation animationData={animationData} className="w-48 h-48 mx-auto" />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your website...</h2>
                            <p className="text-slate-500 mb-8">{loadingMessage}</p>

                            <div className="mb-6">
                                <ProgressBar progress={progress} />
                            </div>

                            <p className="text-slate-500 italic text-sm animate-pulse">
                                "{microcopy}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full pointer-events-none opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 rounded-tr-full pointer-events-none opacity-50"></div>
            </div>

            {/* RIGHT SIDE: Auth Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-slate-50 relative">
                {children}
            </div>
        </div>
    );
};
