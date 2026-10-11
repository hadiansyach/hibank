# Panduan Integrasi API: HiBank Mobile Client (React Native / Expo)

Dokumen ini ditujukan untuk tim mobile engineer guna mengintegrasikan aplikasi client (**React Native / Expo**) dengan backend **HiBank Core API**.

---

## 1. Konfigurasi Lingkungan & Base URL

Saat mengembangkan di mesin lokal, gunakan base URL sesuai environment target pengujian:

| Environment | Base URL | Keterangan |
| :--- | :--- | :--- |
| **iOS Simulator** | `http://localhost:8080` | Berjalan pada localhost Mac host |
| **Android Emulator** | `http://10.0.2.2:8080` | IP alias host machine di emulator Android |
| **Physical Device (Expo Go / Dev Build)** | `http://<IP-LAN-KOMPUTER>:8080` | Pastikan HP dan komputer berada di jaringan Wi-Fi yang sama |

### Akun Seed / Demo untuk Testing Lokal
Backend menyediakan data akun siap pakai untuk mempermudah testing mobile app (`make seed`):

| Nama Nasabah | Email | No. Telepon | Password | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Budi Santoso** | `budi@hibank.com` | `081234567890` | `Password123!` | Active |
| **Siti Rahma** | `siti@hibank.com` | `081298765432` | `Password123!` | Active |

---

## 2. Standar Header & Konvensi

### Header Wajib:
* `Content-Type: application/json`
* `Accept: application/json`

### Header Khusus:
* `Authorization: Bearer <access_token>` — Wajib disertakan pada endpoint privat/terproteksi.
* `X-Request-Id: <uuid_v4>` — *(Opsional tapi disarankan)* ID pelacakan request unik dari mobile client untuk kemudahan penelusuran log/audit.
* `Idempotency-Key: <uuid_v4>` — *(Wajib pada mutasi finansial: transfer & topup)* Menghindari transaksi dobel jika terjadi *network drop* atau *retry*.

---

## 3. Format Respons & Penanganan Error

### 3.1. Respons Berhasil
Respons data dikembalikan langsung sebagai objek atau array JSON:
```json
{
  "id": "019488a0-0000-7000-8000-000000000001",
  "full_name": "Ihsan Pratama",
  "email": "ihsan@hibank.com"
}
```

### 3.2. Format Respons Error Standar
Semua respons error (HTTP 4xx & 5xx) memiliki struktur JSON konsisten:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid registration fields",
    "request_id": "c2371e54-cb11-4120-b475-ae9060b5f6da",
    "details": [
      "email format is invalid",
      "password must be at least 8 characters long"
    ]
  }
}
```

### 3.3. Daftar Error Code Umum
| Kode Error | HTTP Status | Penjelasan & Aksi Mobile Client |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | 401 | Header token tidak ditemukan atau format tidak valid. |
| `TOKEN_EXPIRED` | 401 | Access token kedaluwarsa (15 menit). Picu alur silent refresh. |
| `TOKEN_REUSE_DETECTED` | 401 | **Security Alert:** Refresh token sudah pernah digunakan (potensi token leakage). Paksa logout dan arahkan user ke login screen. |
| `INVALID_TOKEN` | 401 | Signature refresh token salah atau tidak dikenal. Paksa logout. |
| `INVALID_CREDENTIALS` | 401 | Email atau password salah. |
| `ACCOUNT_SUSPENDED` | 403 | Akun user dinonaktifkan oleh sistem. |
| `EMAIL_ALREADY_EXISTS` | 409 | Email sudah terdaftar. |
| `PHONE_ALREADY_EXISTS` | 409 | Nomor handphone sudah terdaftar. |
| `VALIDATION_FAILED` | 400 | Validasi form input gagal (baca array `details`). |
| `INTERNAL_ERROR` | 500 | Terjadi kesalahan pada server. |

---

## 4. Alur Manajemen Autentikasi Mobile

### 4.1. Penyimpanan Token yang Aman
> [!IMPORTANT]
> Simpan `session_token` secara aman di enkripsi hardware perangkat:
> * **Expo:** Gunakan `expo-secure-store`.
> * **React Native CLI:** Gunakan `react-native-keychain`.
> * **Dilarang** menyimpan session token di `AsyncStorage` biasa karena tidak terenkripsi.

### 4.2. Siklus Hidup Sesi & Sliding Inactivity Timeout
1. Sistem menggunakan **Opaque Session Token** 256-bit entropy yang dikelola secara efemeral di cache server dengan zero database query pada request transaksi normal.
2. Sesi menerapkan **Sliding Inactivity Timeout** (15 menit) dan batas maksimum absolute session lifetime.
3. Setiap request API terautentikasi yang valid otomatis memperbarui timestamp aktivitas terakhir dan memperpanjang jendela inaktivitas 15 menit.
4. Client dapat memanggil `POST /v1/auth/refresh` untuk memperpanjang jendela sesi secara manual (touch session).
5. Sistem menerapkan **Single Active Session per Perangkat**: login baru pada perangkat yang sama otomatis membatalkan sesi lama perangkat tersebut.
6. Saat logout (`POST /v1/auth/logout`), token sesi langsung dihapus seketika dari cache (instant server-side revocation), dan seluruh pemanggilan berikutnya dengan token tersebut ditolak dengan HTTP 401 Unauthorized (`INVALID_TOKEN`).

---

## 5. Dokumentasi Endpoint (v1)

### 5.1. Health & Konektivitas

#### `GET /healthz`
Mengecek apakah server backend hidup (*Liveness probe*).
* **Autentikasi:** Publik
* **Respons Berhasil (200 OK):**
```json
{
  "status": "ok",
  "service": "bank-a-api"
}
```

#### `GET /readyz`
Mengecek apakah server dan koneksi database siap (*Readiness probe*).
* **Autentikasi:** Publik
* **Respons Berhasil (200 OK):**
```json
{
  "status": "ready",
  "service": "bank-a-api",
  "database": "up"
}
```

---

### 5.2. Modul Autentikasi (`/v1/auth`)

#### `POST /v1/auth/register`
Mendaftarkan akun nasabah baru. Password diamankan dengan algoritma kriptografi Argon2id.
* **Autentikasi:** Publik
* **Request Body:**
```json
{
  "full_name": "Ihsan Pratama",
  "email": "ihsan@hibank.com",
  "phone": "081234567890",
  "password": "SuperSecretPassword123!"
}
```
* **Aturan Validasi Input:**
  * `full_name`: string (2 – 100 karakter).
  * `email`: format email valid RFC 5322.
  * `phone`: nomor seluler standar Indonesia (awalan `08`, `628`, atau `+628`, panjang 10 – 15 digit).
  * `password`: minimal 8 karakter.
* **Respons Berhasil (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Ihsan Pratama",
  "email": "ihsan@hibank.com",
  "phone": "081234567890",
  "status": "active",
  "created_at": "2026-10-10T17:30:00Z"
}
```

