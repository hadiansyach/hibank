export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CHECKING' | string;
  balance: number; // Stored in rupiah (BIGINT)
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  balance: number;
  formattedBalance: string;
}

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

