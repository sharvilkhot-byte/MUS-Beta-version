
import { createClient } from '@supabase/supabase-js';

// Supabase client (reusing credentials - ideally these should be in a shared config file)
const supabaseUrl = 'https://sobtfbplbpvfqeubjxex.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYnRmYnBsYnB2ZnFldWJqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDgzMDYsImV4cCI6MjA3NDcyNDMwNn0.ewfxDwlapmRpfyvYD3ALb-WyL12ty1eP8nzKyrc66ho';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LeadData {
    email: string;
    name: string;
    organization_type?: string;
    audit_url: string;
}

/**
 * Creates a new lead record in the 'leads' table.
 */
export async function createLead(data: LeadData): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase
            .from('leads')
            .insert([
                {
                    email: data.email,
                    name: data.name,
                    organization_type: data.organization_type,
                    audit_url: data.audit_url,
                    is_verified: false
                }
            ]);

        if (error) {
            console.error('Error creating lead:', error);
            return { error: error.message };
        }

        return { error: null };
    } catch (err: any) {
        console.error('Unexpected error creating lead:', err);
        return { error: err.message || 'Failed to create lead' };
    }
}

/**
 * Updates a lead status to verified (optional, can be called after OTP success)
 */
export async function verifyLead(email: string): Promise<{ error: string | null }> {
    try {
        // We update based on email since we might not have the ID easily in the flow without storing state
        const { error } = await supabase
            .from('leads')
            .update({ is_verified: true })
            .eq('email', email)
        // Safety: only update recent unverified leads? For now simple is better.

        if (error) {
            console.error('Error verifying lead:', error);
            return { error: error.message };
        }
        return { error: null };
    } catch (err: any) {
        return { error: err.message };
    }
}
