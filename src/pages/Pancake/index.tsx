import { useState, useEffect, useRef } from "react";
import {
  Copy, Check, Plus, Pencil, Trash2, AlertTriangle, CheckCircle,
  Plug, MessageSquare, ChevronDown, Tag, FlaskConical,
} from "lucide-react";
import { PageHeader } from "@/components/common";
import { authStore, BRAND } from "@/utils";
import { pancakeService } from "@/services/pancake.service";
import type { PancakeTemplate, PancakeTagTemplate } from "@/services/pancake.service";
import { tagsService } from "@/services/tags.service";
import { tokensService } from "@/services/tokens.service";
import type { Tag as GabyTag, ApiToken } from "@/types";
import { AdvancedSection, emptyAdvanced, advancedFromTemplate } from "./AdvancedSection";
import type { AdvancedConfig } from "./AdvancedSection";

// ── Constants ─────────────────────────────────────────────────────────────────

const WEBHOOK_URL = "https://api.gabysms.com/webhooks/pancake/orders";

const PANCAKE_STATUSES: { value: string; label: string }[] = [
  { value: "0",               label: "New"                      },
  { value: "1",               label: "Confirmed"                },
  { value: "2",               label: "Shipped"                  },
  { value: "3",               label: "Delivered"                },
  { value: "4",               label: "Returning"                },
  { value: "5",               label: "Returned"                 },
  { value: "6",               label: "Canceled"                 },
  { value: "8",               label: "Packaging"                },
  { value: "9",               label: "Waiting for Pick Up"      },
  { value: "11",              label: "Restocking"               },
  { value: "12",              label: "Wait for Printing"        },
  { value: "13",              label: "Printed"                  },
  { value: "15",              label: "Partial Return"           },
  { value: "16",              label: "Collected Money"          },
  { value: "17",              label: "Waiting for Confirmation" },
  { value: "20",              label: "Purchased"                },
  { value: "out_for_delivery", label: "Out for Delivery"        },
  { value: "undeliverable",   label: "Delivery Failed"          },
];

const STATUS_MAP: Record<string, string> = Object.fromEntries(
  PANCAKE_STATUSES.map((s) => [s.value, s.label])
);

const TOKEN_CHIPS = [
  { token: "{{name}}",            label: "Name"             },
  { token: "{{order_id}}",        label: "Order ID"         },
  { token: "{{full_name}}",       label: "Full name"        },
  { token: "{{first_name}}",      label: "First name"       },
  { token: "{{last_name}}",       label: "Last name"        },
  { token: "{{tracking_number}}", label: "Tracking number"  },
  { token: "{{cod}}",             label: "COD amount"       },
  { token: "{{product}}",         label: "Product(s)"       },
];

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── MessageEditor ─────────────────────────────────────────────────────────────

function MessageEditor({
  value,
  onChange,
  placeholder = "Type your SMS message…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + token); return; }
    const start = el.selectionStart ?? value.length;
    const end   = el.selectionEnd   ?? value.length;
    const next  = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {TOKEN_CHIPS.map((c) => (
          <button
            key={c.token}
            type="button"
            onClick={() => insertToken(c.token)}
            title={c.label}
            className="px-2 py-0.5 rounded-full text-xs font-mono font-medium border transition-colors"
            style={{ borderColor: BRAND.primary + "55", color: BRAND.primary, backgroundColor: BRAND.primary + "10" }}
          >
            {c.token}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">click to insert</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent"
        style={{ "--tw-ring-color": BRAND.primary + "40" } as React.CSSProperties}
      />
      <div className="text-right text-xs text-gray-400 mt-1">{value.length}/1000</div>
    </div>
  );
}

// ── EnabledToggle ─────────────────────────────────────────────────────────────

function EnabledToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
        style={{ backgroundColor: value ? BRAND.primary : "#d1d5db" }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
      <span className="text-sm text-gray-700">
        {value ? "Enabled — will send SMS" : "Disabled — will not send SMS"}
      </span>
    </div>
  );
}

// ── FormActions ───────────────────────────────────────────────────────────────

function FormActions({
  saving,
  canSave,
  onCancel,
}: {
  saving: boolean;
  canSave: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2 justify-end pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving || !canSave}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: BRAND.primary }}
      >
        {saving ? "Saving…" : "Save template"}
      </button>
    </div>
  );
}

