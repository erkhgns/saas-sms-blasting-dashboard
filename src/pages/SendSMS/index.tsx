import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Users, Calendar, Send as SendIcon, X, RefreshCw, FileText, Search, UserCheck, Download } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND, getSmsSegmentCount, authStore, cleanPhoneNumbers, TAG_COLORS } from "@/utils";
import { PRIORITY_FROM_LABEL } from "@/types";
import { messagesService, contactsService } from "@/services";
import { useContactGroups } from "@/hooks";
import type { Contact } from "@/types";

type RecipientType = "contacts" | "manual" | "upload";
type ContactMode   = "group" | "individual";
type Priority      = "Normal" | "High" | "Urgent";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse plain-text / CSV / TSV content and extract phone-like tokens. */
function extractPhones(raw: string): string[] {
  const cells = raw.split(/[\n\r,;\t]+/);
  const tokens: string[] = [];
  for (const cell of cells) {
    const stripped = cell.trim().replace(/["']/g, "");
    if (/^[+\d][\d\s\-().]{6,}$/.test(stripped)) tokens.push(stripped);
  }
  return cleanPhoneNumbers(tokens.join("\n"));
}

// ─── ContactSearchPicker ──────────────────────────────────────────────────────

function ContactSearchPicker({
  senderId,
  picked,
  onAdd,
  onRemove,
}: {
  senderId: string;
  picked: Contact[];
  onAdd: (c: Contact) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Contact[]>([]);
  const [searching, setSearching]   = useState(false);
  const [focused, setFocused]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickedIds = new Set(picked.map((c) => c.id));

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await contactsService.getAll({ senderId, search: query.trim(), limit: 8 });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, senderId]);

  const eligibleCount = picked.filter((c) => !c.optedOut).length;
  const optedOutCount = picked.length - eligibleCount;

  return (
    <div className="space-y-3">

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searching && (
          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search by name or phone…"
          className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm"
          style={{ outline: "none" }}
          onFocusCapture={(e) => { e.target.style.borderColor = BRAND.primary; e.target.style.boxShadow = "0 0 0 2px rgba(255,105,46,0.2)"; }}
          onBlurCapture={(e)  => { e.target.style.borderColor = "#d1d5db";    e.target.style.boxShadow = "none"; }}
        />

        {/* Dropdown results */}
        {focused && query.trim() && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {results.length === 0 && !searching ? (
              <div className="px-4 py-3 text-sm text-gray-500">No contacts found.</div>
            ) : (
              results.map((contact) => {
                const isPicked = pickedIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isPicked && !contact.optedOut) onAdd(contact);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      isPicked
                        ? "bg-orange-50 cursor-default"
                        : contact.optedOut
                        ? "opacity-50 cursor-not-allowed bg-white"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ backgroundColor: isPicked ? BRAND.primary : "#9CA3AF" }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                        {contact.optedOut && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                            Opted out
                          </span>
                        )}
                        {isPicked && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 border border-orange-200" style={{ color: BRAND.primary }}>
                            Added
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{contact.phone}</div>
                      {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TAG_COLORS[tag] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected contacts chips */}
      {picked.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Selected ({picked.length})
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[48px]">
            {picked.map((contact) => (
              <div
                key={contact.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border ${
                  contact.optedOut
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
              >
                <span className="font-medium">{contact.name}</span>
                {contact.optedOut && <span className="text-[10px] text-red-500">(opted out)</span>}
                <button
                  type="button"
                  onClick={() => onRemove(contact.id)}
                  className="ml-0.5 rounded-full hover:bg-gray-200 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">
              Will send to{" "}
              <span className="font-semibold text-gray-900">{eligibleCount}</span>{" "}
              contact{eligibleCount !== 1 ? "s" : ""}
            </span>
            {optedOutCount > 0 && (
              <span className="text-red-500">
                · {optedOutCount} opted-out skipped
              </span>
            )}
          </div>
        </div>
      )}

      {picked.length === 0 && (
        <p className="text-xs text-gray-400">
          Search above and click a contact to add them. Opted-out contacts are shown but cannot be added.
        </p>
      )}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export function SendSMS() {
  const senderId = authStore.getUser()?.id ?? "";

  // ── message
  const [message, setMessage] = useState("");
  const characterCount = message.length;
  const segmentCount = getSmsSegmentCount(message);

  // ── recipient type
  const [recipientType, setRecipientType] = useState<RecipientType>("manual");

  // ── "From Contacts" — shared
  const [contactMode, setContactMode] = useState<ContactMode>("group");

  // ── "From Contacts — Group" state
  const { groups, loading: groupsLoading } = useContactGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedTags, setSelectedTags]       = useState<string[]>([]);
  const [availableTags, setAvailableTags]     = useState<string[]>([]);
  const [contactReach, setContactReach]       = useState<number | null>(null);
  const [reachLoading, setReachLoading]       = useState(false);
  const reachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── "From Contacts — Individual" state
  const [pickedContacts, setPickedContacts] = useState<Contact[]>([]);

  // ── "Manual Entry" state
  const [manualNumbers, setManualNumbers] = useState("");

  // ── shared exclude state
  const [excludeNumbers, setExcludeNumbers] = useState("");

  // ── "Upload File" state
  const [uploadedNumbers, setUploadedNumbers] = useState<string[]>([]);
  const [uploadFileName, setUploadFileName]   = useState("");
  const [uploadError, setUploadError]         = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── priority / schedule
  const [priority, setPriority]         = useState<Priority>("Normal");
  const [sendNow, setSendNow]           = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // ── send state
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // ─── fetch available tags when group changes ──────────────────────────────
  useEffect(() => {
    if (recipientType !== "contacts" || contactMode !== "group") return;
    let cancelled = false;
    (async () => {
      try {
        const result = await contactsService.getAll({
          senderId, page: 1, limit: 100,
          ...(selectedGroupId !== "all" ? { groupId: selectedGroupId } : {}),
        });
        if (cancelled) return;
        const tagSet = new Set<string>();
        for (const c of result.data) c.tags.forEach((t) => tagSet.add(t));
        setAvailableTags([...tagSet].sort());
        setSelectedTags((prev) => prev.filter((t) => tagSet.has(t)));
      } catch {
        setAvailableTags([]);
      }
    })();
    return () => { cancelled = true; };
  }, [recipientType, contactMode, selectedGroupId, senderId]);

  // ─── live reach count (debounced 400 ms) ─────────────────────────────────
  useEffect(() => {
    if (recipientType !== "contacts" || contactMode !== "group") return;
    if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
    setContactReach(null);
    setReachLoading(true);

    reachTimerRef.current = setTimeout(async () => {
      try {
        const result = await contactsService.getAll({
          senderId, page: 1, limit: 1,
          ...(selectedGroupId !== "all" ? { groupId: selectedGroupId } : {}),
          ...(selectedTags.length > 0 ? { tag: selectedTags[0] } : {}),
        });
        setContactReach(result.meta.total);
      } catch {
        setContactReach(null);
      } finally {
        setReachLoading(false);
      }
    }, 400);

    return () => { if (reachTimerRef.current) clearTimeout(reachTimerRef.current); };
  }, [recipientType, contactMode, selectedGroupId, selectedTags, senderId]);

  // ─── file upload ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setUploadError(null);
    setUploadedNumbers([]);
    setUploadFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "txt", "tsv"].includes(ext ?? "")) {
      setUploadError("Only CSV, TSV, or TXT files are supported.");
      setUploadFileName(""); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large (max 5 MB).");
      setUploadFileName(""); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const phones = extractPhones(e.target?.result as string);
      if (phones.length === 0) {
        setUploadError("No valid phone numbers found in the file.");
        setUploadFileName(""); return;
      }
      setUploadedNumbers(phones);
    };
    reader.onerror = () => setUploadError("Failed to read the file.");
    reader.readAsText(file);
  }, []);

  // ─── resolve group contacts → phone array ────────────────────────────────
  const resolveGroupPhones = async (): Promise<string[]> => {
    const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
    const seen     = new Set<string>();
    const phones: string[] = [];
    const tagFilters = selectedTags.length > 0 ? selectedTags : [undefined];

    for (const tag of tagFilters) {
      let page = 1;
      while (true) {
        const result = await contactsService.getAll({
          senderId, page, limit: 100,
          ...(selectedGroupId !== "all" ? { groupId: selectedGroupId } : {}),
          ...(tag ? { tag } : {}),
        });
        for (const contact of result.data) {
          if (contact.optedOut) continue;
          if (excluded.has(contact.phone)) continue;
          if (seen.has(contact.phone)) continue;
          seen.add(contact.phone);
          phones.push(contact.phone);
        }
        if (page >= result.meta.totalPages) break;
        page++;
      }
    }
    return phones;
  };

  // ─── send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setSendError(null);
    setSendSuccess(null);
    if (!message.trim()) { setSendError("Please enter a message."); return; }

    // Schedule validation
    let scheduledAt: string | null = null;
    if (!sendNow) {
      if (!scheduledDate) { setSendError("Please select a date."); return; }
      if (!scheduledTime) { setSendError("Please select a time."); return; }
      const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduled <= new Date()) { setSendError("Scheduled time must be in the future."); return; }
      scheduledAt = scheduled.toISOString();
    }

    const priorityValue = PRIORITY_FROM_LABEL[priority as keyof typeof PRIORITY_FROM_LABEL];
    setSending(true);

    try {
      let numbers: string[] = [];

      if (recipientType === "contacts") {
        if (contactMode === "individual") {
          const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
          numbers = pickedContacts
            .filter((c) => !c.optedOut && !excluded.has(c.phone))
            .map((c) => c.phone);
          if (numbers.length === 0) {
            setSendError(pickedContacts.length === 0 ? "Please select at least one contact." : "All selected contacts are opted out or excluded.");
            setSending(false); return;
          }
        } else {
          numbers = await resolveGroupPhones();
          if (numbers.length === 0) {
            setSendError("No eligible contacts found for the selected filters.");
            setSending(false); return;
          }
        }
      } else if (recipientType === "manual") {
        const cleaned  = cleanPhoneNumbers(manualNumbers);
        const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
        numbers = cleaned.filter((n) => !excluded.has(n));
        if (numbers.length === 0) {
          setSendError(cleaned.length === 0 ? "Please enter at least one phone number." : "All numbers were excluded.");
          setSending(false); return;
        }
      } else if (recipientType === "upload") {
        const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
        numbers = uploadedNumbers.filter((n) => !excluded.has(n));
        if (numbers.length === 0) {
          setSendError(uploadedNumbers.length === 0 ? "Please upload a file with phone numbers." : "All uploaded numbers were excluded.");
          setSending(false); return;
        }
      }

      const result = await messagesService.createBulkSms({
        content: message, receivers: numbers, senderId,
        priority: priorityValue,
        ...(scheduledAt ? { scheduledAt } : {}),
      });

      const successMsg = scheduledAt
        ? `${result.count} message${result.count !== 1 ? "s" : ""} scheduled for ${new Date(scheduledAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
        : `${result.count} message${result.count !== 1 ? "s" : ""} queued successfully!`;
      setSendSuccess(successMsg);
      setMessage("");
      setScheduledDate(""); setScheduledTime(""); setSendNow(true);

      if (recipientType === "contacts") {
        if (contactMode === "individual") setPickedContacts([]);
        else { setSelectedGroupId("all"); setSelectedTags([]); }
        setExcludeNumbers("");
      }
      if (recipientType === "manual")  { setManualNumbers(""); setExcludeNumbers(""); }
      if (recipientType === "upload")  { setUploadedNumbers([]); setUploadFileName(""); setExcludeNumbers(""); if (fileInputRef.current) fileInputRef.current.value = ""; }

      if (result.skipped.length > 0)
        setSendError(`Skipped ${result.skipped.length} number(s): ${result.skipped.join(", ")}`);

    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send SMS.");
    } finally {
      setSending(false);
    }
  };

  // ─── style helpers ────────────────────────────────────────────────────────
  const tabStyle = (active: boolean) => active ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight } : {};
  const tabClass = (active: boolean) => `flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-colors ${active ? "text-gray-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`;
  const subTabStyle = (active: boolean) => active ? { borderColor: BRAND.primary, color: BRAND.primary, backgroundColor: BRAND.primaryLight } : {};
  const subTabClass = (active: boolean) => `flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors text-center ${active ? "" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`;
  const textareaFocus = {
    onFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => { e.target.style.borderColor = BRAND.primary; e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 46, 0.2)"; },
    onBlur:  (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; },
  };
  const excludeFocus = {
    onFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = "#ef4444"; e.target.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.15)"; },
    onBlur:  (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Send SMS" subtitle="Compose and send messages to your contacts" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8">

          {/* ── Message ───────────────────────────────────────────────── */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg resize-none"
              style={{ outline: "none" }}
              {...textareaFocus}
            />
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <span className={characterCount > 160 ? "text-orange-600 font-medium" : "text-gray-900 font-medium"}>
                {characterCount}
              </span>
              <span className="text-gray-500">/160 characters</span>
              <span className="mx-2">•</span>
              <span className="text-gray-900 font-medium">{segmentCount}</span>
              <span className="text-gray-500 ml-1">{segmentCount === 1 ? "segment" : "segments"}</span>
            </div>
          </div>

          {/* ── Recipients ────────────────────────────────────────────── */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Recipients</label>

            {/* Primary tabs */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setRecipientType("contacts")} className={tabClass(recipientType === "contacts")} style={tabStyle(recipientType === "contacts")}>
                <Users className="w-4 h-4 inline-block mr-2" />From Contacts
              </button>
              <button onClick={() => setRecipientType("manual")} className={tabClass(recipientType === "manual")} style={tabStyle(recipientType === "manual")}>
                Manual Entry
              </button>
              <button onClick={() => setRecipientType("upload")} className={tabClass(recipientType === "upload")} style={tabStyle(recipientType === "upload")}>
                <Upload className="w-4 h-4 inline-block mr-2" />Upload File
              </button>
            </div>

            {/* ── From Contacts ── */}
            {recipientType === "contacts" && (
              <div className="space-y-4">

                {/* Sub-mode toggle */}
                <div className="flex gap-2">
                  <button onClick={() => setContactMode("group")} className={subTabClass(contactMode === "group")} style={subTabStyle(contactMode === "group")}>
                    By Group
                  </button>
                  <button onClick={() => setContactMode("individual")} className={subTabClass(contactMode === "individual")} style={subTabStyle(contactMode === "individual")}>
                    Pick Individuals
                  </button>
                </div>

                {/* ─ Group mode ─ */}
                {contactMode === "group" && (
                  <>
                    {/* Group selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Group</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        {groupsLoading ? (
                          <div className="w-full h-[46px] pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 animate-pulse" />
                        ) : (
                          <select
                            value={selectedGroupId}
                            onChange={(e) => { setSelectedGroupId(e.target.value); setSelectedTags([]); }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white"
                            style={{ outline: "none" }}
                          >
                            <option value="all">All Contacts</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name} ({g.count.toLocaleString()})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Tag filter */}
                    {availableTags.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Filter by tag
                          <span className="font-normal text-gray-400 ml-1">(optional)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => setSelectedTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                style={active ? { backgroundColor: BRAND.primary } : {}}
                              >
                                {tag}{active && <X className="inline-block w-3 h-3 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Exclude */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">Exclude Numbers</span>
                        {excludeNumbers.trim() && <span className="text-xs text-gray-500">{cleanPhoneNumbers(excludeNumbers).length} excluded</span>}
                      </div>
                      <textarea
                        value={excludeNumbers}
                        onChange={(e) => setExcludeNumbers(e.target.value)}
                        placeholder={"Numbers to skip\n09277910973\n+639277910973"}
                        className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                        style={{ outline: "none" }}
                        {...excludeFocus}
                      />
                    </div>

                    {/* Reach summary */}
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                      {reachLoading ? (
                        <><RefreshCw className="w-4 h-4 text-gray-400 animate-spin" /><span className="text-gray-500">Calculating reach…</span></>
                      ) : contactReach !== null ? (
                        <span className="text-gray-700">
                          Will send to approximately{" "}
                          <span className="font-semibold text-gray-900">{contactReach.toLocaleString()}</span>{" "}
                          contact{contactReach !== 1 ? "s" : ""}
                          <span className="text-gray-400 ml-1">(opted-out contacts excluded at send time)</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select a group to see estimated reach</span>
                      )}
                    </div>
                  </>
                )}

                {/* ─ Individual mode ─ */}
                {contactMode === "individual" && (
                  <>
                    <ContactSearchPicker
                      senderId={senderId}
                      picked={pickedContacts}
                      onAdd={(c) => setPickedContacts((prev) => prev.find((p) => p.id === c.id) ? prev : [...prev, c])}
                      onRemove={(id) => setPickedContacts((prev) => prev.filter((c) => c.id !== id))}
                    />

                    {/* Exclude */}
                    {pickedContacts.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700">Exclude Numbers</span>
                          {excludeNumbers.trim() && <span className="text-xs text-gray-500">{cleanPhoneNumbers(excludeNumbers).length} excluded</span>}
                        </div>
                        <textarea
                          value={excludeNumbers}
                          onChange={(e) => setExcludeNumbers(e.target.value)}
                          placeholder={"Numbers to skip\n09277910973"}
                          className="w-full h-20 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                          style={{ outline: "none" }}
                          {...excludeFocus}
                        />
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

            {/* ── Manual Entry ── */}
            {recipientType === "manual" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">Phone Numbers</span>
                    {manualNumbers.trim() && (
                      <span className="text-xs text-gray-500">
                        {cleanPhoneNumbers(manualNumbers).length} number{cleanPhoneNumbers(manualNumbers).length !== 1 ? "s" : ""} cleaned
                      </span>
                    )}
                  </div>
                  <textarea
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    placeholder={"Paste numbers — messy is fine!\n09277910973\n639277910973\n9277910973,\n09277910987"}
                    className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                    style={{ outline: "none" }}
                    {...textareaFocus}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Commas, line breaks, duplicates &amp; formatting fixed automatically</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">Exclude Numbers</span>
                    {excludeNumbers.trim() && <span className="text-xs text-gray-500">{cleanPhoneNumbers(excludeNumbers).length} excluded</span>}
                  </div>
                  <textarea
                    value={excludeNumbers}
                    onChange={(e) => setExcludeNumbers(e.target.value)}
                    placeholder={"Numbers to skip from the list\n09277910973\n+639277910973"}
                    className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                    style={{ outline: "none" }}
                    {...excludeFocus}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">These numbers will be removed before sending</p>
                </div>

                {manualNumbers.trim() && (
                  <div className="col-span-2">
                    {(() => {
                      const cleaned  = cleanPhoneNumbers(manualNumbers);
                      const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
                      const final    = cleaned.filter((n) => !excluded.has(n));
                      const rawCount = manualNumbers.split(/[\n,]+/).filter((l) => l.trim()).length;
                      const dupes    = rawCount - cleaned.length;
                      return (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                          <span className="text-gray-600">Will send to <span className="font-semibold text-gray-900">{final.length}</span> number{final.length !== 1 ? "s" : ""}</span>
                          {excluded.size > 0 && <span className="text-red-600">· {excluded.size} excluded</span>}
                          {dupes > 0 && <span className="text-orange-600">· {dupes} duplicate{dupes !== 1 ? "s" : ""} removed</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Upload File ── */}
            {recipientType === "upload" && (
              <div className="space-y-4">
                <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {/* Template download */}
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-sm text-gray-600">
                    Not sure what format to use?{" "}
                    <span className="text-gray-500">Download our sample file as a guide.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = [
                        "phone",
                        "09171234567",
                        "+639181234567",
                        "639191234567",
                        "09201234567",
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement("a");
                      a.href     = url;
                      a.download = "recipients-template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors text-gray-700 shrink-0 ml-4"
                  >
                    <Download className="w-4 h-4" />
                    Download template
                  </button>
                </div>

                {!uploadFileName ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.primary; e.currentTarget.style.backgroundColor = BRAND.primaryLight; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                    <div className="font-medium text-gray-700 mb-1">Click or drag &amp; drop a file</div>
                    <div className="text-sm text-gray-500">CSV, TSV, or TXT — one phone number per row (or comma-separated)</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{uploadFileName}</div>
                        <div className="text-xs text-gray-500">{uploadedNumbers.length.toLocaleString()} phone number{uploadedNumbers.length !== 1 ? "s" : ""} found</div>
                      </div>
                    </div>
                    <button onClick={() => { setUploadFileName(""); setUploadedNumbers([]); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{uploadError}</div>
                )}

                {uploadedNumbers.length > 0 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">Exclude Numbers</span>
                        {excludeNumbers.trim() && <span className="text-xs text-gray-500">{cleanPhoneNumbers(excludeNumbers).length} excluded</span>}
                      </div>
                      <textarea
                        value={excludeNumbers}
                        onChange={(e) => setExcludeNumbers(e.target.value)}
                        placeholder={"Numbers to skip\n09277910973"}
                        className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                        style={{ outline: "none" }}
                        {...excludeFocus}
                      />
                    </div>
                    {(() => {
                      const excluded = new Set(cleanPhoneNumbers(excludeNumbers));
                      const final    = uploadedNumbers.filter((n) => !excluded.has(n));
                      return (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                          <span className="text-gray-600">Will send to <span className="font-semibold text-gray-900">{final.length.toLocaleString()}</span> number{final.length !== 1 ? "s" : ""}</span>
                          {excluded.size > 0 && <span className="text-red-600">· {excluded.size} excluded</span>}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Priority ──────────────────────────────────────────────── */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">Priority</label>
            <div className="flex gap-2">
              {(["Normal", "High", "Urgent"] as Priority[]).map((level) => (
                <button key={level} onClick={() => setPriority(level)} className={tabClass(priority === level)} style={tabStyle(priority === level)}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* ── Schedule ──────────────────────────────────────────────── */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">Schedule</label>
            <div className="space-y-4">
              <div className="flex gap-4">
                {([true, false] as const).map((isNow) => (
                  <button
                    key={String(isNow)}
                    onClick={() => setSendNow(isNow)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${sendNow === isNow ? "text-gray-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                    style={sendNow === isNow ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight } : {}}
                  >
                    {isNow ? "Send Now" : "Schedule Later"}
                  </button>
                ))}
              </div>
              {!sendNow && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Time</label>
                      <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Messages will be delivered automatically when the scheduled time arrives.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Feedback ──────────────────────────────────────────────── */}
          {sendError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{sendError}</div>
          )}
          {sendSuccess && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{sendSuccess}</div>
          )}

          {/* ── Send Button ───────────────────────────────────────────── */}
          <div className="flex justify-end">
            <PrimaryButton className="px-8 py-3.5" onClick={handleSend} disabled={sending}>
              <SendIcon className="w-5 h-5" />
              {sending
                ? (recipientType === "contacts" && contactMode === "group") ? "Resolving contacts…" : "Sending…"
                : sendNow ? "Send SMS" : "Schedule SMS"}
            </PrimaryButton>
          </div>

        </div>
      </div>
    </div>
  );
}
