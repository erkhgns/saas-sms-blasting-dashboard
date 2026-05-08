import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, X, Users, AlertTriangle } from "lucide-react";
import {
  BRAND,
  CONTACT_TAGS,
  CAMPAIGN_STATUS_COLORS,
  formatNumber,
  cleanPhoneNumbers,
} from "@/utils";
import { campaignsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import { ApiError } from "@/services/api";
import { useSegments, useContactGroups } from "@/hooks";
import {
  emptyCampaignForm,
  CAMPAIGN_STATUS_LABELS,
  LOCKED_CAMPAIGN_STATUSES,
} from "@/types";
import type {
  CampaignFormState,
  CampaignPriority,
  Campaign,
  CreateCampaignPayload,
} from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CampaignFormProps {
  mode: "create" | "edit" | "view";
}

// ── Personalization tokens ────────────────────────────────────────────────────

const TOKENS = [
  { key: "first_name",       label: "First name",       example: "Sarah" },
  { key: "last_name",        label: "Last name",        example: "Johnson" },
  { key: "full_name",        label: "Full name",        example: "Sarah Johnson" },
  { key: "phone",            label: "Phone",            example: "+63 917 234 5678" },
  { key: "company",          label: "Company",          example: "Acme Corp" },
  { key: "city",             label: "City",             example: "Manila" },
  { key: "discount_code",    label: "Discount code",    example: "SAVE20" },
  { key: "appointment_date", label: "Appointment date", example: "May 8" },
  { key: "appointment_time", label: "Appointment time", example: "3:00 PM" },
  { key: "order_id",         label: "Order ID",         example: "ORD-48201" },
  { key: "balance_due",      label: "Balance due",      example: "₱1,299.00" },
  { key: "due_date",         label: "Due date",         example: "May 12" },
];

function renderTokens(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const t = TOKENS.find((x) => x.key === k);
    return t ? t.example : `{{${k}}}`;
  });
}

// ── TokenPicker ───────────────────────────────────────────────────────────────

function TokenPicker({
  onPick,
  anchor = "down",
}: {
  onPick: (t: { key: string }) => void;
  anchor?: "up" | "down";
}) {
  const [q, setQ] = useState("");
  const filtered = TOKENS.filter(
    (t) =>
      t.label.toLowerCase().includes(q.toLowerCase()) ||
      t.key.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div
      className={`absolute ${
        anchor === "down" ? "top-full mt-2" : "bottom-full mb-2"
      } left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden`}
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tokens…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-orange-400"
        />
      </div>
      <div className="max-h-64 overflow-auto py-1">
        {filtered.map((t) => (
          <button
            key={t.key}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onPick(t); }}
            className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{t.label}</div>
              <div className="text-xs text-gray-500 font-mono truncate">{`{{${t.key}}}`}</div>
            </div>
            <div className="text-xs text-gray-400 truncate">e.g. {t.example}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-gray-500">No tokens match.</div>
        )}
      </div>
    </div>
  );
}

// ── PhonePreview ──────────────────────────────────────────────────────────────

