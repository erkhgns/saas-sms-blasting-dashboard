import { Copy, Save } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";

interface ToggleProps {
  defaultChecked?: boolean;
}

function Toggle({ defaultChecked }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
      <div
        className="w-11 h-6 bg-gray-200 rounded-full peer
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full
          after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full peer-checked:after:border-white
          peer-checked:bg-[#FF5F1F]"
      />
    </label>
  );
}

const accountToggles = [
  { label: "Email Notifications", desc: "Receive email alerts for campaign completions and failures" },
  { label: "Auto-reply Detection", desc: "Automatically detect and categorize auto-replies" },
  { label: "STOP Request Handling", desc: "Automatically unsubscribe contacts who send STOP" },
];

export function Settings() {
  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Settings" subtitle="Manage your account and API configuration" />

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  defaultValue="John"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  style={{ outline: "none" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  defaultValue="Smith"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  style={{ outline: "none" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                defaultValue="john.smith@company.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                style={{ outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                defaultValue="Acme Corporation"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                style={{ outline: "none" }}
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your API keys for programmatic access</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: "Production API Key", value: "••••••••••••••••••••••••••••••••••••••" },
              { label: "Test API Key", value: "••••••••••••••••••••••••••••••••••••••" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={value}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                  />
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => navigator.clipboard.writeText(value)}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> Keep your API keys secure and never share them publicly. If you suspect a
                key has been compromised, regenerate it immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Sender ID Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sender ID Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your default sender ID for outbound messages</p>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Sender ID</label>
            <input
              type="text"
              defaultValue="ACME"
              placeholder="e.g., ACME or +1234567890"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
            />
            <p className="text-sm text-gray-500 mt-2">
              Can be alphanumeric (up to 11 characters) or a phone number.
            </p>
          </div>
        </div>

        {/* Account Settings */}
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

        {/* Save Button */}
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
