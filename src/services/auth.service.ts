import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type { LoginPayload, LoginResponse, RegisterPayload, AuthUser, RefreshResponse, RegenerateApiKeyResponse } from "@/types";

export const authService = {
  register: (payload: RegisterPayload) =>
    api.post<AuthUser>("/auth/register", payload),

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>("/auth/login", payload);
    authStore.setAccessToken(res.accessToken);
    authStore.setRefreshToken(res.refreshToken);
    authStore.setUser(res.user);
    if (res.apiKey) authStore.setApiKey(res.apiKey);
    return res;
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    api.patch<void>("/auth/change-password", { currentPassword, newPassword }),

  regenerateApiKey: (): Promise<RegenerateApiKeyResponse> =>
    api.post<RegenerateApiKeyResponse>("/auth/api-key/regenerate", {}),

  refresh: async (): Promise<RefreshResponse> => {
    const refreshToken = authStore.getRefreshToken();
    const res = await api.post<RefreshResponse>("/auth/refresh", { refreshToken });
    authStore.setAccessToken(res.accessToken);
    authStore.setRefreshToken(res.refreshToken);
    return res;
  },

  logout: async (): Promise<void> => {
    const refreshToken = authStore.getRefreshToken();
    try {
      await api.post<void>("/auth/logout", { refreshToken });
    } finally {
      authStore.clear();
    }
  },
};
