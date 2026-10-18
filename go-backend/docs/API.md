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

### 3.3. Daftar Error Code Lengkap & Aksi Mobile Client
| Kode Error | HTTP Status | Penjelasan Penyebab | Aksi yang Harus Diambil Mobile Client |
| :--- | :---: | :--- | :--- |
| `UNAUTHORIZED` | 401 | Header token tidak ditemukan, format salah, atau user context kosong. | Arahkan pengguna ke layar Login. |
| `TOKEN_EXPIRED` | 401 | Sesi tidak aktif lebih dari 15 menit (*sliding timeout*) atau melebihi *absolute lifetime*. | Hapus token lokal, tampilkan modal "Sesi Berakhir", arahkan ke Login / Re-autentikasi Biometrik. |
| `INVALID_TOKEN` | 401 | Token sesi tidak valid, rusak, atau telah di-*revoke* (logout / login perangkat baru). | Hapus token dari SecureStore, arahkan ke Login. |
| `INVALID_CREDENTIALS` | 401 | Email atau password yang dimasukkan salah saat login. | Tampilkan pesan inline error pada formulir login. |
| `ACCOUNT_SUSPENDED` | 403 | Akun nasabah berstatus `suspended` / nonaktif. | Blokir navigasi, tampilkan layar "Hubungi Customer Support". |
| `RATE_LIMIT_EXCEEDED` | 429 | Melebihi kuota request (Login: 10 req/menit, Transfer: 30 req/menit). | Baca header respons `Retry-After`, tampilkan hitung mundur (*cooldown*), nonaktifkan tombol submit. |
| `EMAIL_ALREADY_EXISTS` | 409 | Email sudah terdaftar pada akun lain. | Tampilkan pesan error pada field email registrasi. |
| `PHONE_ALREADY_EXISTS` | 409 | Nomor telepon sudah terdaftar pada akun lain. | Tampilkan pesan error pada field nomor handphone registrasi. |
| `VALIDATION_FAILED` | 400 | Validasi input formulir gagal (baca array `details`). | Petakan pesan error ke masing-masing input field terkait. |
| `USER_NOT_FOUND` | 404 | Profil pengguna tidak ditemukan di database. | Logout dan bersihkan storage lokal. |
| `INVALID_PIN_FORMAT` | 400 | Format PIN tidak tepat 6 karakter numerik (`^[0-9]{6}$`). | Tampilkan peringatan "PIN harus berupa 6 digit angka". |
| `OLD_PIN_REQUIRED` | 400 | Akun sudah memiliki PIN aktif tetapi `old_pin` atau `password` kosong saat update PIN. | Minta user memasukkan PIN lama sebelum menyetel PIN baru. |
| `PIN_MISMATCH` | 401 | PIN lama atau password verifikasi salah saat update PIN. | Tampilkan error "PIN lama atau password tidak sesuai". |
| `INVALID_PIN` | 401 | PIN transaksi salah saat eksekusi transfer dana. | Tampilkan error pada keypad PIN modal dan sisa kesempatan mencoba. |
| `PIN_NOT_CONFIGURED` | 400 | Nasabah belum menyetel PIN transaksi pada akun mereka. | Buka bottom sheet / dialog "Buat PIN Transaksi Terlebih Dahulu". |
| `PIN_LOCKED` | 429 | PIN salah 3 kali berturut-turut; terkunci selama 15 menit. | Kunci tombol transfer, tampilkan dialog "PIN terkunci 15 menit demi keamanan". |
| `INVALID_ACCOUNT_TYPE` | 400 | Tipe rekening tidak valid (hanya `SAVINGS` atau `CHECKING`). | Gunakan selector dropdown dengan opsi valid. |
| `ACCOUNT_LIMIT_EXCEEDED`| 409 | Nasabah sudah memiliki kuota maksimal 3 rekening tabungan aktif. | Tampilkan info "Maksimal 3 rekening tabungan per nasabah". |
| `ACCOUNT_NOT_FOUND` | 404 | Rekening tidak ditemukan atau nasabah tidak memiliki hak akses (OWASP BOLA). | Tampilkan alert rekening tidak valid atau kembali ke dashboard. |
| `INVALID_CURSOR` | 400 | Format token kursor paginasi mutasi rusak atau diubah secara manual. | Reset query paginasi mutasi ke halaman pertama (`cursor=`). |
| `INVALID_AMOUNT` | 400 | Nominal transfer kurang dari batas minimum Rp 10.000. | Tampilkan pesan "Nominal transfer minimal Rp 10.000". |
| `INSUFFICIENT_BALANCE` | 400 | Saldo rekening sumber tidak mencukupi untuk nominal transfer + fee. | Tampilkan peringatan saldo tidak cukup dan tawarkan topup. |
| `SOURCE_ACCOUNT_NOT_FOUND`| 404 | Rekening sumber tidak ditemukan atau bukan milik pengguna login. | Tampilkan error pemulihan rekening. |
| `TARGET_ACCOUNT_NOT_FOUND`| 404 | Nomor rekening tujuan tidak terdaftar di sistem HiBank. | Tampilkan notifikasi "Nomor rekening tujuan tidak ditemukan". |
| `SAME_ACCOUNT_TRANSFER`| 400 | Rekening tujuan sama persis dengan rekening sumber transfer. | Tampilkan pesan "Tidak dapat transfer ke nomor rekening sendiri". |
| `ACCOUNT_INACTIVE` | 400 | Rekening sumber atau tujuan berstatus tidak aktif / dibekukan. | Tampilkan peringatan rekening sedang dinonaktifkan. |
| `DAILY_LIMIT_EXCEEDED` | 400 | Akumulasi transfer keluar hari ini melebihi batas Rp 25.000.000. | Tampilkan info limit harian telah tercapai, coba lagi besok. |
| `MISSING_IDEMPOTENCY_KEY`| 400 | Header `Idempotency-Key` tidak disertakan pada request mutasi finansial. | Pastikan `apiClient` otomatis menginjeksi UUIDv4 baru pada setiap klik tombol transfer. |
| `IDEMPOTENCY_CONFLICT` | 409 | `Idempotency-Key` sama dikirim ulang tetapi dengan nominal atau rekening berbeda. | Generate UUIDv4 baru untuk transaksi baru nasabah. |
| `INTERNAL_ERROR` | 500 | Kesalahan internal server / basis data. | Tampilkan dialog "Terjadi kesalahan pada sistem, silakan coba lagi". |

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

