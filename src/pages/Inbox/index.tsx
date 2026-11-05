import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Send, MessageSquare, Loader2, UserPlus, X, Check, Tag, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { AvatarInitials, PrimaryButton, SegmentCounter } from "@/components/common";
import { BRAND } from "@/utils";
import { useInbox, useConversation } from "@/hooks";
import { useTags } from "@/hooks/useTags";
import { useTokens } from "@/hooks/useTokens";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { filterQuickReplies, findUnfilledTokens, resolveTemplate } from "@/utils/quickReplies";
import { QuickReplyPicker } from "./QuickReplyPicker";
import type { QuickReply } from "@/types";
import { setViewingInboxPhone, requestInboxAlertsCheck, onInboxCheck } from "@/hooks/useInboxAlerts";
import { isSoundMuted, setSoundMuted } from "@/utils/notificationSound";
import { inboxService, messagesService, contactsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { InboxThread } from "@/types";
import { ThreadTagsRow } from "./ThreadTagsRow";
import { ConversationTagBar } from "./ConversationTagBar";
import { ConversationTokenBar } from "./ConversationTokenBar";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now    = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffH   < 24) return `${diffH} hr ago`;
  if (diffD   < 7)  return `${diffD}d ago`;
  return date.toLocaleDateString();
}

function displayName(thread: InboxThread): string {
  return thread.contact?.name ?? thread.phone;
}

// ── TagFilterDropdown ─────────────────────────────────────────────────────────

