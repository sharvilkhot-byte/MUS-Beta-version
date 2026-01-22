import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { signUp, signIn, sendOtp, verifyOtp, updateProfile } from '../services/authService';
import { createLead, verifyLead } from '../services/leadService';

interface AuthBlockerProps {
    onUnlock: () => void;
    isUnlocked: boolean;
    auditUrl: string;
}

export const AuthBlocker: React.FC<AuthBlockerProps> = ({ onUnlock, isUnlocked, auditUrl }) => {
    const [isLoginMode, setIsLoginMode] = useState(false); // Toggle between Sign Up and Login
    const [step, setStep] = useState<'info' | 'otp'>('info'); // For Signup flow

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [orgType, setOrgType] = useState('');
    const [otp, setOtp] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    // If unlocked, don't render anything
    if (isUnlocked) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please fill in email and password.");
            return;
        }

        setIsLoading(true);
        const { session, error } = await signIn(email, password);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else if (session) {
            // Try to verify lead just in case
            await verifyLead(email);
            toast.success('Welcome back!');
            onUnlock();
        }
    };

    const handleSignupStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError(null);

        if (!email || !password || !name) {
            toast.error("Please fill in all required fields.");
            return;
        }

        // --- Email Validation ---
        const restrictedDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
            'live.com', 'msn.com'
        ];
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (emailDomain && restrictedDomains.includes(emailDomain)) {
            setEmailError("Please use your work email address (generic providers like Gmail are not accepted).");
            return;
        }
        // ------------------------

        setIsLoading(true);

        // Use OTP flow for signup verification
        const { error } = await sendOtp(email);
        setIsLoading(false);

        if (error) {
            toast.error("Error sending verification code: " + error);
        } else {
            toast.success('Verification code sent to ' + email);
            setStep('otp');
        }
    };

    const handleSignupStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return;

        setIsLoading(true);
        // 1. Verify OTP
        const { session, error } = await verifyOtp(email, otp);

        if (error || !session) {
            setIsLoading(false);
            toast.error(error || "Verification failed");
            return;
        }

        // 2. Set Password & Profile Data
        const { error: updateError } = await updateProfile({
            password: password,
            data: {
                full_name: name,
                org_type: orgType
            }
        });

        if (updateError) {
            console.error("Error setting password:", updateError);
            toast.error("Account verified, but failed to set password. You may need to reset it later.");
        }

        // 3. Create Lead (Safe now as we are authenticated)
        const { error: leadError } = await createLead({
            email,
            name,
            organization_type: orgType,
            audit_url: auditUrl
        });

        if (leadError) {
            console.warn("Failed to capture lead data:", leadError);
        }

        // 4. Mark Verified
        await verifyLead(email);

        setIsLoading(false);
        toast.success('Account created successfully!');
        onUnlock();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with stronger blur and dark overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>

            {/* Modal Card */}
            <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 md:p-8 border border-slate-200">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-full mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-600">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {isLoginMode ? 'Welcome Back' : 'Unlock Full Audit Report'}
                    </h2>
                    <p className="mt-2 text-slate-600 text-sm">
                        {isLoginMode
                            ? 'Log in to access your saved reports.'
                            : 'Get instant access to your detailed strategic roadmap and UI/UX insights.'}
                    </p>
                </div>

                {isLoginMode ? (
                    // LOGIN FORM
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                                Business Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                id="password"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging In...
                                </span>
                            ) : (
                                'Log In'
                            )}
                        </button>
                    </form>
                ) : (
                    // SIGNUP FORM (Hybrid)
                    step === 'info' ? (
                        <form onSubmit={handleSignupStep1} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Business Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all text-sm ${emailError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError(null);
                                    }}
                                />
                                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                            </div>
                            <div>
                                <label htmlFor="orgType" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Organization Type <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <select
                                    id="orgType"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                                    value={orgType}
                                    onChange={(e) => setOrgType(e.target.value)}
                                >
                                    <option value="">Select type...</option>
                                    <option value="agency">Agency / Consultancy</option>
                                    <option value="startup">Startup</option>
                                    <option value="enterprise">Enterprise</option>
                                    <option value="ecommerce">E-commerce</option>
                                    <option value="saas">SaaS</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Create Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                            <p className="text-center text-[10px] text-slate-400 mt-3">
                                We'll send a one-time verification code to your email.
                            </p>
                        </form>
                    ) : (
                        // OTP VERIFICATION STEP
                        <form onSubmit={handleSignupStep2} className="space-y-4">
                            <div>
                                <label htmlFor="otp" className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                                    Enter Verification Code sent to <span className="text-indigo-600">{email}</span>
                                </label>
                                <input
                                    type="text"
                                    id="otp"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-center tracking-[0.5em] text-xl font-mono"
                                    placeholder="------"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-center text-slate-500">
                                    Can't find it? Check your spam folder.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </span>
                                ) : (
                                    'Verify & Create Account'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="w-full py-1 text-xs text-slate-500 hover:text-slate-700 font-medium underline decoration-slate-300 underline-offset-4"
                            >
                                Change Details
                            </button>
                        </form>
                    )
                )}

                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500">
                        {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setStep('info');
                                setEmailError(null);
                            }}
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            {isLoginMode ? "Sign Up" : "Log In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

