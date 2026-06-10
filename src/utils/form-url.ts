/**
 * Public form URL helpers.
 *
 * In production, set VITE_APP_URL to your frontend domain so shareable links,
 * QR codes, and copied URLs all show the real address — not localhost.
 *
 *   VITE_APP_URL=https://www.gabysms.com   ← .env or Vercel env var
 *
 * Falls back to window.location.origin in development (localhost:5173).
 */
const APP_ORIGIN =
  (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ??
  window.location.origin;

/**
 * Full URL for a public form — safe to put in QR codes and copy to clipboard.
 * e.g. https://app.gabysms.com/f/A3KX9M
 */
export function formPublicUrl(code: string): string {
  return `${APP_ORIGIN}/f/${code}`;
}

/**
 * Display-friendly URL without the protocol prefix — used in the UI where
 * the full https:// would take up too much space.
 * e.g. app.gabysms.com/f/A3KX9M
 */
export function formDisplayUrl(code: string): string {
  return `${APP_ORIGIN.replace(/^https?:\/\//, "")}/f/${code}`;
}
