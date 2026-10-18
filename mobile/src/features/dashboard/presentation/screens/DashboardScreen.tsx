import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { COLORS } from '@/core/theme/tokens';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { UserProfileGreetingCard } from '../components/UserProfileGreetingCard';
import { HeroAccountCard } from '../components/HeroAccountCard';
import { QuickActionsRow } from '../components/QuickActionsRow';
import { TransferCepatSection } from '../components/TransferCepatSection';
import { MutasiTerakhirSection } from '../components/MutasiTerakhirSection';
import { SecurityPinAlertBanner } from '../components/SecurityPinAlertBanner';
import { AccountSwitcherSheet } from '@/features/accounts/presentation/components/AccountSwitcherSheet';
import { OpenAccountModal } from '@/features/accounts/presentation/components/OpenAccountModal';
import { TransferReceiptModal } from '@/features/transfer/presentation/components/TransferReceiptModal';
import { PinEditorModal } from '@/features/profile/presentation/components/PinEditorModal';

export const DashboardScreen: React.FC = () => {
  const {
    readyUser,
    readyAccount,
    readyContacts,
    readyMutations,
    accountsList,
    selectedAccountId,
    isRefreshing,
    toggleBalance,
    copyAccountNumber,
    handleRefresh,
    navigateToTransfer,
    navigateToTopup,
    navigateToHistory,
    navigateToProfile,
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
    isPinAlertVisible,
    isPinModalOpen,
    setIsPinModalOpen,
    handleSaveInitialPin,
    // Transfer Receipt Modal
    isReceiptModalOpen,
    selectedReceiptId,
    handleOpenReceipt,
    handleCloseReceipt,
  } = useDashboardData();

  return (
    <ScreenContainer
      topInsetBackgroundColor={COLORS.surfaceLowest}
      backgroundColor={COLORS.canvas}
      barStyle="dark"
    >
      {/* 1. Fixed Top App Bar */}
      <DashboardTopBar
        onNotificationPress={navigateToHistory}
        onProfilePress={navigateToProfile}
      />

      {/* 2. Main Scrollable Dashboard Content */}
      <ScrollView
        contentContainerClassName="px-5 pt-3 pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={COLORS.secondary}
          />
        }
      >
        {/* Top User Greeting Card */}
        <UserProfileGreetingCard
          user={readyUser}
        />

        {/* Security PIN Alert Banner (if user hasn't created a PIN yet) */}
        {isPinAlertVisible && (
          <SecurityPinAlertBanner onSetupPin={() => setIsPinModalOpen(true)} />
        )}

        {/* Hero Account Card */}
        <HeroAccountCard
          account={readyAccount}
          onToggleBalance={toggleBalance}
          onCopyRekening={copyAccountNumber}
          onOpenNewAccount={handleOpenAccount}
          onSelectAccount={() => setAccountSwitcherOpen(true)}
        />

        {/* 3 Columns Quick Actions */}
        <QuickActionsRow
          onTransferPress={() => navigateToTransfer()}
          onTopupPress={navigateToTopup}
          onHistoryPress={navigateToHistory}
        />

        {/* Transfer Cepat Horizontal Carousel */}
        <TransferCepatSection
          contacts={readyContacts}
          onAddNewContact={() => navigateToTransfer()}
          onSelectContact={(acc) => navigateToTransfer(acc)}
          onManageContacts={() => navigateToTransfer()}
        />

        {/* Mutasi Terakhir Container */}
        <MutasiTerakhirSection
          mutations={readyMutations}
          onViewAllPress={navigateToHistory}
          onItemPress={(item) => handleOpenReceipt(item.id)}
        />
      </ScrollView>

      {/* Account Switcher Bottom Sheet */}
      <AccountSwitcherSheet
        visible={isAccountSwitcherOpen}
        accounts={accountsList}
        selectedAccountId={selectedAccountId}
        isBalanceVisible={readyAccount.isBalanceVisible}
        onSelectAccount={handleSelectAccount}
        onOpenNewAccount={() => setOpenAccountModalOpen(true)}
        onClose={() => setAccountSwitcherOpen(false)}
      />

      {/* Open New Account Modal Promax */}
      <OpenAccountModal
        visible={isOpenAccountModalOpen}
        currentCount={accountsList.length}
        onSuccess={handleAccountCreated}
        onClose={() => setOpenAccountModalOpen(false)}
      />

      {/* Initial PIN Setup Modal */}
      <PinEditorModal
        visible={isPinModalOpen}
        hasExistingPin={false}
        onSave={handleSaveInitialPin}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Official Electronic Transfer Receipt Modal */}
      <TransferReceiptModal
        visible={isReceiptModalOpen}
        transactionId={selectedReceiptId}
        onClose={handleCloseReceipt}
      />
    </ScreenContainer>
  );
};
