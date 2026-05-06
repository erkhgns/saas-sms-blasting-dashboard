import { useState } from "react";
import { Upload, Users, Calendar, Send as SendIcon, X } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND, CONTACT_GROUPS, CONTACT_TAGS, getSmsSegmentCount, authStore, cleanPhoneNumbers } from "@/utils";
import { PRIORITY_FROM_LABEL } from "@/types";
import { messagesService } from "@/services";

type RecipientType = "contacts" | "manual" | "upload";
type Priority = "Normal" | "High" | "Urgent";

export function SendSMS() {
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("manual");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [excludeNumbers, setExcludeNumbers] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const characterCount = message.length;
  const segmentCount = getSmsSegmentCount(message);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSend = async () => {
    setSendError(null);
    setSendSuccess(false);

    if (!message.trim()) {
      setSendError("Please enter a message.");
      return;
    }

    if (recipientType === "manual") {
      const cleaned = cleanPhoneNumbers(manualNumbers);
      const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
      const numbers = cleaned.filter((n) => !excluded.has(n));

      if (numbers.length === 0) {
        setSendError(
          cleaned.length === 0
            ? "Please enter at least one phone number."
            : "All numbers were excluded."
        );
        return;
      }

      setSending(true);
      try {
        const result = await messagesService.createBulkSms({
          content: message,
          receivers: numbers,
          senderId: authStore.getUser()?.id ?? "",
          priority: PRIORITY_FROM_LABEL[priority as keyof typeof PRIORITY_FROM_LABEL],
        });
        setSendSuccess(true);
        setMessage("");
        setManualNumbers("");
        setExcludeNumbers("");
        if (result.skipped.length > 0) {
          setSendError(`${result.message}. Skipped: ${result.skipped.join(", ")}`);
        }
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Failed to send SMS.");
      } finally {
        setSending(false);
      }
    }
  };

  const recipientTabStyle = (active: boolean) =>
    active ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight } : {};

  const recipientTabClass = (active: boolean) =>
    `flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-colors ${
      active ? "text-gray-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

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

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRecipientType("contacts")}
                className={recipientTabClass(recipientType === "contacts")}
                style={recipientTabStyle(recipientType === "contacts")}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                From Contacts
              </button>
              <button
                onClick={() => setRecipientType("manual")}
                className={recipientTabClass(recipientType === "manual")}
                style={recipientTabStyle(recipientType === "manual")}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setRecipientType("upload")}
                className={recipientTabClass(recipientType === "upload")}
                style={recipientTabStyle(recipientType === "upload")}
              >
                <Upload className="w-4 h-4 inline-block mr-2" />
                Upload File
              </button>
            </div>

            <div className="space-y-4">
              {recipientType === "contacts" && (
                <>
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
                            selectedTags.includes(tag)
                              ? "text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          style={selectedTags.includes(tag) ? { backgroundColor: BRAND.primary } : {}}
                        >
                          {tag}
                          {selectedTags.includes(tag) && <X className="inline-block w-3 h-3 ml-1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {recipientType === "manual" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Recipients */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Phone Numbers</span>
                      {manualNumbers.trim() && (
                        <span className="text-xs text-gray-500">
                          {cleanPhoneNumbers(manualNumbers).length} number
                          {cleanPhoneNumbers(manualNumbers).length !== 1 ? "s" : ""} cleaned
                        </span>
                      )}
                    </div>
                    <textarea
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      placeholder={"Paste numbers — messy is fine!\n09277910973\n639277910973\n9277910973,\n09277910987"}
                      className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
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
                    <p className="text-xs text-gray-500 mt-1.5">
                      Commas, line breaks, duplicates &amp; formatting fixed automatically
                    </p>
                  </div>

                  {/* Exclude */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Exclude Numbers</span>
                      {excludeNumbers.trim() && (
                        <span className="text-xs text-gray-500">
                          {cleanPhoneNumbers(excludeNumbers).length} excluded
                        </span>
                      )}
                    </div>
                    <textarea
                      value={excludeNumbers}
                      onChange={(e) => setExcludeNumbers(e.target.value)}
                      placeholder={"Numbers to skip from the list\n09277910973\n+639277910973"}
                      className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                      style={{ outline: "none" }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#ef4444";
                        e.target.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.15)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      These numbers will be removed before sending
                    </p>
                  </div>

                  {/* Preview count row */}
                  {manualNumbers.trim() && (
                    <div className="col-span-2">
                      {(() => {
                        const cleaned = cleanPhoneNumbers(manualNumbers);
                        const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
                        const final = cleaned.filter((n) => !excluded.has(n));
                        const dupesRemoved = manualNumbers.split(/[\n,]+/).filter((l) => l.trim()).length - cleaned.length;
                        return (
                          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                            <span className="text-gray-600">
                              Will send to{" "}
                              <span className="font-semibold text-gray-900">{final.length}</span> number{final.length !== 1 ? "s" : ""}
                            </span>
                            {excluded.size > 0 && (
                              <span className="text-red-600">
                                · {excluded.size} excluded
                              </span>
                            )}
                            {dupesRemoved > 0 && (
                              <span className="text-orange-600">
                                · {dupesRemoved} duplicate{dupesRemoved !== 1 ? "s" : ""} removed
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {recipientType === "upload" && (
                <div className="text-center py-8">
                  <button
                    className="inline-flex flex-col items-center gap-3 px-8 py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 transition-colors hover:bg-gray-50"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = BRAND.primary;
                      e.currentTarget.style.backgroundColor = BRAND.primaryLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Upload className="w-8 h-8" />
                    <div>
                      <div className="font-medium mb-1">Click to upload CSV or Excel file</div>
                      <div className="text-sm text-gray-500">File should contain phone numbers</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Priority</label>
            <div className="flex gap-2">
              {(["Normal", "High", "Urgent"] as Priority[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setPriority(level)}
                  className={recipientTabClass(priority === level)}
                  style={recipientTabStyle(priority === level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">Schedule</label>
            <div className="space-y-4">
              <div className="flex gap-4">
                {([true, false] as const).map((isNow) => (
                  <button
                    key={String(isNow)}
                    onClick={() => setSendNow(isNow)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                      sendNow === isNow
                        ? "text-gray-900"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={
                      sendNow === isNow
                        ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight }
                        : {}
                    }
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

          {/* Feedback */}
          {sendError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {sendError}
            </div>
          )}
          {sendSuccess && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              SMS queued successfully!
            </div>
          )}

          {/* Send Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Estimated cost: <span className="font-semibold text-gray-900">15,230 credits</span>
            </div>
            <PrimaryButton
              className="px-8 py-3.5"
              onClick={handleSend}
              disabled={sending || recipientType !== "manual"}
            >
              <SendIcon className="w-5 h-5" />
              {sending ? "Sending..." : sendNow ? "Send SMS" : "Schedule SMS"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