## 6. Endpoints Spesifikasi: Modul Profil & PIN (Sprint 2)

#### `GET /v1/users/me`
Melihat data profil nasabah yang sedang aktif login.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Respons Berhasil (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Ihsan Pratama",
  "email": "ihsan@hibank.com",
  "phone": "081234567890",
  "status": "active",
  "has_pin": true,
  "created_at": "2026-10-10T17:30:00Z",
  "updated_at": "2026-10-17T14:30:00Z"
}
```

---

#### `PUT /v1/users/me/pin`
Melakukan setup awal atau pembaruan 6 digit PIN transaksi.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Aturan Bisnis:**
  * Format PIN harus tepat 6 digit angka numerik (`^[0-9]{6}$`).
  * Jika akun **belum memiliki PIN** (`has_pin: false`), cukup kirimkan field `pin`.
  * Jika akun **sudah memiliki PIN** (`has_pin: true`), wajib menyertakan `old_pin` atau `password` akun.
  * Tiga kali percobaan PIN lama yang salah akan mengunci PIN selama 15 menit (`PIN_LOCKED`).
* **Request Body (Setup Awal):**
```json
{
  "pin": "123456"
}
```
* **Request Body (Ganti PIN dengan PIN Lama):**
```json
{
  "pin": "654321",
  "old_pin": "123456"
}
```
* **Respons Berhasil (200 OK):**
```json
{
  "message": "PIN transaksi berhasil disimpan",
  "has_pin": true
}
```

---

## 7. Endpoints Spesifikasi: Modul Rekening (Sprint 3)

#### `POST /v1/accounts`
Membuka rekening tabungan baru (saldo awal 0).
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Aturan Bisnis:**
  * Maksimal 3 rekening tabungan aktif per nasabah.
  * Nomor rekening 10-digit unik berawalan `108` dengan checksum validasi Luhn mod-10.
* **Request Body (Opsional):**
```json
{
  "account_type": "SAVINGS"
}
```
* **Respons Berhasil (201 Created):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "account_number": "1081234568",
  "account_type": "SAVINGS",
  "balance": 0,
  "status": "active",
  "created_at": "2026-10-17T15:30:00Z",
  "updated_at": "2026-10-17T15:30:00Z"
}
```

---

