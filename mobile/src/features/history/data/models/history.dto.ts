export interface MutationItemDto {
  id: string;
  transaction_id: string;
  account_id: string;
  direction: 'DB' | 'CR' | string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | string;
  reference_number: string;
  notes: string;
  created_at: string;
}

export interface MutationsResponseDto {
  items: MutationItemDto[];
  next_cursor?: string;
  has_more: boolean;
}

export interface TransactionItemDto {
  id: string;
  type: 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TOPUP';
  title: string;
  subtitle: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  created_at: string;
  reference_number: string;
  direction?: 'DB' | 'CR';
  balanceAfter?: number;
}


