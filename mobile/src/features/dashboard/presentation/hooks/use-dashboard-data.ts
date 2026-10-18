import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ToastAndroid, Platform, Alert } from 'react-native';
import { useAuthStore } from '@/features/auth/presentation/state/auth-store';
import { useAccounts } from '@/features/accounts/presentation/hooks/use-accounts';
import { useAccountStore } from '@/features/accounts/presentation/state/account-store';
import { useHistory } from '@/features/history/presentation/hooks/use-history';
import { Account, formatRupiah } from '@/features/accounts/domain/entities/account';
import { TransactionItem } from '@/features/history/domain/entities/transaction';
import { COLORS } from '@/core/theme/tokens';

export interface ReadyUserProfile {
  greeting: string;
  initials: string;
  idNasabah: string;
  isActive: boolean;
}

export interface ReadyAccount {
  id?: string;
  accountTypeLabel: string;
  accountCountLabel: string;
  accountNumber: string;
  displayBalance: string;
  isBalanceVisible: boolean;
  totalAccounts: number;
}

export interface ReadyContact {
  id: string;
  initials: string;
  name: string;
  bank: string;
  accountNumber: string;
  avatarBgColor: string;
  avatarTextColor: string;
}

export interface ReadyMutation {
  id: string;
  title: string;
  timeLabel: string;
  amountLabel: string;
  statusLabel: string;
  isCredit: boolean;
  iconBgColor: string;
  iconColor: string;
  amountColor: string;
  statusColor: string;
}

