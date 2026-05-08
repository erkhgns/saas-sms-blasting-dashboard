import type { AuthUser } from "@/types";

const KEYS = {
  refreshToken:  "refresh_token",
  user:          "auth_user",
  apiKeyPrefix:  "api_key_prefix",
} as const;

// Access token lives only in memory — cleared on page refresh (by design)
let _accessToken: string | null = null;

export const authStore = {
  // Access token (in-memory only)
  getAccessToken: () => _accessToken,
  setAccessToken: (token: string | null) => {
    _accessToken = token;
  },

  // Refresh token (persisted so session survives page refresh)
  getRefreshToken: () => localStorage.getItem(KEYS.refreshToken),
  setRefreshToken: (token: string | null) => {
    if (token) localStorage.setItem(KEYS.refreshToken, token);
    else localStorage.removeItem(KEYS.refreshToken);
  },

  // Logged-in user
  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem(KEYS.user);
    try { return raw ? (JSON.parse(raw) as AuthUser) : null; }
    catch { return null; }
  },
  setUser: (user: AuthUser | null) => {
    if (user) localStorage.setItem(KEYS.user, JSON.stringify(user));
    else localStorage.removeItem(KEYS.user);
  },

  // API key prefix (persisted — shown in Settings)
  getApiKeyPrefix: () => localStorage.getItem(KEYS.apiKeyPrefix),
  setApiKeyPrefix: (prefix: string | null) => {
    if (prefix) localStorage.setItem(KEYS.apiKeyPrefix, prefix);
    else localStorage.removeItem(KEYS.apiKeyPrefix);
  },

  isLoggedIn: () => !!localStorage.getItem(KEYS.refreshToken),

  // Call on logout or when refresh fails
  clear: () => {
    _accessToken = null;
    localStorage.removeItem(KEYS.refreshToken);
    localStorage.removeItem(KEYS.user);
    localStorage.removeItem(KEYS.apiKeyPrefix);
  },
};