function PhonePreview({
  message,
  senderName = "GabySMS",
}: {
  message: string;
  senderName?: string;
}) {
  const rendered = renderTokens(
    message || "Your message preview will appear here…"
  );
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div
      className="bg-gray-900 rounded-[36px] p-3 shadow-xl mx-auto"
      style={{ width: 280 }}
    >
      <div
        className="bg-white rounded-[28px] overflow-hidden"
        style={{ height: 520 }}
      >
        <div className="flex items-center justify-between px-6 pt-3 pb-2 text-xs font-semibold text-gray-900">
          <span>{time}</span>
          <div className="w-20 h-5 bg-gray-900 rounded-full" />
          <span>5G</span>
        </div>
        <div className="flex flex-col items-center pt-2 pb-3 border-b border-gray-100">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
            style={{ backgroundColor: BRAND.primary }}
          >
            <span className="text-white font-semibold text-sm">
              {(senderName || "SM").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="text-xs font-medium text-gray-900">{senderName}</div>
          <div className="text-[10px] text-gray-500">text message</div>
        </div>
        <div className="px-3 py-4">
          <div className="text-[10px] text-gray-400 text-center mb-2">
            Today {time}
          </div>
          <div className="max-w-[85%] bg-gray-100 text-gray-900 px-3 py-2 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap break-words">
            {rendered}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MessageEditor ─────────────────────────────────────────────────────────────

function MessageEditor({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function insertToken(token: { key: string }) {
    const el = ref.current;
    if (!el) return;
    const start  = el.selectionStart ?? value.length;
    const end    = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const trimmed = before.endsWith("{{") ? before.slice(0, -2) : before;
    const insert  = `{{${token.key}}}`;
    onChange(trimmed + insert + value.slice(end));
    setPickerOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = trimmed.length + insert.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function onKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly) return;
    const before = value.slice(0, e.currentTarget.selectionStart);
    if (before.endsWith("{{")) setPickerOpen(true);
    if (e.key === "Escape") setPickerOpen(false);
  }

  const charCount  = value.length;
  const segCount   = Math.max(1, Math.ceil(charCount / 160));
  const tokenCount = (value.match(/\{\{(\w+)\}\}/g) || []).length;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={onKeyUp}
        placeholder="Type your message here. Type {{ to insert a personalization token…"
        className={`w-full h-40 px-4 py-3 border border-gray-300 rounded-lg resize-none outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm ${
          readOnly ? "bg-gray-50 text-gray-700" : ""
        }`}
      />
      <div className="absolute right-2 bottom-2">
        <button
          type="button"
          onClick={() => !readOnly && setPickerOpen((p) => !p)}
          disabled={readOnly}
          className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-md hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 7h16M4 12h16M4 17h7" />
          </svg>
          Insert token
        </button>
        {pickerOpen && <TokenPicker onPick={insertToken} anchor="up" />}
      </div>
      <div className="flex items-center justify-between mt-2 text-sm">
        <div className="text-gray-600">
          <span
            className={
              charCount > 160 ? "text-orange-600 font-medium" : "text-gray-900 font-medium"
            }
          >
            {charCount}
          </span>
          <span className="text-gray-500">/160 characters</span>
          <span className="mx-2">•</span>
          <span className="text-gray-900 font-medium">{segCount}</span>
          <span className="text-gray-500">
            {" "}
            {segCount === 1 ? "segment" : "segments"}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {tokenCount} {tokenCount === 1 ? "token" : "tokens"}
        </div>
      </div>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-8 pt-7 pb-2 flex items-start gap-4 border-b border-gray-100">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5"
          style={{ backgroundColor: BRAND.primaryLight, color: BRAND.primary }}
        >
          {step}
        </div>
        <div className="flex-1 pb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-8">{children}</div>
    </section>
  );
}

// ── FieldLabel ────────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  hint,
  required,
}: {
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <label className="text-sm font-medium text-gray-900">
        {children}
        {required && <span className="text-orange-600 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

// ── ExclusionsSection ─────────────────────────────────────────────────────────

function ExclusionsSection({
  form,
  onChange,
  readOnly,
  groups,
}: {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  readOnly: boolean;
  groups: Array<{ id: string; name: string; count: number }>;
}) {
  const [tab, setTab] = useState<"groups" | "tags" | "numbers">("tags");
  const cleanedExcluded  = cleanPhoneNumbers(form.excludeNumbers);
  const totalExclusionCount =
    (form.excludeGroups?.length || 0) +
    (form.excludeTags?.length || 0) +
    cleanedExcluded.length;

  const tabBtn = (key: "groups" | "tags" | "numbers", label: string, count: number) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
          active ? "" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        style={
          active
            ? { borderColor: "#EF4444", backgroundColor: "#FEF2F2", color: "#991B1B" }
            : {}
        }
      >
        {label}
        {count > 0 && (
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold"
            style={
              active
                ? { backgroundColor: "#FEE2E2", color: "#991B1B" }
                : { backgroundColor: "#F3F4F6", color: "#6B7280" }
            }
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  const toggleExcludeGroup = (gid: string) => {
    const next = form.excludeGroups.includes(gid)
      ? form.excludeGroups.filter((g) => g !== gid)
      : [...form.excludeGroups, gid];
    onChange("excludeGroups", next);
  };

  const toggleExcludeTag = (tag: string) => {
    const alreadyExcluded = form.excludeTags.includes(tag);
    onChange(
      "excludeTags",
      alreadyExcluded
        ? form.excludeTags.filter((t) => t !== tag)
        : [...form.excludeTags, tag]
    );
    // Remove from includes if being added to exclusions
    if (!alreadyExcluded) {
      onChange("includeTags", form.includeTags.filter((t) => t !== tag));
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50/30 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-gray-900">
              Exclude from this audience
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Recipients matching any of these will be removed before sending.
          </p>
        </div>
        {totalExclusionCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            {totalExclusionCount} exclusion{totalExclusionCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {tabBtn("groups", "Groups", form.excludeGroups.length)}
        {tabBtn("tags", "Tags", form.excludeTags.length)}
        {tabBtn("numbers", "Phone numbers", cleanedExcluded.length)}
      </div>

      {tab === "groups" && (
        <div className="grid grid-cols-2 gap-2">
          {groups.filter((g) => g.id !== "all").map((g) => {
            const active = form.excludeGroups.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                disabled={readOnly}
                onClick={() => toggleExcludeGroup(g.id)}
                className={`text-left px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                  active ? "" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                style={
                  active ? { borderColor: "#EF4444", backgroundColor: "#FEF2F2" } : {}
                }
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{g.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatNumber(g.count)} contacts
                  </div>
                </div>
                {active && <X className="w-4 h-4 text-red-600" />}
              </button>
            );
          })}
          {groups.filter((g) => g.id !== "all").length === 0 && (
            <p className="text-sm text-gray-500 col-span-2 py-4 text-center">
              No tag groups yet.
            </p>
          )}
        </div>
      )}

      {tab === "tags" && (
        <div className="flex flex-wrap gap-2">
          {CONTACT_TAGS.map((tag) => {
            const active = form.excludeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={readOnly}
                onClick={() => toggleExcludeTag(tag)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border inline-flex items-center gap-1.5"
                style={
                  active
                    ? { backgroundColor: "#FEE2E2", color: "#991B1B", borderColor: "#FCA5A5" }
                    : { backgroundColor: "white", color: "#374151", borderColor: "#E5E7EB" }
                }
              >
                {active && <span>✕</span>}
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {tab === "numbers" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-700">
              Phone numbers to exclude
            </span>
            {form.excludeNumbers.trim() && (
              <span className="text-xs text-gray-500">
                {cleanedExcluded.length} number
                {cleanedExcluded.length !== 1 ? "s" : ""} cleaned
              </span>
            )}
          </div>
          <textarea
            value={form.excludeNumbers}
            readOnly={readOnly}
            onChange={(e) => onChange("excludeNumbers", e.target.value)}
            placeholder={"Numbers to skip from the campaign\n09171234567\n+639281234567\n9171234567,"}
            className={`w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none font-mono text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 ${
              readOnly ? "bg-gray-50" : "bg-white"
            }`}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Commas, line breaks, duplicates &amp; formatting fixed automatically.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

const SENDER_NAMES = ["GabySMS", "AcmeCorp", "SHOP-PH"];
const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm";

// Step 1 – Details
function StepDetails({
  form,
  onChange,
  readonly,
}: {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  readonly: boolean;
}) {
  return (
    <SectionCard step={1} title="Campaign details" subtitle="Internal name and sender ID">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <FieldLabel required>Campaign name</FieldLabel>
          <input
            type="text"
            value={form.name}
            readOnly={readonly}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g. Spring Flash Sale"
            className={`${inputClass} ${readonly ? "bg-gray-50" : ""}`}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Internal label — recipients won't see this.
          </p>
        </div>
        <div>
          <FieldLabel hint="Verified senders only">Sender name</FieldLabel>
          <select
            value={form.senderName}
            disabled={readonly}
            onChange={(e) => onChange("senderName", e.target.value)}
            className={`${inputClass} bg-white ${readonly ? "bg-gray-50" : ""}`}
          >
            {SENDER_NAMES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </SectionCard>
  );
}

// Step 2 – Audience
function StepAudience({
  form,
  onChange,
  readonly,
  estimated,
}: {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  readonly: boolean;
  estimated: number;
}) {
  const { segments } = useSegments();
  const { groups }   = useContactGroups();
  const segCount = Math.max(1, Math.ceil(form.message.length / 160));

  const toggleIncludeTag = (tag: string) => {
    const active = form.includeTags.includes(tag);
    onChange(
      "includeTags",
      active
        ? form.includeTags.filter((t) => t !== tag)
        : [...form.includeTags, tag]
    );
  };

  return (
    <SectionCard
      step={2}
      title="Audience"
      subtitle="Who should receive this campaign?"
    >
      <div className="space-y-6">
        {/* Contact group card buttons — sourced from real API */}
        <div>
          <FieldLabel required>Contact group</FieldLabel>
          <div className="grid grid-cols-4 gap-3">
            {groups.map((g) => {
              const active = form.group === g.id && !form.segmentId;
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={readonly}
                  onClick={() => { onChange("group", g.id); onChange("segmentId", null); }}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    active ? "" : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                  style={
                    active
                      ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight }
                      : {}
                  }
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {g.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatNumber(g.count)} contacts
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saved segments */}
        {segments.length > 0 && (
          <div>
            <FieldLabel hint="Pre-built audience rules">
              …or use a saved segment
            </FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {segments.map((s) => {
                const active = form.segmentId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange("segmentId", active ? null : s.id)}
                    className={`text-left px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                      active ? "" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    style={
                      active
                        ? { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight }
                        : {}
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(s.count)} contacts
                      </div>
                    </div>
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: active ? BRAND.primary : "transparent" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Include tags */}
        <div>
          <FieldLabel hint="Narrow audience to contacts with these tags">
            Include tags
          </FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TAGS.map((tag) => {
              const active = form.includeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={readonly}
                  onClick={() => toggleIncludeTag(tag)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border inline-flex items-center gap-1.5"
                  style={
                    active
                      ? {
                          backgroundColor: BRAND.primary,
                          color: "white",
                          borderColor: BRAND.primary,
                        }
                      : { backgroundColor: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" }
                  }
                >
                  {active && <Check className="w-3 h-3" />}
                  {tag}
                </button>
              );
            })}
          </div>
          {form.includeTags.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              No tags selected — all contacts in the group will be included.
            </p>
          )}
        </div>

        {/* Exclusions */}
        <ExclusionsSection
          form={form}
          onChange={onChange}
          readOnly={readonly}
          groups={groups}
        />

        {/* Reach summary */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-lg border border-orange-200"
          style={{ backgroundColor: BRAND.primaryLight }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white">
              <Users className="w-5 h-5" style={{ color: BRAND.primary }} />
            </div>
            <div>
              <div className="text-xs text-gray-600">Estimated reach</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatNumber(estimated)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600">SMS segments per message</div>
            <div className="text-2xl font-semibold text-gray-900">{segCount}</div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// Step 3 – Content
function StepContent({
  form,
  onChange,
  readonly,
}: {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  readonly: boolean;
}) {
  type PriorityLabel = "Normal" | "High" | "Urgent";
  const priorityLabels: PriorityLabel[] = ["Normal", "High", "Urgent"];
  const labelToPriority: Record<PriorityLabel, CampaignPriority> = {
    Normal: 0, High: 1, Urgent: 2,
  };

  return (
    <SectionCard
      step={3}
      title="Message content"
      subtitle="The text recipients will see, with personalization"
    >
      <div className="grid grid-cols-[1fr_300px] gap-8">
        <div>
          <FieldLabel required hint={`${form.message.length}/160`}>
            Message
          </FieldLabel>
          <MessageEditor
            value={form.message}
            onChange={(v) => onChange("message", v)}
            readOnly={readonly}
          />

          {/* Quick insert chips */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Quick insert:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS.slice(0, 6).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={readonly}
                  onClick={() => onChange("message", form.message + `{{${t.key}}}`)}
                  className="px-2 py-1 text-xs font-mono bg-gray-100 hover:bg-orange-100 text-gray-700 rounded transition-colors disabled:opacity-50"
                >
                  {`{{${t.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="mt-6">
            <FieldLabel>Priority</FieldLabel>
            <div className="flex gap-2">
              {priorityLabels.map((label) => {
                const val   = labelToPriority[label];
                const active = form.priority === val;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange("priority", val)}
                    className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-colors text-sm ${
                      active ? "" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    } ${readonly ? "opacity-70 cursor-default" : ""}`}
                    style={
                      active
                        ? {
                            borderColor: BRAND.primary,
                            backgroundColor: BRAND.primaryLight,
                            color: "#111827",
                          }
                        : {}
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="text-sm font-medium text-gray-900 mb-3">Live preview</div>
          <PhonePreview message={form.message} senderName={form.senderName} />
          <div className="text-xs text-gray-500 text-center mt-3 leading-relaxed">
            Tokens shown with sample values.
            <br />
            Each recipient sees their own data.
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// Step 4 – Schedule (create/edit) or Performance (view)
function StepScheduleOrPerformance({
  form,
  onChange,
  readonly,
  mode,
}: {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  readonly: boolean;
  mode: "create" | "edit" | "view";
}) {
  if (mode === "view") {
    const recipients = form.recipients ?? 0;
    const sent       = form.sent ?? 0;
    const failed     = form.failed ?? 0;
    const isLive     = form.status === "IN_PROGRESS" && recipients > 0;
    const progress   = isLive ? Math.round(((sent + failed) / recipients) * 100) : null;

    return (
      <SectionCard step={4} title="Performance" subtitle="Delivery results for this campaign">
        {/* Live progress bar for IN_PROGRESS */}
        {isLive && progress !== null && (
          <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Sending in progress…
              </span>
              <span className="text-sm font-semibold text-blue-900">
                {sent + failed} / {recipients}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-700 mt-1.5">
              <span>{sent} sent · {failed} failed</span>
              <span>{progress}% dispatched</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Recipients",
              value: recipients > 0 ? formatNumber(recipients) : "—",
              tone: "default" as const,
            },
            {
              label: "Delivered",
              value:
                form.deliveryRate !== null && form.deliveryRate !== undefined
                  ? `${form.deliveryRate.toFixed(1)}%`
                  : isLive && recipients > 0
                  ? `${((sent / recipients) * 100).toFixed(1)}%`
                  : "—",
              tone: "success" as const,
            },
            {
              label: "Failed",
              value: failed > 0 ? formatNumber(failed) : "—",
              tone: "danger" as const,
            },
            { label: "Replies", value: "—", tone: "default" as const },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">{m.label}</div>
              <div
                className={`text-2xl font-semibold mt-1 ${
                  m.tone === "success"
                    ? "text-green-700"
                    : m.tone === "danger"
                    ? "text-red-700"
                    : "text-gray-900"
                }`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
        {form.date && (
          <div className="mt-4 text-xs text-gray-500">Sent on {form.date}</div>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard step={4} title="Schedule" subtitle="Send immediately or pick a time">
      <div className="flex gap-4 mb-4">
        {([true, false] as const).map((isNow) => {
          const active = form.sendNow === isNow;
          return (
            <button
              key={String(isNow)}
              type="button"
              disabled={readonly}
              onClick={() => onChange("sendNow", isNow)}
              className={`flex-1 px-4 py-4 rounded-lg border-2 font-medium transition-colors text-left ${
                active ? "" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={
                active
                  ? {
                      borderColor: BRAND.primary,
                      backgroundColor: BRAND.primaryLight,
                      color: "#111827",
                    }
                  : {}
              }
            >
              <div className="font-medium">
                {isNow ? "Send now" : "Schedule for later"}
              </div>
              <div className="text-xs font-normal text-gray-500 mt-0.5">
                {isNow
                  ? "Queue immediately when you click Send"
                  : "Pick a date and time below"}
              </div>
            </button>
          );
        })}
      </div>
      {!form.sendNow && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={form.scheduledDate}
              readOnly={readonly}
              onChange={(e) => onChange("scheduledDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Time</FieldLabel>
            <input
              type="time"
              value={form.scheduledTime}
              readOnly={readonly}
              onChange={(e) => onChange("scheduledTime", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-400">
        Note: "Schedule for later" stores the time on the campaign. To trigger
        a scheduled campaign early, use Launch from the campaign list.
      </p>
    </SectionCard>
  );
}

// ── Wizard Stepper ────────────────────────────────────────────────────────────

const STEP_LABELS = ["Details", "Audience", "Content", "Schedule"];

function WizardStepper({
  current,
  onStepClick,
  isView,
}: {
  current: number;
  onStepClick: (n: number) => void;
  isView: boolean;
}) {
  const labels = isView
    ? ["Details", "Audience", "Content", "Performance"]
    : STEP_LABELS;

  return (
    <div className="mb-6 flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      {labels.map((label, i) => {
        const n      = i + 1;
        const active = current === n;
        const done   = current > n;
        return (
          <div key={n} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => onStepClick(n)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                active ? "" : "hover:bg-gray-50"
              }`}
              style={active ? { backgroundColor: BRAND.primaryLight } : {}}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: active || done ? BRAND.primary : "#E5E7EB",
                  color: active || done ? "white" : "#6B7280",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span
                className={`text-sm font-medium ${
                  active ? "text-gray-900" : "text-gray-600"
                }`}
              >
                {label}
              </span>
            </button>
            {i < labels.length - 1 && (
              <div className="w-6 h-px bg-gray-200 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Seed form from API campaign object ────────────────────────────────────────

function seedForm(c: Campaign): CampaignFormState {
  const scheduledAt = c.scheduledAt ?? null;
  return {
    id:             c.id,
    name:           c.name,
    status:         c.status,
    message:        c.message ?? "",
    senderName:     c.senderName ?? "GabySMS",
    priority:       c.priority ?? 0,
    group:          c.recipientGroup ?? "all",
    includeTags:    c.includeTags ?? [],
    excludeTags:    c.excludeTags ?? [],
    excludeGroups:  c.excludeGroups ?? [],
    excludeNumbers: (c.excludeNumbers ?? []).join("\n"),
    segmentId:      c.segmentId ?? null,
    sendNow:        !scheduledAt,
    scheduledDate:  scheduledAt ? scheduledAt.slice(0, 10) : "",
    scheduledTime:  scheduledAt ? scheduledAt.slice(11, 16) : "",
    recipients:     c.recipients,
    sent:           c.sent,
    failed:         c.failed,
    deliveryRate:   c.deliveryRate,
    date:           c.sentAt
      ? new Date(c.sentAt).toLocaleDateString("en-PH", {
          month: "short", day: "numeric", year: "numeric",
        })
      : undefined,
  };
}

// ── Build API payload from form state ────────────────────────────────────────

function buildPayload(
  form: CampaignFormState,
  senderId: string
): CreateCampaignPayload {
  const scheduledAt =
    !form.sendNow && form.scheduledDate && form.scheduledTime
      ? new Date(`${form.scheduledDate}T${form.scheduledTime}`).toISOString()
      : null;

  return {
    senderId,
    name:           form.name.trim(),
    senderName:     form.senderName || "GabySMS",
    message:        form.message.trim(),
    priority:       form.priority,
    recipientGroup: form.segmentId ? undefined : form.group,
    segmentId:      form.segmentId,
    includeTags:    form.includeTags,
    excludeTags:    form.excludeTags,
    excludeGroups:  form.excludeGroups,
    excludeNumbers: cleanPhoneNumbers(form.excludeNumbers),
    scheduledAt,
  };
}

// ── Main CampaignForm ─────────────────────────────────────────────────────────

export function CampaignForm({ mode }: CampaignFormProps) {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();

  const readonly = mode === "view";
  const isCreate = mode === "create";

  // Read once — guaranteed non-empty because ProtectedRoute ensures login
  const senderId = authStore.getUser()?.id ?? "";

  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState<CampaignFormState>(emptyCampaignForm);
  const [fetchLoading, setFetchLoading] = useState(!isCreate);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [estimated, setEstimated] = useState(0);

  // ── Fetch existing campaign for edit/view ────────────────────────────────
  useEffect(() => {
    if (!id || isCreate) return;
    setFetchLoading(true);
    setFetchError(null);
    campaignsService
      .getById(id)
      .then((c) => setForm(seedForm(c)))
      .catch((err) =>
        setFetchError(
          err instanceof Error ? err.message : "Failed to load campaign."
        )
      )
      .finally(() => setFetchLoading(false));
  }, [id, isCreate]);

  // ── Poll for live progress when viewing an IN_PROGRESS campaign ──────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (mode !== "view" || !id || form.status !== "IN_PROGRESS") return;

    pollRef.current = setInterval(async () => {
      try {
        const c = await campaignsService.getById(id);
        setForm((prev) => ({
          ...prev,
          status:       c.status,
          sent:         c.sent,
          failed:       c.failed,
          recipients:   c.recipients,
          deliveryRate: c.deliveryRate,
        }));
        if (c.status !== "IN_PROGRESS" && pollRef.current)
          clearInterval(pollRef.current);
      } catch {
        /* silently ignore */
      }
    }, 15_000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mode, id, form.status]);

  // ── Debounced reach fetch — updates "Estimated reach" as audience changes ─
  const reachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (readonly) return;
    if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
    reachTimerRef.current = setTimeout(async () => {
      try {
        const excluded = cleanPhoneNumbers(form.excludeNumbers);
        const result = await campaignsService.reach({
          senderId,
          recipientGroup: form.segmentId ? undefined : form.group,
          segmentId:      form.segmentId ?? undefined,
          includeTags:    form.includeTags.length   ? form.includeTags   : undefined,
          excludeTags:    form.excludeTags.length   ? form.excludeTags   : undefined,
          excludeGroups:  form.excludeGroups.length ? form.excludeGroups : undefined,
          excludeNumbers: excluded.length           ? excluded           : undefined,
        });
        setEstimated(result.count);
      } catch {
        /* silently keep last value */
      }
    }, 600);
    return () => { if (reachTimerRef.current) clearTimeout(reachTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.group,
    form.segmentId,
    // join to primitive to avoid referential inequality on every render
    form.includeTags.join(","),
    form.excludeTags.join(","),
    form.excludeGroups.join(","),
    form.excludeNumbers,
    readonly,
  ]);

  const onChange = useCallback(
    <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
      if (readonly) return;
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [readonly]
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 1 && !form.name.trim()) return "Campaign name is required.";
    if (s === 3 && !form.message.trim()) return "Message is required.";
    if (s === 4 && !form.sendNow) {
      if (!form.scheduledDate) return "Please select a date.";
      if (!form.scheduledTime) return "Please select a time.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setSaveError(err); return; }
    setSaveError(null);
    setStep((s) => Math.min(4, s + 1));
  };

  // ── Save as draft (no launch) ─────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!form.name.trim()) { setSaveError("Campaign name is required."); return; }
    setSaveError(null);
    setSaving(true);
    try {
      const payload = buildPayload(form, senderId);
      if (isCreate || !form.id) {
        const campaign = await campaignsService.create(payload);
        setForm((prev) => ({ ...prev, id: campaign.id }));
      } else {
        await campaignsService.update(form.id, payload);
      }
      navigate("/campaigns");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // ── Send / schedule (save + launch) ──────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateStep(step);
    if (err) { setSaveError(err); return; }
    setSaveError(null);
    setSaving(true);
    try {
      const payload = buildPayload(form, senderId);

      let campaignId = form.id;
      if (isCreate || !campaignId) {
        const campaign = await campaignsService.create(payload);
        campaignId = campaign.id;
        setForm((prev) => ({ ...prev, id: campaignId }));
      } else {
        await campaignsService.update(campaignId, payload);
      }

      await campaignsService.launch(campaignId!);
      navigate("/campaigns");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setSaveError(
          "No recipients found. Check your audience filters or contact opt-out status."
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setSaveError("This campaign has already been launched.");
      } else {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save campaign."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      await campaignsService.duplicate(id);
      navigate("/campaigns");
    } catch {
      setSaveError("Failed to duplicate campaign.");
    }
  };

  // ── Title / subtitle ──────────────────────────────────────────────────────
  const statusLabel = form.status ? CAMPAIGN_STATUS_LABELS[form.status] ?? form.status : "";

  const title = isCreate
    ? "New Campaign"
    : mode === "edit"
    ? `Edit · ${form.name || "Untitled"}`
    : form.name || "Campaign";

  const subtitle = isCreate
    ? "Set up a new SMS campaign"
    : mode === "edit"
    ? `Editing ${statusLabel.toLowerCase()} campaign`
    : undefined;

  // ── Status badge pill for header ──────────────────────────────────────────
  const statusColorClass =
    CAMPAIGN_STATUS_COLORS[statusLabel] ?? "bg-gray-50 text-gray-700 border-gray-200";

  // ── Loading / error states ────────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-5 w-24 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm">
          {fetchError}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const sections: React.ReactNode[] = [
    <StepDetails key="s1" form={form} onChange={onChange} readonly={readonly} />,
    <StepAudience key="s2" form={form} onChange={onChange} readonly={readonly} estimated={estimated} />,
    <StepContent  key="s3" form={form} onChange={onChange} readonly={readonly} />,
    <StepScheduleOrPerformance key="s4" form={form} onChange={onChange} readonly={readonly} mode={mode} />,
  ];

  const isLocked = LOCKED_CAMPAIGN_STATUSES.includes(form.status);

  return (
    <div className="p-8 max-w-5xl mx-auto pb-0">
      {/* Breadcrumb + header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate("/campaigns")}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 mb-2"
          >
            ← Campaigns
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
        </div>
        {mode !== "create" && form.status && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColorClass}`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Wizard stepper */}
      <WizardStepper current={step} onStepClick={setStep} isView={readonly} />

      {/* Active step */}
      <div className="space-y-6 mb-6">{sections[step - 1]}</div>

      {/* Error / warning banner */}
      {saveError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          {saveError}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
        {mode === "view" ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg
                className="w-4 h-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              {isLocked
                ? "This campaign has been sent. Editing is locked."
                : "View-only mode."}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/campaigns")}
                className="px-5 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back to list
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg shadow-sm transition-colors"
                style={{ backgroundColor: BRAND.primary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E54E0F")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = BRAND.primary)
                }
              >
                Duplicate to new campaign
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-gray-600">
              Will send to{" "}
              <span className="font-semibold text-gray-900">
                {formatNumber(estimated)}
              </span>{" "}
              recipients
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/campaigns")}
                className="px-5 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => { setSaveError(null); setStep((s) => s - 1); }}
                  className="px-5 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg shadow-sm transition-colors"
                  style={{ backgroundColor: BRAND.primary }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#E54E0F")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = BRAND.primary)
                  }
                >
                  Next: {STEP_LABELS[step]} →
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-5 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60"
                    style={{ backgroundColor: BRAND.primary }}
                    onMouseEnter={(e) =>
                      !saving &&
                      (e.currentTarget.style.backgroundColor = "#E54E0F")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = BRAND.primary)
                    }
                  >
                    {saving
                      ? "Saving…"
                      : form.sendNow
                      ? "Send campaign"
                      : "Schedule campaign"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
