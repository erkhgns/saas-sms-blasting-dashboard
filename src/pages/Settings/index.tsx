import { useState } from "react";
import { Copy, Save, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND } from "@/utils";
import { authStore } from "@/utils/auth.store";
import { authService } from "@/services/auth.service";

/** Copies text — returns true if successful, false if both methods fail. */
async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  // Method 1: modern Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }

  // Method 2: execCommand (legacy / non-HTTPS)
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    // Must be visible & on-screen for select() to work in all browsers
    el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length); // required for iOS
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
      <div
        className="w-11 h-6 bg-gray-200 rounded-full peer
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full
          after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full peer-checked:after:border-white
          peer-checked:bg-[#FF692E]"
      />
    </label>
  );
}

const accountToggles = [
  { label: "Email Notifications",    desc: "Receive email alerts for campaign completions and failures" },
  { label: "Auto-reply Detection",   desc: "Automatically detect and categorize auto-replies" },
  { label: "STOP Request Handling",  desc: "Automatically unsubscribe contacts who send STOP" },
];

// ─── Settings ────────────────────────────────────────────────────────────────

export function Settings() {
  const apiKeyPrefix = authStore.getApiKeyPrefix();

  // Masked display: show prefix + dots, e.g. "sk_a1b2c3d4••••••••••••••••••••••••••••••"
  const maskedKey = apiKeyPrefix ? `${apiKeyPrefix}${"•".repeat(32)}` : "••••••••••••••••••••••••••••••••••••••••••";

  // Regenerate state
  const [regenerating, setRegenerating]   = useState(false);
  const [newKey, setNewKey]               = useState<string | null>(null);   // full key shown once
  const [newPrefix, setNewPrefix]         = useState<string | null>(null);
  const [regenError, setRegenError]       = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);       // for new-key panel
  const [copiedPrefix, setCopiedPrefix]   = useState(false);       // for main key button
  const [copyError, setCopyError]         = useState(false);       // feedback when copy fails

  const handleRegenerate = async () => {
    setRegenError(null);
    setNewKey(null);
    setRegenerating(true);
    try {
      const res = await authService.regenerateApiKey();
      authStore.setApiKeyPrefix(res.prefix);
      setNewKey(res.key);
      setNewPrefix(res.prefix);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to regenerate API key.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyPrefix = async () => {
    const text = newPrefix ?? apiKeyPrefix ?? "";
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setCopiedPrefix(true);
      setTimeout(() => setCopiedPrefix(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleCopyNew = async () => {
    if (!newKey) return;
    const ok = await copyText(newKey);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismissNew = () => {
    setNewKey(null);
    setNewPrefix(null);
    setCopied(false);
  };

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Settings" subtitle="Manage your account and API configuration" />

      <div className="space-y-6">

        {/* ── Profile Information ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" defaultValue="John" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" defaultValue="Smith" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input type="email" defaultValue="john.smith@company.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input type="text" defaultValue="Acme Corporation" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: "none" }} />
            </div>
          </div>
        </div>

        {/* ── API Key ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
            <p className="text-sm text-gray-600 mt-1">
              Your personal API key for third-party integrations. Use it as the{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">x-api-key</code> header — no Bearer token needed.
            </p>
          </div>
          <div className="p-6 space-y-4">

            {/* Current key (prefix + masked) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>

              {/* No prefix yet — user logged in before v2.1.0 */}
              {!apiKeyPrefix && !newPrefix ? (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Your API key identifier isn't loaded yet.{" "}
                    <strong>Log out and back in</strong>, or click{" "}
                    <strong>Regenerate</strong> to get a new key now.
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPrefix ? `${newPrefix}${"•".repeat(32)}` : maskedKey}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyPrefix}
                    title="Copy key identifier"
                    className="flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors text-sm font-medium"
                    style={
                      copyError    ? { borderColor: "#ef4444", backgroundColor: "#fef2f2", color: "#dc2626" } :
                      copiedPrefix ? { borderColor: "#16a34a", backgroundColor: "#f0fdf4", color: "#16a34a" } :
                                     { borderColor: "#d1d5db", backgroundColor: "white",   color: "#6b7280" }
                    }
                  >
                    {copyError
                      ? <><AlertTriangle className="w-4 h-4" /><span>Failed</span></>
                      : copiedPrefix
                      ? <><CheckCircle className="w-4 h-4" /><span>Copied</span></>
                      : <><Copy className="w-4 h-4" /><span>Copy</span></>}
                  </button>
                </div>
              )}

              {/* Re-generate button — always visible */}
              <div className="mt-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Regenerating…" : "Regenerate key"}
                </button>
              </div>

              {copyError && (
                <p className="text-xs text-red-600 mt-1.5">
                  Clipboard access denied. Select the key text manually and press Ctrl+C / Cmd+C.
                </p>
              )}
            </div>

            {/* Regenerate error */}
            {regenError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {regenError}
              </div>
            )}

            {/* New key reveal — shown once after regeneration */}
            {newKey && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900">
                    Copy your new API key now — it will not be shown again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKey}
                    readOnly
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg bg-white font-mono text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyNew}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: copied ? "#16a34a" : BRAND.primary }}
                  >
                    {copied
                      ? <><CheckCircle className="w-4 h-4" /> Copied!</>
                      : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
                <button
                  onClick={handleDismissNew}
                  className="text-xs text-amber-700 hover:text-amber-900 underline"
                >
                  I've saved it — dismiss
                </button>
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong className="text-gray-900">Note:</strong> The full key is only visible immediately after generation or regeneration. Only the key identifier (prefix) is stored. If the key is lost, use <strong>Regenerate</strong> to get a new one — the old key will be invalidated immediately.
              </p>
            </div>

          </div>
        </div>

        {/* ── Sender ID Configuration ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sender ID Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your default sender ID for outbound messages</p>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Sender ID</label>
            <input
              type="text"
              defaultValue="GabySMS"
              placeholder="e.g., GabySMS or +1234567890"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
            />
            <p className="text-sm text-gray-500 mt-2">
              Can be alphanumeric (up to 11 characters) or a phone number.
            </p>
          </div>
        </div>

        {/* ── Account Settings ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            {accountToggles.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between ${i < accountToggles.length - 1 ? "pb-4 border-b border-gray-200" : ""}`}
              >
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
                <Toggle defaultChecked />
              </div>
            ))}
          </div>
        </div>

        {/* ── Save Button ──────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <PrimaryButton className="px-6 py-3">
            <Save className="w-5 h-5" />
            Save Changes
          </PrimaryButton>
        </div>

      </div>
    </div>
  );
}
