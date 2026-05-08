export type TokenType = "text" | "number" | "date" | "select";

export interface PersonalizationToken {
  key: string;        // snake_case, immutable, e.g. "first_name"
  label: string;      // human label, e.g. "First name"
  type: TokenType;
  fallback: string;   // used when contact has no value for this token
  required: boolean;
  options?: string[]; // only for type="select"
}

// ─── v2.3.0 API Tags ─────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color: string | null;   // hex e.g. "#f59e0b", null if not set
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagPayload {
  senderId: string;
  name: string;
  color?: string;          // optional hex — validated as 3 or 6 digit hex
}

export interface UpdateTagPayload {
  name?: string;           // both fields optional (partial update)
  color?: string | null;   // null to clear the color
}

// ─── v2.3.0 API Tokens ───────────────────────────────────────────────────────

export interface ApiToken {
  id: string;
  key: string;             // snake_case token key, e.g. "cod_value"
  label: string;           // human label, e.g. "COD Amount"
  fallback: string | null; // value used when contact has no customFields[key]
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiTokenPayload {
  senderId: string;
  key: string;
  label: string;
  fallback?: string;       // optional — empty string / omit = no fallback
}

export interface UpdateApiTokenPayload {
  key?: string;
  label?: string;
  fallback?: string | null; // null to clear the fallback
}
