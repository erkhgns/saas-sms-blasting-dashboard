import { useState, useEffect, useRef } from "react";
import {
  Copy, Save, AlertTriangle, CheckCircle,
  Tag as TagIcon, Plus, Pencil, Trash2, X, Check,
  Key, Hash,
} from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { authStore } from "@/utils/auth.store";
import { tagsService } from "@/services/tags.service";
import { tokensService } from "@/services/tokens.service";
import type { Tag, ApiToken } from "@/types";

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

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
      <div
        className="w-11 h-6 bg-gray-200 rounded-full peer
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full
          after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full peer-checked:after:border-white
          peer-checked:bg-[#FF692E]"
      />
    </label>
  );
}

const accountToggles = [
  { label: "Email Notifications",    desc: "Receive email alerts for campaign completions and failures" },
  { label: "Auto-reply Detection",   desc: "Automatically detect and categorize auto-replies" },
  { label: "STOP Request Handling",  desc: "Automatically unsubscribe contacts who send STOP" },
];

// ─── Tags Management Section ──────────────────────────────────────────────────

function TagsSection({ senderId }: { senderId: string }) {
  const [tags, setTags]           = useState<Tag[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Add new tag
  const [newName, setNewName]     = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [saving, setSaving]       = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [senderId]);

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
      const tag = await tagsService.create({ senderId, name });
      setTags(prev => [...prev, tag]);
      setNewName("");
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
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    try {
      setSaving(true);
      const updated = await tagsService.update(id, { name });
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
    } catch {
      // swallow — UI stays intact
    } finally {
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
        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(null); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="New tag name…"
            maxLength={50}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF692E]/30 focus:border-[#FF692E]"
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

        {/* Tag list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
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
                <span className="w-2 h-2 rounded-full bg-[#FF692E] shrink-0" />

                {editingId === tag.id ? (
                  <>
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
                        title="Rename"
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
  const [tokens, setTokens]       = useState<ApiToken[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Add form
  const [newKey, setNewKey]       = useState("");
  const [newLabel, setNewLabel]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editKey, setEditKey]       = useState("");
  const [editLabel, setEditLabel]   = useState("");
  const [saving, setSaving]         = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [senderId]);

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

  // Sanitize token key: lowercase, replace spaces/hyphens with underscore, strip special chars
  function sanitizeKey(raw: string) {
    return raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  async function handleAdd() {
    const key   = sanitizeKey(newKey).trim();
    const label = newLabel.trim();
    if (!key || !label) return;
    try {
      setAdding(true);
      setAddError(null);
      const token = await tokensService.create({ senderId, key, label });
      setTokens(prev => [...prev, token]);
      setNewKey("");
      setNewLabel("");
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
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKey("");
    setEditLabel("");
  }

  async function handleSaveEdit(id: string) {
    const key   = sanitizeKey(editKey).trim();
    const label = editLabel.trim();
    if (!key || !label) return;
    try {
      setSaving(true);
      const updated = await tokensService.update(id, { key, label });
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
    } catch {
      // swallow
    } finally {
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
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">customFields</code> and they are replaced per-recipient at send time.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <Hash className="w-4 h-4 mt-0.5 shrink-0 text-[#FF692E]" />
          <p>
            Use tokens in your message body like{" "}
            <code className="text-xs bg-orange-100 px-1 py-0.5 rounded font-mono">{"{{cod_value}}"}</code>.
            Built-in tokens{" "}
            <code className="text-xs bg-orange-100 px-1 py-0.5 rounded font-mono">{"{{first_name}}"}</code> and{" "}
            <code className="text-xs bg-orange-100 px-1 py-0.5 rounded font-mono">{"{{name}}"}</code>{" "}
            always work without setup.
          </p>
        </div>

        {/* Add new token */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
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

        {/* Token list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
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
            {/* Header */}
            <div className="grid grid-cols-[160px_1fr_auto] gap-4 px-4 pb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Key</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</span>
              <span className="w-16" />
            </div>
            <ul className="space-y-2">
              {tokens.map(token => (
                <li
                  key={token.id}
                  className="grid grid-cols-[160px_1fr_auto] gap-4 items-center px-4 py-3 border border-gray-200 rounded-lg group"
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
                    <div className="col-span-3 flex items-center gap-3">
                      <span className="flex-1 text-sm text-gray-700">
                        Delete token <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">{"{{" + token.key + "}}"}</code>?
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
                      <span className="text-sm font-mono text-[#FF692E] bg-orange-50 px-2 py-1 rounded border border-orange-100 truncate">
                        {"{{" + token.key + "}}"}
                      </span>
                      <span className="text-sm text-gray-800">{token.label}</span>
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
          {tokens.length} custom token{tokens.length !== 1 ? "s" : ""} · Token keys must be unique and use lowercase letters, numbers, and underscores only.
        </p>
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function Settings() {
  const storedKey  = authStore.getApiKey();
  const senderId   = authStore.getUser()?.id ?? "";

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
    <div className="p-8 max-w-4xl">
      <PageHeader title="Settings" subtitle="Manage your account and API configuration" />

      <div className="space-y-6">

        {/* ── Profile Information ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" defaultValue="John" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" defaultValue="Smith" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input type="email" defaultValue="john.smith@company.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input type="text" defaultValue="Acme Corporation" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
            </div>
          </div>
        </div>

        {/* ── API Key ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
            <p className="text-sm text-gray-600 mt-1">
              Your personal API key for third-party integrations. Use it as the{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">x-api-key</code> header — no Bearer token needed.
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
                <strong className="text-gray-900">Note:</strong> Your API key is generated once upon registration. If you lose access to it, please contact support — we cannot recover or display a lost key.
              </p>
            </div>
          </div>
        </div>

        {/* ── Sender ID Configuration ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sender ID Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your default sender ID for outbound messages</p>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Sender ID</label>
            <input
              type="text"
              defaultValue="GabySMS"
              placeholder="e.g., GabySMS or +1234567890"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
            />
            <p className="text-sm text-gray-500 mt-2">
              Can be alphanumeric (up to 11 characters) or a phone number.
            </p>
          </div>
        </div>

        {/* ── Tags Management ──────────────────────────────────────────────── */}
        {senderId && <TagsSection senderId={senderId} />}

        {/* ── Token Management ─────────────────────────────────────────────── */}
        {senderId && <TokensSection senderId={senderId} />}

        {/* ── Account Settings ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            {accountToggles.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between ${i < accountToggles.length - 1 ? "pb-4 border-b border-gray-200" : ""}`}
              >
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
                <Toggle defaultChecked />
              </div>
            ))}
          </div>
        </div>

        {/* ── Save Button ──────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <PrimaryButton className="px-6 py-3">
            <Save className="w-5 h-5" />
            Save Changes
          </PrimaryButton>
        </div>

      </div>
    </div>
  );
}