export function useDashboardData() {
  const router = useRouter();
  const { user, logout, updatePin } = useAuthStore();
  const {
    data: accounts,
    isLoading: isAccountsLoading,
    refetch: refetchAccounts,
    isRefetching: isRefetchingAccounts,
  } = useAccounts();

  const {
    selectedAccountId,
    setSelectedAccountId,
    isAccountSwitcherOpen,
    setAccountSwitcherOpen,
    isOpenAccountModalOpen,
    setOpenAccountModalOpen,
  } = useAccountStore();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // 1. Determine active account (from store or default to first account)
  const primaryAccount = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    if (selectedAccountId) {
      const found = accounts.find((a) => a.id === selectedAccountId);
      if (found) return found;
    }
    return accounts[0];
  }, [accounts, selectedAccountId]);

  // Sync selected account id when accounts arrive
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  const {
    data: history,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useHistory(primaryAccount?.id);

  // 2. Ready User Profile Data
  const readyUser: ReadyUserProfile = useMemo(() => {
    const fullName = user?.fullName || 'Nasabah HiBank';
    const firstName = fullName.split(' ')[0];
    const greeting = `Selamat datang, ${firstName}`;

    const parts = fullName.trim().split(' ');
    let initials = 'HB';
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }

    return {
      greeting,
      initials,
      idNasabah: `ID Nasabah: ${user?.id ? user.id.slice(0, 8).toUpperCase() : 'HB-NEW'}`,
      isActive: true,
    };
  }, [user]);

  // 3. Ready Account Data
  const readyAccount: ReadyAccount = useMemo(() => {
    const hasAccount = !!primaryAccount;
    const rawBalance = primaryAccount?.balance ?? 0;
    const rawNumber = primaryAccount?.accountNumber ?? '';
    const formattedNumber = hasAccount
      ? rawNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
      : 'Belum Ada Rekening';

    let balanceText = '••••••••••••';
    if (isBalanceVisible) {
      balanceText = hasAccount ? formatRupiah(rawBalance) : 'Rp 0';
    }

    const typeLabel = hasAccount
      ? (primaryAccount.accountType === 'GIRO' ? 'HiBank Giro' : 'HiBank Tabungan')
      : 'Belum Ada Rekening';
    const totalCount = accounts ? accounts.length : 0;
    const countLabel = totalCount > 0
      ? `${totalCount} Rekening Aktif`
      : '0 Rekening Aktif';

    return {
      id: primaryAccount?.id,
      accountTypeLabel: typeLabel,
      accountCountLabel: countLabel,
      accountNumber: formattedNumber,
      displayBalance: balanceText,
      isBalanceVisible,
      totalAccounts: totalCount,
    };
  }, [primaryAccount, accounts, isBalanceVisible]);

  // 3. Ready Contacts for "Transfer Cepat"
  const readyContacts: ReadyContact[] = useMemo(() => {
    return [
      {
        id: 'contact-1',
        initials: 'SR',
        name: 'Siti Rahma',
        bank: 'HiBank',
        accountNumber: '1088291040',
        avatarBgColor: 'bg-surface-variant',
        avatarTextColor: 'text-primary',
      },
      {
        id: 'contact-2',
        initials: 'BS',
        name: 'Budi S.',
        bank: 'HiBank',
        accountNumber: '1081234568',
        avatarBgColor: 'bg-secondary-fixed',
        avatarTextColor: 'text-secondary',
      },
    ];
  }, []);

  // 4. Ready Recent Mutations
  const readyMutations: ReadyMutation[] = useMemo(() => {
    if (history && history.length > 0) {
      return history.slice(0, 5).map((item: TransactionItem) => {
        const isCredit = item.type === 'TRANSFER_IN' || item.type === 'TOPUP';
        const formattedAmount = formatRupiah(item.amount);

        let iconBg = 'bg-surface-low border border-outline-variant';
        let iconColor: string = COLORS.primaryContainer;
        let amountText = `-${formattedAmount}`;
        let statusText = 'Berhasil';
        let amountColor = 'text-on-surface font-bold font-mono';
        let statusColor = 'text-on-surface-variant';

        if (isCredit) {
          iconBg = 'bg-success-container';
          iconColor = COLORS.success;
          amountText = `+${formattedAmount}`;
          statusText = 'Masuk';
          amountColor = 'text-success font-bold font-mono';
          statusColor = 'text-success font-medium';
        }

        const dateObj = new Date(item.createdAt);
        const timeLabel = isNaN(dateObj.getTime())
          ? item.createdAt
          : dateObj.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

        return {
          id: item.id,
          title: item.title,
          timeLabel,
          amountLabel: amountText,
          statusLabel: statusText,
          isCredit,
          iconBgColor: iconBg,
          iconColor,
          amountColor,
          statusColor,
        };
      });
    }

    return [];
  }, [history]);

  // Actions
  const toggleBalance = () => {
    setIsBalanceVisible((prev) => !prev);
  };

  const copyAccountNumber = () => {
    if (!primaryAccount) return;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Nomor rekening berhasil disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Tersalin', 'Nomor rekening berhasil disalin ke clipboard.');
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchAccounts(), refetchHistory()]);
  };

  const navigateToTransfer = (targetAccount?: string) => {
    if (targetAccount) {
      router.push({ pathname: '/transfer', params: { target: targetAccount } });
    } else {
      router.push('/transfer');
    }
  };

  const navigateToTopup = () => {
    router.push('/topup');
  };

  const navigateToHistory = () => {
    router.push('/(tabs)/history');
  };

  const navigateToProfile = () => {
    router.push('/(tabs)/profile');
  };

  const handleOpenAccount = () => {
    setOpenAccountModalOpen(true);
  };

  const handleSelectAccount = (acc: Account) => {
    setSelectedAccountId(acc.id);
  };

  const handleAccountCreated = (newAcc: Account) => {
    setSelectedAccountId(newAcc.id);
    void refetchAccounts();
  };

  const handleSaveInitialPin = async (pin: string) => {
    await updatePin(pin);
    setIsPinModalOpen(false);
    if (Platform.OS === 'android') {
      ToastAndroid.show('PIN transaksi berhasil dibuat!', ToastAndroid.SHORT);
    } else {
      Alert.alert('PIN Berhasil Dibuat', 'PIN Anda telah aktif untuk otorisasi transfer.');
    }
  };

  const handleOpenReceipt = (transactionId: string) => {
    setSelectedReceiptId(transactionId);
    setIsReceiptModalOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceiptId(null);
  };

  return {
    readyUser,
    readyAccount,
    readyContacts,
    readyMutations,
    accountsList: accounts || [],
    selectedAccountId: primaryAccount?.id || null,
    isLoading: isAccountsLoading || isHistoryLoading,
    isRefreshing: isRefetchingAccounts,
    toggleBalance,
    copyAccountNumber,
    handleRefresh,
    navigateToTransfer,
    navigateToTopup,
    navigateToHistory,
    navigateToProfile,
    handleLogout: logout,
    handleOpenAccount,
    handleSelectAccount,
    handleAccountCreated,
    // Multi-Account switcher
    isAccountSwitcherOpen,
    setAccountSwitcherOpen,
    // Open Account Modal
    isOpenAccountModalOpen,
    setOpenAccountModalOpen,
    // Security PIN setup
    isPinAlertVisible: !!user && !user.hasPin,
    isPinModalOpen,
    setIsPinModalOpen,
    handleSaveInitialPin,
    // Transfer Receipt Modal
    isReceiptModalOpen,
    selectedReceiptId,
    handleOpenReceipt,
    handleCloseReceipt,
  };
}
