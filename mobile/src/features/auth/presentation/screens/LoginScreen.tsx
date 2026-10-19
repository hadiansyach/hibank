import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthNavigationProp } from "@/core/navigation/types";
import { CalmInput } from "../components/CalmInput";
import { AuthHeader } from "../components/AuthHeader";
import {
  loginValidationSchema,
  LoginFormValues,
} from "../../utils/authValidators";
import { useLoginMutation } from "../hooks/useLoginMutation";

export function LoginScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const { control, handleSubmit, setValue } = useForm<LoginFormValues>({
    resolver: zodResolver(loginValidationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const fillDemoAccount = () => {
    setValue("email", "budi@hibank.com");
    setValue("password", "Password123!");
    setErrorMessage(null);
  };

  const loginMutation = useLoginMutation();

  const onSubmit = (values: LoginFormValues) => {
    setErrorMessage(null);
    loginMutation.mutate(
      {
        email: values.email,
        password: values.password,
      },
      {
        onError: (error) => {
          setErrorMessage(error.message);
        },
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F6]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Header */}
          <AuthHeader subtitle="Perbankan Tenang" />

          {/* Hero Editorial Greeting */}
          <View className="mt-2 mb-6">
            <Text className="text-[28px] font-bold text-[#282734] tracking-tight leading-tight">
              Selamat Datang Kembali
            </Text>
            <Text className="text-[14px] text-[#747280] mt-1.5 leading-relaxed">
              Kelola finansial dan transaksi Anda dengan tenang dan teratur.
            </Text>

            {/* Reassurance Badge Pill */}
            <View className="flex-row items-center mt-3 self-start px-3 py-1.5 rounded-full bg-[#EAE7FB]">
              <Ionicons name="sparkles" size={13} color="#6654D9" />
              <Text className="text-[12px] font-semibold text-[#6654D9] ml-1.5">
                Bebas Biaya Transfer • Enkripsi Berlapis
              </Text>
            </View>
          </View>

          {/* Server Error Alert */}
          {errorMessage && (
            <View className="flex-row items-center mb-5 p-3.5 rounded-2xl bg-[#F7E9E8] border border-[#ffdad6]">
              <Ionicons name="alert-circle" size={18} color="#B85358" />
              <Text className="text-[13px] text-[#B85358] font-medium ml-2.5 flex-1">
                {errorMessage}
              </Text>
              <TouchableOpacity onPress={() => setErrorMessage(null)}>
                <Ionicons name="close" size={16} color="#B85358" />
              </TouchableOpacity>
            </View>
          )}

          {/* Elevated Form Card */}
          <View className="bg-white rounded-3xl p-6 border border-[#E5E2E9] shadow-sm mb-6">
            <CalmInput
              control={control}
              name="email"
              label="Alamat Email"
              placeholder="nama@email.com"
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
            />

            <CalmInput
              control={control}
              name="password"
              label="Kata Sandi"
              placeholder="Masukkan kata sandi"
              leftIcon="lock-closed-outline"
              isPassword
              autoCapitalize="none"
            />

            {/* Remember Me & Forgot Password Row */}
            <View className="flex-row items-center justify-between mt-1 mb-6">
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center"
                activeOpacity={0.7}
              >
                <View
                  className={`w-5 h-5 rounded-md items-center justify-center mr-2 border ${
                    rememberMe
                      ? "bg-[#6654D9] border-[#6654D9]"
                      : "bg-white border-[#E5E2E9]"
                  }`}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  )}
                </View>
                <Text className="text-[13px] text-[#282734] font-medium">
                  Ingat Saya
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("SetPin", { email: "demo@hibank.com" })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-[13px] text-[#6654D9] font-semibold">
                  Lupa Sandi?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => handleSubmit(onSubmit)()}
              disabled={loginMutation.isPending}
              className={`h-[52px] rounded-xl items-center justify-center ${
                loginMutation.isPending
                  ? "bg-[#5142B5]"
                  : "bg-[#6654D9] active:bg-[#5142B5]"
              }`}
              activeOpacity={0.85}
            >
              {loginMutation.isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-semibold text-[15px] ml-2">
                    Memverifikasi...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-semibold text-[15px] tracking-wide">
                    Masuk ke Akun
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                    className="ml-1.5"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Demo Autofill Button */}
            <TouchableOpacity
              onPress={fillDemoAccount}
              className="mt-3.5 h-[46px] rounded-xl bg-[#EAE7FB] flex-row items-center justify-center active:bg-[#dedaf8]"
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={16} color="#6654D9" />
              <Text className="text-[13px] font-semibold text-[#6654D9] ml-2">
                Gunakan Akun Demo (Budi Santoso)
              </Text>
            </TouchableOpacity>

            {/* Soft Alternative Button (PIN / Biometrik / Argon2id Demo) */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("SetPin", { email: "budi@hibank.com" })
              }
              className="mt-2.5 h-[42px] rounded-xl bg-[#EFEDF3] flex-row items-center justify-center active:bg-[#E5E2E9]"
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#515060"
              />
              <Text className="text-[12px] font-semibold text-[#515060] ml-1.5">
                Inspeksi Standar PIN & Argon2id
              </Text>
            </TouchableOpacity>
          </View>

          {/* Registration Switcher */}
          <View className="flex-row justify-center items-center py-2 mb-8">
            <Text className="text-[14px] text-[#747280]">
              Belum memiliki rekening HiBank?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-[14px] font-bold text-[#6654D9]">
                Daftar Sekarang
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compliance & Trust Footnote */}
          <View className="items-center justify-center mt-auto pt-4 border-t border-[#E5E2E9]/60">
            <View className="flex-row items-center space-x-1.5 mb-1">
              <Ionicons name="shield-checkmark" size={14} color="#747280" />
              <Text className="text-[11px] font-medium text-[#747280] ml-1">
                Aman & Terjamin • Diawasi OJK & Peserta Penjaminan LPS
              </Text>
            </View>
            <Text className="text-[10px] text-[#9A98A6]">
              PT Bank Multiplatform Indonesia Tbk.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
