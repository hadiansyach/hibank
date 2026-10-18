import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { Button } from '@/core/components/Button';
import { TransferResult } from '../../domain/entities/transfer';
import { formatRupiah } from '@/features/accounts/domain/entities/account';
import { COLORS } from '@/core/theme/tokens';

interface TransferSuccessCardProps {
  result: TransferResult;
  onDone: () => void;
  onViewReceipt?: () => void;
}

export const TransferSuccessCard: React.FC<TransferSuccessCardProps> = ({
  result,
  onDone,
  onViewReceipt,
}) => {
  return (
    <Card className="items-center p-6 mt-4">
      <View className="w-16 h-16 rounded-full bg-success-container items-center justify-center mb-4">
        <CheckCircle2 size={36} color={COLORS.success} />
      </View>
      <Text className="text-[20px] font-extrabold text-on-surface tracking-tight mb-1 text-center">
        Transfer Berhasil!
      </Text>
      <Text className="text-[13px] text-on-surface-variant text-center mb-6">
        Dana telah berhasil dikirimkan ke rekening tujuan secara instan.
      </Text>

      {/* Nominal */}
      <View className="bg-surface-low rounded-2xl p-4 w-full mb-6 border border-outline-variant">
        <Text className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-center mb-1">
          Total Dana Ditransfer
        </Text>
        <Text className="text-[26px] font-black text-on-surface text-center font-mono">
          {formatRupiah(result.amount)}
        </Text>

        <View className="border-t border-outline-variant/60 my-3" />

        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-[12px] text-on-surface-variant">No. Referensi</Text>
            <Text className="text-[12px] font-bold text-on-surface font-mono">
              {result.referenceNumber}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[12px] text-on-surface-variant">Biaya Layanan</Text>
            <Text className="text-[12px] font-bold text-success">
              {result.fee > 0 ? formatRupiah(result.fee) : 'Rp 0 (BI-FAST)'}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[12px] text-on-surface-variant">Waktu</Text>
            <Text className="text-[12px] font-bold text-on-surface">
              {new Date(result.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>

      <View className="w-full gap-2.5">
        {onViewReceipt ? (
          <Button
            title="Lihat Bukti Transfer Resmi"
            variant="outline"
            onPress={onViewReceipt}
            className="w-full"
          />
        ) : null}
        <Button
          title="Kembali ke Beranda"
          variant="primary"
          onPress={onDone}
          className="w-full"
        />
      </View>
    </Card>
  );
};
