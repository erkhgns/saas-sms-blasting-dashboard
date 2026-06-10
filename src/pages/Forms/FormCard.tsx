import { useState } from "react";
import { ExternalLink, QrCode, Pencil, Trash2, Copy, Check } from "lucide-react";
import { formPublicUrl, formDisplayUrl } from "@/utils/form-url";
import type { GabyForm, FormStatus, Tag } from "@/types";

interface FormCardProps {
  form: GabyForm;
  tags: Tag[];
  togglingId: string | null;
  onEdit: (form: GabyForm) => void;
  onDelete: (form: GabyForm) => void;
  onToggle: (id: string, newStatus: FormStatus) => void;
  onQR: (form: GabyForm) => void;
  onView: (form: GabyForm) => void;
}
// ── Copy-link button ──────────────────────────────────────────────────────────

function CopyLinkButton({ displayUrl, copyUrl }: { displayUrl: string; copyUrl: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="inline-flex items-center gap-1.5 max-w-full">
      <code className="text-[13px] text-gray-600 font-mono truncate">{displayUrl}</code>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy link"
        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
          copied
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF692E]/40 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[#FF692E]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function FormCard({ form, tags, togglingId, onEdit, onDelete, onToggle, onQR, onView }: FormCardProps) {
  const active     = form.status === "active";
  const isToggling = togglingId === form.id;

  const formTags = (form.defaultTagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean) as Tag[];

  const shortUrl = formDisplayUrl(form.shortCode);
  const slugUrl  = form.slug ? formDisplayUrl(form.slug) : null;

  function handleToggle() {
    if (isToggling) return;
    onToggle(form.id, active ? "inactive" : "active");
  }

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm transition-colors ${
        active ? "border-gray-200 hover:border-gray-300" : "border-gray-200 bg-gray-50/60"
      }`}
    >
      {/* Main body */}
      <div className="p-5 flex items-start gap-5">
        {/* Left: identity — click opens editor */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onEdit(form)}
          onKeyDown={(e) => { if (e.key === "Enter") onEdit(form); }}
          className="flex-1 min-w-0 text-left group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className={`text-[16px] font-semibold group-hover:text-[#FF692E] transition-colors ${
                active ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {form.name}
            </h3>
            {active ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Inactive
              </span>
            )}
          </div>

          {/* Links */}
          <div className="mt-2 flex flex-col gap-1">
            <CopyLinkButton
              displayUrl={shortUrl}
              copyUrl={formPublicUrl(form.shortCode)}
            />
            {slugUrl && (
              <CopyLinkButton
                displayUrl={slugUrl}
                copyUrl={formPublicUrl(form.slug!)}
              />
            )}
          </div>

          {/* Default tags */}
          {formTags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {formTags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                  style={{
                    borderColor: t.color ?? "#e5e7eb",
                    backgroundColor: (t.color ?? "#e5e7eb") + "18",
                    color: t.color ?? "#6b7280",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: t.color ?? "#9ca3af" }}
                  />
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: submission count */}
        <div className="hidden sm:flex flex-col items-end justify-center px-5 border-l border-gray-100 shrink-0 self-stretch">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: active ? "#FF692E" : "#9ca3af" }}
          >
            {(form.submissionCount ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-medium">submissions</div>
          <div className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
            Created{" "}
            {new Date(form.createdAt).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Footer: toggle + action buttons */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ToggleSwitch checked={active} onChange={handleToggle} disabled={isToggling} />
          <span className="text-[13px] text-gray-500">
            {active ? "Accepting submissions" : "Not accepting submissions"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView(form)}
            title="View form"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">View</span>
          </button>
          <button
            type="button"
            onClick={() => onQR(form)}
            title="Download QR code"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">QR</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(form)}
            title="Edit form"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden md:inline">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(form)}
            title="Delete form"
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
