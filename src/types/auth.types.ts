export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: "Admin" | "Manager" | "Viewer";
  avatarUrl?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AccountSettings {
  emailNotifications: boolean;
  autoReplyDetection: boolean;
  stopRequestHandling: boolean;
  defaultSenderId: string;
}
