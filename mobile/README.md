# HiBank Mobile App (React Native & Expo Prebuild)

Aplikasi client mobile banking modern untuk **HiBank Core API (Bank A Go Monolith)**, dibangun dengan **React Native**, **Expo Prebuild (Continuous Native Generation / CNG)**, arsitektur **Feature-First + Clean Architecture 3-Layer (Domain, Data, Presentation)**, state management **TanStack Query + Zustand**, UI styling **NativeWind v4 (Tailwind CSS)**, dan **Full Banking Security Baseline**.

---

## 1. Arsitektur & Struktur Folder

Proyek ini menerapkan **Clean Architecture** yang terisolasi per fitur (**Feature-First**) dengan pola **Thin Route Adapter** menggunakan Expo Router. Seluruh bisnis logic, state, dan UI murni berada di dalam `src/`, sedangkan folder `app/` hanya berfungsi sebagai registrasi rute URL yang sangat tipis.

```text
mobile/
├── android/                             # Generated via Expo Prebuild (CNG)
├── ios/                                 # Generated via Expo Prebuild (CNG)
├── app/                                 # Expo Router Thin Route Adapters
│   ├── _layout.tsx                      # Root layout: Providers, PrivacyMask, InactivityTracker
│   ├── (auth)/                          # Route group untuk Guest / Authentication
│   │   ├── _layout.tsx
│   │   ├── login.tsx                    # -> src/features/auth/presentation/screens/LoginScreen
│   │   └── register.tsx                 # -> src/features/auth/presentation/screens/RegisterScreen
│   ├── (tabs)/                          # Route group untuk Authenticated Main Tabs
│   │   ├── _layout.tsx                  # Bottom navigation bar
│   │   ├── index.tsx                    # -> src/features/dashboard/presentation/screens/DashboardScreen
│   │   ├── history.tsx                  # -> src/features/history/presentation/screens/HistoryScreen
│   │   └── profile.tsx                  # -> src/features/profile/presentation/screens/ProfileScreen
│   ├── transfer/
│   │   └── index.tsx                    # -> src/features/transfer/presentation/screens/TransferScreen
│   └── topup/
│       └── index.tsx                    # -> src/features/topup/presentation/screens/TopupScreen
├── src/
│   ├── core/                            # Fondasi lintas fitur (Shared Core)
│   │   ├── config/                      # Host dinamis (iOS/macOS vs Android emulator), timeout, keys
│   │   ├── errors/                      # AppError model sesuai format JSON Go backend
│   │   ├── network/                     # Axios instance: Bearer token, X-Request-ID, Idempotency-Key
│   │   ├── security/                    # Modul keamanan perbankan
│   │   │   ├── secure-storage.ts        # Hardware-backed SecureStore (iOS Keychain / Android Keystore)
│   │   │   ├── screen-shield.ts         # Anti-screenshot & anti-screen recording (FLAG_SECURE)
│   │   │   ├── privacy-mask.tsx         # Privacy overlay saat app masuk ke App Switcher/background
│   │   │   ├── inactivity-tracker.tsx   # Auto-logout inaktivitas 15 menit (sliding session)
│   │   │   └── device-integrity.ts     # Baseline deteksi root/jailbreak & tampering
│   │   └── components/                  # Atomic design UI: Button, Input, Card, Badge, ScreenContainer
│   └── features/                        # Modul perbankan (Feature-First)
│       ├── auth/                        # Registrasi, Login, Biometrik, Sesi
│       │   ├── domain/                  # Entities, IAuthRepository, UseCases (Login, Register, Logout)
│       │   ├── data/                    # DTOs, AuthRemoteDataSource, AuthRepositoryImpl
│       │   ├── di/                      # Dependency injection factory
│       │   └── presentation/            # LoginScreen, RegisterScreen, useAuthStore (Zustand)
│       ├── accounts/                    # Manajemen Rekening & Saldo
│       │   ├── domain/                  # Entity Account, IAccountRepository, GetAccountsUseCase
│       │   ├── data/                    # AccountDto, AccountRemoteDataSource, AccountRepositoryImpl
│       │   ├── di/                      # account-factory
│       │   └── presentation/            # useAccounts (TanStack Query), AccountCard
│       ├── transfer/                    # Transfer Sesama & Antar Bank
│       │   ├── domain/                  # Entity Transfer, ITransferRepository, ExecuteTransferUseCase
│       │   ├── data/                    # TransferDto, TransferRemoteDataSource, TransferRepositoryImpl
│       │   ├── di/                      # transfer-factory
│       │   └── presentation/            # useTransfer (useMutation + query invalidation), TransferScreen
│       ├── history/                     # Riwayat Mutasi Rekening (Double-entry Ledger)
│       │   ├── domain/                  # Entity TransactionItem, IHistoryRepository, GetHistoryUseCase
│       │   ├── data/                    # TransactionDto, HistoryRemoteDataSource, HistoryRepositoryImpl
│       │   ├── di/                      # history-factory
│       │   └── presentation/            # useHistory (TanStack Query), HistoryScreen
│       ├── dashboard/                   # Beranda nasabah & quick actions
│       ├── topup/                       # Top Up saldo (Midtrans Sandbox integration)
│       └── profile/                     # Profil nasabah & security settings
├── app.json                             # Expo CNG config plugins (Biometrics, SecureStore, etc.)
├── global.css                           # Tailwind CSS directives
├── tailwind.config.js                   # HiBank brand design tokens (Colors, Typography, Spacing)
└── package.json
```

