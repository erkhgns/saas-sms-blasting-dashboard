import { useState, useEffect, useCallback, useRef } from "react";
import { inboxService } from "@/services";
import { chimeForMessage, installSoundUnlock } from "@/utils/notificationSound";
import { logger } from "@/utils/logger";

// Background unread check that runs on every dashboard page (mounted in DashboardLayout).
// Drives the tab title "(3) …", the favicon dot, the sidebar badge, and the notification sound.

const VISIBLE_MS = 15_000;
const HIDDEN_MS  = 60_000; // browsers throttle hidden tabs to ~1/min anyway
const SAMPLE     = 10;     // newest unread threads to compare between checks
const SYNC_WAIT_MS = 5_000; // longest the sound waits for the Inbox page to refresh

// ── Hooks the Inbox page into the watcher ────────────────────────────────────

let viewingPhone: string | null = null;
let requestCheck: (() => void) | null = null;
let checkListener: ((arrivedPhones: string[]) => Promise<unknown>) | null = null;

/** The conversation open on the Inbox page — no sound for it while the tab is visible. */
export function setViewingInboxPhone(phone: string | null) {
  viewingPhone = phone;
}

/**
 * Lets the Inbox page refresh on this watcher's clock: called on every check with the
 * threads that just got new messages. The sound waits for the returned promise, so the
 * new message shows on screen and the chime plays together. Returns an unsubscribe.
 */
export function onInboxCheck(listener: (arrivedPhones: string[]) => Promise<unknown>) {
  checkListener = listener;
  return () => { if (checkListener === listener) checkListener = null; };
}

/** Ask for an immediate check, e.g. after marking a thread read so the count drops. */
export function requestInboxAlertsCheck() {
  requestCheck?.();
}

// ── Title + favicon ──────────────────────────────────────────────────────────

const TITLE_COUNT = /^\(\d+\+?\)\s/;

function applyTitle(unread: number) {
  const base = document.title.replace(TITLE_COUNT, "");
  document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
}

let dotIconUrl: string | null = null;

function iconLinks(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
}

async function buildDotIcon(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = "/favicon-32.png";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const c = canvas.getContext("2d");
    if (!c) return null;
    c.drawImage(img, 0, 0, 32, 32);
    c.beginPath();
    c.arc(24, 8, 7, 0, Math.PI * 2);
    c.fillStyle = "#ffffff";
    c.fill();
    c.beginPath();
    c.arc(24, 8, 5, 0, Math.PI * 2);
    c.fillStyle = "#dc2626";
    c.fill();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function applyFavicon(showDot: boolean) {
  const links = iconLinks();
  for (const link of links) link.dataset.originalHref ??= link.getAttribute("href") ?? "";
  if (showDot) {
    dotIconUrl ??= await buildDotIcon();
    if (!dotIconUrl) return;
    for (const link of links) link.href = dotIconUrl;
  } else {
    for (const link of links) link.setAttribute("href", link.dataset.originalHref ?? "");
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Returns the number of unread threads, refreshed in the background. */
export function useInboxAlerts(): number {
  const [unread, setUnread] = useState(0);
  // Unread threads from the previous check (phone → unreadCount) and the newest activity seen.
  // null until the first successful check, which only sets the baseline — no sound on page load.
  const prevUnreadRef  = useRef<Map<string, number> | null>(null);
  const newestSeenRef  = useRef("");
  const inFlight    = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await inboxService.getInbox(1, SAMPLE, true);
      setUnread(res.meta.unreadThreads);

      const unreadNow  = res.data.filter((t) => t.unreadCount > 0);
      const prev       = prevUnreadRef.current;
      const prevNewest = newestSeenRef.current;

      prevUnreadRef.current = new Map(unreadNow.map((t) => [t.phone, t.unreadCount]));
      for (const t of unreadNow) {
        if (t.lastActivityAt > newestSeenRef.current) newestSeenRef.current = t.lastActivityAt;
      }

      // A thread has a new incoming message if its unread count went up, or it wasn't
      // among the unread threads last time and has activity newer than anything seen before.
      // The first check only sets the baseline.
      const arrived = prev === null ? [] : unreadNow.filter((t) => {
        const before = prev.get(t.phone);
        return before !== undefined ? t.unreadCount > before : t.lastActivityAt > prevNewest;
      });
      if (prev === null) logger.debug("InboxAlerts", "baseline set", { unread: res.meta.unreadThreads });

      // Let the Inbox page (if open) refresh first, so the chime lands with the new message
      if (checkListener) {
        await Promise.race([
          checkListener(arrived.map((t) => t.phone)).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, SYNC_WAIT_MS)),
        ]);
      }

      const viewing = document.visibilityState === "visible" ? viewingPhone : null;
      const toChime = arrived.filter((t) => t.phone !== viewing);

      if (arrived.length && !toChime.length) {
        logger.debug("InboxAlerts", "new message in the open conversation — no sound", viewing);
      }
      if (toChime.length) {
        const key = toChime.map((t) => t.lastActivityAt).sort().pop()!;
        logger.debug("InboxAlerts", "new incoming message", toChime.map((t) => t.phone));
        void chimeForMessage(key);
      }
    } catch {
      // silent — next check retries
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Poll: faster while visible, slower while hidden; check right away when the tab returns
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await check();
        schedule();
      }, document.visibilityState === "visible" ? VISIBLE_MS : HIDDEN_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
      schedule();
    };

    const removeUnlock = installSoundUnlock();
    requestCheck = () => void check();
    void check();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      removeUnlock();
      requestCheck = null;
    };
  }, [check]);

  useEffect(() => {
    applyTitle(unread);
    void applyFavicon(unread > 0);
  }, [unread]);

  // Restore the plain title and icon when leaving the dashboard (e.g. logout)
  useEffect(() => () => {
    applyTitle(0);
    void applyFavicon(false);
  }, []);

  return unread;
}
