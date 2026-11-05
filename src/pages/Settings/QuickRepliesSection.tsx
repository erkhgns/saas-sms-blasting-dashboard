import { useState, useEffect, useRef } from "react";
import {
  Zap, Plus, Pencil, Trash2, GripVertical, X, Braces, AlertTriangle, CheckCircle, Loader2,
} from "lucide-react";
import { TokenPicker, SegmentCounter } from "@/components/common";
import { useQuickReplies, useTokens } from "@/hooks";
import { ApiError, quickReplyFieldErrors } from "@/services";
import { BRAND } from "@/utils";
import { resolveTemplate, sanitizeShortcut } from "@/utils/quickReplies";
import { QUICK_REPLY_LIMITS } from "@/types";
import type { QuickReply, CreateQuickReplyPayload } from "@/types";

const LIMIT_MESSAGE = `You can have up to ${QUICK_REPLY_LIMITS.perAccount} quick replies. Delete one to add another.`;

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ id: number; msg: string; kind: "success" | "error" } | null>(null);
  const push = (msg: string, kind: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, msg, kind });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  };
  return { toast, push };
}

// ── Section ───────────────────────────────────────────────────────────────────

export function QuickRepliesSection() {
  const { quickReplies, loading, error, refetch, create, update, remove, reorder } = useQuickReplies();
  const { tokens, refetch: refetchTokens } = useTokens();
  const { toast, push } = useToast();

  const [drawer, setDrawer]       = useState<{ open: boolean; editing: QuickReply | null }>({ open: false, editing: null });
  const [deleting, setDeleting]   = useState<QuickReply | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);

  const atLimit = quickReplies.length >= QUICK_REPLY_LIMITS.perAccount;

  const openCreate = () => { refetchTokens(); setDrawer({ open: true, editing: null }); };
  const openEdit   = (r: QuickReply) => { refetchTokens(); setDrawer({ open: true, editing: r }); };

  // ── Drag reorder (only from the grip, same pattern as Automations) ──────────
  const canDrag   = useRef(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver]   = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const resetDrag = () => { dragIndex.current = null; setDragOver(null); setDraggingId(null); };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    resetDrag();
    if (from === null || from === dropIndex) return;
    const next = [...quickReplies];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    reorder(next)
      .then(() => {
        setOrderSaved(true);
        setTimeout(() => setOrderSaved(false), 1800);
      })
      .catch((err) => {
        push(
          err instanceof ApiError && err.status === 409
            ? "The list changed while you were editing. It's been refreshed — please drag again."
            : "Failed to save the new order.",
          "error",
        );
      });
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await remove(target.id);
      push("Quick reply deleted");
    } catch {
      push("Failed to delete quick reply.", "error");
    }
  };

  return (
    <div id="quick-replies" className="bg-white rounded-xl border border-gray-200 shadow-sm scroll-mt-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: BRAND.primary }} />
            <h2 className="text-lg font-semibold text-gray-900">Quick Replies</h2>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Saved messages agents insert in the Inbox by typing{" "}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">/</code> in the reply box.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {orderSaved && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle className="w-3.5 h-3.5" /> Order saved
            </span>
          )}
          {quickReplies.length > 0 && (
            <button
              type="button"
              onClick={openCreate}
              disabled={atLimit}
              title={atLimit ? LIMIT_MESSAGE : undefined}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND.primary }}
            >
              <Plus className="w-4 h-4" /> Create Quick Reply
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => void refetch()} className="ml-auto text-xs text-red-600 underline">Retry</button>
          </div>
        ) : quickReplies.length === 0 ? (
          /* Empty state */
          <div className="py-16 flex flex-col items-center text-center">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-xl bg-orange-100 rotate-6" />
              <div className="absolute inset-0 rounded-xl bg-white border border-orange-200 flex items-center justify-center -rotate-3">
                <Zap className="w-6 h-6" style={{ color: BRAND.primary }} />
              </div>
            </div>
            <p className="text-base font-semibold text-gray-900">No quick replies yet</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Save the answers you send most often, then insert them in any conversation by typing “/”.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND.primary }}
            >
              <Plus className="w-4 h-4" /> Create Quick Reply
            </button>
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="h-10 px-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <span className="w-6 shrink-0" />
                <span className="flex-1 lg:flex-none lg:w-56 min-w-0">Name</span>
                <span className="hidden sm:block w-32 shrink-0">Shortcut</span>
                <span className="hidden lg:block flex-1 min-w-0">Message</span>
                <span className="w-[76px] shrink-0" />
              </div>

              <ul className="divide-y divide-gray-100">
                {quickReplies.map((r, i) => (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={(e) => {
                      if (!canDrag.current) { e.preventDefault(); return; }
                      dragIndex.current = i;
                      setDraggingId(r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={() => { canDrag.current = false; resetDrag(); }}
                    className={`group px-4 py-3.5 flex items-center gap-3 transition-colors ${
                      draggingId === r.id ? "opacity-50 bg-orange-50/60" : "hover:bg-gray-50/70"
                    }`}
                    style={dragOver === i && draggingId !== r.id ? { boxShadow: `inset 0 2px 0 ${BRAND.primary}` } : undefined}
                  >
                    <button
                      type="button"
                      onMouseDown={() => { canDrag.current = true; }}
                      onMouseUp={() => { canDrag.current = false; }}
                      className="w-6 shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                      tabIndex={-1}
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>

                    <div className="flex-1 lg:flex-none lg:w-56 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{r.name}</div>
                      {r.category && <div className="text-xs text-gray-400 truncate">{r.category}</div>}
                      <div className="lg:hidden text-xs text-gray-500 truncate mt-0.5">{r.message}</div>
                    </div>

                    <div className="hidden sm:block w-32 shrink-0">
                      {r.shortcut
                        ? <span className="inline-block max-w-full truncate px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-mono">/{r.shortcut}</span>
                        : <span className="text-sm text-gray-300">—</span>}
                    </div>

                    <div className="hidden lg:block flex-1 min-w-0 text-sm text-gray-500 truncate">{r.message}</div>

                    <div className="w-[76px] shrink-0 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                        aria-label={`Edit ${r.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(r)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-3">This order is the order agents see in the Inbox picker.</p>
          </>
        )}
      </div>

      <QuickReplyDrawer
        open={drawer.open}
        editing={drawer.editing}
        all={quickReplies}
        tokens={tokens}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSave={async (payload) => {
          if (drawer.editing) {
            await update(drawer.editing.id, payload);
            push("Quick reply updated");
          } else {
            await create(payload);
            push("Quick reply created");
          }
          setDrawer((d) => ({ ...d, open: false }));
        }}
      />

      {deleting && (
        <DeleteDialog name={deleting.name} onCancel={() => setDeleting(null)} onConfirm={handleConfirmDelete} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm shadow-xl">
          {toast.kind === "success"
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Drawer: Create / Edit ────────────────────────────────────────────────────

interface DrawerForm { name: string; shortcut: string; category: string; message: string }
const BLANK: DrawerForm = { name: "", shortcut: "", category: "", message: "" };

function QuickReplyDrawer({
  open,
  editing,
  all,
  tokens,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: QuickReply | null;
  all: QuickReply[];
  tokens: ReturnType<typeof useTokens>["tokens"];
  onClose: () => void;
  onSave: (payload: CreateQuickReplyPayload) => Promise<void>;
}) {
  const [form, setForm]           = useState<DrawerForm>(BLANK);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DrawerForm, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caret       = useRef(0);

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { name: editing.name, shortcut: editing.shortcut ?? "", category: editing.category ?? "", message: editing.message }
      : BLANK);
    caret.current = editing?.message.length ?? 0;
    setTokenOpen(false);
    setFieldErrors({});
    setFormError(null);
  }, [open, editing]);

  // Esc closes the drawer (the token menu first, if open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tokenOpen) setTokenOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tokenOpen, onClose]);

  const set = (key: keyof DrawerForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  const shortcutTaken = !!form.shortcut && all.some((r) => r.shortcut === form.shortcut && r.id !== editing?.id);
  const canSave = !!form.name.trim() && !!form.message.trim() && !shortcutTaken && !saving;
  const categories = [...new Set(all.map((r) => r.category).filter((c): c is string => !!c))];

  const insertToken = (t: { key: string }) => {
    const tag = `{{${t.key}}}`;
    const el  = textareaRef.current;
    const pos = el && document.activeElement === el ? el.selectionStart : caret.current;
    set("message", form.message.slice(0, pos) + tag + form.message.slice(pos));
    setTokenOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos + tag.length, pos + tag.length);
      caret.current = pos + tag.length;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSave({
        name:     form.name.trim(),
        shortcut: form.shortcut || null,
        category: form.category.trim() || null,
        message:  form.message,
      });
    } catch (err) {
      const fields = quickReplyFieldErrors(err);
      setFieldErrors(fields);
      if (err instanceof ApiError && err.status === 422) setFormError(err.message || LIMIT_MESSAGE);
      else if (Object.keys(fields).length === 0) {
        setFormError(err instanceof Error ? err.message : "Failed to save quick reply.");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 ${
      hasError ? "border-red-400 focus:ring-red-100" : "border-gray-300 focus:border-orange-500 focus:ring-orange-100"
    }`;

  const shortcutError = fieldErrors.shortcut ?? (shortcutTaken ? "This shortcut is already taken" : null);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/30 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0 }}
      />
      <aside
        role="dialog"
        aria-label={editing ? "Edit Quick Reply" : "Create Quick Reply"}
        className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl flex flex-col transition-transform duration-300"
        style={{ transform: open ? "none" : "translateX(100%)", transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-900">{editing ? "Edit Quick Reply" : "Create Quick Reply"}</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
          className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={QUICK_REPLY_LIMITS.name}
              placeholder="e.g. Order Confirmed"
              className={inputClass(!!fieldErrors.name)}
            />
            {fieldErrors.name && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          {/* Shortcut + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Shortcut <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className={`flex items-stretch border rounded-lg overflow-hidden transition-colors focus-within:ring-2 ${
                shortcutError ? "border-red-400 focus-within:ring-red-100" : "border-gray-300 focus-within:border-orange-500 focus-within:ring-orange-100"
              }`}>
                <span className="px-3 flex items-center bg-gray-50 border-r border-gray-200 text-sm font-mono text-gray-500">/</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => set("shortcut", sanitizeShortcut(e.target.value))}
                  maxLength={QUICK_REPLY_LIMITS.shortcut}
                  placeholder="e.g. confirmed"
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm font-mono outline-none"
                  aria-invalid={!!shortcutError}
                />
              </div>
              {shortcutError
                ? <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{shortcutError}</p>
                : <p className="mt-1.5 text-xs text-gray-400">Lowercase, no spaces.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                list="quick-reply-categories"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                maxLength={QUICK_REPLY_LIMITS.category}
                placeholder="e.g. Order Updates"
                className={inputClass(!!fieldErrors.category)}
              />
              <datalist id="quick-reply-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
              {fieldErrors.category && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.category}</p>}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
            <div className={`border rounded-lg transition-colors focus-within:ring-2 ${
              fieldErrors.message ? "border-red-400 focus-within:ring-red-100" : "border-gray-300 focus-within:border-orange-500 focus-within:ring-orange-100"
            }`}>
              <textarea
                ref={textareaRef}
                value={form.message}
                rows={6}
                maxLength={QUICK_REPLY_LIMITS.message}
                onChange={(e) => { set("message", e.target.value); caret.current = e.target.selectionStart; }}
                onSelect={(e) => { caret.current = e.currentTarget.selectionStart; }}
                placeholder="Hi {{first_name}}, your order is confirmed…"
                className="w-full px-3 py-2.5 text-sm leading-relaxed resize-none outline-none rounded-t-lg block"
              />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-gray-100 bg-gray-50/60 rounded-b-lg">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTokenOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <Braces className="w-3.5 h-3.5" /> Insert token
                  </button>
                  {tokenOpen && <TokenPicker onPick={insertToken} anchor="up" tokens={tokens} />}
                </div>
                <SegmentCounter text={form.message} className="pr-1" />
              </div>
            </div>
            {fieldErrors.message && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.message}</p>}
          </div>

          {/* Preview */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">Preview (using fallback values)</div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              {form.message.trim() ? (
                <div
                  className="max-w-[85%] ml-auto px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed text-white whitespace-pre-wrap break-words"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  {resolveTemplate(form.message, null, tokens)}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-2">Your message preview will appear here.</div>
              )}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <button type="submit" className="hidden" />
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95"
            style={{ backgroundColor: BRAND.primary }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Save Changes" : "Save"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Delete confirm ───────────────────────────────────────────────────────────

function DeleteDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-label={`Delete ‘${name}’?`}
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 break-words">Delete ‘{name}’?</h3>
            <p className="text-sm text-gray-600 mt-1">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