---

## 2. Fitur Keamanan Perbankan (Security Concern Baseline)

1. **Hardware-Backed Secure Storage:**
   - Token sesi (`session_token`, `refresh_token`) dan flag preferensi biometrik disimpan menggunakan `expo-secure-store`.
   - Menggunakan **iOS Keychain** (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) dan **Android KeyStore + EncryptedSharedPreferences** sehingga token tidak pernah disimpan dalam plaintext atau `AsyncStorage` biasa.
2. **Screen Shield (Anti-Screenshot & Anti-Screen Recording):**
   - Layar transaksi, otorisasi PIN, dan kredensial diamankan dengan `expo-screen-capture` (Android `FLAG_SECURE`).
   - Mencegah penangkapan layar atau perekaman layar oleh malware / spyware di perangkat.
3. **Privacy Mask (App Switcher Shield):**
   - Komponen `PrivacyMask` mendengarkan perubahan status aplikasi (`AppState`).
   - Ketika aplikasi berpindah ke background atau menu *Multitask / App Switcher*, tampilan aplikasi secara otomatis ditutupi oleh layer keamanan opaque HiBank sehingga angka saldo dan nomor rekening tidak terekam dalam snapshot thumbnail sistem operasi.
4. **Auto-Logout Inaktivitas 15 Menit:**
   - Mengikuti aturan keamanan sliding session backend (`expires_in: 900`).
   - `InactivityProvider` memantau sentuhan pengguna di seluruh aplikasi dan timestamp backgrounding. Jika tidak ada aktivitas selama 15 menit, sesi lokal langsung dicabut dan diarahkan ke layar login.
5. **Idempotency-Key & Tracing Interceptor:**
   - Network client secara otomatis menyuntikkan header `X-Request-ID` (UUIDv4) untuk pelacakan log terstruktur (`slog`).
   - Setiap mutasi finansial (`POST /v1/transfer/*`, `POST /v1/topup/*`) otomatis mendapatkan header `Idempotency-Key` (UUIDv4) untuk mencegah transaksi ganda jika terjadi timeout jaringan.
6. **Autentikasi Biometrik (FIDO / Local Authentication):**
   - Terintegrasi dengan Face ID, Touch ID, dan Android BiometricPrompt dengan deskripsi izin perbankan resmi.
7. **Deteksi Integritas Perangkat (Device Integrity):**
   - Pengecekan baseline terhadap environment compromised, re-signed APK, dan status developer debugging.

---

## 3. Integrasi ke Go Backend (`go-backend`)

Aplikasi secara cerdas mengarahkan URL API sesuai platform pengembangan:
- **Android Emulator:** Menggunakan `http://10.0.2.2:8080` (alias loopback host machine).
- **iOS Simulator & macOS:** Menggunakan `http://localhost:8080`.
- **Custom / Device Fisik:** Cukup tentukan variabel lingkungan `EXPO_PUBLIC_API_URL=http://<IP_KOMPUTER>:8080`.

---

## 4. Perintah Pengembangan

Navigasi ke direktori `mobile`:
```bash
cd mobile
```

### Menjalankan Typecheck
```bash
npm run typecheck
```

### Menjalankan Metro Bundler
```bash
npm start
```

### Menjalankan di Native Emulator
```bash
npm run android    # Menjalankan build native Android
npm run ios        # Menjalankan build native iOS (khusus macOS)
```

### Meregenerasi Native Project (Expo Prebuild / CNG)
```bash
npm run prebuild:clean
```

