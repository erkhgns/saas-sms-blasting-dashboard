import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft, Download, Loader2, AlertTriangle,
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  Inbox,
} from "lucide-react";
import { formsService } from "@/services/forms.service";
import { useFormSubmissions } from "@/hooks/useFormSubmissions";
import type { GabyForm, FormSubmission } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateOnly(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StarDisplay({ value }: { value: string | number | undefined }) {
  const n = Number(value ?? 0);
  if (!n || isNaN(n)) return <span className="text-gray-300">—</span>;
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ color: n >= s ? "#FF692E" : "#d1d5db" }}>★</span>
      ))}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { id: string; msg: string; kind: "error" }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (msg: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, msg, kind: "error" }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };
  return { toasts, push };
}

// ── Cell value renderer ───────────────────────────────────────────────────────

function CellValue({
  fieldType, value,
}: {
  fieldType?: string;
  value: string | number | undefined | null;
}) {
  if (value == null || value === "") return <span className="text-gray-300">—</span>;

  if (fieldType === "star_rating") {
    return <StarDisplay value={value} />;
  }
  if (fieldType === "yes_no") {
    const bool = String(value).toLowerCase();
    if (bool === "true")  return <span className="text-green-700 font-medium">Yes</span>;
    if (bool === "false") return <span className="text-gray-500">No</span>;
  }
  if (fieldType === "date_picker") {
    return <span>{fmtDateOnly(String(value))}</span>;
  }
  return <span>{String(value)}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FormSubmissions() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, push: pushError } = useToast();

  const [form,        setForm]        = useState<GabyForm | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError,   setFormError]   = useState<string | null>(null);

  const {
    submissions, total, page, totalPages,
    loading, error,
    exporting, exportError,
    goToPage, exportCsv,
    refetch,
  } = useFormSubmissions(formId ?? "");

  // ── Fetch form config ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!formId) return;
    setFormLoading(true);
    setFormError(null);
    formsService.getForm(formId)
      .then(setForm)
      .catch(() => setFormError("Could not load form details."))
      .finally(() => setFormLoading(false));
  }, [formId]);

  // ── Export error toast ────────────────────────────────────────────────────
  useEffect(() => {
    if (exportError) pushError(exportError);
  }, [exportError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Column structure (derived from form config) ───────────────────────────
  const tokenCols = form?.tokenFields ?? [];

  // ── Loading / error states ────────────────────────────────────────────────
  const pageLoading = formLoading || (loading && submissions.length === 0);

  if (!formId) return null;

  return (
    <div className="p-4 sm:p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/forms")}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {form?.name ?? (formLoading ? "Loading…" : "Submissions")}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total > 0
                ? `${total.toLocaleString()} submission${total !== 1 ? "s" : ""}`
                : "Form submissions"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
          ) : (
            <><Download className="w-4 h-4" /> Export CSV</>
          )}
        </button>
      </div>

      {/* ── Form / page error ── */}
      {(formError || error) && !pageLoading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {formError ?? error}
          <button
            onClick={() => { refetch(); }}
            className="ml-auto text-red-600 underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {pageLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-gray-100 rounded-xl" />
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl border border-gray-100" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!pageLoading && !error && total === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
            <Inbox className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4">No submissions yet</h3>
          <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
            Share the form link or QR code with customers to start collecting responses.
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {!pageLoading && !error && total > 0 && (
        <>
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Submission Date
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Phone
                    </th>
                    {form?.fields.birthday.visible && (
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Birthday
                      </th>
                    )}
                    {form?.fields.address.visible && (
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Address
                      </th>
                    )}
                    {tokenCols.map((tf) => (
                      <th
                        key={tf.tokenKey}
                        className="text-left px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {tf.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-100 ${loading ? "opacity-60" : ""} transition-opacity`}>
                  {submissions.map((sub: FormSubmission) => (
                    <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[13px]">
                        {fmtDate(sub.submittedAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {sub.payload.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono whitespace-nowrap text-[13px]">
                        {sub.phone}
                      </td>
                      {form?.fields.birthday.visible && (
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-[13px]">
                          {sub.payload.birthday ? fmtDateOnly(sub.payload.birthday) : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {form?.fields.address.visible && (
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate text-[13px]">
                          {sub.payload.address ?? <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {tokenCols.map((tf) => (
                        <td key={tf.tokenKey} className="px-4 py-3 text-gray-600 text-[13px] whitespace-nowrap">
                          <CellValue
                            fieldType={tf.fieldType}
                            value={sub.payload.tokenValues?.[tf.tokenKey]}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
                <span className="ml-2 text-gray-400">· {total.toLocaleString()} total</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PrevIcon className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <NextIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-[fadeUp_.2s_ease-out] bg-red-600 text-white border-red-700"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
