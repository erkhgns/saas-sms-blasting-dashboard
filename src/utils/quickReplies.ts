import type { ApiToken, QuickReply } from "@/types";

// ── Token resolution ─────────────────────────────────────────────────────────
// Used identically by the Inbox picker preview and on insert. Each {{key}} becomes
// the contact's value, else the token's fallback, else it's left as typed.

const TOKEN_RE = /\{\{(\w+)\}\}/g;

export type ResolvedPart =
  | { kind: "text"; text: string }
  | { kind: "contact" | "fallback" | "unresolved"; text: string; token: string };

export function resolveTemplateParts(
  template: string,
  values: Record<string, unknown> | null | undefined,
  tokens: ApiToken[],
): ResolvedPart[] {
  const parts: ResolvedPart[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: template.slice(last, start) });
    const key = m[1];
    const raw = values?.[key];
    const value = raw === null || raw === undefined ? "" : String(raw).trim();
    const fallback = tokens.find((t) => t.key === key)?.fallback?.trim() ?? "";
    if (value)         parts.push({ kind: "contact",    text: value,    token: key });
    else if (fallback) parts.push({ kind: "fallback",   text: fallback, token: key });
    else               parts.push({ kind: "unresolved", text: m[0],     token: key });
    last = start + m[0].length;
  }
  if (last < template.length) parts.push({ kind: "text", text: template.slice(last) });
  return parts;
}

export function resolveTemplate(
  template: string,
  values: Record<string, unknown> | null | undefined,
  tokens: ApiToken[],
): string {
  return resolveTemplateParts(template, values, tokens).map((p) => p.text).join("");
}

/** {{token}} placeholders still in a message — sent as-is they'd reach the customer literally. */
export function findUnfilledTokens(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[0]))];
}

// ── SMS segment counter ──────────────────────────────────────────────────────
// GSM-7: 160 chars for 1 segment, 153 per segment when multi-part; extended chars count 2.
// Any other character switches the whole message to UCS-2: 70, then 67 per segment.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

export interface SmsInfo {
  encoding: "GSM-7" | "UCS-2";
  /** Length in encoding units (GSM extended chars count as 2). */
  length: number;
  segments: number;
  /** Capacity of the current number of segments, e.g. 160 or 306. */
  limit: number;
}

export function smsInfo(text: string): SmsInfo {
  let gsmLength = 0;
  let isGsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(ch)) gsmLength += 2;
    else { isGsm = false; break; }
  }

  if (isGsm) {
    const segments = gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153);
    return { encoding: "GSM-7", length: gsmLength, segments, limit: segments === 1 ? 160 : segments * 153 };
  }
  const length = text.length; // UTF-16 code units — emoji take 2
  const segments = length <= 70 ? 1 : Math.ceil(length / 67);
  return { encoding: "UCS-2", length, segments, limit: segments === 1 ? 70 : segments * 67 };
}

// ── Picker filter ────────────────────────────────────────────────────────────

/** Case-insensitive match on name, shortcut and message. Keeps sortOrder. */
export function filterQuickReplies(list: QuickReply[], query: string): QuickReply[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.shortcut ?? "").includes(q) ||
      r.message.toLowerCase().includes(q),
  );
}

/** Lowercase and strip anything outside a-z 0-9 _ - (spaces included). */
export function sanitizeShortcut(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
