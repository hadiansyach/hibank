import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldCheck, User } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { Input } from '@/core/components/Input';
import { COLORS } from '@/core/theme/tokens';

const POPULAR_BANKS = ['HiBank', 'BCA', 'Mandiri', 'BRI'];

interface RecipientInquiryCardProps {
  selectedBank: string;
  onSelectBank: (bank: string) => void;
  accountNumber: string;
  onChangeAccountNumber: (val: string) => void;
  recipientName: string;
}

export const RecipientInquiryCard: React.FC<RecipientInquiryCardProps> = ({
  selectedBank,
  onSelectBank,
  accountNumber,
  onChangeAccountNumber,
  recipientName,
}) => {
  return (
    <Card className="p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">
          Tujuan Transfer
        </Text>
        <TouchableOpacity onPress={() => onChangeAccountNumber('1088291040')}>
          <Text className="text-[12px] font-semibold text-secondary">Daftar Tersimpan</Text>
        </TouchableOpacity>
      </View>

      {/* Bank Select Tabs */}
      <View className="flex-row gap-2 mb-3.5">
        {POPULAR_BANKS.map((bank) => {
          const isActive = selectedBank === bank;
          return (
            <TouchableOpacity
              key={bank}
              className={`flex-1 py-2.5 rounded-control border items-center justify-center ${
                isActive
                  ? 'bg-surface-container border-secondary shadow-sm'
                  : 'bg-surface-low border-outline-variant'
              }`}
              onPress={() => onSelectBank(bank)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-[12px] font-bold ${
                  isActive ? 'text-secondary' : 'text-on-surface-variant'
                }`}
              >
                {bank}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account Number Input */}
      <Input
        label="Nomor Rekening Penerima"
        placeholder="Ketik nomor rekening"
        keyboardType="number-pad"
        value={accountNumber}
        onChangeText={onChangeAccountNumber}
        leftIcon={<User size={18} color={COLORS.onSurfaceVariant} />}
      />

      {/* Verified Inquiry Banner */}
      {recipientName ? (
        <View className="flex-row items-center gap-2.5 bg-success-container border border-success/20 p-3 rounded-xl mt-1">
          <View className="w-7 h-7 rounded-full bg-success/20 items-center justify-center">
            <ShieldCheck size={16} color={COLORS.success} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-success uppercase tracking-wider">
              Rekening Terverifikasi
            </Text>
            <Text className="text-[13px] font-bold text-on-surface">{recipientName}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
};