// ── SectionShell ──────────────────────────────────────────────────────────────

function SectionShell({
  icon: Icon,
  title,
  subtitle,
  onAdd,
  showAddButton,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onAdd: () => void;
  showAddButton: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color: BRAND.primary }} />
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {showAddButton && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: BRAND.primary }}
          >
            <Plus className="w-4 h-4" />
            Add template
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Status Templates Section ──────────────────────────────────────────────────

function StatusTemplatesSection({
  senderId,
  gabyTags,
  gabyTokens,
}: {
  senderId: string;
  gabyTags: GabyTag[];
  gabyTokens: ApiToken[];
}) {
  const [templates,   setTemplates]   = useState<PancakeTemplate[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [addSaving,   setAddSaving]   = useState(false);
  const [addError,    setAddError]    = useState<string | null>(null);
  const [addSuccess,  setAddSuccess]  = useState(false);

  // Add form state
  const [addStatus,    setAddStatus]    = useState("");
  const [addMessage,   setAddMessage]   = useState("");
  const [addEnabled,   setAddEnabled]   = useState(true);
  const [addAdvanced,  setAddAdvanced]  = useState<AdvancedConfig>(emptyAdvanced());

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      setTemplates(await pancakeService.getTemplates());
    } catch {
      setLoadError("Failed to load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const usedStatuses = templates.map((t) => t.effectiveStatus);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await pancakeService.createTemplate({
        senderId,
        effectiveStatus: addStatus,
        message: addMessage.trim(),
        isEnabled: addEnabled,
        tagsToAdd:          addAdvanced.tagsToAdd,
        tagsToRemove:       addAdvanced.tagsToRemove,
        tokenMappings:      addAdvanced.tokenMappings,
        manualFieldUpdates: addAdvanced.manualFieldUpdates,
      });
      setTemplates((prev) => [...prev, created]);
      setShowAdd(false);
      setAddStatus(""); setAddMessage(""); setAddEnabled(true); setAddAdvanced(emptyAdvanced());
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create template.";
      setAddError(
        msg.includes("409") || msg.toLowerCase().includes("already exists")
          ? "A template for this status already exists."
          : msg
      );
    } finally {
      setAddSaving(false);
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, isEnabled } : t));
    await pancakeService.updateTemplate(id, { isEnabled });
  };

  const handleEdit = async (id: string, message: string, advanced: AdvancedConfig) => {
    const updated = await pancakeService.updateTemplate(id, {
      message,
      tagsToAdd:          advanced.tagsToAdd,
      tagsToRemove:       advanced.tagsToRemove,
      tokenMappings:      advanced.tokenMappings,
      manualFieldUpdates: advanced.manualFieldUpdates,
    });
    setTemplates((prev) => prev.map((t) => t.id === id ? updated : t));
  };

  const handleDelete = async (id: string) => {
    await pancakeService.deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const availableStatuses = PANCAKE_STATUSES.filter((s) => !usedStatuses.includes(s.value));

  return (
    <SectionShell
      icon={MessageSquare}
      title="Status Templates"
      subtitle="Send an SMS when an order reaches a specific status."
      onAdd={() => setShowAdd(true)}
      showAddButton={!showAdd}
    >
      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="px-6 pt-5 pb-4 space-y-4 border-b border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Order Status</label>
            <div className="relative">
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
                required
                className="w-full appearance-none px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent pr-9"
                style={{ "--tw-ring-color": BRAND.primary + "40" } as React.CSSProperties}
              >
                <option value="" disabled>Select a status…</option>
                {availableStatuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {availableStatuses.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">All available statuses already have templates.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SMS Message</label>
            <MessageEditor value={addMessage} onChange={setAddMessage} />
          </div>
          <EnabledToggle value={addEnabled} onChange={setAddEnabled} />
          <AdvancedSection value={addAdvanced} onChange={setAddAdvanced} gabyTags={gabyTags} gabyTokens={gabyTokens} />
          {addError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />{addError}
            </div>
          )}
          <FormActions
            saving={addSaving}
            canSave={!!addStatus && !!addMessage.trim()}
            onCancel={() => { setShowAdd(false); setAddError(null); setAddStatus(""); setAddMessage(""); setAddEnabled(true); setAddAdvanced(emptyAdvanced()); }}
          />
        </form>
      )}

      {addSuccess && !showAdd && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />Template created successfully.
        </div>
      )}

      {loading ? (
        <div className="px-6 py-6 space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="px-6 py-5 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />{loadError}
          <button onClick={load} className="ml-auto text-red-600 underline text-xs">Retry</button>
        </div>
      ) : templates.length === 0 && !showAdd ? (
        <div className="px-6 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No status templates yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add template" to create your first one.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {templates.map((t) => (
            <StatusTemplateRow
              key={t.id}
              template={t}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              gabyTags={gabyTags}
              gabyTokens={gabyTokens}
            />
          ))}
        </ul>
      )}

      {templates.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {templates.length} template{templates.length !== 1 ? "s" : ""} · Tokens are replaced by Gaby at send time.
          </p>
        </div>
      )}
    </SectionShell>
  );
}

