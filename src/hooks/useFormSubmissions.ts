import { useState, useEffect, useCallback } from "react";
import { formsService } from "@/services/forms.service";
import type { FormSubmission } from "@/types";

interface UseFormSubmissionsReturn {
  submissions: FormSubmission[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  exporting: boolean;
  exportError: string | null;
  goToPage: (page: number) => void;
  exportCsv: () => Promise<void>;
  refetch: () => void;
}

/**
 * Data hook for the Form Submissions page.
 * Fetches a paginated list of submissions for a given form and exposes
 * page navigation and CSV export capabilities.
 */
export function useFormSubmissions(formId: string): UseFormSubmissionsReturn {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await formsService.getSubmissions(formId, { page: p, limit: 25 });
      setSubmissions(res.data);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      setError("Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const goToPage = useCallback((p: number) => fetchPage(p), [fetchPage]);

  // ── CSV export ────────────────────────────────────────────────────────────────
  const exportCsv = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await formsService.exportSubmissions(formId, {});
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [formId]);

  return {
    submissions,
    total,
    page,
    totalPages,
    loading,
    error,
    exporting,
    exportError,
    goToPage,
    exportCsv,
    refetch: () => fetchPage(page),
  };
}
