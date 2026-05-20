import { useState, useRef, useEffect } from "react";
import { Copy, Check, Eye, EyeOff, ChevronDown, ChevronRight, Code2, Key } from "lucide-react";
import { BRAND, authStore } from "@/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ResponseDoc {
  status: string;
  label: string;
  body?: string;
}

interface EndpointDoc {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  requestUrl: string;
  headers: { key: string; value: string }[];
  requestBody?: string;
  responses: ResponseDoc[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    "bg-blue-100 text-blue-700 border-blue-200",
  POST:   "bg-green-100 text-green-700 border-green-200",
  PATCH:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_COLOR = (s: string) => {
  if (s.startsWith("2")) return "text-green-700 bg-green-50 border-green-200";
  if (s.startsWith("4")) return "text-red-700 bg-red-50 border-red-200";
  return "text-gray-700 bg-gray-50 border-gray-200";
};

const ENDPOINTS: EndpointDoc[] = [
  {
    id: "post-contacts",
    method: "POST",
    path: "/contacts",
    title: "Add or Upsert a Contact",
    description: "Creates a new contact or updates an existing one if the phone number already exists. Token values are merged into customFields — only passed keys are updated.",
    requestUrl: "POST /api/contacts",
    headers: [
      { key: "x-api-key", value: "sk_••••••••••••••••••••" },
      { key: "Content-Type", value: "application/json" },
    ],
    requestBody: `{
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "name": "Juan Dela Cruz",
  "phone": "09171234567",
  "email": "juan@email.com",
  "tags": ["vip", "luzon"],
  "tokens": {
    "order_id": "ORD-9981",
    "promo_code": "SALE50"
  }
}`,
    responses: [
      {
        status: "201",
        label: "Created — new contact",
        body: `{
  "id": "cnt_xyz789",
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "name": "Juan Dela Cruz",
  "phone": "09171234567",
  "email": "juan@email.com",
  "tags": ["vip", "luzon"],
  "customFields": { "order_id": "ORD-9981", "promo_code": "SALE50" },
  "optedOut": false,
  "createdAt": "2026-05-20T10:00:00.000Z",
  "updatedAt": "2026-05-20T10:00:00.000Z",
  "action": "created"
}`,
      },
      {
        status: "200",
        label: "OK — phone already existed, contact updated",
        body: `{
  "id": "cnt_xyz789",
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "name": "Juan Dela Cruz",
  "phone": "09171234567",
  "email": "juan@email.com",
  "tags": ["vip", "luzon"],
  "customFields": {
    "order_id": "ORD-9981",
    "promo_code": "SALE50",
    "loyalty_points": "800"
  },
  "optedOut": false,
  "createdAt": "2026-05-14T08:00:00.000Z",
  "updatedAt": "2026-05-20T10:00:00.000Z",
  "action": "updated"
}`,
      },
      {
        status: "400",
        label: "Bad Request — validation error",
        body: `{ "message": "Validation error", "issues": { "phone": ["Invalid PH phone number"] } }`,
      },
      {
        status: "401",
        label: "Unauthorized — missing or invalid x-api-key",
        body: `{ "message": "Unauthorized" }`,
      },
    ],
  },
  {
    id: "get-sms",
    method: "GET",
    path: "/sms",
    title: "List SMS",
    description: "Returns a paginated list of SMS messages for a sender. Supports filtering by status, priority, date range, and full-text search on receiver or content.",
    requestUrl: "GET /api/sms?senderId=cmofogn3500030pqqyoyqs7p8&page=1&limit=10&search=Juan&status=SENT&dateFrom=2026-05-01&dateTo=2026-05-20",
    headers: [{ key: "x-api-key", value: "sk_••••••••••••••••••••" }],
    responses: [
      {
        status: "200",
        label: "OK",
        body: `{
  "data": [
    {
      "id": "sms_abc123",
      "senderId": "cmofogn3500030pqqyoyqs7p8",
      "receiver": "09171234567",
      "content": "Hello Juan!",
      "status": "SENT",
      "priority": 0,
      "campaignId": null,
      "createdAt": "2026-05-20T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}`,
      },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
  {
    id: "get-sms-id",
    method: "GET",
    path: "/sms/:id",
    title: "Get Single SMS",
    description: "Retrieve the full details of a single SMS by its ID.",
    requestUrl: "GET /api/sms/sms_abc123",
    headers: [{ key: "x-api-key", value: "sk_••••••••••••••••••••" }],
    responses: [
      {
        status: "200",
        label: "OK",
        body: `{
  "id": "sms_abc123",
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "receiver": "09171234567",
  "content": "Hello Juan!",
  "status": "SENT",
  "priority": 0,
  "campaignId": null,
  "createdAt": "2026-05-20T10:00:00.000Z"
}`,
      },
      { status: "404", label: "Not Found", body: `{ "message": "SMS not found" }` },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
  {
    id: "post-sms",
    method: "POST",
    path: "/sms",
    title: "Send Single SMS",
    description: "Queue a single SMS to one recipient. Priority: 0 = Normal, 1 = High, 2 = Urgent.",
    requestUrl: "POST /api/sms",
    headers: [
      { key: "x-api-key", value: "sk_••••••••••••••••••••" },
      { key: "Content-Type", value: "application/json" },
    ],
    requestBody: `{
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "receiver": "09171234567",
  "content": "Hello Juan! Your order ORD-9981 is ready.",
  "priority": 1
}`,
    responses: [
      {
        status: "201",
        label: "Created",
        body: `{
  "id": "sms_abc123",
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "receiver": "09171234567",
  "content": "Hello Juan! Your order ORD-9981 is ready.",
  "status": "PENDING",
  "priority": 1,
  "campaignId": null,
  "createdAt": "2026-05-20T10:00:00.000Z"
}`,
      },
      { status: "400", label: "Validation error", body: `{ "message": "Validation error", "issues": { "receiver": ["Invalid PH phone number"] } }` },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
  {
    id: "post-sms-bulk",
    method: "POST",
    path: "/sms/bulk",
    title: "Send Bulk SMS",
    description: "Queue multiple SMS messages in a single request. Each message can have its own receiver, content, and priority.",
    requestUrl: "POST /api/sms/bulk",
    headers: [
      { key: "x-api-key", value: "sk_••••••••••••••••••••" },
      { key: "Content-Type", value: "application/json" },
    ],
    requestBody: `{
  "senderId": "cmofogn3500030pqqyoyqs7p8",
  "messages": [
    { "receiver": "09171234567", "content": "Hi Juan!", "priority": 0 },
    { "receiver": "09181234567", "content": "Hi Maria!", "priority": 0 }
  ]
}`,
    responses: [
      { status: "201", label: "Created", body: `{ "queued": 2 }` },
      { status: "400", label: "Validation error", body: `{ "message": "Validation error" }` },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
  {
    id: "patch-sms-id",
    method: "PATCH",
    path: "/sms/:id",
    title: "Update SMS Status",
    description: "Update the delivery status of an SMS. Typically called by the ESP32 device after attempting to send.",
    requestUrl: "PATCH /api/sms/sms_abc123",
    headers: [
      { key: "x-api-key", value: "sk_••••••••••••••••••••" },
      { key: "Content-Type", value: "application/json" },
    ],
    requestBody: `{ "status": "SENT" }`,
    responses: [
      {
        status: "200",
        label: "OK",
        body: `{
  "id": "sms_abc123",
  "status": "SENT",
  "updatedAt": "2026-05-20T10:05:00.000Z"
}`,
      },
      { status: "404", label: "Not Found", body: `{ "message": "SMS not found" }` },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
  {
    id: "delete-sms-id",
    method: "DELETE",
    path: "/sms/:id",
    title: "Delete SMS",
    description: "Permanently delete an SMS log entry by ID.",
    requestUrl: "DELETE /api/sms/sms_abc123",
    headers: [{ key: "x-api-key", value: "sk_••••••••••••••••••••" }],
    responses: [
      { status: "204", label: "No Content — successfully deleted" },
      { status: "404", label: "Not Found", body: `{ "message": "SMS not found" }` },
      { status: "401", label: "Unauthorized", body: `{ "message": "Unauthorized" }` },
    ],
  },
];

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
      } ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
        <div className="ml-auto">
          <CopyButton text={code} />
        </div>
      </div>
      <pre className="bg-gray-900 px-4 py-4 text-sm text-gray-100 overflow-x-auto leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ── EndpointSection ───────────────────────────────────────────────────────────

function EndpointSection({ ep }: { ep: EndpointDoc }) {
  const [open, setOpen] = useState(false);
  const [activeResponse, setActiveResponse] = useState(0);

  const headersText = ep.headers.map((h) => `${h.key}: ${h.value}`).join("\n");

  return (
    <div
      id={ep.id}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header row — click to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold border font-mono ${METHOD_COLORS[ep.method]}`}
        >
          {ep.method}
        </span>
        <code className="text-sm font-mono text-gray-700 flex-1">{ep.path}</code>
        <span className="text-sm font-medium text-gray-900 hidden sm:block">{ep.title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Description */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-600">{ep.description}</p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Request URL */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request</div>
              <CodeBlock code={ep.requestUrl} label="URL" />
            </div>

            {/* Headers */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Headers</div>
              <CodeBlock code={headersText} label="Headers" />
            </div>

            {/* Request body */}
            {ep.requestBody && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Body</div>
                <CodeBlock code={ep.requestBody} label="Request Body" />
              </div>
            )}

            {/* Responses */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Responses</div>
              {/* Status tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {ep.responses.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveResponse(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      activeResponse === i
                        ? STATUS_COLOR(r.status)
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-mono font-bold">{r.status}</span>
                    <span className="hidden sm:inline">{r.label}</span>
                  </button>
                ))}
              </div>
              {/* Active response body */}
              {ep.responses[activeResponse]?.body ? (
                <CodeBlock
                  code={ep.responses[activeResponse].body!}
                  label={`${ep.responses[activeResponse].status} ${ep.responses[activeResponse].label}`}
                />
              ) : (
                <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500">
                  No response body — {ep.responses[activeResponse]?.label}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ApiDocs page ──────────────────────────────────────────────────────────────

export function ApiDocs() {
  const apiKey = authStore.getApiKey() ?? "";
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyCopied, setKeyCopied]   = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Group endpoints by resource
  const groups = [
    { label: "Contacts", ids: ["post-contacts"] },
    { label: "SMS", ids: ["get-sms", "get-sms-id", "post-sms", "post-sms-bulk", "patch-sms-id", "delete-sms-id"] },
  ];

  const endpointMap = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e]));

  // Scroll offset for sticky header
  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = "80px";
    return () => { document.documentElement.style.scrollPaddingTop = ""; };
  }, []);

  return (
    <div className="flex h-full">

      {/* ── Sidebar nav ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4" style={{ color: BRAND.primary }} />
            <span className="text-sm font-semibold text-gray-900">API Reference</span>
          </div>
        </div>
        <nav className="p-3 space-y-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                {g.label}
              </div>
              {g.ids.map((id) => {
                const ep = endpointMap[id];
                if (!ep) return null;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                  >
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${METHOD_COLORS[ep.method]}`}>
                      {ep.method}
                    </span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 truncate font-mono">
                      {ep.path}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto" ref={sectionRef}>
        <div className="p-4 sm:p-8 max-w-4xl">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">API Reference</h1>
            <p className="text-gray-500 mt-1">
              Integrate Gaby SMS into your platform using your personal API key.
            </p>
          </div>

          {/* API Key card */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Key className="w-4 h-4" style={{ color: BRAND.primary }} />
              <span className="font-semibold text-gray-900 text-sm">Your API Key</span>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-500 mb-3">
                Pass this as the <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-800">x-api-key</code> header on every request. Keep it secret — anyone with this key can send SMS on your behalf.
              </p>
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700">
                    <code className="flex-1 text-sm font-mono text-green-400 break-all">
                      {keyVisible ? apiKey : `${apiKey.slice(0, 8)}${"•".repeat(32)}${apiKey.slice(-4)}`}
                    </code>
                  </div>
                  <button
                    onClick={() => setKeyVisible((v) => !v)}
                    className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={keyVisible ? "Hide key" : "Show key"}
                  >
                    {keyVisible
                      ? <EyeOff className="w-4 h-4 text-gray-500" />
                      : <Eye className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                  <button
                    onClick={copyKey}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      keyCopied
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {keyCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  API key not found. Go to <strong>Settings</strong> to generate one.
                </div>
              )}

              {/* Base URL */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Base URL</div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700">
                  <code className="flex-1 text-sm font-mono text-blue-400">https://api.gabysms.com</code>
                  <CopyButton text="https://api.gabysms.com" />
                </div>
              </div>

              {/* Priority reference */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { val: "0", label: "Normal", color: "bg-gray-100 text-gray-700 border-gray-200" },
                  { val: "1", label: "High", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                  { val: "2", label: "Urgent", color: "bg-red-50 text-red-700 border-red-200" },
                ].map((p) => (
                  <div key={p.val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${p.color}`}>
                    <code className="font-bold font-mono">{p.val}</code>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Priority: Urgent messages skip the queue and are sent first by the ESP32 device.
              </p>
            </div>
          </div>

          {/* Endpoint sections grouped */}
          {groups.map((g) => (
            <div key={g.label} className="mb-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span
                  className="w-1.5 h-5 rounded-full inline-block"
                  style={{ backgroundColor: BRAND.primary }}
                />
                {g.label}
              </h2>
              <div className="space-y-3">
                {g.ids.map((id) => {
                  const ep = endpointMap[id];
                  if (!ep) return null;
                  return <EndpointSection key={id} ep={ep} />;
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