// ── StatusTemplateRow ─────────────────────────────────────────────────────────

function StatusTemplateRow({
  template,
  onToggle,
  onEdit,
  onDelete,
  gabyTags,
  gabyTokens,
}: {
  template: PancakeTemplate;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onEdit: (id: string, message: string, advanced: AdvancedConfig) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  gabyTags: GabyTag[];
  gabyTokens: ApiToken[];
}) {
  const [mode,        setMode]        = useState<"view" | "edit" | "delete">("view");
  const [toggling,    setToggling]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [editMsg,     setEditMsg]     = useState(template.message);
  const [editEnabled, setEditEnabled] = useState(template.isEnabled);
  const [editAdvanced, setEditAdvanced] = useState<AdvancedConfig>(advancedFromTemplate(template));
  const [editError,   setEditError]   = useState<string | null>(null);

  const statusLabel = STATUS_MAP[template.effectiveStatus] ?? template.statusLabel ?? template.effectiveStatus;

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(template.id, !template.isEnabled); }
    finally { setToggling(false); }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      await onEdit(template.id, editMsg.trim(), editAdvanced);
      setMode("view");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(template.id); }
    finally { setDeleting(false); }
  };

  if (mode === "edit") {
    return (
      <li className="px-5 py-4">
        <form onSubmit={handleSaveEdit} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Order Status</label>
            <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">{statusLabel}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SMS Message</label>
            <MessageEditor value={editMsg} onChange={setEditMsg} />
          </div>
          <EnabledToggle value={editEnabled} onChange={setEditEnabled} />
          <AdvancedSection value={editAdvanced} onChange={setEditAdvanced} gabyTags={gabyTags} gabyTokens={gabyTokens} />
          {editError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />{editError}
            </div>
          )}
          <FormActions saving={saving} canSave={!!editMsg.trim()} onCancel={() => { setMode("view"); setEditError(null); }} />
        </form>
      </li>
    );
  }

  if (mode === "delete") {
    return (
      <li className="px-5 py-4 flex items-center gap-3">
        <span className="flex-1 text-sm text-gray-700">
          Delete the <strong>{statusLabel}</strong> template? This cannot be undone.
        </span>
        <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button onClick={() => setMode("view")} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </button>
      </li>
    );
  }

  const hasAdvanced =
    template.tagsToAdd?.length > 0 ||
    template.tagsToRemove?.length > 0 ||
    template.tokenMappings?.length > 0 ||
    template.manualFieldUpdates?.length > 0;

  return (
    <li className="px-5 py-4 flex items-start gap-4 group">
      <span className="shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
        {statusLabel}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-600 font-mono leading-relaxed break-all">{template.message}</span>
        {hasAdvanced && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">
            + actions
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={template.isEnabled}
        onClick={handleToggle}
        disabled={toggling}
        className="relative inline-flex h-5 w-9 shrink-0 mt-0.5 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
        style={{ backgroundColor: template.isEnabled ? BRAND.primary : "#d1d5db" }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: template.isEnabled ? "translateX(18px)" : "translateX(2px)" }}
        />
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditMsg(template.message);
            setEditEnabled(template.isEnabled);
            setEditAdvanced(advancedFromTemplate(template));
            setMode("edit");
          }}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode("delete")} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

