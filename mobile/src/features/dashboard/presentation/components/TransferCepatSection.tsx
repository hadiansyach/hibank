import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { ReadyContact } from '../hooks/use-dashboard-data';
import { COLORS } from '@/core/theme/tokens';

interface TransferCepatSectionProps {
  contacts: ReadyContact[];
  onAddNewContact: () => void;
  onSelectContact: (accountNumber: string) => void;
  onManageContacts: () => void;
}

export const TransferCepatSection: React.FC<TransferCepatSectionProps> = ({
  contacts,
  onAddNewContact,
  onSelectContact,
  onManageContacts,
}) => {
  return (
    <View className="mb-5">
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-[16px] font-bold text-on-surface tracking-tight">
          Transfer Cepat
        </Text>
        <TouchableOpacity onPress={onManageContacts} activeOpacity={0.7}>
          <Text className="text-[13px] font-semibold text-secondary">
            Kelola
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 px-5"
      >
        <View className="flex-row items-center gap-2.5 pb-1">
          {/* Add Target Button */}
          <TouchableOpacity
            className="w-20 py-3 rounded-card bg-surface-lowest border border-outline-variant shadow-sm items-center justify-center active:scale-95"
            onPress={onAddNewContact}
            activeOpacity={0.8}
          >
            <View className="w-11 h-11 rounded-full bg-surface-container items-center justify-center mb-1.5">
              <UserPlus size={20} color={COLORS.onSurfaceVariant} />
            </View>
            <Text className="text-[11px] font-medium text-on-surface-variant text-center">
              Baru
            </Text>
          </TouchableOpacity>

          {/* Contact Cards */}
          {contacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              className="w-24 p-2.5 rounded-card bg-surface-lowest border border-outline-variant shadow-sm items-center justify-center active:scale-95"
              onPress={() => onSelectContact(contact.accountNumber)}
              activeOpacity={0.8}
            >
              <View
                className={`w-11 h-11 rounded-full ${contact.avatarBgColor} items-center justify-center mb-1.5`}
              >
                <Text className={`text-[15px] font-bold ${contact.avatarTextColor}`}>
                  {contact.initials}
                </Text>
              </View>
              <Text
                className="text-[13px] font-semibold text-on-surface text-center w-full"
                numberOfLines={1}
              >
                {contact.name}
              </Text>
              <Text
                className="text-[11px] text-on-surface-variant text-center w-full font-medium"
                numberOfLines={1}
              >
                {contact.bank}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
