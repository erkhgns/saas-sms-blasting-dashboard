export const BRAND = {
  primary: "#FF692E",
  primaryHover: "#E55829",
  primaryLight: "#FCF4B5",
} as const;

export const SMS = {
  maxSegmentLength: 160,
  maxMessageLength: 1600,
} as const;

export const CONTACT_TAGS = ["VIP", "Repeat Customer", "New Lead", "Active", "Trial"] as const;

export const CONTACT_GROUPS = [
  { label: "All Contacts (15,230)", value: "all" },
  { label: "Active Customers (8,450)", value: "active" },
  { label: "New Leads (2,340)", value: "new_leads" },
  { label: "VIP Customers (890)", value: "vip" },
] as const;

export const TAG_COLORS: Record<string, string> = {
  VIP: "bg-purple-50 text-purple-700 border-purple-200",
  Active: "bg-green-50 text-green-700 border-green-200",
  "Repeat Customer": "bg-blue-50 text-blue-700 border-blue-200",
  "New Lead": "bg-orange-50 text-orange-700 border-orange-200",
  Trial: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

/**
 * Keyed by display label ("Draft", "In Progress", …) — not the API enum value.
 * Always convert API status → display label via CAMPAIGN_STATUS_LABELS before indexing here.
 */
export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  Draft:        "bg-gray-50   text-gray-700  border-gray-200",
  Scheduled:    "bg-blue-50   text-blue-700  border-blue-200",
  "In Progress":"bg-blue-50   text-blue-700  border-blue-200",
  Sent:         "bg-green-50  text-green-700 border-green-200",
  Failed:       "bg-red-50    text-red-700   border-red-200",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Normal: "bg-gray-50   text-gray-700   border-gray-200",
  High:   "bg-orange-50 text-orange-700 border-orange-200",
  Urgent: "bg-red-50    text-red-700    border-red-200",
};

export const SMS_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-50 text-gray-700 border-gray-200",
  SENT:    "bg-green-50 text-green-700 border-green-200",
  FAILED:  "bg-red-50 text-red-700 border-red-200",
};

export const SMS_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SENT:    "Sent",
  FAILED:  "Failed",
};

export const PAGE_SIZE = 10;

