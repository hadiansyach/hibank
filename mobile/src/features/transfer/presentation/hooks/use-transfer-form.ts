import { useState, useMemo, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAccounts } from '@/features/accounts/presentation/hooks/use-accounts';
import { useInquiry, useTransfer } from './use-transfer';
import { useAuthStore } from '@/features/auth/presentation/state/auth-store';
import { AppError } from '@/core/errors/app-error';
import { TransferResult } from '../../domain/entities/transfer';

export function useTransferForm() {
  const params = useLocalSearchParams<{ target?: string }>();
  const { data: accounts } = useAccounts();
  const { mutateAsync: transferMutate, isPending: isTransferPending } = useTransfer();
  const { mutateAsync: inquiryMutate, isPending: isInquiryPending } = useInquiry();
  const { isBiometricEnabled, authenticateWithBiometrics, user, updatePin } = useAuthStore();

  const isPending = isTransferPending || isInquiryPending;

  const sourceAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  const [selectedBank, setSelectedBank] = useState('HiBank');
  const [targetAccountNumber, setTargetAccountNumber] = useState(params.target || '');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState<number>(50000);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupPinModalOpen, setIsSetupPinModalOpen] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);

  // If a target parameter was passed (e.g. from Transfer Cepat), run inquiry automatically
  useEffect(() => {
    if (params.target && sourceAccount && params.target.trim().length >= 8) {
      void handleTargetAccountChange(params.target.trim());
    }
  }, [params.target, sourceAccount?.id]);

  // Ready data: form validity
  const isFormValid = useMemo(() => {
    return (
      !!sourceAccount &&
      targetAccountNumber.trim().length >= 8 &&
      amount >= 10000 &&
      amount <= (sourceAccount.balance || 0)
    );
  }, [sourceAccount, targetAccountNumber, amount]);

  const handleQuickAmount = (val: number) => {
    setAmount(val);
  };

  const handleTargetAccountChange = async (val: string) => {
    setTargetAccountNumber(val);
    setErrorMessage(null);

    if (val.trim().length >= 8 && sourceAccount) {
      try {
        const inq = await inquiryMutate({
          sourceAccountId: sourceAccount.id,
          targetAccountNumber: val.trim(),
        });
        setRecipientName(inq.recipientName);
        setErrorMessage(null);
      } catch (err: unknown) {
        setRecipientName('');
        const msg = err instanceof AppError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Nomor rekening tujuan tidak ditemukan.';
        setErrorMessage(msg);
      }
    } else {
      setRecipientName('');
    }
  };

  const openPinConfirmation = async () => {
    setErrorMessage(null);
    if (!sourceAccount) {
      setErrorMessage('Rekening sumber dana tidak ditemukan.');
      return;
    }
    if (amount < 10000) {
      setErrorMessage('Nominal transfer minimum adalah Rp 10.000.');
      return;
    }
    if (amount > sourceAccount.balance) {
      setErrorMessage('Saldo rekening sumber tidak mencukupi.');
      return;
    }
    if (targetAccountNumber.length < 8) {
      setErrorMessage('Nomor rekening tujuan tidak valid.');
      return;
    }

    // Check if user has configured PIN
    if (user && !user.hasPin) {
      setIsSetupPinModalOpen(true);
      return;
    }

    // Run inquiry to get verified recipient name before asking for PIN
    try {
      const inq = await inquiryMutate({
        sourceAccountId: sourceAccount.id,
        targetAccountNumber: targetAccountNumber.trim(),
      });
      setRecipientName(inq.recipientName);
      setIsPinModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Gagal memverifikasi nomor rekening tujuan.';
      setErrorMessage(msg);
    }
  };

  const handleSaveInitialPin = async (newPin: string) => {
    await updatePin(newPin);
    setIsSetupPinModalOpen(false);
    // Proceed to open PIN confirmation now that PIN is configured
    setIsPinModalOpen(true);
  };

  const executeTransferWithPin = async (pin: string) => {
    if (!sourceAccount) return;
    try {
      setErrorMessage(null);
      const result = await transferMutate({
        sourceAccountId: sourceAccount.id,
        targetAccountNumber: targetAccountNumber.trim(),
        amount,
        notes: notes.trim(),
        pin,
      });
      setIsPinModalOpen(false);
      setTransferResult(result);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal memproses transfer. Periksa PIN Anda.');
      }
    }
  };

  const executeTransferWithBiometric = async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        // Prompt user for their PIN to ensure high-security Argon2id verification
        setIsPinModalOpen(true);
      }
    } catch {
      setErrorMessage('Autentikasi biometrik dibatalkan.');
    }
  };

  return {
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
    setErrorMessage,
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
  };
}
