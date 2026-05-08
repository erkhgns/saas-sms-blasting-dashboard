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
  apiKey: {
    hasKey: boolean;
    /** First 10 chars of the personal API key, e.g. "sk_a1b2c3d4" */
    prefix: string;
  };
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

// Legacy aliases kept so other files don't break
export type User = AuthUser;
export interface AuthResponse extends LoginResponse {}
export interface AccountSettings {
  emailNotifications: boolean;
  autoReplyDetection: boolean;
  stopRequestHandling: boolean;
  defaultSenderId: string;
}
