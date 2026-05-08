/**
 * Parses a raw string of phone numbers (newline- or comma-separated),
 * normalises them to Philippine format, and deduplicates.
 * Mirrors the logic used in SendSMS — single source of truth.
 */
export function cleanPhoneNumbers(raw: string): string[] {
  const entries = raw.split(/[\n,]+/);
  const cleaned = entries
    .map((entry) => {
      let num = entry.trim().replace(/,/g, "").trim();
      if (!num) return null;
      const hasPlus = num.startsWith("+");
      const digits = num.replace(/\D/g, "");
      if (!digits) return null;
      if (hasPlus) return `+${digits}`;
      if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
      if (digits.length === 11 && digits.startsWith("09"))  return digits;
      if (digits.length === 12 && digits.startsWith("63"))  return `+${digits}`;
      if (digits.length === 13 && digits.startsWith("639")) return `+${digits}`;
      return digits;
    })
    .filter((n): n is string => Boolean(n));
  return [...new Set(cleaned)];
}
