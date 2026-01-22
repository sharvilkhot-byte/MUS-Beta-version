import React, { useState } from 'react';
import { Mail, ArrowRight, Lock, Loader2, CheckCircle } from 'lucide-react';
import { sendOtp, verifyOtp } from '../services/authService';
import toast from 'react-hot-toast';

interface LoginFormProps {
    onLoginSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address.");
            return;
        }

        setIsLoading(true);
        const { error } = await sendOtp(email);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else {
            toast.success("OTP sent to your email!");
            setEmailSent(true);
            setStep('otp');
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) {
            toast.error("Please enter the OTP.");
            return;
        }

        setIsLoading(true);
        const { session, error } = await verifyOtp(email, otp);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else if (session) {
            toast.success("Login successful!");
            if (onLoginSuccess) onLoginSuccess();
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-white shadow-xl border border-slate-100">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Your Report</h2>
                <p className="text-slate-500 text-sm">
                    {step === 'email'
                        ? "Enter your email to verify your identity."
                        : `Enter the code sent to ${email}`}
                </p>
            </div>

            <div className="space-y-6">
                {/* Email Input Section */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Work Email
                    </label>
                    <div className={`relative flex items-center transition-opacity duration-300 ${step === 'otp' ? 'opacity-70' : 'opacity-100'}`}>
                        <Mail className="absolute left-3 w-5 h-5 text-slate-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={step === 'otp'}
                            placeholder="name@company.com"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        {step === 'otp' && (
                            <div className="absolute right-3 text-emerald-500">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                </div>

                {/* OTP Input Section (Mock-disabled style if not active) */}
                <div className={`transition-all duration-300 ${step === 'email' ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        One-Time Password
                    </label>
                    <div className="relative flex items-center">
                        <Lock className="absolute left-3 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            disabled={step === 'email'}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-mono tracking-widest disabled:bg-slate-100"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2">
                    {step === 'email' ? (
                        <button
                            onClick={handleSendOtp}
                            disabled={isLoading || !email}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <span>Get Access Code</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otp.length < 6}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <span>Unlock Report</span>
                                        <Lock className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => { setStep('email'); setOtp(''); }}
                                className="w-full py-2 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                            >
                                Change Email
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