// ── Tag Templates Section ─────────────────────────────────────────────────────

function TagTemplatesSection({
  senderId,
  gabyTags,
  gabyTokens,
}: {
  senderId: string;
  gabyTags: GabyTag[];
  gabyTokens: ApiToken[];
}) {
  const [templates,  setTemplates]  = useState<PancakeTagTemplate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addSaving,  setAddSaving]  = useState(false);
  const [addError,   setAddError]   = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [addTagName,  setAddTagName]  = useState("");
  const [addMessage,  setAddMessage]  = useState("");
  const [addEnabled,  setAddEnabled]  = useState(true);
  const [addAdvanced, setAddAdvanced] = useState<AdvancedConfig>(emptyAdvanced());

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      setTemplates(await pancakeService.getTagTemplates());
    } catch {
      setLoadError("Failed to load tag templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await pancakeService.createTagTemplate({
        senderId,
        tagName: addTagName.trim(),
        message: addMessage.trim(),
        isEnabled: addEnabled,
        tagsToAdd:          addAdvanced.tagsToAdd,
        tagsToRemove:       addAdvanced.tagsToRemove,
        tokenMappings:      addAdvanced.tokenMappings,
        manualFieldUpdates: addAdvanced.manualFieldUpdates,
      });
      setTemplates((prev) => [...prev, created]);
      setShowAdd(false);
      setAddTagName(""); setAddMessage(""); setAddEnabled(true); setAddAdvanced(emptyAdvanced());
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create template.";
      setAddError(
        msg.includes("409") || msg.toLowerCase().includes("already exists")
          ? "A template for this tag already exists."
          : msg
      );
    } finally {
      setAddSaving(false);
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, isEnabled } : t));
    await pancakeService.updateTagTemplate(id, { isEnabled });
  };

  const handleEdit = async (id: string, message: string, advanced: AdvancedConfig) => {
    const updated = await pancakeService.updateTagTemplate(id, {
      message,
      tagsToAdd:          advanced.tagsToAdd,
      tagsToRemove:       advanced.tagsToRemove,
      tokenMappings:      advanced.tokenMappings,
      manualFieldUpdates: advanced.manualFieldUpdates,
    });
    setTemplates((prev) => prev.map((t) => t.id === id ? updated : t));
  };

  const handleDelete = async (id: string) => {
    await pancakeService.deleteTagTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SectionShell
      icon={Tag}
      title="Tag Templates"
      subtitle="Send an SMS when a Pancake order is assigned a specific tag."
      onAdd={() => setShowAdd(true)}
      showAddButton={!showAdd}
    >
      {showAdd && (
        <form onSubmit={handleAdd} className="px-6 pt-5 pb-4 space-y-4 border-b border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pancake Tag Name</label>
            <input
              type="text"
              value={addTagName}
              onChange={(e) => setAddTagName(e.target.value)}
              placeholder="e.g. ODZ"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": BRAND.primary + "40" } as React.CSSProperties}
            />
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Must match the tag name in Pancake exactly. Case-sensitive.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SMS Message</label>
            <MessageEditor value={addMessage} onChange={setAddMessage} />
          </div>
          <EnabledToggle value={addEnabled} onChange={setAddEnabled} />
          <AdvancedSection value={addAdvanced} onChange={setAddAdvanced} gabyTags={gabyTags} gabyTokens={gabyTokens} />
          {addError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />{addError}
            </div>
          )}
          <FormActions
            saving={addSaving}
            canSave={!!addTagName.trim() && !!addMessage.trim()}
            onCancel={() => { setShowAdd(false); setAddError(null); setAddTagName(""); setAddMessage(""); setAddEnabled(true); setAddAdvanced(emptyAdvanced()); }}
          />
        </form>
      )}

      {addSuccess && !showAdd && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />Tag template created successfully.
        </div>
      )}

      {loading ? (
        <div className="px-6 py-6 space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="px-6 py-5 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />{loadError}
          <button onClick={load} className="ml-auto text-red-600 underline text-xs">Retry</button>
        </div>
      ) : templates.length === 0 && !showAdd ? (
        <div className="px-6 py-10 text-center">
          <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No tag templates yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add template" to create your first one.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {templates.map((t) => (
            <TagTemplateRow
              key={t.id}
              template={t}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              gabyTags={gabyTags}
              gabyTokens={gabyTokens}
            />
          ))}
        </ul>
      )}

      {templates.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {templates.length} tag template{templates.length !== 1 ? "s" : ""} · Tag names are case-sensitive and must match Pancake exactly.
          </p>
        </div>
      )}
    </SectionShell>
  );
}

