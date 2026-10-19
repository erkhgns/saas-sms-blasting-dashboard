// ── Inbox notification sound ─────────────────────────────────────────────────
// A short two-note chime synthesized with the Web Audio API (no audio file).
// Browsers only allow audio after the user has clicked or typed on the page,
// so the AudioContext is created/resumed on the first user gesture.

import { logger } from "./logger";

const MUTE_KEY       = "gaby:inboxSoundMuted";
const LAST_CHIME_KEY = "gaby:inboxLastChime:v2"; // shared across tabs so only one plays
const CHIME_LOCK     = "gaby-inbox-chime";

let ctx: AudioContext | null = null;

function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // Web Audio unavailable — stay silent
  }
}

/** Listen for the first user gesture so sound is allowed later. Returns a cleanup. */
export function installSoundUnlock(): () => void {
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  return () => {
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
}

export function isSoundMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setSoundMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // storage blocked — preference just isn't remembered
  }
}

/** Why this tab can't make sound right now, or null if it can. */
function blockedReason(): string | null {
  if (isSoundMuted()) return "muted";
  if (!ctx || ctx.state !== "running") return "browser blocked audio — click or type on the page once";
  return null;
}

function playChime() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes: [freq: number, offset: number][] = [[880, 0], [1318.5, 0.12]];
  for (const [freq, offset] of notes) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.55);
  }
}

/**
 * Play the chime for new activity at `at` (ISO string), unless another tab already
 * played it. Only a tab that can actually make sound claims it, so a tab still
 * waiting for a click doesn't silence the others.
 */
export async function chimeForMessage(at: string) {
  const claimAndPlay = () => {
    const blocked = blockedReason();
    if (blocked) { logger.debug("InboxAlerts", `no sound: ${blocked}`); return; }
    let last = "";
    try { last = localStorage.getItem(LAST_CHIME_KEY) ?? ""; } catch { /* no storage */ }
    if (last >= at) { logger.debug("InboxAlerts", "no sound: another tab already played it"); return; }
    try { localStorage.setItem(LAST_CHIME_KEY, at); } catch { /* no storage */ }
    playChime();
  };

  if (navigator.locks) await navigator.locks.request(CHIME_LOCK, claimAndPlay);
  else claimAndPlay();
}
