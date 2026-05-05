export type TokenType = "text" | "number" | "date" | "select";

export interface PersonalizationToken {
  key: string;        // snake_case, immutable, e.g. "first_name"
  label: string;      // human label, e.g. "First name"
  type: TokenType;
  fallback: string;   // used when contact has no value for this token
  required: boolean;
  options?: string[]; // only for type="select"
}
