import { api } from "./api";
import type { AuthResponse, LoginPayload, User, AccountSettings } from "@/types";

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", payload),

  logout: () =>
    api.post<void>("/auth/logout", {}),

  getProfile: () =>
    api.get<User>("/auth/me"),

  updateProfile: (payload: Partial<User>) =>
    api.put<User>("/auth/me", payload),

  getSettings: () =>
    api.get<AccountSettings>("/auth/settings"),

  updateSettings: (payload: Partial<AccountSettings>) =>
    api.patch<AccountSettings>("/auth/settings", payload),

  regenerateApiKey: (type: "production" | "test") =>
    api.post<{ key: string }>("/auth/api-keys/regenerate", { type }),
};