// ── TagTemplateRow ────────────────────────────────────────────────────────────

function TagTemplateRow({
  template,
  onToggle,
  onEdit,
  onDelete,
  gabyTags,
  gabyTokens,
}: {
  template: PancakeTagTemplate;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onEdit: (id: string, message: string, advanced: AdvancedConfig) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  gabyTags: GabyTag[];
  gabyTokens: ApiToken[];
}) {
  const [mode,        setMode]        = useState<"view" | "edit" | "delete">("view");
  const [toggling,    setToggling]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [editMsg,     setEditMsg]     = useState(template.message);
  const [editEnabled, setEditEnabled] = useState(template.isEnabled);
  const [editAdvanced, setEditAdvanced] = useState<AdvancedConfig>(advancedFromTemplate(template));
  const [editError,   setEditError]   = useState<string | null>(null);

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(template.id, !template.isEnabled); }
    finally { setToggling(false); }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      await onEdit(template.id, editMsg.trim(), editAdvanced);
      setMode("view");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(template.id); }
    finally { setDeleting(false); }
  };

  if (mode === "edit") {
    return (
      <li className="px-5 py-4">
        <form onSubmit={handleSaveEdit} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pancake Tag Name</label>
            <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium font-mono">
              {template.tagName}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SMS Message</label>
            <MessageEditor value={editMsg} onChange={setEditMsg} />
          </div>
          <EnabledToggle value={editEnabled} onChange={setEditEnabled} />
          <AdvancedSection value={editAdvanced} onChange={setEditAdvanced} gabyTags={gabyTags} gabyTokens={gabyTokens} />
          {editError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />{editError}
            </div>
          )}
          <FormActions saving={saving} canSave={!!editMsg.trim()} onCancel={() => { setMode("view"); setEditError(null); }} />
        </form>
      </li>
    );
  }

  if (mode === "delete") {
    return (
      <li className="px-5 py-4 flex items-center gap-3">
        <span className="flex-1 text-sm text-gray-700">
          Delete the <strong className="font-mono">{template.tagName}</strong> tag template? This cannot be undone.
        </span>
        <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button onClick={() => setMode("view")} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </button>
      </li>
    );
  }

  const hasAdvanced =
    template.tagsToAdd?.length > 0 ||
    template.tagsToRemove?.length > 0 ||
    template.tokenMappings?.length > 0 ||
    template.manualFieldUpdates?.length > 0;

  return (
    <li className="px-5 py-4 flex items-start gap-4 group">
      <span className="shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
        {template.tagName}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-600 font-mono leading-relaxed break-all">{template.message}</span>
        {hasAdvanced && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">
            + actions
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={template.isEnabled}
        onClick={handleToggle}
        disabled={toggling}
        className="relative inline-flex h-5 w-9 shrink-0 mt-0.5 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
        style={{ backgroundColor: template.isEnabled ? BRAND.primary : "#d1d5db" }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: template.isEnabled ? "translateX(18px)" : "translateX(2px)" }}
        />
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditMsg(template.message);
            setEditEnabled(template.isEnabled);
            setEditAdvanced(advancedFromTemplate(template));
            setMode("edit");
          }}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode("delete")} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Pancake() {
  const apiKey   = authStore.getApiKey() ?? "";
  const senderId = authStore.getUser()?.id ?? "";

  const [gabyTags,   setGabyTags]   = useState<GabyTag[]>([]);
  const [gabyTokens, setGabyTokens] = useState<ApiToken[]>([]);

  useEffect(() => {
    if (!senderId) return;
    tagsService.getAll(senderId).then(setGabyTags).catch(() => {});
    tokensService.getAll(senderId).then(setGabyTokens).catch(() => {});
  }, [senderId]);

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader
        title="Pancake Integration"
        subtitle="Connect your Pancake POS to send automatic SMS messages on order events."
      />

      {/* Beta banner */}
      <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
        <FlaskConical className="w-4 h-4 shrink-0 text-amber-500" />
        <span>
          <strong>Beta feature.</strong> Pancake integration is still in beta — behaviour may change and some edge cases may not be handled yet. Please report any issues to our support team.
        </span>
      </div>

      <div className="space-y-6">

        {/* ── Section 1: Connection Setup ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Plug className="w-5 h-5" style={{ color: BRAND.primary }} />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Connect to Pancake</h2>
              <p className="text-sm text-gray-500 mt-0.5">Paste these into your Pancake webhook settings.</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Webhook URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="text-sm text-gray-800 break-all">{WEBHOOK_URL}</code>
                </div>
                <CopyButton text={WEBHOOK_URL} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your API Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="text-sm text-gray-800 font-mono break-all">
                    {apiKey
                      ? `${apiKey.slice(0, 10)}${"•".repeat(24)}`
                      : <span className="text-gray-400 italic">No API key found</span>
                    }
                  </code>
                </div>
                {apiKey && <CopyButton text={apiKey} />}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-5 py-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Setup steps in Pancake</p>
              <ol className="space-y-2">
                {[
                  <>Go to <strong>Pancake → Settings → Advanced → Third-party connection → Webhook/API</strong></>,
                  <>Paste the <strong>Webhook URL</strong> into the URL field</>,
                  <>Under <strong>Data</strong>, select <strong>Orders</strong></>,
                  <>Under <strong>Request Headers</strong>, add: <code className="text-[11px] bg-blue-100 px-1 py-0.5 rounded font-mono">x-api-key</code> → (paste your API Key)</>,
                  <>Click <strong>Save</strong></>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-blue-800">
                    <span className="shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5 text-white" style={{ backgroundColor: BRAND.primary }}>
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* ── Section 2: Status Templates ── */}
        <StatusTemplatesSection senderId={senderId} gabyTags={gabyTags} gabyTokens={gabyTokens} />

        {/* ── Section 3: Tag Templates ── */}
        <TagTemplatesSection senderId={senderId} gabyTags={gabyTags} gabyTokens={gabyTokens} />

      </div>
    </div>
  );
}
