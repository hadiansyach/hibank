import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { RefreshCw, ChevronDown, Landmark } from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { useHistory } from '../hooks/use-history';
import { TransactionItem } from '../../domain/entities/transaction';
import { COLORS } from '@/core/theme/tokens';
import { HistoryFilterBar, HistoryFilterType } from '../components/HistoryFilterBar';
import { TransactionCardItem } from '../components/TransactionCardItem';
import { TransferReceiptModal } from '@/features/transfer/presentation/components/TransferReceiptModal';
import { useAccountStore } from '@/features/accounts/presentation/state/account-store';
import { useAccounts } from '@/features/accounts/presentation/hooks/use-accounts';
import { AccountSwitcherSheet } from '@/features/accounts/presentation/components/AccountSwitcherSheet';
import { OpenAccountModal } from '@/features/accounts/presentation/components/OpenAccountModal';

export const HistoryScreen: React.FC = () => {
  const { data: accounts } = useAccounts();
  const {
    selectedAccountId,
    setSelectedAccountId,
    isAccountSwitcherOpen,
    setAccountSwitcherOpen,
    isOpenAccountModalOpen,
    setOpenAccountModalOpen,
  } = useAccountStore();

  const activeAccount = (accounts || []).find((a) => a.id === selectedAccountId) || accounts?.[0];

  const { data: transactions, isLoading, refetch, isRefetching } = useHistory(activeAccount?.id);
  const [filter, setFilter] = useState<HistoryFilterType>('ALL');

  // Receipt Modal State
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const filteredData = (transactions || []).filter((item) => {
    if (filter === 'IN') return item.type === 'TRANSFER_IN';
    if (filter === 'OUT') return item.type === 'TRANSFER_OUT';
    if (filter === 'TOPUP') return item.type === 'TOPUP';
    return true;
  });

  const handleOpenReceipt = (item: TransactionItem) => {
    setSelectedTxId(item.id);
    setIsReceiptModalOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptModalOpen(false);
    setSelectedTxId(null);
  };

  const formattedAccNumber = activeAccount
    ? activeAccount.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
    : 'Semua Rekening';

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      {/* Header */}
      <View className="px-5 pt-3 pb-1">
        <View className="flex-row items-center justify-between mb-1">
          <View>
            <Text className="text-[20px] font-bold text-on-surface">Riwayat Mutasi</Text>
            <Text className="text-[12px] text-on-surface-variant mt-0.5">
              Catatan pergerakan dana buku besar HiBank
            </Text>
          </View>

          {/* Account Selector Chip */}
          {activeAccount && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAccountSwitcherOpen(true)}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-lowest border border-outline-variant shadow-sm"
            >
              <Landmark size={13} color={COLORS.secondary} />
              <Text className="text-[11px] font-mono font-bold text-on-surface">
                {activeAccount.accountNumber.slice(-4)}
              </Text>
              <ChevronDown size={13} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <HistoryFilterBar activeFilter={filter} onSelectFilter={setFilter} />

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text className="mt-2.5 text-[13px] text-on-surface-variant font-medium">
            Memuat mutasi rekening...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: TransactionItem }) => (
            <TransactionCardItem
              item={item}
              onPress={() => handleOpenReceipt(item)}
            />
          )}
          contentContainerClassName="px-5 pt-2 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={COLORS.secondary}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View className="w-14 h-14 rounded-full bg-surface-low items-center justify-center mb-3 border border-outline-variant">
                <RefreshCw size={24} color={COLORS.onSurfaceVariant} />
              </View>
              <Text className="text-[15px] font-bold text-on-surface">Belum Ada Mutasi</Text>
              <Text className="text-[12px] text-on-surface-variant mt-1 text-center px-6">
                Transaksi keuangan pada rekening ini akan tampil secara real-time.
              </Text>
            </View>
          }
        />
      )}

      {/* Account Switcher Bottom Sheet */}
      <AccountSwitcherSheet
        visible={isAccountSwitcherOpen}
        accounts={accounts || []}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
        onOpenNewAccount={() => setOpenAccountModalOpen(true)}
        onClose={() => setAccountSwitcherOpen(false)}
      />

      {/* Open Account Modal */}
      <OpenAccountModal
        visible={isOpenAccountModalOpen}
        currentCount={accounts?.length || 0}
        onSuccess={(newAcc) => {
          setSelectedAccountId(newAcc.id);
          void refetch();
        }}
        onClose={() => setOpenAccountModalOpen(false)}
      />

      {/* Official Electronic Transfer Receipt Modal */}
      <TransferReceiptModal
        visible={isReceiptModalOpen}
        transactionId={selectedTxId}
        onClose={handleCloseReceipt}
      />
    </ScreenContainer>
  );
};