#### `GET /v1/accounts`
Mendapatkan seluruh daftar rekening tabungan aktif milik nasabah yang sedang login.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Respons Berhasil (200 OK):**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_number": "1081234568",
    "account_type": "SAVINGS",
    "balance": 24750000,
    "status": "active",
    "created_at": "2026-10-17T15:30:00Z",
    "updated_at": "2026-10-17T15:30:00Z"
  }
]
```

---

#### `GET /v1/accounts/{id}`
Mendapatkan detail rekening tabungan tertentu.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Proteksi Keamanan (OWASP BOLA / IDOR):** Hanya pemilik sah dari rekening yang dapat mengakses data rekening ini.
* **Respons Berhasil (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "account_number": "1081234568",
  "account_type": "SAVINGS",
  "balance": 24750000,
  "status": "active",
  "created_at": "2026-10-17T15:30:00Z",
  "updated_at": "2026-10-17T15:30:00Z"
}
```

---

#### `GET /v1/accounts/{id}/mutations`
Mendapatkan riwayat mutasi transaksi buku besar (*double-entry ledger*) per rekening dengan **Cursor-based Pagination**.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Proteksi Keamanan (OWASP BOLA / IDOR):** Hanya pemilik sah dari rekening yang dapat melihat riwayat mutasi rekening ini.
* **Query Parameters:**
  * `cursor` (string, opsional): Token kursor base64 opaque untuk navigasi halaman berikutnya (didapat dari field `next_cursor` sebelumnya).
  * `limit` (integer, opsional, default `20`, maksimum `100`): Jumlah data per halaman.
* **Respons Berhasil (200 OK):**
```json
{
  "items": [
    {
      "id": "e81e19d7-8326-4705-9b2a-874281358912",
      "transaction_id": "f50e8400-e29b-41d4-a716-446655440001",
      "account_id": "770e8400-e29b-41d4-a716-446655440000",
      "direction": "CR",
      "amount": 5000000,
      "balance_after": 24750000,
      "transaction_type": "TOPUP",
      "status": "SUCCESS",
      "reference_number": "TRX-20261017-8B29KM1029",
      "notes": "Topup via VA",
      "created_at": "2026-10-17T15:00:00Z"
    },
    {
      "id": "b12e19d7-8326-4705-9b2a-874281358911",
      "transaction_id": "f50e8400-e29b-41d4-a716-446655440000",
      "account_id": "770e8400-e29b-41d4-a716-446655440000",
      "direction": "DB",
      "amount": 250000,
      "balance_after": 19750000,
      "transaction_type": "TRANSFER_INTERNAL",
      "status": "SUCCESS",
      "reference_number": "TRX-20261017-7B12KL9912",
      "notes": "Transfer ke Budi",
      "created_at": "2026-10-17T14:30:00Z"
    }
  ],
  "next_cursor": "MjAyNi0xMC0xN1QxNDozMDowMFp8YjEyZTE5ZDctODMyNi00NzA1LTliMmEtODc0MjgxMzU4OTEx",
  "has_more": true
}
```

---

#### `POST /v1/transfers/inquiry`
Mengecek keabsahan rekening tujuan dan mengembalikan nama pemilik rekening tujuan dalam format tersamar (*PII Masking*) untuk konfirmasi sebelum eksekusi transfer.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Proteksi Keamanan:**
  * Validasi nomor rekening tujuan sesuai algoritma Luhn mod-10.
  * Larangan transfer ke nomor rekening sendiri (`SAME_ACCOUNT_TRANSFER`, HTTP 400).
  * Perlindungan data privasi PII: Nama dikaburkan (contoh: `Siti Rahma` $\rightarrow$ `S*** R****`).
* **Request Body:**
```json
{
  "source_account_id": "770e8400-e29b-41d4-a716-446655440000",
  "target_account_number": "1088291040"
}
```
* **Respons Berhasil (200 OK):**
```json
{
  "source_account_id": "770e8400-e29b-41d4-a716-446655440000",
  "target_account_number": "1088291040",
  "recipient_name": "S*** R****",
  "bank_code": "108",
  "bank_name": "HiBank",
  "fee": 0
}
```

---

#### `POST /v1/transfers`
Mengeksekusi pemindahan saldo antar rekening sesama bank secara atomik dalam satu transaksi basis data dengan verifikasi PIN transaksi 6 digit dan proteksi idempotensi.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Header Keamanan Wajib:**
  * `Idempotency-Key: <UUIDv4>` (Mencegah eksekusi ganda saat network retry)
