import { useState, useEffect, useMemo, useRef } from "react";
import { X, User, Braces, Clock, Search, Check, Tag, Trash2, Sparkles, Ban } from "lucide-react";
import { BRAND } from "@/utils";
import { contactsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import { useTokens, useTags } from "@/hooks";
import { CustomFieldInput } from "./CustomFieldInput";
import type { Contact } from "@/types";

interface EditContactDrawerProps {
  /** Pass an existing Contact to edit, or null to create a new one. */
  contact: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
}

type DrawerTab = "details" | "custom" | "activity";

function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = BRAND.primary;
  e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 46, 0.18)";
}
function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "#d1d5db";
  e.target.style.boxShadow = "none";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}


export function EditContactDrawer({ contact, onClose, onSuccess }: EditContactDrawerProps) {
  const isCreate = contact === null;

  const { tokens, loading: tokensLoading } = useTokens();
  const { tags: apiTags } = useTags();

  // Build name → color map for instant lookup
  const apiTagColorMap = useMemo(
    () => new Map(apiTags.map((t) => [t.name, t.color])),
    [apiTags]
  );

  // Animate in
  const [shown, setShown] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
  }, []);

  const handleClose = () => {
    setShown(false);
    setTimeout(onClose, 200);
  };

  // Esc key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form state ────────────────────────────────────────────────────────────
  const [tab, setTab]               = useState<DrawerTab>("details");
  const [name, setName]             = useState(contact?.name ?? "");
  const [phone, setPhone]           = useState(contact?.phone ?? "");
  const [email, setEmail]           = useState(contact?.email ?? "");
  const [tags, setTags]             = useState<string[]>(contact?.tags ?? []);
  const [tagInput, setTagInput]     = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    contact?.customFields ?? {}
  );
  const [tokenSearch, setTokenSearch] = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);

  // ── Tag helpers ───────────────────────────────────────────────────────────
  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setTagInput("");
    setTagDropdownOpen(false);
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    else if (e.key === "Backspace" && !tagInput && tags.length > 0)
      setTags((prev) => prev.slice(0, -1));
    else if (e.key === "Escape") { setTagDropdownOpen(false); }
  };

  // Dropdown suggestions: API tags matching the current input, excluding already-selected
  const dropdownSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return apiTags
      .filter((t) => !tags.includes(t.name))
      .filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [apiTags, tagInput, tags]);

  // Close tag dropdown on outside click
  useEffect(() => {
    if (!tagDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        tagInputRef.current && !tagInputRef.current.contains(e.target as Node) &&
        tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tagDropdownOpen]);

  // Quick-add chips: API tags not yet selected (shown below input, no filter)
  const quickAddTags = useMemo(
    () => apiTags.filter((t) => !tags.includes(t.name)).slice(0, 8),
    [apiTags, tags]
  );

  // ── Custom field helpers ──────────────────────────────────────────────────
  const updateCustomField = (key: string, value: string) =>
    setCustomFields((prev) => ({ ...prev, [key]: value }));

  const filledCount = useMemo(
    () => Object.values(customFields).filter((v) => v && String(v).trim()).length,
    [customFields]
  );

  const filteredTokens = useMemo(() => {
    if (!tokenSearch.trim()) return tokens;
    const q = tokenSearch.toLowerCase();
    return tokens.filter(
      (t) => t.key.includes(q) || t.label.toLowerCase().includes(q)
    );
  }, [tokens, tokenSearch]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    if (!name.trim())  { setSaveError("Name is required."); return; }
    if (!phone.trim()) { setSaveError("Phone number is required."); return; }

    setSaving(true);
    try {
      if (isCreate) {
        // Send token values via the `tokens` field — API merges them into
        // customFields and preserves any existing keys not included here.
        const filledTokens = Object.fromEntries(
          Object.entries(customFields).filter(([, v]) => v && String(v).trim())
        );
        await contactsService.create({
          senderId: authStore.getUser()?.id ?? "",
          name:  name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          tags,
          tokens: Object.keys(filledTokens).length > 0 ? filledTokens : undefined,
        });
      } else {
        await contactsService.update(contact.id, {
          name:  name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          tags,
          customFields,
        });
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : isCreate ? "Failed to create contact." : "Failed to update contact.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await contactsService.delete(contact.id);
      onSuccess();
      handleClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete contact.");
      setDeleting(false);
    }
  };

  const initials = contact ? getInitials(contact.name) : "";

  // Custom fields tab visible in both create and edit mode (when there are tokens)
  const tabs: { key: DrawerTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "details",  label: "Details",       icon: <User className="w-4 h-4" /> },
    ...(tokens.length > 0 || tokensLoading
      ? [{ key: "custom" as DrawerTab, label: "Custom Fields", icon: <Braces className="w-4 h-4" />, count: filledCount > 0 ? filledCount : undefined }]
      : []),
    ...(!isCreate
      ? [{ key: "activity" as DrawerTab, label: "Activity", icon: <Clock className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
        style={{ opacity: shown ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-200"
        style={{
          width: "min(640px, 100vw)",
          transform: shown ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-200">
          <div className="flex items-start gap-4 pb-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base shrink-0"
              style={{ backgroundColor: BRAND.primary }}
            >
              {isCreate ? <User className="w-5 h-5" /> : initials}
            </div>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {isCreate ? "New Contact" : contact.name}
              </h2>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                {isCreate ? (
                  <span>Fill in the details below</span>
                ) : (
                  <>
                    <span className="font-mono">{contact.phone}</span>
                    {contact.optedOut && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                        <Ban className="w-3 h-3" />
                        Opted out
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 -mb-px">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        active ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  style={{ outline: "none" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono"
                  style={{ outline: "none" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                {isCreate && (
                  <p className="text-xs text-gray-400 mt-1">Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  style={{ outline: "none" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>

                {/* Selected tag pills */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => {
                      const color = apiTagColorMap.get(t);
                      return (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-100 text-gray-700"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: color ?? "#d1d5db" }}
                          />
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Tag input with autocomplete dropdown */}
                <div className="relative">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setTagDropdownOpen(true);
                    }}
                    onKeyDown={handleTagKeyDown}
                    onFocus={() => setTagDropdownOpen(true)}
                    placeholder="Type a tag and press Enter…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                    style={{ outline: "none" }}
                  />

                  {/* Autocomplete dropdown */}
                  {tagDropdownOpen && dropdownSuggestions.length > 0 && (
                    <div
                      ref={tagDropdownRef}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden max-h-44 overflow-y-auto"
                    >
                      {dropdownSuggestions.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addTag(t.name); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-orange-50 transition-colors"
                        >
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-100 text-gray-700"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: t.color ?? "#d1d5db" }}
                            />
                            {t.name}
                          </span>
                        </button>
                      ))}
                      {/* Option to add as new tag if typed text isn't an exact match */}
                      {tagInput.trim() &&
                        !apiTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addTag(tagInput); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                        >
                          <span className="text-gray-400">Add</span>
                          <span className="font-medium">"{tagInput.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick-add chips from API tags */}
                {quickAddTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quickAddTags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addTag(t.name)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                      >
                        {t.color ? (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                        ) : (
                          <Tag className="w-2.5 h-2.5" />
                        )}
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Custom fields tab ── */}
          {tab === "custom" && (
            <div className="px-6 py-5">
              {/* Helper banner */}
              <div className="mb-4 px-3.5 py-3 rounded-lg bg-orange-50 border border-orange-100 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 text-orange-600 shrink-0" />
                <div className="text-xs text-gray-700 leading-relaxed">
                  These values fill in{" "}
                  <span className="font-mono text-orange-700 bg-orange-100 px-1 rounded">
                    {"{{tokens}}"}
                  </span>{" "}
                  when you send a campaign. If a contact has no value, the token's{" "}
                  <span className="font-medium">fallback</span> is used instead.
                  Manage token definitions in{" "}
                  <span className="text-orange-600 font-medium">Settings → Custom Tokens</span>.
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ outline: "none" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Loading state */}
              {tokensLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-[180px_1fr] gap-4">
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-10">
                  <Braces className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No custom tokens defined yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Go to <span className="font-medium">Settings → Custom Tokens</span> to add your first token.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredTokens.map((token) => {
                    const value = customFields[token.key];
                    const filled = value != null && String(value).trim() !== "";
                    return (
                      <div
                        key={token.key}
                        className="grid grid-cols-[180px_1fr] gap-4 items-start"
                      >
                        {/* Label column */}
                        <div className="pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900">
                              {token.label}
                            </span>
                            {filled && (
                              <Check className="w-3 h-3 text-green-600" />
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {`{{${token.key}}}`}
                          </div>
                        </div>

                        {/* Input column */}
                        <CustomFieldInput
                          token={token}
                          value={value}
                          onChange={(v) => updateCustomField(token.key, v)}
                        />
                      </div>
                    );
                  })}

                  {filteredTokens.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No tokens match "{tokenSearch}"
                    </div>
                  )}
                </div>
              )}

              {/* Footer count */}
              {!tokensLoading && tokens.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {tokens.length} token{tokens.length !== 1 ? "s" : ""} defined ·{" "}
                    {filledCount} filled on this contact
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab === "activity" && (
            <div className="px-6 py-10 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-gray-500">Activity timeline coming soon</div>
              <div className="text-xs text-gray-400 mt-1">
                Will show messages sent, opens, replies, and field changes.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3.5 border-t border-gray-200 flex items-center justify-between">
          {/* Delete — edit mode only */}
          {!isCreate ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-600 hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete contact"}
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-600 mr-2">{saveError}</span>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: BRAND.primary }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#E55829"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BRAND.primary; }}
            >
              {saving ? "Saving..." : isCreate ? "Add Contact" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
