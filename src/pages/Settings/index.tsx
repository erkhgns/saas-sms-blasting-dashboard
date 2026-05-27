import { useState, useEffect, useRef } from "react";
import {
  Copy, AlertTriangle, CheckCircle,
  Tag as TagIcon, Plus, Pencil, Trash2, X, Check,
  Key, Hash, Lock, Eye, EyeOff, Zap, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/common";
import { authStore } from "@/utils/auth.store";
import { authService } from "@/services/auth.service";
import { tagsService } from "@/services/tags.service";
import { tokensService } from "@/services/tokens.service";
import { useAutoReply } from "@/hooks/useAutoReply";
import { useTokens } from "@/hooks/useTokens";
import { FREQUENCY_LABELS, FREQUENCY_OPTIONS } from "@/types";
import type { Tag, ApiToken, AutoReplyRule, FrequencyType, CreateAutoReplyRulePayload, UpdateAutoReplyRulePayload } from "@/types";

/** Copies text — returns true if successful, false if both methods fail. */
async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Normalize a hex color for use in <input type="color">.
 * Expands 3-digit #abc → #aabbcc; returns brand orange as fallback.
 */
function toInputHex(hex: string | null | undefined): string {
  if (!hex) return "#FF692E";
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}


/** Inline color-swatch button that opens the native color picker on click. */
function ColorPicker({
  value,
  onChange,
  size = "md",
  title = "Pick a color",
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: "sm" | "md";
  title?: string;
}) {
  const sizeClass = size === "sm" ? "w-7 h-7" : "w-10 h-10";
  return (
    <label className={`relative cursor-pointer shrink-0 rounded-lg ${sizeClass}`} title={title}>
      {/* visually-hidden native input */}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      {/* Styled swatch */}
      <span
        className={`block ${sizeClass} rounded-lg border-2 border-white ring-1 ring-gray-300 hover:ring-[#FF692E] transition-shadow`}
        style={{ backgroundColor: value }}
      />
    </label>
  );
}

// ─── Tags Management Section ──────────────────────────────────────────────────

function TagsSection({ senderId }: { senderId: string }) {
  const [tags, setTags]       = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Add new tag
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState("#FF692E");
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [editColor, setEditColor] = useState("#FF692E");
  const [saving, setSaving]       = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [senderId]);
  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getAll(senderId);
      setTags(data);
    } catch {
      setError("Failed to load tags.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      setAdding(true);
      setAddError(null);
      const tag = await tagsService.create({ senderId, name, color: newColor });
      setTags(prev => [...prev, tag]);
      setNewName("");
      setNewColor("#FF692E");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create tag.";
      setAddError(msg.includes("409") || msg.toLowerCase().includes("exists")
        ? "A tag with that name already exists."
        : msg);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(toInputHex(tag.color));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditColor("#FF692E");
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    try {
      setSaving(true);
      const updated = await tagsService.update(id, { name, color: editColor });
      setTags(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch {
      // keep editor open — user can retry
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await tagsService.delete(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch { /* swallow */ } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <TagIcon className="w-5 h-5 text-[#FF692E]" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Organize contacts into groups. Renaming a tag updates it across all contacts automatically.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">

        {/* ── Add new tag ── */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(null); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="New tag name…"
            maxLength={50}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
          />
          {/* Color picker swatch */}
          <ColorPicker
            value={newColor}
            onChange={setNewColor}
            title="Tag color"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF692E] text-white rounded-lg text-sm font-medium hover:bg-[#e55a24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {adding ? "Adding…" : "Add Tag"}
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-600 -mt-2">{addError}</p>
        )}

        {/* ── Tag list ── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={load} className="ml-auto text-red-600 underline text-xs">Retry</button>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No tags yet. Add your first tag above.
          </div>
        ) : (
          <ul className="space-y-2">
            {tags.map(tag => (
              <li
                key={tag.id}
                className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg group"
              >
                {/* Color dot — always visible, reflects tag.color */}
                {editingId !== tag.id && deletingId !== tag.id && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: tag.color ?? "#d1d5db" }}
                  />
                )}

                {editingId === tag.id ? (
                  <>
                    {/* Color picker swatch in edit mode */}
                    <ColorPicker
                      value={editColor}
                      onChange={setEditColor}
                      size="sm"
                      title="Change color"
                    />
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveEdit(tag.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      maxLength={50}
                      className="flex-1 px-3 py-1.5 border border-[#FF692E] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30"
                    />
                    <button
                      onClick={() => handleSaveEdit(tag.id)}
                      disabled={saving || !editName.trim()}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : deletingId === tag.id ? (
                  <>
                    <span className="flex-1 text-sm text-gray-700">
                      Delete <strong>"{tag.name}"</strong>? It will be removed from all contacts.
                    </span>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800 font-medium">{tag.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1.5 text-gray-400 hover:text-[#FF692E] hover:bg-orange-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(tag.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-gray-500">
          {tags.length} tag{tags.length !== 1 ? "s" : ""} · Tags are shared across contacts and campaigns.
        </p>
      </div>
    </div>
  );
}

// ─── Token Management Section ─────────────────────────────────────────────────

function TokensSection({ senderId }: { senderId: string }) {
  const [tokens, setTokens]   = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Add form
  const [newKey, setNewKey]         = useState("");
  const [newLabel, setNewLabel]     = useState("");
  const [newFallback, setNewFallback] = useState("");
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editKey, setEditKey]           = useState("");
  const [editLabel, setEditLabel]       = useState("");
  const [editFallback, setEditFallback] = useState("");
  const [saving, setSaving]             = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { load(); }, [senderId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await tokensService.getAll(senderId);
      setTokens(data);
    } catch {
      setError("Failed to load tokens.");
    } finally {
      setLoading(false);
    }
  }

  function sanitizeKey(raw: string) {
    return raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  async function handleAdd() {
    const key      = sanitizeKey(newKey).trim();
    const label    = newLabel.trim();
    const fallback = newFallback.trim() || undefined;
    if (!key || !label) return;
    try {
      setAdding(true);
      setAddError(null);
      const token = await tokensService.create({ senderId, key, label, fallback });
      setTokens(prev => [...prev, token]);
      setNewKey("");
      setNewLabel("");
      setNewFallback("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create token.";
      setAddError(msg.includes("409") || msg.toLowerCase().includes("exists")
        ? "A token with that key already exists."
        : msg);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(token: ApiToken) {
    setEditingId(token.id);
    setEditKey(token.key);
    setEditLabel(token.label);
    setEditFallback(token.fallback ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKey("");
    setEditLabel("");
    setEditFallback("");
  }

  async function handleSaveEdit(id: string) {
    const key      = sanitizeKey(editKey).trim();
    const label    = editLabel.trim();
    const fallback = editFallback.trim() || null;   // null = clear fallback
    if (!key || !label) return;
    try {
      setSaving(true);
      const updated = await tokensService.update(id, { key, label, fallback });
      setTokens(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch {
      // keep editor open
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await tokensService.delete(id);
      setTokens(prev => prev.filter(t => t.id !== id));
    } catch { /* swallow */ } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <Key className="w-5 h-5 text-[#FF692E]" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Custom Tokens</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Define personalization tokens used in campaigns. Set matching values on contacts via{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">customFields</code>{" "}
            and they are replaced per-recipient at send time.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <Hash className="w-4 h-4 mt-0.5 shrink-0 text-[#FF692E]" />
          <p>
            Use tokens in message bodies like{" "}
            <code className="text-xs bg-orange-100 px-1 py-0.5 rounded font-mono">{"{{cod_value}}"}</code>.
            The <strong>fallback</strong> is used when a contact has no value set — if neither is set the token
            is replaced with an empty string.
          </p>
        </div>

        {/* ── Add new token ── */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Token Key</label>
            <input
              type="text"
              value={newKey}
              onChange={e => { setNewKey(sanitizeKey(e.target.value)); setAddError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. cod_value"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => { setNewLabel(e.target.value); setAddError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. COD Amount"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fallback{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={newFallback}
              onChange={e => setNewFallback(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. 0.00"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newKey.trim() || !newLabel.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF692E] text-white rounded-lg text-sm font-medium hover:bg-[#e55a24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {adding ? "Adding…" : "Add Token"}
            </button>
          </div>
        </div>
        {addError && (
          <p className="text-xs text-red-600 -mt-2">{addError}</p>
        )}

        {/* ── Token list ── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={load} className="ml-auto text-red-600 underline text-xs">Retry</button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No custom tokens yet. Add your first token above.
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[160px_1fr_160px_auto] gap-4 px-4 pb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Key</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fallback</span>
              <span className="w-16" />
            </div>

            <ul className="space-y-2">
              {tokens.map(token => (
                <li
                  key={token.id}
                  className="grid grid-cols-[160px_1fr_160px_auto] gap-4 items-center px-4 py-3 border border-gray-200 rounded-lg group"
                >
                  {editingId === token.id ? (
                    <>
                      <input
                        type="text"
                        value={editKey}
                        onChange={e => setEditKey(sanitizeKey(e.target.value))}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveEdit(token.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="px-3 py-1.5 border border-[#FF692E] rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30"
                      />
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveEdit(token.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="px-3 py-1.5 border border-[#FF692E] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30"
                      />
                      <input
                        type="text"
                        value={editFallback}
                        onChange={e => setEditFallback(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveEdit(token.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        placeholder="No fallback"
                        className="px-3 py-1.5 border border-[#FF692E] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(token.id)}
                          disabled={saving || !editKey.trim() || !editLabel.trim()}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : deletingId === token.id ? (
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="flex-1 text-sm text-gray-700">
                        Delete token{" "}
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                          {"{{" + token.key + "}}"}
                        </code>?
                      </span>
                      <button
                        onClick={() => handleDelete(token.id)}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Key pill */}
                      <span className="text-sm font-mono text-[#FF692E] bg-orange-50 px-2 py-1 rounded border border-orange-100 truncate">
                        {"{{" + token.key + "}}"}
                      </span>
                      {/* Label */}
                      <span className="text-sm text-gray-800">{token.label}</span>
                      {/* Fallback */}
                      {token.fallback ? (
                        <span className="text-sm text-gray-600 font-mono truncate" title={token.fallback}>
                          {token.fallback}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No fallback</span>
                      )}
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(token)}
                          className="p-1.5 text-gray-400 hover:text-[#FF692E] hover:bg-orange-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(token.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-xs text-gray-500">
          {tokens.length} custom token{tokens.length !== 1 ? "s" : ""} · Keys must use lowercase letters, numbers, and underscores only.
        </p>
      </div>
    </div>
  );
}

// ─── Change Password ─────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const newTooShort     = newPassword.length > 0 && newPassword.length < 8;
  const canSubmit       = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        setError("Current password is incorrect.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to change password. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
    }`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Lock className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update your login password</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
          <div className="flex gap-2">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className={inputCls(false)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="px-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <div className="flex gap-2">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls(newTooShort)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="px-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newTooShort && (
            <p className="text-xs text-red-600 mt-1.5">Password must be at least 8 characters.</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
          <div className="flex gap-2">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className={inputCls(confirmMismatch)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="px-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmMismatch && (
            <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
          )}
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Password changed successfully.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#FF692E" }}
          >
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── KeywordChipInput ─────────────────────────────────────────────────────────

function KeywordChipInput({
  keywords,
  onChange,
  hasError = false,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  hasError?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addKeyword() {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return;
    if (!keywords.includes(trimmed)) onChange([...keywords, trimmed]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); }
    if (e.key === "Backspace" && !inputValue && keywords.length > 0)
      onChange(keywords.slice(0, -1));
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex flex-wrap gap-2 px-3 py-2.5 border rounded-lg cursor-text min-h-[44px] transition-colors focus-within:ring-2 ${
        hasError
          ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
          : "border-gray-300 focus-within:border-[#FF692E] focus-within:ring-[#FF692E]/20"
      }`}
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(keywords.filter((k) => k !== kw)); }}
            className="ml-0.5 hover:text-orange-900 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addKeyword(); }}
        placeholder={keywords.length === 0 ? "Type a keyword and press Enter…" : "Add more…"}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder:text-gray-400"
      />
    </div>
  );
}

// ─── DeleteRuleModal ─────────────────────────────────────────────────────────

function DeleteRuleModal({
  rule,
  deleting,
  onConfirm,
  onCancel,
}: {
  rule: AutoReplyRule;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete Auto Reply Rule</h3>
            <p className="text-sm text-gray-600 mt-1">
              Are you sure you want to delete <strong>"{rule.name}"</strong>?
            </p>
            <p className="text-sm text-gray-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting…" : "Delete Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AutoReplyRuleTable ───────────────────────────────────────────────────────

function AutoReplyRuleTable({
  rules,
  globallyEnabled,
  onEdit,
  onDelete,
}: {
  rules: AutoReplyRule[];
  globallyEnabled: boolean;
  onEdit: (rule: AutoReplyRule) => void;
  onDelete: (rule: AutoReplyRule) => void;
}) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/60 text-center">
        <Zap className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No auto reply rules yet.</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Create your first rule to automatically answer common customer questions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Rule Name", "Keywords", "Frequency", "Status", "Actions"].map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rules.map((rule) => {
            const visibleKeywords = rule.keywords.slice(0, 3);
            const extraCount      = rule.keywords.length - visibleKeywords.length;
            const isEffectivelyOn = rule.isEnabled && globallyEnabled;

            return (
              <tr
                key={rule.id}
                className={`transition-colors ${
                  isEffectivelyOn ? "hover:bg-gray-50/60" : "bg-gray-50/40"
                }`}
              >
                {/* Rule Name */}
                <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                  <span className={isEffectivelyOn ? "" : "opacity-50"}>{rule.name}</span>
                </td>

                {/* Keywords */}
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {visibleKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
                      >
                        {kw}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        +{extraCount} more
                      </span>
                    )}
                  </div>
                </td>

                {/* Frequency */}
                <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                  {FREQUENCY_LABELS[rule.frequencyType]}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  {rule.isEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Disabled
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(rule)}
                      className="p-1.5 text-gray-400 hover:text-[#FF692E] hover:bg-orange-50 rounded-md transition-colors"
                      title="Edit rule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(rule)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── AutoReplyRuleDrawer ──────────────────────────────────────────────────────

function AutoReplyRuleDrawer({
  open,
  rule,
  onClose,
  createRule,
  updateRule,
  onSuccess,
}: {
  open: boolean;
  rule: AutoReplyRule | null;
  onClose: () => void;
  createRule: (p: CreateAutoReplyRulePayload) => Promise<AutoReplyRule>;
  updateRule: (id: string, p: UpdateAutoReplyRulePayload) => Promise<AutoReplyRule>;
  onSuccess: (message: string) => void;
}) {
  const isEdit = rule !== null;
  const { tokens } = useTokens();
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name,          setName]          = useState("");
  const [keywords,      setKeywords]      = useState<string[]>([]);
  const [message,       setMessage]       = useState("");
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("ONCE_EVERY_24_HOURS");
  const [isEnabled,     setIsEnabled]     = useState(true);

  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);

  // ── Reset / populate when drawer opens ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (rule) {
      setName(rule.name);
      setKeywords(rule.keywords);
      setMessage(rule.message);
      setFrequencyType(rule.frequencyType);
      setIsEnabled(rule.isEnabled);
    } else {
      setName("");
      setKeywords([]);
      setMessage("");
      setFrequencyType("ONCE_EVERY_24_HOURS");
      setIsEnabled(true);
    }
    setFormError(null);
    setErrors({});
    setTokenPickerOpen(false);
  }, [open, rule]);

  const charCount = message.length;
  const segCount  = Math.max(1, Math.ceil(charCount / 160));

  // ── Client-side validation ──────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim())        e.name     = "Rule name is required.";
    if (keywords.length < 1) e.keywords = "At least one keyword is required.";
    if (!message.trim())     e.message  = "Reply message is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Token insertion ─────────────────────────────────────────────────────────
  function insertToken(key: string) {
    const el = messageRef.current;
    if (!el) return;
    const start  = el.selectionStart ?? message.length;
    const end    = el.selectionEnd   ?? message.length;
    const insert = `{{${key}}}`;
    setMessage(message.slice(0, start) + insert + message.slice(end));
    setTokenPickerOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      if (isEdit && rule) {
        await updateRule(rule.id, {
          name: name.trim(), keywords, message: message.trim(), frequencyType, isEnabled,
        });
        onSuccess("Rule updated successfully.");
      } else {
        await createRule({
          name: name.trim(), keywords, message: message.trim(), frequencyType, isEnabled,
        });
        onSuccess("Rule created successfully.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save rule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
    }`;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${open ? "" : "pointer-events-none"}`}>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={!saving ? onClose : undefined}
      />

      {/* Drawer panel */}
      <div
        className={`relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Rule" : "Create Auto Reply Rule"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit
                ? "Update your keyword-based auto reply."
                : "Set up a keyword-based automatic response."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Rule Name ── */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Rule Name <span className="text-[#FF692E]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="e.g. Delivery Timeline"
              className={inputCls("name")}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* ── Keywords ── */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Keywords <span className="text-[#FF692E]">*</span>
            </label>
            <KeywordChipInput
              keywords={keywords}
              hasError={!!errors.keywords}
              onChange={(kws) => { setKeywords(kws); setErrors((p) => ({ ...p, keywords: "" })); }}
            />
            {errors.keywords
              ? <p className="text-xs text-red-600 mt-1">{errors.keywords}</p>
              : <p className="text-xs text-gray-400 mt-1">
                  Add words or phrases customers might text to trigger this reply. Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">,</kbd> to add each keyword.
                </p>
            }
          </div>

          {/* ── Reply Message ── */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Reply Message <span className="text-[#FF692E]">*</span>
            </label>
            <div className="relative">
              <textarea
                ref={messageRef}
                value={message}
                onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: "" })); }}
                placeholder="Type the automated response here…"
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg text-sm resize-none outline-none transition-colors focus:ring-2 ${
                  errors.message
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
                }`}
              />
              {/* Token picker button */}
              <div className="absolute right-2 bottom-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTokenPickerOpen((p) => !p)}
                    className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-md hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 7h16M4 12h16M4 17h7" />
                    </svg>
                    Insert token
                  </button>
                  {tokenPickerOpen && (
                    <div className="absolute bottom-full mb-2 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Available tokens
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {tokens.length === 0 ? (
                          <div className="px-3 py-5 text-xs text-gray-400 text-center">
                            No tokens defined yet.{" "}
                            <span className="text-gray-500">Add in Settings → Custom Tokens.</span>
                          </div>
                        ) : (
                          tokens.map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); insertToken(t.key); }}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between gap-2 text-sm"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{t.label}</div>
                                <div className="text-xs text-gray-500 font-mono truncate">{`{{${t.key}}}`}</div>
                              </div>
                              {t.fallback && (
                                <span className="text-xs text-gray-400 shrink-0 truncate">e.g. {t.fallback}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
              <span className={charCount > 160 ? "text-orange-600 font-medium" : "font-medium text-gray-700"}>
                {charCount}
              </span>
              <span>/160 characters</span>
              <span className="mx-1">·</span>
              <span className="font-medium text-gray-700">{segCount}</span>
              <span>{segCount === 1 ? "segment" : "segments"}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Tokens will be replaced with customer details when the auto reply is sent.
            </p>
          </div>

          {/* ── Frequency ── */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Frequency Limit <span className="text-[#FF692E]">*</span>
            </label>
            <select
              value={frequencyType}
              onChange={(e) => setFrequencyType(e.target.value as FrequencyType)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#FF692E] focus:ring-2 focus:ring-[#FF692E]/20 bg-white"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Controls how often the same customer can receive this reply.
            </p>
          </div>

          {/* ── Status toggle ── */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => setIsEnabled((p) => !p)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  isEnabled ? "bg-[#FF692E]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">
                {isEnabled
                  ? <span className="text-green-700 font-medium">Enabled</span>
                  : <span className="text-gray-500">Disabled</span>
                }
                <span className="text-gray-400 ml-1.5">
                  — {isEnabled ? "rule is active and will trigger on keywords" : "rule is saved but will not trigger"}
                </span>
              </span>
            </div>
          </div>

          {/* ── Form-level error ── */}
          {formError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? (isEdit ? "Saving…" : "Creating…")
              : (isEdit ? "Save Changes" : "Create Rule")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auto Reply Section ───────────────────────────────────────────────────────

function AutoReplySection() {
  const {
    settings,
    loading,
    error,
    toggling,
    refetch,
    toggleEnabled,
    createRule,
    updateRule,
    deleteRule,
  } = useAutoReply();

  const [toastMsg, setToastMsg]       = useState<string | null>(null);
  const [toastError, setToastError]   = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete state
  const [ruleToDelete, setRuleToDelete] = useState<AutoReplyRule | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

  function openCreateDrawer() {
    setEditingRule(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(rule: AutoReplyRule) {
    setEditingRule(rule);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRule(null);
  }

  function handleRuleSaved(message: string) {
    showToast(message);
    closeDrawer();
  }

  function showToast(msg: string, isError = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (isError) { setToastError(msg); setToastMsg(null); }
    else          { setToastMsg(msg);   setToastError(null); }
    toastTimer.current = setTimeout(() => {
      setToastMsg(null);
      setToastError(null);
    }, 3000);
  }

  async function handleToggle() {
    if (!settings) return;
    const next = !settings.enabled;
    try {
      await toggleEnabled(next);
      showToast(`Auto Reply ${next ? "enabled" : "disabled"} successfully.`);
    } catch {
      showToast("Failed to update Auto Reply status.", true);
    }
  }

  async function handleDeleteConfirm() {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRule(ruleToDelete.id);
      showToast("Rule deleted successfully.");
      setRuleToDelete(null);
    } catch {
      showToast("Failed to delete rule.", true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

      {/* ── Section header ── */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#FF692E]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Auto Reply Assistant</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Automatically reply to customer SMS messages based on keywords you set.
            </p>
          </div>
        </div>

        {/* Global toggle */}
        {!loading && !error && settings && (
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={handleToggle}
            disabled={toggling}
            title={settings.enabled ? "Disable Auto Reply" : "Enable Auto Reply"}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
              settings.enabled ? "bg-[#FF692E]" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                settings.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        )}

        {/* Spinner during toggle */}
        {toggling && (
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
        )}
      </div>

      <div className="p-6 space-y-4">

        {/* ── Toasts ── */}
        {toastMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {toastMsg}
          </div>
        )}
        {toastError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {toastError}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button
              onClick={refetch}
              className="ml-auto text-red-600 underline text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Main content — shown once loaded ── */}
        {!loading && !error && settings && (
          <>
            {/* Globally disabled banner */}
            {!settings.enabled && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>
                  Auto Reply is currently <strong>disabled</strong>. Rules below are saved but inactive. Toggle the switch above to re-enable.
                </span>
              </div>
            )}

            {/* Dispatch note (US12 — no priority language exposed) */}
            <p className="text-xs text-gray-400">
              Auto replies are automatically sent as soon as possible.
            </p>

            {/* Rules header row — count + Create Rule button */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {settings.rules.length} rule{settings.rules.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={openCreateDrawer}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF692E] text-white rounded-lg text-sm font-medium hover:bg-[#e55a24] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Rule
              </button>
            </div>

            {/* Rules table */}
            <AutoReplyRuleTable
              rules={settings.rules}
              globallyEnabled={settings.enabled}
              onEdit={openEditDrawer}
              onDelete={(rule) => setRuleToDelete(rule)}
            />
          </>
        )}

      </div>

      {/* Delete confirmation modal */}
      {ruleToDelete && (
        <DeleteRuleModal
          rule={ruleToDelete}
          deleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setRuleToDelete(null)}
        />
      )}

      {/* Create / Edit rule drawer */}
      <AutoReplyRuleDrawer
        open={drawerOpen}
        rule={editingRule}
        onClose={closeDrawer}
        createRule={createRule}
        updateRule={updateRule}
        onSuccess={handleRuleSaved}
      />
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function Settings() {
  const storedKey = authStore.getApiKey();
  const senderId  = authStore.getUser()?.id ?? "";

  const maskedKey = storedKey
    ? `${storedKey.slice(0, 10)}${"•".repeat(32)}`
    : null;

  const [copiedMain, setCopiedMain] = useState(false);
  const [copyError, setCopyError]   = useState(false);

  const handleCopyMain = async () => {
    const text = storedKey ?? "";
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader title="Settings" subtitle="Manage your account and API configuration" />

      <div className="space-y-6">

        {/* ── Profile Information ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">Your account details as registered.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={authStore.getUser()?.name ?? ""}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-default select-none"
                style={{ outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={authStore.getUser()?.email ?? ""}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-default select-none"
                style={{ outline: "none" }}
              />
            </div>
          </div>
        </div>

        {/* ── Change Password ─────────────────────────────────────────────── */}
        <ChangePasswordSection />

        {/* ── API Key ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
            <p className="text-sm text-gray-600 mt-1">
              Your personal API key for third-party integrations. Use it as the{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">x-api-key</code>{" "}
              header — no Bearer token needed.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              {maskedKey ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskedKey}
                      readOnly
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleCopyMain}
                      className="flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors text-sm font-medium"
                      style={
                        copyError  ? { borderColor: "#ef4444", backgroundColor: "#fef2f2", color: "#dc2626" } :
                        copiedMain ? { borderColor: "#16a34a", backgroundColor: "#f0fdf4", color: "#16a34a" } :
                                     { borderColor: "#d1d5db", backgroundColor: "white",   color: "#374151" }
                      }
                    >
                      {copyError
                        ? <><AlertTriangle className="w-4 h-4" /><span>Failed</span></>
                        : copiedMain
                        ? <><CheckCircle className="w-4 h-4" /><span>Copied</span></>
                        : <><Copy className="w-4 h-4" /><span>Copy</span></>}
                    </button>
                  </div>
                  {copyError && (
                    <p className="text-xs text-red-600 mt-1.5">
                      Clipboard access denied — select the key manually and press Ctrl+C / Cmd+C.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>No API key found. Log out and back in to load your key.</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong className="text-gray-900">Note:</strong> Your API key is generated once upon registration.
                If you lose access to it, please contact support — we cannot recover or display a lost key.
              </p>
            </div>
          </div>
        </div>

        {/* ── Tags Management ──────────────────────────────────────────────── */}
        {senderId && <TagsSection senderId={senderId} />}

        {/* ── Token Management ─────────────────────────────────────────────── */}
        {senderId && <TokensSection senderId={senderId} />}

        {/* ── Auto Reply Assistant ─────────────────────────────────────────── */}
        <AutoReplySection />

      </div>
    </div>
  );
}
