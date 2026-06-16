import { useState, useEffect, useRef } from "react";
import {
  Copy, AlertTriangle, CheckCircle,
  Tag as TagIcon, Plus, Pencil, Trash2, X, Check,
  Key, Hash, Lock, Eye, EyeOff, Zap,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/common";
import { authStore } from "@/utils/auth.store";
import { authService } from "@/services/auth.service";
import { tagsService } from "@/services/tags.service";
import { tokensService } from "@/services/tokens.service";
import type { Tag, ApiToken, TokenDataType } from "@/types";

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
  const [newType, setNewType]       = useState<TokenDataType>("text");
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editKey, setEditKey]           = useState("");
  const [editLabel, setEditLabel]       = useState("");
  const [editFallback, setEditFallback] = useState("");
  const [editType, setEditType]         = useState<TokenDataType>("text");
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
      const token = await tokensService.create({ senderId, key, label, type: newType, fallback });
      setTokens(prev => [...prev, token]);
      setNewKey("");
      setNewLabel("");
      setNewFallback("");
      setNewType("text");
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
    setEditType(token.type ?? "text");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKey("");
    setEditLabel("");
    setEditFallback("");
    setEditType("text");
  }

  async function handleSaveEdit(id: string) {
    const key      = sanitizeKey(editKey).trim();
    const label    = editLabel.trim();
    const fallback = editFallback.trim() || null;   // null = clear fallback
    if (!key || !label) return;
    try {
      setSaving(true);
      const updated = await tokensService.update(id, { key, label, type: editType, fallback });
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
        <div className="grid grid-cols-[1fr_1fr_140px_1fr_auto] gap-2">
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={newType}
              onChange={e => {
                const t = e.target.value as TokenDataType;
                setNewType(t);
                // Reset fallback to a type-appropriate default
                if (t === "boolean") setNewFallback("false");
                else setNewFallback("");
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E] bg-white"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="decimal">Decimal</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fallback{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            {newType === "date" ? (
              <input
                type="date"
                value={newFallback}
                onChange={e => setNewFallback(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
              />
            ) : newType === "boolean" ? (
              <div className="flex items-center gap-3 py-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={newFallback === "true"}
                  onClick={() => setNewFallback(newFallback === "true" ? "false" : "true")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF692E]/40 ${
                    newFallback === "true" ? "bg-[#FF692E]" : "bg-gray-200"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                    newFallback === "true" ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
                <span className="text-sm text-gray-700 select-none">
                  {newFallback === "true" ? "True" : "False"}
                </span>
              </div>
            ) : (
              <input
                type="text"
                value={newFallback}
                onChange={e => setNewFallback(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="e.g. 0.00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
              />
            )}
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
            <div className="grid grid-cols-[160px_1fr_100px_120px_auto] gap-4 px-4 pb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Key</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fallback</span>
              <span className="w-16" />
            </div>

            <ul className="space-y-2">
              {tokens.map(token => (
                <li
                  key={token.id}
                  className="grid grid-cols-[160px_1fr_100px_120px_auto] gap-4 items-center px-4 py-3 border border-gray-200 rounded-lg group"
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
                      <select
                        value={editType}
                        onChange={e => {
                          const t = e.target.value as TokenDataType;
                          setEditType(t);
                          if (t === "boolean") setEditFallback("false");
                          else setEditFallback("");
                        }}
                        className="px-2 py-1.5 border border-[#FF692E] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 bg-white"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="decimal">Decimal</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                      </select>
                      {editType === "date" ? (
                        <input
                          type="date"
                          value={editFallback}
                          onChange={e => setEditFallback(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="px-3 py-1.5 border border-[#FF692E] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30"
                        />
                      ) : editType === "boolean" ? (
                        <div className="flex items-center gap-2.5 px-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={editFallback === "true"}
                            onClick={() => setEditFallback(editFallback === "true" ? "false" : "true")}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF692E]/40 ${
                              editFallback === "true" ? "bg-[#FF692E]" : "bg-gray-200"
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                              editFallback === "true" ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                          <span className="text-sm text-gray-700 select-none">
                            {editFallback === "true" ? "True" : "False"}
                          </span>
                        </div>
                      ) : (
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
                      )}
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
                    <div className="col-span-5 flex items-center gap-3">
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
                      {/* Type badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 capitalize w-fit">
                        {token.type ?? "text"}
                      </span>
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


// ─── Settings ────────────────────────────────────────────────────────────────

export function Settings() {
  const navigate  = useNavigate();
  const storedKey = authStore.getApiKey();
  const senderId  = authStore.getUser()?.id ?? "";

  const maskedKey = storedKey
    ? `${storedKey.slice(0, 10)}${"•".repeat(32)}`
    : null;

  const [copiedMain,     setCopiedMain]     = useState(false);
  const [copyError,      setCopyError]      = useState(false);
  const [copiedSenderId, setCopiedSenderId] = useState(false);

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

  const handleCopySenderId = async () => {
    if (!senderId) return;
    const ok = await copyText(senderId);
    if (ok) {
      setCopiedSenderId(true);
      setTimeout(() => setCopiedSenderId(false), 2000);
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

            {/* Sender ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
              <p className="text-xs text-gray-500 mb-2">
                Required as <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded font-mono">senderId</code> in API request bodies. Not a secret — safe to share with developers.
              </p>
              {senderId ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={senderId}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm focus:outline-none text-gray-700"
                  />
                  <button
                    onClick={handleCopySenderId}
                    className="flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors text-sm font-medium"
                    style={
                      copiedSenderId
                        ? { borderColor: "#16a34a", backgroundColor: "#f0fdf4", color: "#16a34a" }
                        : { borderColor: "#d1d5db", backgroundColor: "white",   color: "#374151" }
                    }
                  >
                    {copiedSenderId
                      ? <><CheckCircle className="w-4 h-4" /><span>Copied</span></>
                      : <><Copy className="w-4 h-4" /><span>Copy</span></>}
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Sender ID not found. Log out and back in to reload your account.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tags Management ──────────────────────────────────────────────── */}
        {senderId && <TagsSection senderId={senderId} />}

        {/* ── Token Management ─────────────────────────────────────────────── */}
        {senderId && <TokensSection senderId={senderId} />}

        {/* ── Auto Reply migration note ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
          <Zap className="w-4 h-4 shrink-0 text-[#FF692E]" />
          <span>
            <strong>Looking for Auto Reply?</strong> It's now under{" "}
            <button
              type="button"
              onClick={() => navigate("/automations")}
              className="font-semibold underline hover:text-orange-900 transition-colors"
            >
              Automations
            </button>
            {" "}— with support for conditions, tags, multiple actions, and more.
          </span>
        </div>

      </div>
    </div>
  );
}
