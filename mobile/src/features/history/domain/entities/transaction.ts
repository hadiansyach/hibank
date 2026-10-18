export type TransactionType = 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TOPUP';

export interface TransactionItem {
  id: string;
  type: TransactionType;
  title: string;
  subtitle: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
  referenceNumber: string;
}

