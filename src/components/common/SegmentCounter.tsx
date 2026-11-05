import { smsInfo } from "@/utils/quickReplies";

/** "1 segment · 72 / 160 chars" — amber at 2+ segments. Informational only. */
export function SegmentCounter({ text, className = "" }: { text: string; className?: string }) {
  const info = smsInfo(text);
  const multi = info.segments > 1;
  return (
    <span
      className={`text-xs tabular-nums ${multi ? "text-amber-700" : "text-gray-400"} ${className}`}
      title={info.encoding === "UCS-2" ? "Contains special characters — sent as Unicode (70 chars per segment)" : undefined}
    >
      {info.segments} segment{multi ? "s" : ""} · {info.length} / {info.limit} chars
    </span>
  );
}