function TagFilterDropdown({
  allTags,
  selectedIds,
  onChange,
}: {
  allTags: { id: string; name: string; color: string | null }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const containerRef          = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0"
          style={
            selectedIds.length > 0
              ? { borderColor: BRAND.primary, backgroundColor: BRAND.primary + "12", color: BRAND.primary }
              : { borderColor: "#e5e7eb", backgroundColor: "#f9fafb", color: "#6b7280" }
          }
        >
          <Tag className="w-3 h-3" />
          Tags
          {selectedIds.length > 0 && (
            <span
              className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: BRAND.primary }}
            >
              {selectedIds.length}
            </span>
          )}
          <ChevronDown
            className="w-3 h-3 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          />
        </button>

        {/* Active tag chips */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-xs font-medium border"
            style={{ borderColor: BRAND.primary + "40", backgroundColor: BRAND.primary + "10", color: BRAND.primary }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => toggle(tag.id)}
              className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Clear all */}
        {selectedIds.length > 1 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tags…"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                style={{ "--tw-ring-color": BRAND.primary + "60" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No tags found</p>
            ) : (
              filtered.map((tag) => {
                const active = selectedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggle(tag.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
                      style={
                        active
                          ? { backgroundColor: BRAND.primary, borderColor: BRAND.primary }
                          : { borderColor: "#d1d5db" }
                      }
                    >
                      {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 text-xs text-gray-700 truncate">{tag.name}</span>
                    {tag.color && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SaveContactModal ──────────────────────────────────────────────────────────

interface SaveContactModalProps {
  phone: string;
  senderId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SaveContactModal({ phone, senderId, onClose, onSaved }: SaveContactModalProps) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field on open
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await contactsService.create({
        senderId,
        name:  name.trim(),
        phone,
        email: email.trim() || undefined,
        tags:  parsedTags.length > 0 ? parsedTags : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" style={{ color: BRAND.primary }} />
            <h2 className="font-semibold text-gray-900">Save to Contacts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">

          {/* Phone — pre-filled, read-only */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Phone</label>
            <input
              type="text"
              value={phone}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono outline-none"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Name <span style={{ color: BRAND.primary }}>*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Maria Santos"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Email <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maria@example.com"
              className={inputClass}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Tags <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. VIP, New Lead"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple tags with commas.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-70"
            style={{ backgroundColor: success ? "#16a34a" : BRAND.primary }}
          >
            {success ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Save Contact</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Thread list item ─────────────────────────────────────────────────────────

interface ThreadItemProps {
  thread: InboxThread;
  selected: boolean;
  allTags: import("@/types").Tag[];
  onClick: () => void;
}

function ThreadItem({ thread, selected, allTags, onClick }: ThreadItemProps) {
  const name = displayName(thread);
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
      style={selected ? { backgroundColor: BRAND.primaryLight } : {}}
    >
      <AvatarInitials name={name} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className={`truncate ${thread.unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
            {name}
          </div>
          <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {formatTimestamp(thread.lastActivityAt)}
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-1">{thread.phone}</div>
        <div className={`text-sm truncate ${thread.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
          {thread.lastMessage.content}
        </div>
        {thread.contact && thread.contact.tags.length > 0 && (
          <ThreadTagsRow tagNames={thread.contact.tags} allTags={allTags} />
        )}
      </div>
      {thread.unreadCount > 0 && (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-1 flex-shrink-0"
          style={{ backgroundColor: BRAND.primary }}
        >
          {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
        </div>
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

// Within this many px of the bottom counts as "reading the latest messages"
const NEAR_BOTTOM_PX = 80;

export function Inbox() {
  const senderId = authStore.getUser()?.id ?? "";

  const [search, setSearch]               = useState("");
  const [unreadOnly, setUnreadOnly]       = useState(false);
  const [filterTagIds, setFilterTagIds]   = useState<string[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText]         = useState("");
  const [sending, setSending]             = useState(false);
  const [sendError, setSendError]         = useState<string | null>(null);
  // Unfilled {{tokens}} found on the last send attempt — the next send goes out anyway
  const [unfilledWarning, setUnfilledWarning] = useState<string[] | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);
  const messagesScrollRef                 = useRef<HTMLDivElement>(null);
  const nearBottomRef                     = useRef(true);
  const lastMessageRef                    = useRef<{ phone: string | null; id: string | null }>({ phone: null, id: null });
  const [hasNewBelow, setHasNewBelow]     = useState(false);
  const [soundMuted, setSoundMutedState]  = useState(isSoundMuted);
  const sentinelRef                       = useRef<HTMLDivElement>(null);

  const {
    threads,
    meta,
    loading: threadsLoading,
    loadingMore,
    hasMore,
    error: threadsError,
    refetch: refetchInbox,
    loadMore,
    updateThread,
  } = useInbox({
    unread: unreadOnly || undefined,
    tagIds: filterTagIds.length ? filterTagIds : undefined,
  });
  const { messages, conversation, loading: msgLoading, refetch: refetchConversation } =
    useConversation(selectedPhone);

  // Refresh on the background unread check's clock (useInboxAlerts, every 15s while visible)
  // instead of a separate timer, so new messages show up together with the notification sound
  useEffect(
    () => onInboxCheck(() => Promise.all([refetchInbox(), refetchConversation()])),
    [refetchInbox, refetchConversation],
  );
  const { tags: allTags } = useTags();
  const { tokens } = useTokens();
  const { quickReplies, refetch: refetchQuickReplies } = useQuickReplies();

  // ── Quick reply "/" picker ─────────────────────────────────────────────────
  // Open while the reply starts with "/" — unless dismissed (Esc / click outside),
  // which lasts until the leading "/" is gone or the conversation changes.
  const replyRef  = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [qrDismissed, setQrDismissed] = useState(false);
  const [qrHighlight, setQrHighlight] = useState(0);
  const qrOpen  = replyText.startsWith("/") && !qrDismissed;
  const qrQuery = qrOpen ? replyText.slice(1) : "";
  const qrItems = useMemo(
    () => (qrOpen ? filterQuickReplies(quickReplies, qrQuery) : []),
    [qrOpen, qrQuery, quickReplies],
  );

  // First row highlighted on open and whenever the filter changes
  useEffect(() => { setQrHighlight(qrItems.length ? 0 : -1); }, [qrQuery, qrItems.length]);

  // Pick up replies added in Settings since the page loaded
  useEffect(() => { if (qrOpen) void refetchQuickReplies(); }, [qrOpen, refetchQuickReplies]);

  // Click outside the picker and the reply box dismisses it
  useEffect(() => {
    if (!qrOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target) || replyRef.current?.contains(target)) return;
      setQrDismissed(true);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [qrOpen]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setHasNewBelow(false);
  }, []);

  const handleMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottomRef.current) setHasNewBelow(false);
  };

  // Scroll only when the latest message changes: jump to the bottom when a conversation
  // opens; on a new message, follow it if the user is near the bottom or just sent it,
  // otherwise leave them where they are and show the "New message" button.
  useEffect(() => {
    const last = messages.length ? messages[messages.length - 1] : null;
    const prev = lastMessageRef.current;
    lastMessageRef.current = { phone: selectedPhone, id: last?.id ?? null };
    if (!last || last.id === prev.id) return;

    if (prev.phone !== selectedPhone || prev.id === null) {
      nearBottomRef.current = true;
      scrollToLatest("auto");
    } else if (nearBottomRef.current || last.direction === "outbound") {
      scrollToLatest("smooth");
    } else {
      setHasNewBelow(true);
    }
  }, [messages, selectedPhone, scrollToLatest]);

  // Infinite scroll — load next page when sentinel enters view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Mark thread as read when opened, and again when a refresh brings in new messages
  // for the thread already open — optimistic local update, no refetch
  const selectedUnread = threads.find((t) => t.phone === selectedPhone)?.unreadCount ?? 0;
  useEffect(() => {
    if (!selectedPhone || selectedUnread === 0) return;
    updateThread(selectedPhone, { unreadCount: 0 });
    inboxService
      .markRead(selectedPhone)
      .then(requestInboxAlertsCheck) // tab title / sidebar count drops right away
      .catch(() => {/* silent */});
  }, [selectedPhone, selectedUnread, updateThread]);

  // No notification sound for the conversation the user is looking at
  useEffect(() => {
    setViewingInboxPhone(selectedPhone);
    return () => setViewingInboxPhone(null);
  }, [selectedPhone]);

  const toggleSound = () => {
    setSoundMuted(!soundMuted);
    setSoundMutedState(!soundMuted);
  };

  const filteredThreads = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.phone.includes(q) ||
      (t.contact?.name ?? "").toLowerCase().includes(q) ||
      t.lastMessage.content.toLowerCase().includes(q) ||
      (t.contact?.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleTagsChange = async (newTags: string[]) => {
    if (!selectedThread?.contact?.id) return;
    try {
      await contactsService.update(selectedThread.contact.id, { tags: newTags });
      refetchInbox();
    } catch {
      // silent — tag bar stays as-is if save fails
    }
  };

  const handleTokenUpdate = async (key: string, value: string) => {
    if (!selectedThread?.contact?.id) return;
    await contactsService.update(selectedThread.contact.id, {
      tokenOperations: [{ key, op: "overwrite", value }],
    });
    refetchConversation(); // refresh so contact.customFields reflects the new value
  };

  const handleSelectThread = useCallback((phone: string) => {
    setSelectedPhone(phone);
    setHasNewBelow(false);
    setReplyText("");
    setSendError(null);
    setUnfilledWarning(null);
    setQrDismissed(false);
  }, []);

  const handleReplyChange = (value: string) => {
    if (!value.startsWith("/")) setQrDismissed(false);
    setReplyText(value);
    setUnfilledWarning(null);
  };

  // Replace the whole reply ("/" + filter) with the message, tokens filled from the contact
  const insertQuickReply = (reply: QuickReply) => {
    const text = resolveTemplate(reply.message, conversation?.contact?.customFields, tokens);
    setReplyText(text);
    setQrDismissed(false);
    setUnfilledWarning(null);
    requestAnimationFrame(() => {
      const el = replyRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
      el.scrollTop = el.scrollHeight;
    });
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone) return;
    if (!senderId) return;

    // Unfilled {{tokens}} would reach the customer literally — warn once, then allow
    const unfilled = findUnfilledTokens(replyText);
    if (unfilled.length && !unfilledWarning) {
      setUnfilledWarning(unfilled);
      return;
    }
    setUnfilledWarning(null);

    setSending(true);
    setSendError(null);
    try {
      await messagesService.createBulkSms({
        content:   replyText.trim(),
        receivers: [selectedPhone],
        senderId,
        priority:  2, // Urgent — inbox replies always get top priority
      });
      setReplyText("");
      refetchConversation();
      // Delay inbox refresh so the server has time to update thread order
      // before we re-fetch — without this the sent thread may not bubble to top
      setTimeout(refetchInbox, 400);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (qrOpen) {
      // ↑ ↓ don't wrap; Enter only inserts (never sends or adds a newline) while the picker is open
      if (e.key === "ArrowDown") { e.preventDefault(); if (qrItems.length) setQrHighlight((h) => Math.min(qrItems.length - 1, h + 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); if (qrItems.length) setQrHighlight((h) => Math.max(0, h - 1)); return; }
      if (e.key === "Escape")    { e.preventDefault(); setQrDismissed(true); return; }
      if (e.key === "Enter")     { e.preventDefault(); const r = qrItems[qrHighlight]; if (r) insertQuickReply(r); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedThread  = threads.find((t) => t.phone === selectedPhone) ?? null;
  const selectedName    = selectedThread ? displayName(selectedThread) : "";
  const isUnknownNumber = selectedThread && !selectedThread.contact;

  return (
    <div className="h-[calc(100vh-4rem)] flex">

      {/* ── Thread List ─────────────────────────────────────────── */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">

        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Inbox</h2>
              <button
                type="button"
                onClick={toggleSound}
                title={soundMuted ? "Turn on new message sound" : "Mute new message sound"}
                aria-label={soundMuted ? "Turn on new message sound" : "Mute new message sound"}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                style={{ outline: "none" }}
                onFocus={(e) => Object.assign(e.target.style, { borderColor: BRAND.primary, boxShadow: "0 0 0 2px rgba(255,95,31,0.2)" })}
                onBlur={(e)  => Object.assign(e.target.style, { borderColor: "#d1d5db", boxShadow: "none" })}
              />
            </div>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="px-4 pb-3">
              <TagFilterDropdown
                allTags={allTags}
                selectedIds={filterTagIds}
                onChange={setFilterTagIds}
              />
            </div>
          )}

          {/* All / Unread tabs */}
          <div className="flex">
            {([
              { label: "All",    value: false, count: null },
              { label: "Unread", value: true,  count: meta?.unreadThreads ?? 0 },
            ] as const).map(({ label, value, count }) => {
              const active = unreadOnly === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setUnreadOnly(value)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors relative"
                  style={{ color: active ? BRAND.primary : "#6b7280" }}
                >
                  {label}
                  {!!count && count > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                      style={
                        active
                          ? { backgroundColor: BRAND.primary, color: "#fff" }
                          : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                      }
                    >
                      {count}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                      style={{ backgroundColor: BRAND.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {threadsError && (
            <div className="p-4 text-sm text-red-600">{threadsError}</div>
          )}
          {!threadsLoading && !threadsError && filteredThreads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare className="w-10 h-10 mb-2" />
              <p className="text-sm">{search ? "No matching conversations" : "No conversations yet"}</p>
            </div>
          )}
          {filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.phone}
              thread={thread}
              selected={thread.phone === selectedPhone}
              allTags={allTags}
              onClick={() => handleSelectThread(thread.phone)}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-xs">Loading more…</span>
            </div>
          )}
          {!hasMore && !threadsLoading && threads.length > 0 && (
            <div className="py-4 text-center text-xs text-gray-300">
              All conversations loaded
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Thread ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-50">

        {!selectedPhone ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-base font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a thread from the left to view messages</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <AvatarInitials name={selectedName || selectedPhone} size="md" />
                <div>
                  <div className="font-medium text-gray-900">{selectedName || selectedPhone}</div>
                  {selectedThread?.contact?.name && (
                    <div className="text-sm text-gray-500">{selectedPhone}</div>
                  )}
                </div>
              </div>

              {/* Save to Contacts — shown in header for quick access on unknown numbers */}
              {isUnknownNumber && (
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-orange-50"
                  style={{ borderColor: BRAND.primary, color: BRAND.primary }}
                >
                  <UserPlus className="w-4 h-4" />
                  Save to Contacts
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 relative min-h-0">
              <div
                ref={messagesScrollRef}
                onScroll={handleMessagesScroll}
                className="absolute inset-0 overflow-y-auto p-6 space-y-4"
              >
                {msgLoading && (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Loading messages…</span>
                  </div>
                )}
                {!msgLoading && messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">No messages in this conversation yet.</div>
                )}
                {messages.map((msg) => {
                  const isOut = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-md">
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isOut
                              ? "text-white rounded-br-sm"
                              : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                          }`}
                          style={isOut ? { backgroundColor: BRAND.primary } : {}}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
                          <span className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</span>
                          {isOut && msg.status && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              msg.status === "SENT"   ? "bg-green-100 text-green-700" :
                              msg.status === "FAILED" ? "bg-red-100 text-red-700" :
                                                        "bg-gray-100 text-gray-500"
                            }`}>
                              {msg.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {hasNewBelow && (
                <button
                  type="button"
                  onClick={() => scrollToLatest("smooth")}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium text-white shadow-md"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  New message
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Token values bar — uses conversation contact which includes customFields (CR-01) */}
            <ConversationTokenBar
              contact={conversation?.contact ?? null}
              tokens={tokens}
              onTokenUpdate={handleTokenUpdate}
            />

            {/* Tag bar */}
            <ConversationTagBar
              contact={selectedThread?.contact ?? null}
              allTags={allTags}
              onTagsChange={handleTagsChange}
              onSaveContact={() => setSaveModalOpen(true)}
            />

            {/* Reply input */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              {sendError && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {sendError}
                </div>
              )}
              {unfilledWarning && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  This reply still has{" "}
                  {unfilledWarning.map((t, i) => (
                    <span key={t}>{i > 0 && ", "}<code className="font-mono">{t}</code></span>
                  ))}
                  {" "}— the customer would see it as-is. Edit the reply, or press Send again to send anyway.
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="relative flex-1 flex">
                  {qrOpen && (
                    <QuickReplyPicker
                      items={qrItems}
                      total={quickReplies.length}
                      query={qrQuery}
                      highlight={qrHighlight}
                      onHighlight={setQrHighlight}
                      onSelect={insertQuickReply}
                      values={conversation?.contact?.customFields}
                      tokens={tokens}
                      pickerRef={pickerRef}
                    />
                  )}
                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={(e) => handleReplyChange(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Type your reply, or / for quick replies… (Shift+Enter for new line)"
                    rows={3}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm"
                    style={{ outline: "none" }}
                    onFocus={(e) => Object.assign(e.target.style, { borderColor: BRAND.primary, boxShadow: "0 0 0 2px rgba(255,95,31,0.2)" })}
                    onBlur={(e)  => Object.assign(e.target.style, { borderColor: "#d1d5db", boxShadow: "none" })}
                  />
                </div>
                <PrimaryButton
                  onClick={handleSend}
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-3 h-fit gap-2"
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                  {sending ? "Sending…" : "Send"}
                </PrimaryButton>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <SegmentCounter text={replyText} />
                <span className="text-xs text-gray-400">
                  Type <code className="font-mono bg-gray-100 px-1 rounded">/</code> for quick replies
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Save to Contacts modal ───────────────────────────────── */}
      {saveModalOpen && selectedPhone && (
        <SaveContactModal
          phone={selectedPhone}
          senderId={senderId}
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => {
            refetchInbox();         // thread list updates — contact name now shows
            refetchConversation();  // conversation header refreshes too
          }}
        />
      )}
    </div>
  );
}