* **Proteksi Keamanan:**
  * Verifikasi 6-digit PIN transaksi nasabah via Argon2id.
  * Lockout otomatis 15 menit jika gagal 3 kali (`PIN_LOCKED`, HTTP 429).
  * Validasi saldo sumber $\ge \text{amount} + \text{fee}$.
  * Batas transfer harian per rekening: Akumulasi transfer keluar maksimal Rp 25.000.000 per hari (`DAILY_LIMIT_EXCEEDED`, HTTP 400).
  * Deadlock mitigation: Row lock `SELECT ... FOR UPDATE` diurutkan berdasarkan UUID menaik.
  * Pembukuan ganda atomik: Pembaruan saldo + baris `transactions` + 2 baris `ledger_entries` (DB dan CR).
* **Request Body:**
```json
{
  "source_account_id": "770e8400-e29b-41d4-a716-446655440000",
  "target_account_number": "1088291040",
  "amount": 500000,
  "notes": "Bayar makan siang",
  "pin": "123456"
}
```
* **Respons Berhasil (201 Created):**
```json
{
  "transaction_id": "f50e8400-e29b-41d4-a716-446655440000",
  "reference_number": "TRX-20261017-8B29KM1029",
  "source_account_id": "770e8400-e29b-41d4-a716-446655440000",
  "source_account_number": "1088291038",
  "target_account_id": "880e8400-e29b-41d4-a716-446655440000",
  "target_account_number": "1088291040",
  "recipient_name": "S*** R****",
  "amount": 500000,
  "fee": 0,
  "status": "SUCCESS",
  "notes": "Bayar makan siang",
  "created_at": "2026-10-17T15:30:00Z"
}
```
* **Idempotency Replay (201 Created):** Jika `Idempotency-Key` sama dikirim ulang dengan payload identik, sistem mengembalikan data tanda terima yang sama persis tanpa mendebit saldo ulang.
* **Idempotency Conflict (409 Conflict):**
```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Idempotency key sudah digunakan dengan parameter transaksi berbeda",
    "request_id": "990e8400-e29b-41d4-a716-446655440099"
  }
}
```
* **Rate Limit Exceeded (429 Too Many Requests):**
Diberikan jika user melebihi kuota 30 request transfer/menit (Header respons: `Retry-After: <detik>`).
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
    "request_id": "990e8400-e29b-41d4-a716-446655440099"
  }
}
```
* **Missing Idempotency Key (400 Bad Request):**
```json
{
  "error": {
    "code": "MISSING_IDEMPOTENCY_KEY",
    "message": "Header Idempotency-Key wajib disertakan",
    "request_id": "990e8400-e29b-41d4-a716-446655440099"
  }
}
```

---

#### `GET /v1/transfers/{id}`
Melihat tanda terima / bukti transaksi transfer dana.
* **Autentikasi:** Wajib (Header `Authorization: Bearer <session_token>`)
* **Proteksi Keamanan (OWASP BOLA / IDOR):** Hanya pengirim atau penerima transaksi sah yang diizinkan mengakses data bukti transfer ini.
* **Respons Berhasil (200 OK):**
```json
{
  "transaction_id": "f50e8400-e29b-41d4-a716-446655440000",
  "reference_number": "TRX-20261017-8B29KM1029",
  "source_account_id": "770e8400-e29b-41d4-a716-446655440000",
  "source_account_number": "1088291038",
  "target_account_id": "880e8400-e29b-41d4-a716-446655440000",
  "target_account_number": "1088291040",
  "recipient_name": "S*** R****",
  "amount": 500000,
  "fee": 0,
  "status": "SUCCESS",
  "notes": "Bayar makan siang",
  "created_at": "2026-10-17T15:30:00Z"
}
```

---

## 8. Contoh Implementasi API Client Mobile (TypeScript & Axios)

Berikut template implementasi API Client di React Native / Expo (`src/services/api.ts`) yang telah disesuaikan dengan arsitektur **Opaque Active Sessions**, **Sliding Inactivity Window**, dan **Idempotency-Key Generator**:

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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Helper UUIDv4 Generator untuk Idempotency-Key
export const generateUUIDv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 1. Request Interceptor: Injeksi Session Token & Distributed Trace ID
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Selalu sertakan X-Request-Id untuk tracing log end-to-end
  config.headers['X-Request-Id'] = generateUUIDv4();

  // Otomatis inject Bearer token jika user sudah login
  const sessionToken = await SecureStore.getItemAsync('session_token');
  if (sessionToken && config.headers) {
    config.headers.Authorization = `Bearer ${sessionToken}`;
  }

  // Jika endpoint mutasi finansial (/transfers) dan header Idempotency-Key belum ada, otomatis inject UUIDv4
  if (config.url?.includes('/transfers') && config.method === 'post' && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = generateUUIDv4();
  }

  return config;
});

// 2. Response Interceptor: Penanganan Session Inactivity Timeout & Error Global
apiClient.interceptors.response.use(
  (response) => {
    // Setiap request sukses otomatis memperpanjang sliding inactivity window 15 menit di backend
    return response;
  },
  async (error: AxiosError<{ error?: { code?: string; message?: string; details?: string[] } }>) => {
    const status = error.response?.status;
    const errCode = error.response?.data?.error?.code;

    // A. Deteksi Sesi Berakhir (Inactivity Timeout 15 Menit atau Token Revoked)
    if (status === 401 && (errCode === 'TOKEN_EXPIRED' || errCode === 'INVALID_TOKEN')) {
      await SecureStore.deleteItemAsync('session_token');
      // Panggil event listener navigasi ke layar login / trigger modal expired
      // navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }

    // B. Deteksi Rate Limit Exceeded (HTTP 429)
    if (status === 429) {
      const retryAfterSeconds = error.response?.headers['retry-after'];
      console.warn(`[RateLimit] Harap tunggu ${retryAfterSeconds || 'beberapa'} detik sebelum mencoba kembali.`);
    }

    return Promise.reject(error);
  }
);
```

