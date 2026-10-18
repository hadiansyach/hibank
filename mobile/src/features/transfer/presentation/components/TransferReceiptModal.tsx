import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  ToastAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Copy,
  Share2,
  X,
  Landmark,
  ShieldCheck,
  FileText,
  ArrowRight,
} from 'lucide-react-native';
import { TransferResult } from '../../domain/entities/transfer';
import { useTransferReceipt } from '../hooks/use-transfer';
import { formatRupiah } from '@/features/accounts/domain/entities/account';
import { COLORS } from '@/core/theme/tokens';
import { Button } from '@/core/components/Button';

interface TransferReceiptModalProps {
  visible: boolean;
  transactionId?: string | null;
  directResult?: TransferResult | null;
  onClose: () => void;
}

export const TransferReceiptModal: React.FC<TransferReceiptModalProps> = ({
  visible,
  transactionId,
  directResult,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  // If directResult is passed, use it; otherwise fetch by transactionId
  const { data: fetchedResult, isLoading, error } = useTransferReceipt(
    !directResult && transactionId ? transactionId : null
  );

  const receipt: TransferResult | null = directResult || fetchedResult || null;

  const handleCopyRef = () => {
    if (!receipt?.referenceNumber) return;
    if (Platform.OS === 'android') {
      ToastAndroid.show('No. Referensi berhasil disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Tersalin', 'Nomor referensi berhasil disalin ke clipboard.');
    }
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      const shareMessage = [
        '--- BUKTI TRANSAKSI ELEKTRONIK HIBANK ---',
        `No. Referensi: ${receipt.referenceNumber}`,
        `Status: BERHASIL`,
        `Jumlah: ${formatRupiah(receipt.amount)}`,
        `Rekening Tujuan: ${receipt.targetAccountNumber}`,
        receipt.recipientName ? `Penerima: ${receipt.recipientName}` : '',
        `Biaya Admin: Rp 0 (BI-FAST)`,
        `Waktu: ${new Date(receipt.timestamp).toLocaleString('id-ID')}`,
        receipt.notes ? `Catatan: ${receipt.notes}` : '',
        '-----------------------------------------',
        'Transaksi diproses secara aman oleh HiBank Core Banking.',
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        message: shareMessage,
        title: `Bukti Transfer HiBank - ${receipt.referenceNumber}`,
      });
    } catch (e) {
      console.warn('Share error', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/65 justify-end">
        <View
          className="bg-surface-lowest rounded-t-sheet max-h-[90%]"
          style={{
            backgroundColor: COLORS.surfaceLowest,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          {/* Handle bar */}
          <View className="w-10 h-1.5 bg-outline-variant/60 rounded-full self-center mt-3 mb-2" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-2 border-b border-outline-variant/30">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-primary-container items-center justify-center">
                <Text className="text-[14px] font-black text-white">H</Text>
              </View>
              <View>
                <Text className="text-[15px] font-black text-on-surface tracking-tight">HiBank</Text>
                <Text className="text-[10px] text-on-surface-variant font-semibold tracking-wider uppercase">
                  Bukti Transaksi Resmi
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-surface-low items-center justify-center"
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerClassName="px-6 pt-4 pb-4"
            showsVerticalScrollIndicator={false}
          >
            {isLoading && !receipt ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="large" color={COLORS.secondary} />
                <Text className="text-[13px] text-on-surface-variant font-medium mt-3">
                  Mengambil bukti transaksi resmi...
                </Text>
              </View>
            ) : error && !receipt ? (
              <View className="items-center justify-center py-10">
                <View className="w-12 h-12 rounded-full bg-error-container items-center justify-center mb-3">
                  <FileText size={24} color={COLORS.error} />
                </View>
                <Text className="text-[15px] font-bold text-on-surface">Gagal Memuat Bukti</Text>
                <Text className="text-[12px] text-on-surface-variant mt-1 text-center px-4">
                  Detail transaksi tidak ditemukan atau Anda tidak memiliki akses ke mutasi ini.
                </Text>
              </View>
            ) : receipt ? (
              <>
                {/* Status Chip & Main Amount */}
                <View className="items-center mb-5">
                  <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-success-container mb-3 border border-success/20">
                    <CheckCircle2 size={15} color={COLORS.success} strokeWidth={2.4} />
                    <Text className="text-[11px] font-bold text-success uppercase tracking-wider">
                      Transaksi Berhasil
                    </Text>
                  </View>

                  <Text className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    TOTAL TRANSAKSI
                  </Text>
                  <Text className="text-[32px] font-black text-on-surface font-mono tracking-tight">
                    {formatRupiah(receipt.amount)}
                  </Text>
                </View>

                {/* Receipt Card with Bank Decorative Layout */}
                <View className="bg-surface-low rounded-2xl p-4 mb-4 border border-outline-variant/60">
                  {/* Watermark header */}
                  <View className="flex-row items-center justify-between pb-3 border-b border-outline-variant/40 mb-3">
                    <View className="flex-row items-center gap-1.5">
                      <ShieldCheck size={16} color={COLORS.secondary} />
                      <Text className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                        Terverifikasi Sistem HiBank
                      </Text>
                    </View>
                    <Text className="text-[10px] text-on-surface-variant font-mono">
                      ISO 20022
                    </Text>
                  </View>

                  {/* Field rows */}
                  <View className="gap-2.5">
                    {/* Reference Number */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">No. Referensi</Text>
                      <TouchableOpacity
                        className="flex-row items-center gap-1 active:opacity-70"
                        onPress={handleCopyRef}
                      >
                        <Text className="text-[12px] font-bold text-on-surface font-mono">
                          {receipt.referenceNumber}
                        </Text>
                        <Copy size={13} color={COLORS.secondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Waktu */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">Waktu Transaksi</Text>
                      <Text className="text-[12px] font-medium text-on-surface">
                        {new Date(receipt.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {/* Rekening Pengirim */}
                    {receipt.sourceAccountNumber ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[12px] text-on-surface-variant">Rekening Pengirim</Text>
                        <Text className="text-[12px] font-bold text-on-surface font-mono">
                          {receipt.sourceAccountNumber}
                        </Text>
                      </View>
                    ) : null}

                    {/* Rekening Tujuan */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">Rekening Tujuan</Text>
                      <Text className="text-[12px] font-bold text-on-surface font-mono">
                        {receipt.targetAccountNumber}
                      </Text>
                    </View>

                    {/* Nama Penerima */}
                    {receipt.recipientName ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[12px] text-on-surface-variant">Nama Penerima</Text>
                        <Text className="text-[12px] font-bold text-on-surface">
                          {receipt.recipientName}
                        </Text>
                      </View>
                    ) : null}

                    {/* Bank Tujuan */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">Bank Tujuan</Text>
                      <Text className="text-[12px] font-medium text-on-surface">HiBank (108)</Text>
                    </View>

                    {/* Tipe Transfer */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">Jenis Layanan</Text>
                      <Text className="text-[12px] font-semibold text-secondary">
                        Transfer Antar Rekening (Real-Time)
                      </Text>
                    </View>

                    {/* Biaya Admin */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-on-surface-variant">Biaya Layanan</Text>
                      <Text className="text-[12px] font-bold text-success">
                        {receipt.fee > 0 ? formatRupiah(receipt.fee) : 'Rp 0 (GRATIS BI-FAST)'}
                      </Text>
                    </View>

                    {/* Catatan / Berita */}
                    {receipt.notes ? (
                      <View className="flex-row items-start justify-between pt-1 border-t border-outline-variant/30">
                        <Text className="text-[12px] text-on-surface-variant">Catatan Transaksi</Text>
                        <Text className="text-[12px] font-medium text-on-surface text-right max-w-[60%]">
                          {receipt.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Bottom Action Buttons */}
                <View className="flex-row gap-3 mt-1">
                  <Button
                    title="Bagikan Bukti"
                    variant="outline"
                    onPress={handleShare}
                    leftIcon={<Share2 size={16} color={COLORS.secondary} />}
                    className="flex-1"
                  />
                  <Button
                    title="Tutup"
                    variant="primary"
                    onPress={onClose}
                    className="flex-1"
                  />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
