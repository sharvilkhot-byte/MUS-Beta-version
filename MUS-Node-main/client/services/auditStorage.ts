import { createClient } from '@supabase/supabase-js';
import { AnalysisReport, Screenshot } from '../types';

// Supabase client (reusing existing credentials)
const supabaseUrl = 'https://sobtfbplbpvfqeubjxex.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYnRmYnBsYnB2ZnFldWJqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDgzMDYsImV4cCI6MjA3NDcyNDMwNn0.ewfxDwlapmRpfyvYD3ALb-WyL12ty1eP8nzKyrc66ho';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'shared-audits'; // Will use existing 'screenshots' bucket or create this

export interface SharedAuditData {
    id: string;
    url: string;
    report: AnalysisReport;
    screenshots: Screenshot[];
    screenshotMimeType: string;
    whiteLabelLogo?: string | null;
    createdAt: string;
}

/**
 * Save audit data to Supabase Storage as a JSON file
 * Returns the unique audit ID
 */
export async function saveSharedAudit(data: {
    url: string;
    report: AnalysisReport;
    screenshots: Screenshot[];
    screenshotMimeType: string;
    whiteLabelLogo?: string | null;
}): Promise<string> {
    // Generate unique ID
    const auditId = crypto.randomUUID();

    // Prepare audit data
    const auditData: SharedAuditData = {
        id: auditId,
        url: data.url,
        report: data.report,
        screenshots: data.screenshots,
        screenshotMimeType: data.screenshotMimeType,
        whiteLabelLogo: data.whiteLabelLogo,
        createdAt: new Date().toISOString(),
    };

    // Convert to JSON
    const jsonData = JSON.stringify(auditData);
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Upload to Supabase Storage
    const fileName = `${auditId}.json`;
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
            contentType: 'application/json',
            upsert: false,
        });

    if (error) {
        console.error('Error uploading shared audit:', error);
        throw new Error(`Failed to save audit: ${error.message}`);
    }

    return auditId;
}

/**
 * Retrieve shared audit data by ID
 * Returns null if not found
 */
export async function getSharedAudit(auditId: string): Promise<SharedAuditData | null> {
    const fileName = `${auditId}.json`;

    // Download from Supabase Storage
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(fileName);

    if (error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
            return null;
        }
        console.error('Error downloading shared audit:', error);
        throw new Error(`Failed to fetch audit: ${error.message}`);
    }

    if (!data) {
        return null;
    }

    // Parse JSON
    const text = await data.text();
    const auditData = JSON.parse(text) as SharedAuditData;

    return auditData;
}
