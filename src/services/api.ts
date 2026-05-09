import { logger } from "@/utils/logger";
import { authStore } from "@/utils/auth.store";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const ENV_API_KEY = import.meta.env.VITE_API_KEY ?? "";
const API_TIMEOUT_MS = 15_000;

// Routes that require x-api-key (ESP32 + frontend shared)
const API_KEY_PREFIXES = ["/sms", "/users", "/contacts", "/analytics", "/inbox", "/device-logs", "/tags", "/tokens"];

// Only these specific auth routes are fully public (no headers needed).
// Other /auth/* routes like /auth/change-password and /auth/api-key/regenerate
// require Authorization: Bearer and must NOT be treated as public.
const PUBLIC_PATHS = [
  "/auth/register",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/health",
];

function needsApiKey(path: string) {
  return API_KEY_PREFIXES.some((p) => path.startsWith(p));
}

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

/**
 * Resolve the x-api-key to send.
 * Preference order:
 *  1. VITE_API_KEY env var (global ESP32/server key — set in production .env)
 *  2. User's personal API key from authStore (sk_... stored on login)
 *  3. Empty string (no key — server may still accept Bearer-only for some routes)
 */
function resolveApiKey(): string {
  if (ENV_API_KEY) return ENV_API_KEY;
  return authStore.getApiKey() ?? "";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Calls /auth/refresh directly (not through request()) to avoid infinite loops
async function refreshTokens(): Promise<string> {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json();
  authStore.setAccessToken(data.accessToken);
  authStore.setRefreshToken(data.refreshToken);
  return data.accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const method = options.method ?? "GET";
  const url = `${BASE_URL}${path}`;
  const hasBody = options.body !== undefined;

  const headers: Record<string, string> = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (!isPublic(path)) {
    if (needsApiKey(path)) headers["x-api-key"] = resolveApiKey();
    const accessToken = authStore.getAccessToken();
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  }

  logger.info("API", `→ ${method} ${url}`, hasBody ? JSON.parse(options.body as string) : undefined);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    // Access token expired — try refresh once then retry
    if (response.status === 401 && !isRetry && !path.startsWith("/auth/refresh")) {
      logger.warn("API", "401 received, attempting token refresh...");
      try {
        await refreshTokens();
        return request<T>(path, options, true);
      } catch {
        authStore.clear();
        window.location.href = "/login";
        throw new ApiError(401, "Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      logger.error("API", `✕ ${method} ${url} — ${response.status} ${response.statusText}`, data);
      throw new ApiError(response.status, data?.message ?? response.statusText, data);
    }

    if (response.status === 204) {
      logger.info("API", `✓ ${method} ${url} — 204 No Content`);
      return undefined as T;
    }

    const data = await response.json() as T;
    logger.info("API", `✓ ${method} ${url} — ${response.status}`, data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    logger.error("API", `✕ ${method} ${url} — Network/fetch error: ${message}`, err);
    throw err;
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) => {
    const url = params
      ? `${path}?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
        )}`
      : path;
    return request<T>(url);
  },
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: "POST",  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: "PUT",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string)               => request<T>(path, { method: "DELETE" }),
};
