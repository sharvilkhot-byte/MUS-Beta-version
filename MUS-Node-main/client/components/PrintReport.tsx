
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, Screenshot } from '../types';
import { SkeletonLoader } from './SkeletonLoader';
import { ReportPDFTemplate } from './report/ReportPDFTemplate';

// --- Supabase Client Details ---
const supabaseUrl = 'https://sobtfbplbpvfqeubjxex.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYnRmYnBsYnB2ZnFldWJqeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDgzMDYsImV4cCI6MjA3NDcyNDMwNn0.ewfxDwlapmRpfyvYD3ALb-WyL12ty1eP8nzKyrc66ho';
// -----------------------------

interface PrintReportProps {
  auditId: string;
}

interface FetchedData {
  report: AnalysisReport & { screenshots: Screenshot[] }; // Screenshots are embedded
  url: string;
}

export const PrintReport: React.FC<PrintReportProps> = ({ auditId }) => {
  const [data, setData] = useState<FetchedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const functionUrl = `${supabaseUrl}/functions/v1/audit`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ mode: 'get-audit', auditId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch audit data: ${response.status}`);
        }

        const fetchedData = await response.json();
        setData(fetchedData);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAuditData();
  }, [auditId]);

  useEffect(() => {
    // This is the signal for the Puppeteer instance in the backend.
    // It now waits for all images to be loaded before setting the flag.
    if (data && !error && containerRef.current) {
      const images = containerRef.current.querySelectorAll('img');
      const totalImages = images.length;

      if (totalImages === 0) {
        (window as any).readyForPdf = true;
        return;
      }

      let loadedImages = 0;
      const onImageLoad = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          console.log("All images loaded. Ready for PDF generation.");
          (window as any).readyForPdf = true;
        }
      };

      images.forEach(img => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.addEventListener('load', onImageLoad);
          img.addEventListener('error', onImageLoad); // Count errors as "loaded" to not block forever
        }
      });
    }
  }, [data, error]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="p-8 bg-white shadow-lg rounded-lg text-red-800">
          <h1 className="text-2xl font-bold mb-4">Error loading report</h1>
          <p>Could not fetch data for audit ID: {auditId}</p>
          <pre className="mt-4 p-2 bg-red-100 text-sm rounded">{error}</pre>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-slate-600">Preparing Report for Printing...</p>
          <p className="text-sm text-slate-500">Audit ID: {auditId}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-white" style={{ width: '640px', margin: '0 auto' }}>
      <ReportPDFTemplate
        report={data.report}
        url={data.url}
        screenshots={data.report.screenshots || []}
      />
    </div>
  );
};
