This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **React Navigation (v7)** for all multiplatform navigation to keep screen routing decoupled within Clean Architecture feature layers (`src/features/<feature>/presentation/`).
- Mount `<NavigationContainer>` strictly at the application root (`App.tsx`) wrapping `<RootNavigator />` to guarantee continuous navigation context from frame 0.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## UI & Design System

- **MANDATORY REFERENCE**: Strictly follow designs from `mobile/.agents/ui` ("Calm Confidence" design system).
- **Light Mode Exclusively**: Canvas surface `#FAF9F6`, elevated cards `#FFFFFF`, signature brand indigo `#6654D9`, soft lavender `#EAE7FB`, dark charcoal text `#282734`, muted labels `#747280`.
- **NativeWind v4 Dynamic Styling Guardrail**: NEVER use dynamic classes that inject CSS variables (e.g. `shadow-*`) or pseudo-classes (`transition-*`) conditionally on `View`/`TextInput` inside `className` (e.g. `isFocused ? '... shadow-sm' : '...'`). This triggers NativeWind development upgrade warnings which traverse React props and crash with navigation context errors. Instead, keep `className` static and apply dynamic focus/error borders via inline `style`:
  ```tsx
  className="flex-row items-center px-4 h-[52px] rounded-xl bg-white"
  style={{
    borderWidth: hasError || isFocused ? 2 : 1,
    borderColor: hasError ? '#BA1A1A' : isFocused ? '#6654D9' : '#E5E2E9',
  }}
  ```

## Security & Cryptography

- **Argon2id Hashing**: Client-side hashing (`@noble/hashes`) must produce raw hexadecimal digests with strictly NO prefix (`$argon2id$...`) and NO suffix.
- **Session Persistence**: Use `expo-secure-store` for hardware-backed token storage on iOS Keychain and Android KeyStore.

## Data & Validation

- Always synchronize API DTOs and Zod response schemas against `go-backend/api/openapi.yaml` (e.g. handling `session_token` / `access_token` in `SessionResponse`).

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
