import { useState } from "react";
import { Upload, Users, Calendar, Send as SendIcon, X } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND, CONTACT_GROUPS, CONTACT_TAGS, getSmsSegmentCount } from "@/utils";

export function SendSMS() {
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const characterCount = message.length;
  const segmentCount = getSmsSegmentCount(message);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Send SMS" subtitle="Compose and send messages to your contacts" />

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
              style={{ outline: "none" }}
              onFocus={(e) => {
                e.target.style.borderColor = BRAND.primary;
                e.target.style.boxShadow = "0 0 0 2px rgba(255, 95, 31, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
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
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white"
                  style={{ outline: "none" }}
                >
                  {CONTACT_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-700 mb-2">Filter by tags:</div>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag) ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={selectedTags.includes(tag) ? { backgroundColor: BRAND.primary } : {}}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <X className="inline-block w-3 h-3 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = BRAND.primary;
                  e.currentTarget.style.backgroundColor = BRAND.primaryLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload CSV/Excel</span>
              </button>
            </div>
          </div>

          {/* Scheduling */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">Schedule</label>
            <div className="space-y-4">
              <div className="flex gap-4">
                {[true, false].map((isNow) => (
                  <button
                    key={String(isNow)}
                    onClick={() => setSendNow(isNow)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                      sendNow === isNow ? "text-gray-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={sendNow === isNow ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight } : {}}
                  >
                    {isNow ? "Send Now" : "Schedule Later"}
                  </button>
                ))}
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
                        style={{ outline: "none" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      style={{ outline: "none" }}
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
            <PrimaryButton className="px-8 py-3.5">
              <SendIcon className="w-5 h-5" />
              {sendNow ? "Send SMS" : "Schedule SMS"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
