import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, MessageSquare, Loader2 } from "lucide-react";
import { AvatarInitials, PrimaryButton } from "@/components/common";
import { BRAND } from "@/utils";
import { useInbox, useConversation } from "@/hooks";
import { inboxService, messagesService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { InboxThread } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";   // guard against "Invalid Date"
  const now  = new Date();
  const diffMs = now.getTime() - date.getTime();
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

// ── Thread list item ─────────────────────────────────────────────────────────

interface ThreadItemProps {
  thread: InboxThread;
  selected: boolean;
  onClick: () => void;
}

function ThreadItem({ thread, selected, onClick }: ThreadItemProps) {
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

export function Inbox() {
  const [search, setSearch]         = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState("");
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState<string | null>(null);
  const messagesEndRef              = useRef<HTMLDivElement>(null);

  const { threads, meta, loading: threadsLoading, error: threadsError, refetch: refetchInbox } = useInbox();
  const { messages, loading: msgLoading, refetch: refetchConversation } = useConversation(selectedPhone);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark thread as read when opened
  useEffect(() => {
    if (!selectedPhone) return;
    const thread = threads.find((t) => t.phone === selectedPhone);
    if (thread && thread.unreadCount > 0) {
      inboxService.markRead(selectedPhone).then(() => refetchInbox()).catch(() => {/* silent */});
    }
  }, [selectedPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredThreads = threads.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.phone.includes(q) ||
      (t.contact?.name ?? "").toLowerCase().includes(q) ||
      t.lastMessage.content.toLowerCase().includes(q)
    );
  });

  const handleSelectThread = useCallback((phone: string) => {
    setSelectedPhone(phone);
    setReplyText("");
    setSendError(null);
  }, []);

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone) return;
    const senderId = authStore.getUser()?.id;
    if (!senderId) return;

    setSending(true);
    setSendError(null);
    try {
      await messagesService.createBulkSms({
        content: replyText.trim(),
        receivers: [selectedPhone],
        senderId,
      });
      setReplyText("");
      // Refresh conversation and inbox list
      refetchConversation();
      refetchInbox();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedThread = threads.find((t) => t.phone === selectedPhone) ?? null;
  const selectedName   = selectedThread ? displayName(selectedThread) : "";

  return (
    <div className="h-[calc(100vh-4rem)] flex">

      {/* ── Thread List ─────────────────────────────────────────── */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Inbox</h2>
            {meta && meta.unreadThreads > 0 && (
              <span
                className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: BRAND.primary }}
              >
                {meta.unreadThreads} unread
              </span>
            )}
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
              onClick={() => handleSelectThread(thread.phone)}
            />
          ))}
        </div>
      </div>

      {/* ── Chat Thread ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-50">

        {!selectedPhone ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-base font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a thread from the left to view messages</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <AvatarInitials name={selectedName || selectedPhone} size="md" />
                <div>
                  <div className="font-medium text-gray-900">{selectedName || selectedPhone}</div>
                  {selectedThread?.contact?.name && (
                    <div className="text-sm text-gray-500">{selectedPhone}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {/* Reply input */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              {sendError && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {sendError}
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Type your reply… (Ctrl+Enter to send)"
                  rows={3}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm"
                  style={{ outline: "none" }}
                  onFocus={(e) => Object.assign(e.target.style, { borderColor: BRAND.primary, boxShadow: "0 0 0 2px rgba(255,95,31,0.2)" })}
                  onBlur={(e)  => Object.assign(e.target.style, { borderColor: "#d1d5db", boxShadow: "none" })}
                />
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
              <div className="text-xs text-gray-400 mt-1.5">{replyText.length} / 160 characters</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
