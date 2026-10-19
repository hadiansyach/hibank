# hibank Mobile Application

Multiplatform React Native mobile client built with **Clean Architecture** and **Feature-First** structure.

---

## 🛠 Tech Stack & Prerequisites

| Requirement | Technology | Implementation Details |
| :--- | :--- | :--- |
| **Framework** | Expo SDK 58 (TypeScript) | Multiplatform (iOS, Android, Web) with Dev Build support |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Auth session and persistent user store (`src/features/auth/presentation/controllers/useAuthStore.ts`) |
| **Secure Storage** | [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) | Hardware-backed Keychain (iOS) & KeyStore (Android) storage adapter |
| **Styling** | [NativeWind v4](https://www.nativewind.dev/) + [React Native Paper](https://callstack.github.io/react-native-paper/) | Tailwind CSS utility classes + Material Design 3 UI theme |
| **Form Management** | [React Hook Form](https://react-hook-form.com/) | High performance uncontrolled form state |
| **Validation** | [Zod](https://zod.dev/) | Type-safe runtime schemas with `@hookform/resolvers/zod` |
| **Data Fetching** | [TanStack Query v5](https://tanstack.com/query/latest) + Axios | Asynchronous server-state caching, mutations, and interceptors |
| **Hashing** | **Argon2id** (`@noble/hashes`) | **Strictly raw hex output (NO `$argon2id$` prefix, NO PHC suffix)** |
| **Navigation** | [React Navigation v7](https://reactnavigation.org/) | Strongly typed Native Stack + Bottom Tabs |

---

## 🏛 File Architecture

This project strictly follows **Clean Architecture** combined with **Feature-First** modularization:

```text
mobile/
├── App.tsx                     # Application root with Providers (Query, Theme, Navigation)
├── global.css                  # Tailwind CSS root stylesheet
├── tailwind.config.js          # NativeWind preset & theme extensions
├── metro.config.js             # Metro bundler with NativeWind integration
├── babel.config.js             # Babel config with NativeWind & Reanimated plugins
├── tsconfig.json               # Path alias mapping (@/* -> ./src/*)
└── src/
    ├── core/                   # Shared cross-cutting concerns
    │   ├── config/             # App environment variables & parameters
    │   ├── crypto/             # Argon2id raw hashing utility (no prefix/suffix)
    │   ├── storage/            # SecureStore abstraction & key definitions
    │   ├── network/            # Axios API client & TanStack Query configuration
    │   ├── theme/              # React Native Paper MD3 theme
    │   └── navigation/         # RootNavigator & type definitions
    │
    └── features/
        ├── auth/               # Feature: Authentication & Identity
        │   ├── domain/         # Enterprise & application business rules
        │   │   ├── entities/   # Pure domain models (User, AuthSession)
        │   │   ├── repositories/# Abstract repository interfaces (contracts)
        │   │   └── usecases/   # Isolated business operations (Login, Register, HashPin)
        │   ├── data/           # Data access implementations
        │   │   ├── datasources/# Remote API calls & Local SecureStorage
        │   │   ├── models/     # DTOs & Zod schemas with entity mappers
        │   │   └── repositories/# Repository interface implementations
        │   ├── presentation/   # UI & State Presentation layer
        │   │   ├── components/ # Reusable UI components (FormInput, PinPad)
        │   │   ├── controllers/# Zustand stores (useAuthStore)
        │   │   ├── hooks/      # TanStack Query mutation hooks
        │   │   └── screens/    # Screen views (LoginScreen, RegisterScreen, SetPinScreen)
        │   ├── utils/          # Feature utilities & Zod form schemas
        │   ├── hooks/          # Feature facade hook (useAuth)
        │   └── index.ts        # Public API barrel export for the feature
        │
        └── dashboard/          # Feature: Authenticated home & banking overview
            ├── presentation/
            │   └── screens/    # DashboardScreen
            └── index.ts
```

---

## 🔒 Argon2id Hashing Specification

Per the system requirements, Argon2id hashes computed on the client **do not include standard modular crypt format prefixes or suffixes**:

- ❌ Standard PHC: `$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ...$dGhpcyBpcyBhIGhhc2g...`
- ✅ **hibank Output**: `7fb43e622b86847073df52bf026099c190e8fe1f32d55f10afeb4cd3ac613b0e` (pure raw 64-character hexadecimal digest)

### Usage Example:
```typescript
import { hashArgon2idRaw, verifyArgon2idRaw } from '@/core/crypto';

// 1. Generate raw hash
const { rawHashHex, saltHex } = hashArgon2idRaw('123456');

// 2. Verify against target
const isValid = verifyArgon2idRaw('123456', saltHex, rawHashHex);
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Run the application
```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator / device
npm run android

# Run in Web browser
npm run web
```

### 3. Type Checking
```bash
npx tsc --noEmit
```
