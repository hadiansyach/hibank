export interface LoginRequestDto {
  email: string;
  password: string;
  device_id?: string;
}

export interface SessionResponseDto {
  session_token: string;
  refresh_token?: string;
  access_token?: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequestDto {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UserResponseDto {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  has_pin?: boolean;
  is_pin_set?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UpdatePinRequestDto {
  pin: string;
  old_pin?: string;
  password?: string;
}

export interface UpdatePinResponseDto {
  message: string;
  has_pin: boolean;
}

