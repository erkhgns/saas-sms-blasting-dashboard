import { CAMPAIGN_STATUS_COLORS, TAG_COLORS } from "@/utils";

interface StatusBadgeProps {
  label: string;
  variant?: "campaign" | "tag";
  className?: string;
  children?: React.ReactNode;
}

export function StatusBadge({ label, variant = "campaign", className = "", children }: StatusBadgeProps) {
  const colorMap = variant === "tag" ? TAG_COLORS : CAMPAIGN_STATUS_COLORS;
  const colorClass = colorMap[label] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {children}
      {label}
    </span>
  );
}
