export type TransferType = 'INTERNAL' | 'INTERBANK';

export interface TransferRequest {
  sourceAccountId: string;
  targetAccountNumber: string;
  targetBankCode?: string; // Optional for internal bank transfers
  amount: number; // Rupiah integer (BIGINT)
  notes?: string;
  pin: string; // 6-digit transaction PIN
  idempotencyKey?: string;
}

export interface InquiryResult {
  sourceAccountId: string;
  targetAccountNumber: string;
  recipientName: string;
  bankCode: string;
  bankName: string;
  fee: number;
}

export interface TransferResult {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  sourceAccountNumber: string;
  targetAccountNumber: string;
  recipientName?: string;
  amount: number;
  fee: number;
  timestamp: string;
  referenceNumber: string;
  notes?: string;
}

