import { useState } from "react";
import { Upload, Users, Calendar, Send as SendIcon, X } from "lucide-react";

const availableTags = ["VIP", "Repeat Customer", "New Lead", "Active", "Trial"];

export function SendSMS() {
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const characterCount = message.length;
  const segmentCount = Math.ceil(characterCount / 160) || 1;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Send SMS</h1>
        <p className="text-gray-600 mt-1">Compose and send messages to your contacts</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8">
          {/* Message Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg resize-none"
              style={{ outline: 'none' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#FF5F1F';
                e.target.style.boxShadow = '0 0 0 2px rgba(255, 95, 31, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-600">
                <span className={characterCount > 160 ? "text-orange-600" : "text-gray-900 font-medium"}>
                  {characterCount}
                </span>
                <span className="text-gray-500">/160 characters</span>
                <span className="mx-2">•</span>
                <span className="text-gray-900 font-medium">{segmentCount}</span>
                <span className="text-gray-500"> {segmentCount === 1 ? "segment" : "segments"}</span>
              </div>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Recipients</label>

            <div className="space-y-4">
              {/* Contact Dropdown */}
              <div>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white" style={{ outline: 'none' }}>
                    <option>All Contacts (15,230)</option>
                    <option>Active Customers (8,450)</option>
                    <option>New Leads (2,340)</option>
                    <option>VIP Customers (890)</option>
                  </select>
                </div>
              </div>

              {/* Tag Filter */}
              <div>
                <div className="text-sm text-gray-700 mb-2">Filter by tags:</div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={selectedTags.includes(tag) ? { backgroundColor: '#FF5F1F' } : {}}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
                        <X className="inline-block w-3 h-3 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload CSV */}
              <div>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF5F1F';
                    e.currentTarget.style.backgroundColor = '#FFF4EF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload CSV/Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">Schedule</label>

            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setSendNow(true)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                    sendNow
                      ? "text-gray-900"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={sendNow ? { borderColor: '#FF5F1F', backgroundColor: '#FFF4EF' } : {}}
                >
                  Send Now
                </button>
                <button
                  onClick={() => setSendNow(false)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                    !sendNow
                      ? "text-gray-900"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={!sendNow ? { borderColor: '#FF5F1F', backgroundColor: '#FFF4EF' } : {}}
                >
                  Schedule Later
                </button>
              </div>

              {!sendNow && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg" style={{ outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg" style={{ outline: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Estimated cost: <span className="font-semibold text-gray-900">15,230 credits</span>
            </div>
            <button
              className="flex items-center gap-2 px-8 py-3.5 text-white font-semibold rounded-lg transition-colors shadow-sm"
              style={{ backgroundColor: '#FF5F1F' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E54E0F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5F1F'}
            >
              <SendIcon className="w-5 h-5" />
              {sendNow ? "Send SMS" : "Schedule SMS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
