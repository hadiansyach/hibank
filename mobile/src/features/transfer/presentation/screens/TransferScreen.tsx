import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { Button } from '@/core/components/Button';
import { PinSheet } from '@/core/components/PinSheet';
import { COLORS } from '@/core/theme/tokens';
import { formatRupiah } from '@/features/accounts/domain/entities/account';
import { useTransferForm } from '../hooks/use-transfer-form';
import { SourceAccountCard } from '../components/SourceAccountCard';
import { RecipientInquiryCard } from '../components/RecipientInquiryCard';
import { NominalInputSection } from '../components/NominalInputSection';
import { TransferSuccessCard } from '../components/TransferSuccessCard';
import { TransferReceiptModal } from '../components/TransferReceiptModal';
import { PinEditorModal } from '@/features/profile/presentation/components/PinEditorModal';

export const TransferScreen: React.FC = () => {
  const router = useRouter();
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const {
    sourceAccount,
    selectedBank,
    setSelectedBank,
    targetAccountNumber,
    handleTargetAccountChange,
    recipientName,
    amount,
    setAmount,
    handleQuickAmount,
    notes,
    setNotes,
    errorMessage,
    isPinModalOpen,
    setIsPinModalOpen,
    isSetupPinModalOpen,
    setIsSetupPinModalOpen,
    handleSaveInitialPin,
    isFormValid,
    isPending,
    isBiometricEnabled,
    transferResult,
    openPinConfirmation,
    executeTransferWithPin,
    executeTransferWithBiometric,
  } = useTransferForm();

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-surface-lowest border border-outline-variant items-center justify-center"
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-on-surface">Transfer Dana</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* If Transfer Succeeded, show receipt */}
        {transferResult ? (
          <TransferSuccessCard
            result={transferResult}
            onDone={() => router.replace('/(tabs)')}
            onViewReceipt={() => setIsReceiptModalOpen(true)}
          />
        ) : (
          <>
            {/* Source Account */}
            <SourceAccountCard account={sourceAccount} />

            {/* Error Banner */}
            {errorMessage && (
              <View className="bg-error-container border border-error/20 p-3 rounded-xl mb-4">
                <Text className="text-[13px] text-error font-medium">{errorMessage}</Text>
              </View>
            )}

            {/* Destination Account */}
            <RecipientInquiryCard
              selectedBank={selectedBank}
              onSelectBank={setSelectedBank}
              accountNumber={targetAccountNumber}
              onChangeAccountNumber={handleTargetAccountChange}
              recipientName={recipientName}
            />

            {/* Nominal & Notes */}
            <NominalInputSection
              amount={amount}
              onChangeAmount={handleQuickAmount}
              notes={notes}
              onChangeNotes={setNotes}
            />

            {/* Main Action CTA */}
            <Button
              title="Lanjut ke Otorisasi PIN"
              variant="primary"
              disabled={!isFormValid}
              onPress={openPinConfirmation}
              rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
            />
          </>
        )}
      </ScrollView>

      {/* Reusable Shared PIN Bottom Sheet */}
      <PinSheet
        visible={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Otorisasi Transfer"
        subtitle={
          <Text className="text-[13px] text-on-surface-variant text-center px-4 leading-5">
            Transfer <Text className="font-bold text-on-surface">{formatRupiah(amount)}</Text> ke{' '}
            <Text className="font-bold text-on-surface">{recipientName}</Text>
          </Text>
        }
        onComplete={executeTransferWithPin}
        isLoading={isPending}
        errorMessage={errorMessage}
        onBiometricPress={executeTransferWithBiometric}
        isBiometricAvailable={isBiometricEnabled}
      />

      {/* First-time PIN setup if user doesn't have a PIN yet */}
      <PinEditorModal
        visible={isSetupPinModalOpen}
        hasExistingPin={false}
        onClose={() => setIsSetupPinModalOpen(false)}
        onSave={handleSaveInitialPin}
      />

      {/* Official Electronic Receipt Modal */}
      <TransferReceiptModal
        visible={isReceiptModalOpen}
        directResult={transferResult}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </ScreenContainer>
  );
};
