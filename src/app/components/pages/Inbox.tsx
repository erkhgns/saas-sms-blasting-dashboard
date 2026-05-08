import { useState } from "react";
import { Search, Send } from "lucide-react";

const conversations = [
  {
    id: 1,
    name: "Sarah Johnson",
    phone: "+1 (555) 234-5678",
    lastMessage: "Yes, I'll be there at 3pm",
    time: "5 min ago",
    unread: true,
  },
  {
    id: 2,
    name: "Mike Chen",
    phone: "+1 (555) 876-5432",
    lastMessage: "Can I reschedule to tomorrow?",
    time: "12 min ago",
    unread: true,
  },
  {
    id: 3,
    name: "Emily Davis",
    phone: "+1 (555) 345-6789",
    lastMessage: "Thanks for the update!",
    time: "25 min ago",
    unread: false,
  },
  {
    id: 4,
    name: "Robert Wilson",
    phone: "+1 (555) 567-8901",
    lastMessage: "STOP",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 5,
    name: "Jessica Martinez",
    phone: "+1 (555) 123-4567",
    lastMessage: "What are your hours today?",
    time: "2 hours ago",
    unread: false,
  },
  {
    id: 6,
    name: "David Brown",
    phone: "+1 (555) 789-0123",
    lastMessage: "Perfect, see you soon!",
    time: "3 hours ago",
    unread: false,
  },
];

const messages = {
  1: [
    { sender: "outbound", text: "Hi Sarah! Your appointment is confirmed for 3pm today. See you soon!", time: "10:25 AM" },
    { sender: "inbound", text: "Yes, I'll be there at 3pm", time: "10:30 AM" },
  ],
  2: [
    { sender: "outbound", text: "Hi Mike! Your appointment is scheduled for tomorrow at 2pm.", time: "9:45 AM" },
    { sender: "inbound", text: "Can I reschedule to tomorrow?", time: "9:53 AM" },
  ],
  3: [
    { sender: "outbound", text: "Your order #12345 has been shipped! Track at tracking.example.com", time: "9:15 AM" },
    { sender: "inbound", text: "Thanks for the update!", time: "9:20 AM" },
  ],
};

export function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [replyMessage, setReplyMessage] = useState("");

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
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: 'none' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`w-full p-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation === conversation.id ? "hover:bg-gray-50" : ""
              }`}
              style={selectedConversation === conversation.id ? { backgroundColor: '#FCF4B5' } : {}}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FCF4B5' }}>
                <span className="text-sm font-medium" style={{ color: '#FF692E' }}>{conversation.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 truncate">{conversation.name}</div>
                  <div className="text-xs text-gray-500 ml-2 flex-shrink-0">{conversation.time}</div>
                </div>
                <div className="text-sm text-gray-600 mb-1">{conversation.phone}</div>
                <div className={`text-sm truncate ${conversation.unread ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                  {conversation.lastMessage}
                </div>
              </div>
              {conversation.unread && (
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: '#FF692E' }}></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FCF4B5' }}>
              <span className="text-sm font-medium" style={{ color: '#FF692E' }}>
                {conversations.find(c => c.id === selectedConversation)?.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{conversations.find(c => c.id === selectedConversation)?.name}</div>
              <div className="text-sm text-gray-600">{conversations.find(c => c.id === selectedConversation)?.phone}</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(messages[selectedConversation as keyof typeof messages] || []).map((message, index) => (
            <div key={index} className={`flex ${message.sender === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md ${message.sender === "outbound" ? "order-2" : "order-1"}`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.sender === "outbound"
                      ? "text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}
                  style={message.sender === "outbound" ? { backgroundColor: '#FF692E' } : {}}
                >
                  {message.text}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${message.sender === "outbound" ? "text-right" : "text-left"}`}>
                  {message.time}
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none" style={{ outline: 'none' }}
            />
            <button
              className="flex items-center gap-2 px-5 py-3 text-white font-semibold rounded-lg transition-colors h-fit"
              style={{ backgroundColor: '#FF692E' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E55829'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF692E'}
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {replyMessage.length}/160 characters
          </div>
        </div>
      </div>
    </div>
  );
}
