/**
 * Shared UI atoms for the Automations feature.
 * Used by both RulesTab and LogTab (and the drawer in Phase 5).
 */
import {
  MessageSquare, RefreshCw, CalendarDays, ClipboardList,
  Tag, UserX, Minus,
} from "lucide-react";
import type { TriggerType, AutomationAction, AutomationFrequency } from "@/types";
import type { Tag as TagType } from "@/types";

// ── Trigger badge ─────────────────────────────────────────────────────────────

const TRIGGER_BADGE: Record<
  TriggerType,
  { cls: string; label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  INBOUND_MESSAGE: {
    cls:   "bg-blue-50 text-blue-700 border-blue-200",
    label: "Inbound Message",
    Icon:  MessageSquare,
  },
  TOKEN_UPDATED: {
    cls:   "bg-purple-50 text-purple-700 border-purple-200",
    label: "Token Updated",
    Icon:  RefreshCw,
  },
  SCHEDULED: {
    cls:   "bg-orange-50 text-orange-700 border-orange-200",
    label: "Scheduled",
    Icon:  CalendarDays,
  },
  FORM_SUBMITTED: {
    cls:   "bg-teal-50 text-teal-700 border-teal-200",
    label: "Form Submitted",
    Icon:  ClipboardList,
  },
};

export function TriggerBadge({
  trigger,
  dim = false,
}: {
  trigger: TriggerType;
  dim?: boolean;
}) {
  const meta = TRIGGER_BADGE[trigger];
  if (!meta) return null;
  const { cls, label, Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls} ${
        dim ? "opacity-50" : ""
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Action chips ──────────────────────────────────────────────────────────────

const ACTION_CHIP_STYLE: Record<
  AutomationAction["type"],
  { cls: string; Icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  SEND_SMS:   { cls: "bg-gray-100 text-gray-600 border-gray-200",        Icon: MessageSquare, label: "Send SMS"    },
  APPLY_TAG:  { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Tag,          label: "Apply Tag"  },
  REMOVE_TAG: { cls: "bg-amber-50 text-amber-700 border-amber-200",       Icon: Minus,        label: "Remove Tag" },
  OPT_OUT:    { cls: "bg-red-50 text-red-600 border-red-200",             Icon: UserX,        label: "Opted Out"  },
};

export function ActionChips({
  actions,
  tags,
  dim = false,
}: {
  actions: AutomationAction[];
  tags: TagType[];
  dim?: boolean;
}) {
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  return (
    <div className={`flex items-center flex-wrap gap-1.5 ${dim ? "opacity-50" : ""}`}>
      {actions.map((action, i) => {
        const meta = ACTION_CHIP_STYLE[action.type];
        const { cls, Icon } = meta;

        // For tag actions, show the tag name; for others show the action label
        let chipLabel: string;
        if (action.type === "APPLY_TAG" || action.type === "REMOVE_TAG") {
          chipLabel = tagMap.get(action.tagId)?.name ?? "Tag";
        } else if (action.type === "OPT_OUT") {
          chipLabel = "Opted Out";
        } else {
          chipLabel = "Send SMS";
        }

        return (
          <span
            key={i}
            title={meta.label}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${cls}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {chipLabel}
          </span>
        );
      })}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

/**
 * Branded toggle switch. Size "sm" = 36×20px, "md" = 44×24px.
 * Matches the existing Settings AutoReply switch pattern exactly.
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  const trackCls  = sm ? "h-5 w-9"  : "h-6 w-11";
  const knobCls   = sm ? "h-4 w-4"  : "h-5 w-5";
  const translateOn = sm ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex ${trackCls} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[#FF692E]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block ${knobCls} rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? translateOn : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Frequency short labels (for table column) ─────────────────────────────────

export const FREQ_SHORT: Record<AutomationFrequency, string> = {
  EVERY_TIME:       "Every time",
  ONCE_PER_CONTACT: "Once / contact",
  ONCE_PER_24H:     "Every 24 hrs",
  ONCE_PER_7D:      "Every 7 days",
  ONCE_PER_30D:     "Every 30 days",
};
