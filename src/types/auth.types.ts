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
  /** Full personal API key returned on every login — store securely. */
  apiKey: string;
}

export interface RegenerateApiKeyResponse {
  key:     string;   // full plaintext key — shown once
  prefix:  string;   // first 10 chars
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordPayload {
  phoneNumber: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordPayload {
  phoneNumber: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
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
