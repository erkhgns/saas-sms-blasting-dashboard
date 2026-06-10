import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common";
import { formPublicUrl } from "@/utils/form-url";
import { useForms } from "@/hooks/useForms";
import { useTags } from "@/hooks/useTags";
import { FormCard } from "./FormCard";
import { DeleteFormModal } from "./DeleteFormModal";
import { QRCodeModal } from "./QRCodeModal";
import { FormEditor } from "./FormEditor";
import type { GabyForm, FormStatus } from "@/types";

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { id: string; msg: string; kind: "success" | "error" }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (msg: string, kind: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };
  return { toasts, push };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Forms() {
  const {
    forms, loading, error, togglingId,
    refetch, deleteForm, toggleStatus,
  } = useForms();
  const { tags } = useTags();
  const { toasts, push } = useToast();

  // ── Editor view ────────────────────────────────────────────────────────────
  const [view,        setView]        = useState<"list" | "editor">("list");
  const [editingForm, setEditingForm] = useState<GabyForm | null>(null);

  function openCreate() { setEditingForm(null); setView("editor"); }
  function openEdit(f: GabyForm) { setEditingForm(f); setView("editor"); }
  function handleEditorBack() { setView("list"); setEditingForm(null); }

  // ── Delete modal ───────────────────────────────────────────────────────────
  const [deletingForm, setDeletingForm] = useState<GabyForm | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  async function confirmDelete() {
    if (!deletingForm) return;
    setDeleting(true);
    try {
      await deleteForm(deletingForm.id);
      push(`"${deletingForm.name}" deleted.`);
      setDeletingForm(null);
    } catch {
      push("Failed to delete form.", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ── QR modal ───────────────────────────────────────────────────────────────
  const [qrForm, setQrForm] = useState<GabyForm | null>(null);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  async function handleToggle(id: string, newStatus: FormStatus) {
    try {
      await toggleStatus(id, newStatus);
      push(newStatus === "active" ? "Form activated." : "Form deactivated.");
    } catch {
      push("Failed to update form status.", "error");
    }
  }

  // ── Editor success ─────────────────────────────────────────────────────────
  async function handleEditorSuccess(message: string) {
    push(message);
    await refetch();
    setView("list");
    setEditingForm(null);
  }

  const empty = !loading && !error && forms.length === 0;

  // Full-page editor view — fills DashboardLayout's <main className="flex-1 overflow-auto">
  if (view === "editor") {
    return (
      <div className="h-full">
        <FormEditor
          form={editingForm}
          onBack={handleEditorBack}
          onSuccess={handleEditorSuccess}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="Forms"
        subtitle="Create shareable registration forms to collect customer contacts."
        actions={
          !empty && !loading ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Form
            </button>
          ) : undefined
        }
      />

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto text-red-600 underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {empty && (
        <div className="mt-6 flex flex-col items-center justify-center py-24 px-6 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-[#FF692E]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">No forms yet</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md leading-relaxed">
            Forms give you a shareable link and QR code customers can use to register themselves —
            every submission becomes a contact, auto-tagged and ready for your campaigns.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first form
            </button>
          </div>
        </div>
      )}

      {/* Forms list */}
      {!loading && !error && forms.length > 0 && (
        <>
          <div className="text-sm text-gray-500 mt-4 mb-4">
            {forms.length} form{forms.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-3.5">
            {forms.map((f) => (
              <FormCard
                key={f.id}
                form={f}
                tags={tags}
                togglingId={togglingId}
                onEdit={openEdit}
                onDelete={setDeletingForm}
                onToggle={handleToggle}
                onQR={setQrForm}
                onView={(form) => window.open(formPublicUrl(form.shortCode), "_blank")}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deletingForm && (
        <DeleteFormModal
          form={deletingForm}
          deleting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingForm(null)}
        />
      )}

      {/* QR modal */}
      {qrForm && (
        <QRCodeModal form={qrForm} onClose={() => setQrForm(null)} pushToast={push} />
      )}

      {/* Toast stack */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-[fadeUp_.2s_ease-out] ${
              t.kind === "error"
                ? "bg-red-600 text-white border-red-700"
                : "bg-gray-900 text-white border-gray-900"
            }`}
          >
            {t.kind === "error"
              ? <AlertTriangle className="w-4 h-4 shrink-0" />
              : <CheckCircle className="w-4 h-4 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
