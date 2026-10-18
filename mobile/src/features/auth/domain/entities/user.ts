export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  hasPin?: boolean;
  createdAt: string;
}

export interface AuthSession {
  sessionToken: string;
  refreshToken?: string;
  accessToken?: string;
  tokenType: string;
  expiresIn: number;
}

