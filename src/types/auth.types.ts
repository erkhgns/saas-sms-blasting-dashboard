export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Legacy aliases kept so other files don't break
export type User = AuthUser;
export interface AuthResponse extends LoginResponse {}
export interface AccountSettings {
  emailNotifications: boolean;
  autoReplyDetection: boolean;
  stopRequestHandling: boolean;
  defaultSenderId: string;
}
