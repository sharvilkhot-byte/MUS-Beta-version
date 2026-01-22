import { createClient } from '@supabase/supabase-js';

// Supabase client (reusing existing credentials)
// Supabase client (using environment variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sobtfbplbpvfqeubjxex.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYnRmYnBsYnB2ZnFldWJqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDgzMDYsImV4cCI6MjA3NDcyNDMwNn0.ewfxDwlapmRpfyvYD3ALb-WyL12ty1eP8nzKyrc66ho';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Update user profile (e.g. set password)
 */
export async function updateProfile(attributes: { password?: string; data?: any }) {
    const { data, error } = await supabase.auth.updateUser(attributes);
    return { data, error };
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, data?: any): Promise<{ session: any; error: string | null }> {
    try {
        const { data: authData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: data, // Save metadata like name, orgType
            },
        });

        if (error) {
            console.error('Error signing up:', error);
            return { session: null, error: error.message };
        }

        return { session: authData.session, error: null };
    } catch (err: any) {
        console.error('Unexpected error signing up:', err);
        return { session: null, error: err.message || 'Failed to sign up' };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ session: any; error: string | null }> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Error signing in:', error);
            return { session: null, error: error.message };
        }

        return { session: data.session, error: null };
    } catch (err: any) {
        console.error('Unexpected error signing in:', err);
        return { session: null, error: err.message || 'Failed to sign in' };
    }
}

/**
 * Send OTP to email
 */
export async function sendOtp(email: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true, // Auto-register new users
            },
        });

        if (error) {
            console.error('Error sending OTP:', error);
            return { error: error.message };
        }

        return { error: null };
    } catch (err: any) {
        console.error('Unexpected error sending OTP:', err);
        return { error: err.message || 'Failed to send OTP' };
    }
}

/**
 * Verify OTP
 */
export async function verifyOtp(email: string, token: string): Promise<{ session: any; error: string | null }> {
    try {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) {
            console.error('Error verifying OTP:', error);
            return { session: null, error: error.message };
        }

        return { session: data.session, error: null };
    } catch (err: any) {
        console.error('Unexpected error verifying OTP:', err);
        return { session: null, error: err.message || 'Failed to verify OTP' };
    }
}

/**
 * Check if user is currently authenticated
 */
export async function getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Sign out
 */
export async function signOut() {
    await supabase.auth.signOut();
}
