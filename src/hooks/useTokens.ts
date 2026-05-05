// TODO: replace with real API call when the Personalization Tokens admin page is built.
// The backing API/admin page is a separate spec — see design_handoff_contacts README.
import type { PersonalizationToken } from "@/types";

export const MOCK_TOKENS: PersonalizationToken[] = [
  { key: "first_name",       label: "First name",       type: "text",   fallback: "there",        required: true  },
  { key: "company",          label: "Company",          type: "text",   fallback: "your company",  required: false },
  { key: "city",             label: "City",             type: "text",   fallback: "",              required: false },
  { key: "loyalty_tier",     label: "Loyalty tier",     type: "select", options: ["Bronze", "Silver", "Gold", "Platinum"], fallback: "Bronze", required: false },
  { key: "discount_code",    label: "Discount code",    type: "text",   fallback: "WELCOME10",     required: false },
  { key: "appointment_date", label: "Appointment date", type: "date",   fallback: "",              required: false },
  { key: "appointment_time", label: "Appointment time", type: "text",   fallback: "",              required: false },
  { key: "balance_due",      label: "Balance due",      type: "number", fallback: "0",             required: false },
];

export function useTokens(): { tokens: PersonalizationToken[]; loading: false; error: null } {
  return { tokens: MOCK_TOKENS, loading: false, error: null };
}
