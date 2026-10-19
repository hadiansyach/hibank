export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  hasPin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