---

#### `POST /v1/auth/login`
Melakukan autentikasi dan menerbitkan token sesi opaque 256-bit untuk perangkat nasabah.
* **Autentikasi:** Publik
* **Request Body:**
```json
{
  "email": "ihsan@hibank.com",
  "password": "SuperSecretPassword123!",
  "device_id": "iphone-15-pro-max-uuid"
}
```
* **Respons Berhasil (200 OK):**
```json
{
  "session_token": "8f4e2b109c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  "access_token": "8f4e2b109c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  "token_type": "Bearer",
  "expires_in": 900
}
```

---

#### `POST /v1/auth/refresh`
Memperpanjang jendela inaktivitas sesi (*sliding window touch*).
* **Autentikasi:** Publik / Bearer Token
* **Request Body:**
```json
{
  "session_token": "8f4e2b109c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
}
```
* **Respons Berhasil (200 OK):**
```json
{
  "session_token": "8f4e2b109c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  "token_type": "Bearer",
  "expires_in": 900
}
```

---

#### `POST /v1/auth/logout`
Mencabut token sesi aktif seketika dari cache (server-side instant revocation).
* **Autentikasi:** Header `Authorization: Bearer <token>` atau body JSON
* **Request Body (Opsional jika membawa header):**
```json
{
  "session_token": "8f4e2b109c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
}
```
* **Respons Berhasil (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 6. Contoh Implementasi API Client (TypeScript & Axios)

Berikut template implementasi interceptor di React Native untuk otomatisasi token refresh dan penanganan error:

```typescript
// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  ios: 'http://localhost:8080',
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Injeksi Bearer Token
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Silent Token Refresh & Error Handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Deteksi jika Access Token Kedaluwarsa
    if (
      error.response?.status === 401 &&
      error.response.data?.error?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${BASE_URL}/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Simpan token baru hasil rotasi
        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);

        apiClient.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

        processQueue(null, data.access_token);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Hapus token dan alihkan user ke login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // triggerNavigationToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Deteksi Token Reuse (Security Alert)
    if (
      error.response?.status === 401 &&
      error.response.data?.error?.code === 'TOKEN_REUSE_DETECTED'
    ) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      // triggerSecurityAlertAndForceLogout();
    }

    return Promise.reject(error);
  }
);
```

---

## 7. Roadmap Endpoint Berikutnya (Upcoming)

| Endpoint | Method | Modul / Sprint | Deskripsi |
| :--- | :--- | :--- | :--- |
| `/v1/users/me` | `GET` | Sprint 2 (Profil) | Melihat data profil nasabah login |
| `/v1/users/me/pin` | `PUT` | Sprint 2 (PIN) | Set atau ubah PIN transaksi 6 digit |
| `/v1/accounts` | `POST` | Sprint 3 (Rekening) | Buka rekening tabungan baru |
| `/v1/accounts` | `GET` | Sprint 3 (Rekening) | Daftar rekening tabungan milik nasabah |
| `/v1/accounts/{id}/mutations` | `GET` | Sprint 4 (Mutasi) | Riwayat mutasi dengan cursor pagination |
| `/v1/transfers/inquiry` | `POST` | Sprint 5 (Transfer) | Cek rekening tujuan & nama tersamar |
| `/v1/transfers` | `POST` | Sprint 5 (Transfer) | Eksekusi transfer (wajib PIN & Idempotency-Key) |
| `/v1/topups` | `POST` | Sprint 7 (Topup) | Minta token Snap Midtrans untuk isi saldo |
