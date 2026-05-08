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
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagPayload {
  senderId: string;
  name: string;
}

export interface UpdateTagPayload {
  name: string;
}

// ─── v2.3.0 API Tokens ───────────────────────────────────────────────────────

export interface ApiToken {
  id: string;
  key: string;        // snake_case token key, e.g. "cod_value"
  label: string;      // human label, e.g. "COD Amount"
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiTokenPayload {
  senderId: string;
  key: string;
  label: string;
}

export interface UpdateApiTokenPayload {
  key?: string;
  label?: string;
}
