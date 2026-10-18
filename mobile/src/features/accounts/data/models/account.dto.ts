export interface AccountDto {
  id: string;
  user_id: string;
  account_number: string;
  account_type: 'SAVINGS' | 'CHECKING' | string;
  balance: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateAccountDto {
  account_type?: 'SAVINGS' | 'CHECKING';
}

