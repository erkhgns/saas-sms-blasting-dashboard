import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type { LoginPayload, LoginResponse, RegisterPayload, AuthUser, RefreshResponse } from "@/types";

export const authService = {
  register: (payload: RegisterPayload) =>
    api.post<AuthUser>("/auth/register", payload),

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>("/auth/login", payload);
    authStore.setAccessToken(res.accessToken);
    authStore.setRefreshToken(res.refreshToken);
    authStore.setUser(res.user);
    return res;
  },

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