---

## 9. Status Kesiapan Seluruh Endpoint Backend (Realita Terverifikasi)

Seluruh endpoint dari **MVP 1 hingga MVP 3 (Sprint 0 – 6) telah 100% SELESAI, teruji dengan race detector, dan siap diintegrasikan penuh oleh tim Mobile App**:

| Endpoint | Method | Modul / Sprint | Status Backend | Kesiapan Integrasi Mobile |
| :--- | :--- | :--- | :---: | :--- |
| `GET /healthz` | `GET` | Sprint 0 (Fondasi) | ✅ **100% Ready** | Health check liveness konektivitas |
| `GET /readyz` | `GET` | Sprint 0 (Fondasi) | ✅ **100% Ready** | Readiness check status DB PostgreSQL |
| `GET /v1/ping` | `GET` | Sprint 0 (Fondasi) | ✅ **100% Ready** | Ping routing v1 latency |
| `POST /v1/auth/register` | `POST` | Sprint 1 (Auth) | ✅ **100% Ready** | Registrasi akun baru (Argon2id) |
| `POST /v1/auth/login` | `POST` | Sprint 1 (Auth) | ✅ **100% Ready** | Login, token opaque 256-bit, single-session per device |
| `POST /v1/auth/refresh` | `POST` | Sprint 1 (Auth) | ✅ **100% Ready** | Sliding inactivity window touch (perpanjang 15 menit) |
| `POST /v1/auth/logout` | `POST` | Sprint 1 (Auth) | ✅ **100% Ready** | Instant server-side session revocation |
| `GET /v1/users/me` | `GET` | Sprint 2 (Profil) | ✅ **100% Ready** | Profil nasabah aktif & status `has_pin` |
| `PUT /v1/users/me/pin` | `PUT` | Sprint 2 (PIN) | ✅ **100% Ready** | Set & ubah 6-digit PIN transaksi dengan 3x lockout |
| `POST /v1/accounts` | `POST` | Sprint 3 (Rekening) | ✅ **100% Ready** | Buka rekening unik Luhn mod-10 (maks 3 rekening) |
| `GET /v1/accounts` | `GET` | Sprint 3 (Rekening) | ✅ **100% Ready** | Daftar seluruh rekening tabungan aktif nasabah |
| `GET /v1/accounts/{id}` | `GET` | Sprint 3 (Rekening) | ✅ **100% Ready** | Detail rekening tertentu dengan proteksi IDOR / BOLA |
| `GET /v1/accounts/{id}/mutations`| `GET` | Sprint 4 (Mutasi) | ✅ **100% Ready** | Riwayat mutasi double-entry cursor pagination |
| `POST /v1/transfers/inquiry` | `POST` | Sprint 5 (Transfer) | ✅ **100% Ready** | Inquiry nomor rekening, validasi Luhn & PII Masking |
| `POST /v1/transfers` | `POST` | Sprint 5 & 6 (Transfer) | ✅ **100% Ready** | Transfer internal atomic, ordered lock, cek PIN & limit harian 25jt |
| `GET /v1/transfers/{id}` | `GET` | Sprint 5 (Transfer) | ✅ **100% Ready** | Tanda terima transaksi untuk pihak pengirim / penerima |
| `POST /v1/topups` | `POST` | Sprint 7 (Topup Midtrans) | ⏳ Upcoming | MVP 4: Pembayaran payment gateway Midtrans Snap |



