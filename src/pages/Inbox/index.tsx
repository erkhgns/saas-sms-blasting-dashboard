import { useState } from "react";
import { Search, Send } from "lucide-react";
import { AvatarInitials, PrimaryButton } from "@/components/common";
import { BRAND } from "@/utils";
import type { Conversation, Message } from "@/types";

const conversations: Conversation[] = [
  { id: 1, name: "Sarah Johnson", phone: "+1 (555) 234-5678", lastMessage: "Yes, I'll be there at 3pm", time: "5 min ago", unread: true },
  { id: 2, name: "Mike Chen", phone: "+1 (555) 876-5432", lastMessage: "Can I reschedule to tomorrow?", time: "12 min ago", unread: true },
  { id: 3, name: "Emily Davis", phone: "+1 (555) 345-6789", lastMessage: "Thanks for the update!", time: "25 min ago", unread: false },
  { id: 4, name: "Robert Wilson", phone: "+1 (555) 567-8901", lastMessage: "STOP", time: "1 hour ago", unread: false },
  { id: 5, name: "Jessica Martinez", phone: "+1 (555) 123-4567", lastMessage: "What are your hours today?", time: "2 hours ago", unread: false },
  { id: 6, name: "David Brown", phone: "+1 (555) 789-0123", lastMessage: "Perfect, see you soon!", time: "3 hours ago", unread: false },
];

const messagesByConversation: Record<number, Message[]> = {
  1: [
    { id: "1a", conversationId: "1", direction: "outbound", text: "Hi Sarah! Your appointment is confirmed for 3pm today. See you soon!", time: "10:25 AM" },
    { id: "1b", conversationId: "1", direction: "inbound", text: "Yes, I'll be there at 3pm", time: "10:30 AM" },
  ],
  2: [
    { id: "2a", conversationId: "2", direction: "outbound", text: "Hi Mike! Your appointment is scheduled for tomorrow at 2pm.", time: "9:45 AM" },
    { id: "2b", conversationId: "2", direction: "inbound", text: "Can I reschedule to tomorrow?", time: "9:53 AM" },
  ],
  3: [
    { id: "3a", conversationId: "3", direction: "outbound", text: "Your order #12345 has been shipped! Track at tracking.example.com", time: "9:15 AM" },
    { id: "3b", conversationId: "3", direction: "inbound", text: "Thanks for the update!", time: "9:20 AM" },
  ],
};

export function Inbox() {
  const [selectedId, setSelectedId] = useState(1);
  const [replyMessage, setReplyMessage] = useState("");

  const selected = conversations.find((c) => c.id === selectedId);
  const messages: Message[] = messagesByConversation[selectedId] ?? [];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className="w-full p-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              style={selectedId === conv.id ? { backgroundColor: BRAND.primaryLight } : {}}
            >
              <AvatarInitials name={conv.name} size="lg" />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 truncate">{conv.name}</div>
                  <div className="text-xs text-gray-500 ml-2 flex-shrink-0">{conv.time}</div>
                </div>
                <div className="text-sm text-gray-600 mb-1">{conv.phone}</div>
                <div className={`text-sm truncate ${conv.unread ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                  {conv.lastMessage}
                </div>
              </div>
              {conv.unread && (
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: BRAND.primary }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          {selected && (
            <div className="flex items-center gap-3">
              <AvatarInitials name={selected.name} size="md" />
              <div>
                <div className="font-medium text-gray-900">{selected.name}</div>
                <div className="text-sm text-gray-600">{selected.phone}</div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-md">
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.direction === "outbound"
                      ? "text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}
                  style={msg.direction === "outbound" ? { backgroundColor: BRAND.primary } : {}}
                >
                  {msg.text}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${msg.direction === "outbound" ? "text-right" : "text-left"}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none"
              style={{ outline: "none" }}
            />
            <PrimaryButton className="px-5 py-3 h-fit">
              <Send className="w-5 h-5" />
              Send
            </PrimaryButton>
          </div>
          <div className="text-xs text-gray-500 mt-2">{replyMessage.length}/160 characters</div>
        </div>
      </div>
    </div>
  );
}
