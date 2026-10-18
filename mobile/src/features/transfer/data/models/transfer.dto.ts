export interface InquiryRequestDto {
  source_account_id: string;
  target_account_number: string;
}

export interface InquiryResponseDto {
  source_account_id: string;
  target_account_number: string;
  recipient_name: string;
  bank_code: string;
  bank_name: string;
  fee: number;
}

export interface InternalTransferRequestDto {
  source_account_id: string;
  target_account_number: string;
  amount: number;
  notes?: string;
  pin: string;
}

export interface InterbankTransferRequestDto {
  source_account_id: string;
  target_bank_code: string;
  target_account_number: string;
  amount: number;
  notes?: string;
  pin: string;
}

export interface TransferResponseDto {
  transaction_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  source_account_id?: string;
  source_account_number: string;
  target_account_id?: string;
  target_account_number: string;
  recipient_name?: string;
  amount: number;
  fee: number;
  created_at?: string;
  timestamp?: string;
  reference_number: string;
  notes?: string;
}

