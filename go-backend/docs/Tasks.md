# HiBank Roadmap: Task List MVP & Sprint

Dokumen ini memetakan seluruh backlog implementasi backend **HiBank Core Banking API** berdasarkan [Background.md](Background.md). Roadmap dibagi menjadi **7 MVP** yang mencakup **13 Sprint** (Sprint 0 – 12), dirancang dengan standar rekayasa finansial (double-entry bookkeeping, strict concurrency, ACID, dan zero-float BIGINT).

---

## Ringkasan Progres MVP

| MVP | Fokus | Sprint | Status | Target Demo |
| :--- | :--- | :--- | :--- | :--- |
| **MVP 1** | Fondasi & Identitas | Sprint 0 – 2 | 🟡 In Progress (Sprint 0 Done) | User registrasi, login JWT rotation, profil & PIN |
| **MVP 2** | Rekening & Double-Entry Ledger | Sprint 3 – 4 | ⚪ Planned | Buat rekening, mutasi, verifikasi invarian saldo |
| **MVP 3** | Transfer Sesama Bank & Concurrency | Sprint 5 – 6 | ⚪ Planned | Transfer internal, ordered lock, uji 50 race goroutine |
| **MVP 4** | Topup Payment Gateway | Sprint 7 | ⚪ Planned | Midtrans Snap sandbox, webhook idempoten SHA512 |
| **MVP 5** | Transfer Antar Bank (Outbound) | Sprint 8 – 9 | ⚪ Planned | HMAC client ke partner bank, saga & rekonsiliasi |
| **MVP 6** | Notifikasi & Biometrik FIDO | Sprint 10 – 11 | ⚪ Planned | Transactional outbox push FCM, asymmetric key FIDO |
| **MVP 7** | Integrasi & Kesiapan Rilis | Sprint 12 | ⚪ Planned | Prometheus metrics, hardening keamanan, deploy sandbox |

---

## MVP 1: Fondasi dan Identitas (Sprint 0 – 2)

### ✅ Sprint 0: Setup & Fondasi Sistem (Selesai)
- [x] **Inisialisasi Project:** Go module (`go.mod`), struktur folder modular monolith flat layout (`cmd/`, `internal/`, `db/`, `api/`).
- [x] **Infrastruktur Lokal:** PostgreSQL 16 Alpine di `docker-compose.yml` dengan healthcheck dan timezone `UTC`.
- [x] **Database Tooling:** Integrasi `golang-migrate` dan `sqlc` (`sqlc.yaml`).
- [x] **Konfigurasi & Logging:** Fail-fast env loader (`internal/platform/config`) dan structured logger `slog` dengan `request_id` context.
- [x] **HTTP Middleware Pipeline:** Request ID, Access Log, Panic Recovery, Security Headers, CORS, dan konsistensi JSON error schema.
- [x] **Database Pool:** Inisialisasi `pgxpool` dan helper transaksi `WithTx`.
- [x] **Observability Awal:** Endpoint `GET /healthz` (liveness) dan `GET /readyz` (readiness).
- [x] **CI/CD & Otomasi:** GitHub Actions workflow (`.github/workflows/ci.yml`), `.golangci.yml`, dan `Makefile`.
- [x] **Dokumentasi API:** OpenAPI 3.0 (`api/openapi.yaml`) dan collection HTTP client (`api/client.http`).

---

### ✅ Sprint 1: Registrasi & Autentikasi Pengguna (Selesai - Refactored to Opaque Active Sessions)
* **Target Demo:** Pengguna dapat mendaftar, login mendapatkan token sesi opaque berentropi tinggi (256-bit), sliding inactivity timeout, penegakan single session per perangkat, dan pencabutan instan dari in-memory cache.
* **Tabel Database:**
  * `users` (`id UUID`, `full_name`, `email UNIQUE`, `phone UNIQUE`, `password_hash`, `status`, `created_at`, `updated_at`)
  * *(Catatan Arsitektur: Tabel `refresh_tokens` dihilangkan sesuai standar digital banking; seluruh status sesi aktif dikelola secara efemeral di cache/in-memory store dengan zero database query pada request terautentikasi)*

#### Tasks:
- [x] **Migrasi Database:** Migrasi SQL bersih `000002_create_users_and_tokens.up.sql` dan `.down.sql` (hanya mengelola tabel `users`).
- [x] **SQLC Queries:** Query SQL di `db/queries/auth.sql` (hanya operasi user; tidak ada persistensi token ke PostgreSQL).
- [x] **Hashing Argon2id:** Implementasi helper hashing password yang aman dengan salt kriptografis (`internal/auth/password.go`).
- [x] **Ephemeral Session Store & Manager (`internal/auth/session.go`, `internal/auth/store.go`):**
  - [x] Terbitkan token sesi opaque acak kriptografis 256-bit entropy.
  - [x] Sliding inactivity timeout (default 15 menit) dan batas maksimum absolute lifetime.
  - [x] Penegakan single active session per perangkat (login baru mematikan sesi lama pada perangkat yang sama).
- [x] **Alur Registrasi (`POST /v1/auth/register`):**
  - [x] Validasi input (email valid, format no. telepon standar Indonesia, password minimum 8 karakter).
  - [x] Cek duplikasi email / nomor telepon.
  - [x] Return status 201 Created (tanpa menyertakan password hash).
- [x] **Alur Login (`POST /v1/auth/login`):**
  - [x] Verifikasi email/phone dan verifikasi password argon2id.
  - [x] Terbitkan token sesi opaque baru dan daftarkan di ephemeral store (preempt sesi lama perangkat).
  - [x] Return `session_token` beserta `expires_in`.
- [x] **Alur Touch / Extend Session (`POST /v1/auth/refresh`):**
  - [x] Validasi token sesi dari cache dan perpanjang sliding inactivity window.
- [x] **Middleware Autentikasi (`internal/auth/middleware.go`):**
  - [x] Ekstraksi dan validasi header `Authorization: Bearer <session_token>`.
  - [x] Validasi terhadap cache efemeral dengan zero database queries.
  - [x] Refresh sliding inactivity window otomatis pada setiap request yang valid.
  - [x] Injeksi `user_id` dan `device_id` ke dalam `context.Context`.
- [x] **Logout Session (`POST /v1/auth/logout`):** Hapus sesi dari cache secara instan (request berikutnya langsung 401 Unauthorized).
- [x] **Testing & DoD:** Unit test entropy token 256-bit, sliding window & absolute lifetime, single-session preemption, instant revocation, zero database token queries, race condition detection, dan integration test flow dengan 100% kelulusan.

---

### 🔲 Sprint 2: Profil Pengguna, PIN Transaksi & Hardening
* **Target Demo:** Pengguna yang terautentikasi dapat melihat profil, memasang/mengubah PIN 6-digit, dan logout.
* **Tabel Database:** Update `users` (kolom `pin_hash`, `pin_failed_attempts INT`, `pin_locked_until TIMESTAMP`).

#### Tasks:
- [ ] **Migrasi Database:** Tambah kolom PIN dan status lockout ke tabel `users`.
- [ ] **Endpoint Profil (`GET /v1/users/me`):** Mengembalikan data pengguna login (nama, email, telepon, status KYC/akun).
- [ ] **Manajemen PIN Transaksi (`PUT /v1/users/me/pin`):**
  - [ ] Validasi PIN tepat 6 digit numerik.
  - [ ] Hash PIN menggunakan algoritma kriptografis terpisah.
  - [ ] Logika lockout: kunci percobaan verifikasi PIN jika salah $N$ kali berturut-turut (misal 5 kali) selama rentang waktu tertentu.
- [ ] **Alur Logout (`POST /v1/auth/logout`):** Revoke refresh token aktif untuk perangkat yang sedang logout.
- [ ] **Alur Logout Semua Perangkat (`POST /v1/auth/logout-all`):** Revoke seluruh token family milik `user_id`.
- [ ] **Dokumentasi & OpenAPI:** Update `api/openapi.yaml` dan `api/client.http` untuk endpoint Sprint 1 & 2.

---

## MVP 2: Rekening dan Ledger Double-Entry (Sprint 3 – 4)

### 🔲 Sprint 3: Manajemen Rekening
* **Target Demo:** Pengguna dapat membuka rekening tabungan dengan nomor rekening unik otomatis dan melihat daftar rekening miliknya.
* **Tabel Database:**
  * `accounts` (`id UUID`, `user_id FK`, `account_number VARCHAR(12) UNIQUE`, `balance BIGINT NOT NULL DEFAULT 0`, `currency VARCHAR(3) DEFAULT 'IDR'`, `status`, `created_at`, `updated_at`, `CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)`)

#### Tasks:
- [ ] **Migrasi Database:** Buat migrasi SQL tabel `accounts` dengan constraint `CHECK (balance >= 0)`.
- [ ] **Generator Nomor Rekening:**
  - [ ] Format standar: kode bank (3 digit) + kode cabang/produk + angka acak + Luhn check digit.
  - [ ] Retry loop (maksimal 3 kali) apabila terjadi benturan `UNIQUE constraint`.
- [ ] **Buka Rekening Baru (`POST /v1/accounts`):**
  - [ ] Validasi kepemilikan user dan batas maksimal rekening per nasabah (misal: max 3 rekening tabungan).
  - [ ] Saldo awal dibuat default `0`.
- [ ] **Daftar Rekening (`GET /v1/accounts`):** Menampilkan semua rekening aktif milik user yang sedang login.
- [ ] **Detail Rekening (`GET /v1/accounts/{id}`):**
  - [ ] *Proteksi IDOR:* Validasi mutlak bahwa rekening dengan `id` tersebut dimiliki oleh user pemanggil. Mengembalikan `404` atau `403` jika bukan pemilik.
- [ ] **Testing & DoD:** Test generator nomor rekening, test collision handling, test pencegahan IDOR.

---

### 🔲 Sprint 4: Double-Entry Ledger & Mutasi Transaksi
* **Target Demo:** Sistem mencatat saldo menggunakan double-entry ledger murni dan nasabah dapat membaca riwayat mutasi dengan cursor pagination.
* **Tabel Database:**
  * `transactions` (`id UUID`, `idempotency_key VARCHAR UNIQUE`, `reference_no VARCHAR UNIQUE`, `type`, `status`, `amount BIGINT`, `description`, `created_at`)
  * `ledger_entries` (`id UUID`, `transaction_id FK`, `account_id FK`, `direction VARCHAR(2)` ['DB', 'CR'], `amount BIGINT CHECK (amount > 0)`, `balance_after BIGINT`, `created_at`)

#### Tasks:
- [ ] **Migrasi Database:** Buat migrasi SQL tabel `transactions` dan `ledger_entries` dengan foreign key dan index pada `(account_id, created_at, id)`.
- [ ] **Domain Ledger Engine (`internal/transfer/ledger.go`):**
  - [ ] Fungsi pencatatan berpasangan: debit dan kredit harus seimbang ($\sum Debit = \sum Kredit$).
  - [ ] `accounts.balance` diperbarui sebagai materialized cache yang konsisten di dalam transaksi yang sama.
- [ ] **Mutasi Rekening (`GET /v1/accounts/{id}/mutations`):**
  - [ ] Validasi kepemilikan rekening.
  - [ ] Implementasi **Cursor-Based Pagination** (`created_at` + `id`) untuk efisiensi transaksi bervolume tinggi (bukan offset pagination).
  - [ ] Menampilkan arah mutasi (`DEBIT` / `KREDIT`), nominal, saldo setelah mutasi, dan keterangan.
- [ ] **Dev Seeder Tooling:** CLI command / Makefile target (`make seed-balance`) untuk mengisi saldo rekening testing sebelum modul payment gateway aktif.
- [ ] **Testing & DoD:** Test invarian mutlak: `Saldo Rekening == Total Kredit - Total Debit` di tabel `ledger_entries`.

---

## MVP 3: Transfer Sesama Bank & Concurrency (Sprint 5 – 6)

### 🔲 Sprint 5: Alur Transfer Inti (Bank A ke Bank A)
* **Target Demo:** Pengguna dapat melakukan inquiry rekening tujuan dan transfer dana antar rekening Bank A dengan otorisasi PIN.

#### Tasks:
- [ ] **Inquiry Rekening Tujuan (`POST /v1/transfers/inquiry`):**
  - [ ] Input nomor rekening tujuan.
  - [ ] Validasi keberadaan rekening dan pastikan rekening berstatus aktif.
  - [ ] Masking nama pemilik rekening (misal: `BU** SANT***`) untuk privasi nasabah.
- [ ] **Eksekusi Transfer (`POST /v1/transfers`):**
  - [ ] Wajib header `Idempotency-Key` (UUIDv4).
  - [ ] Validasi PIN transaksi pengguna pengirim.
  - [ ] Validasi bisnis: tidak boleh transfer ke rekening sendiri, nominal `> 0`, batas minimum/maksimum transfer.
  - [ ] **Atomic Database Transaction:**
    1. Ambil & kunci dua baris rekening menggunakan `SELECT ... FOR UPDATE` berurutan berdasarkan UUID (`id_min` lalu `id_max`) untuk menjamin **bebas deadlock**.
    2. Cek kecukupan saldo pengirim.
    3. Potong saldo pengirim, tambah saldo penerima.
    4. Tulis baris `transactions` dengan status `SUCCESS`.
    5. Tulis 2 baris `ledger_entries` (Debit pengirim, Kredit penerima).
- [ ] **Detail Transaksi (`GET /v1/transfers/{id}`):** Mengambil detail bukti transfer berdasarkan ID transaksi.
- [ ] **Testing & DoD:** Test transfer nominal valid, test penolakan saldo tidak cukup, test salah PIN.

---

### 🔲 Sprint 6: Concurrency Control, Idempotency & Reliabilitas
* **Target Demo:** Sistem lulus uji transfer balapan paralel tanpa race condition dan lolos uji request ganda (idempoten).

#### Tasks:
- [ ] **Uji Stres Concurrency (50 Goroutines Parallel):**
  - [ ] Eksekusi 50 goroutine melakukan transfer simultan dari satu rekening ke rekening lain.
  - [ ] Verifikasi saldo akhir pengirim dan penerima tepat tanpa selisih 1 rupiah pun.
- [ ] **Uji Deadlock Prevention:**
  - [ ] Skenario simulasi: User A transfer ke User B bersamaan dengan User B transfer ke User A.
  - [ ] Verifikasi kedua request selesai tanpa saling mengunci (deadlock).
- [ ] **Idempotency Engine Hardening:**
  - [ ] Request replay dengan payload identik mengembalikan respon cache yang sama tanpa mutasi ganda.
  - [ ] Request dengan `Idempotency-Key` sama tetapi payload berbeda wajib ditolak dengan HTTP 409 Conflict.
- [ ] **Limit Transaksi:** Pembatasan limit transfer harian per rekening dan rate limiter per user.
- [ ] **Background Ledger Auditor:** Job berkala yang memverifikasi kecocokan antara `accounts.balance` dan rekapitulasi `ledger_entries`.
- [ ] **Testing & DoD:** `go test -race ./...` lulus tanpa temuan data race.

---

## MVP 4: Topup Saldo via Midtrans (Sprint 7)

### 🔲 Sprint 7: Integrasi Payment Gateway Midtrans & Webhook Idempoten
* **Target Demo:** Pengguna dapat meminta topup via Midtrans Snap, membayar di simulator, dan saldo bertambah secara otomatis melalui webhook.
* **Tabel Database:**
  * `topups` (`id UUID`, `order_id VARCHAR UNIQUE`, `account_id FK`, `amount BIGINT`, `status`, `snap_token`, `snap_redirect_url`, `payment_type`, `settled_at`, `payload JSONB`, `created_at`)

#### Tasks:
- [ ] **Migrasi Database:** Buat migrasi SQL tabel `topups`.
- [ ] **Integrasi Client Midtrans Snap (`POST /v1/topups`):**
  - [ ] Generate unik `order_id` (format: `TOPUP-<timestamp>-<random>`).
  - [ ] Panggil Midtrans Snap API sandbox, simpan token dan redirect URL.
  - [ ] Catat transaksi topup dengan status `PENDING`.
- [ ] **Webhook Listener (`POST /v1/webhooks/midtrans`):**
  - [ ] **Verifikasi Signature SHA512:** `SHA512(order_id + status_code + gross_amount + server_key)`. Tolak webhook jika signature tidak cocok.
  - [ ] **Pemrosesan Idempoten:**
    - Jika notifikasi status `settlement` / `capture` (dan status sebelumnya `PENDING`):
      1. Ubah status topup menjadi `SUCCESS`.
      2. Kredit saldo rekening nasabah + buat entri ledger kredit dalam satu DB transaction.
    - Jika status `expire` / `cancel` / `deny`: Ubah status menjadi `FAILED`.
    - Jika webhook diterima ulang untuk order yang sudah `SUCCESS`, kembalikan HTTP 200 OK tanpa memproses ulang saldo.
- [ ] **Cek Status Manual (`GET /v1/topups/{id}`):** Fallback sync status langsung ke API Midtrans jika webhook terlambat masuk.
- [ ] **Testing & DoD:** Test webhook duplikat, test penolakan signature palsu, test idempotensi mutasi saldo.

---

## MVP 5: Transfer Antar Bank (Sprint 8 – 9)

### 🔲 Sprint 8: Client API Interbank & Simulasi Mock Partner Bank
* **Target Demo:** Bank A dapat memanggil API bank mitra eksternal dengan otentikasi HMAC-SHA256 yang aman dan teruji via test fixtures.
* **Arsitektur:** Modul `internal/interbank` murni sebagai outbound HTTP client. Tidak ada service backend bank mitra di repository ini.

#### Tasks:
- [ ] **Spesifikasi Kontrak Interbank:**
  - Endpoint target bank mitra: `POST /interbank/v1/inquiry`, `POST /interbank/v1/transfer`, `GET /interbank/v1/transfer/{ref}`.
- [ ] **HMAC-SHA256 Signer & Verifier:**
  - Header: `X-Bank-Code`, `X-Timestamp` (ISO 8601 dengan toleransi waktu $\le 5$ menit anti-replay), `X-Signature: HMAC-SHA256(secret, payload + timestamp)`.
- [ ] **Outbound HTTP Client:**
  - Timeout ketat via `context.WithTimeout` (misal 5 detik).
  - Exponential backoff retry khusus untuk transient network failure pada tahapan inquiry.
- [ ] **Mock Partner Bank Server Test Fixture:**
  - Gunakan `httptest.NewServer` untuk mensimulasikan respons bank mitra: sukses transfer, rekening tujuan tidak ditemukan, timeout network, respon HTTP 500, dan signature ditolak.
- [ ] **Testing & DoD:** Unit test client interbank berhasil menangani skenario sukses dan error penolakan bank mitra.

---

### 🔲 Sprint 9: Saga Outbound Transfer & Rekonsiliasi
* **Target Demo:** Transfer keluar ke bank eksternal mengeksekusi pola saga: menahan dana, memanggil bank luar, dan melakukan auto-reversal bila gagal.
* **Tabel Database:**
  * `interbank_transfers` (`id UUID`, `account_id FK`, `partner_bank_code VARCHAR(10)`, `beneficiary_account_no`, `beneficiary_name`, `amount BIGINT`, `external_ref`, `status` ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'], `failure_reason`, `created_at`, `updated_at`)

#### Tasks:
- [ ] **Migrasi Database:** Buat migrasi SQL tabel `interbank_transfers`.
- [ ] **Alur Saga Outbound Transfer:**
  1. *Fase Tahan Dana (Escrow):* Debit rekening pengirim ke rekening internal settlement Bank A (status transaksi `PENDING`).
  2. *Fase Panggilan Jaringan:* Panggil API partner bank dengan `Idempotency-Key` dan timeout.
  3. *Fase Sukses:* Jika partner bank menjawab berhasil $\rightarrow$ update status `SUCCESS` dan finalisasi ledger.
  4. *Fase Kompensasi (Reversal):* Jika partner bank menolak $\rightarrow$ kembalikan dana dari rekening settlement ke rekening pengirim via reversal ledger entry (status `REVERSED`).
  5. *Fase Timeout/Ambigus:* Jika timeout terjadi, transaksi tetap berstatus `PENDING` untuk diselesaikan oleh worker.
- [ ] **Background Reconciliation Worker:**
  - Goroutine periodik yang memindai transaksi `PENDING` yang berumur $> 5$ menit.
  - Melakukan query status ke bank mitra (`GET /interbank/v1/transfer/{ref}`) hingga mendapat status pasti (finalisasi atau kembalikan dana).
- [ ] **Testing & DoD:** Test skenario partner bank timeout, partner bank down, dan verifikasi saldo selalu seimbang (*no money lost*).

---

## MVP 6: Notifikasi & Keamanan Biometrik (Sprint 10 – 11)

### 🔲 Sprint 10: Push Notification dengan Pola Transactional Outbox
* **Target Demo:** Setiap transaksi (transfer, topup, login baru) otomatis memicu push notifikasi ke perangkat tanpa memblokir transaksi uang.
* **Tabel Database:**
  * `devices` (`id UUID`, `user_id FK`, `platform` ['android', 'ios'], `device_name`, `push_token`, `last_seen_at`, `created_at`)
  * `notifications` (`id UUID`, `user_id FK`, `type`, `title`, `body`, `data JSONB`, `status` ['PENDING', 'SENT', 'FAILED'], `sent_at`, `read_at`, `created_at`)

#### Tasks:
- [ ] **Migrasi Database:** Buat tabel `devices` dan tabel `notifications` (outbox).
- [ ] **Registrasi Perangkat (`POST /v1/devices`):** Simpan push token FCM/APNs milik perangkat.
- [ ] **Transactional Outbox Event Publisher:**
  - Setiap mutasi finansial menuliskan baris event notifikasi ke tabel `notifications` di dalam transaksi database yang sama dengan mutasi ledger.
- [ ] **Outbox Poller & Dispatcher Worker:**
  - Worker goroutine membaca baris outbox bertahap.
  - Kirim notifikasi via Firebase Cloud Messaging (FCM Admin SDK).
  - Update `sent_at` dan status `SENT`. Hapus token jika FCM merespons token kadaluwarsa/tidak terdaftar.
  - Pastikan kegagalan push notification tidak membatalkan transaksi finansial.
- [ ] **In-App Notification API:**
  - `GET /v1/notifications` (daftar riwayat notifikasi).
  - `POST /v1/notifications/{id}/read` (tandai sudah dibaca).
- [ ] **Testing & DoD:** Push worker diuji untuk skenario normal, skenario retry saat FCM down, dan token invalid.

---

### 🔲 Sprint 11: Biometrik On-Device FIDO / Passkey
* **Target Demo:** Pengguna dapat login dan mengonfirmasi transfer uang menggunakan biometrik (FaceID/Fingerprint) melalui public-key cryptography.
* **Tabel Database:**
  * `device_credentials` (`id UUID`, `device_id FK`, `user_id FK`, `public_key BYTEA`, `algorithm`, `last_used_at`, `revoked_at`, `created_at`)
  * `auth_challenges` (`id UUID`, `challenge VARCHAR UNIQUE`, `purpose` ['LOGIN', 'TRANSFER'], `payload_hash VARCHAR`, `expires_at`, `created_at`)

#### Tasks:
- [ ] **Migrasi Database:** Buat migrasi SQL tabel `device_credentials` dan `auth_challenges`.
- [ ] **Enrollment Kunci Biometrik:**
  - User login memasukkan PIN untuk meminta pendaftaran kunci.
  - Server menerbitkan challenge acak kriptografis (TTL 2 menit).
  - Klien menandatangani challenge dengan private key dari Secure Enclave/Keystore dan mengirimkan **Public Key**.
  - Server memvalidasi tanda tangan dan menyimpan public key di `device_credentials`.
- [ ] **Login Biometrik (`POST /v1/auth/biometric/...`):**
  - Minta challenge login $\rightarrow$ klien tanda tangani $\rightarrow$ server verifikasi tanda tangan $\rightarrow$ terbitkan JWT.
- [ ] **Konfirmasi Transfer dengan Biometrik:**
  - Challenge di-bind ke hash payload transaksi (`SHA256(amount + to_account)`).
  - Tanda tangan hanya valid untuk transaksi tersebut, mencegah serangan relay / replay. PIN tetap tersedia sebagai fallback.
- [ ] **Pencabutan Kunci:** Cabut kredensial saat `logout-all` atau perangkat dihapus.
- [ ] **Testing & DoD:** Challenge sekali pakai, signature mismatch ditolak, challenge kedaluwarsa ditolak.

---

## MVP 7: Integrasi, Observability & Kesiapan Rilis (Sprint 12)

### 🔲 Sprint 12: Integrasi Mobile, Metrik & Production Readiness
* **Target Demo:** Backend siap produksi diuji end-to-end dengan aplikasi mobile React Native dan termonitor di dashboard metrics.

#### Tasks:
- [ ] **Observability & Metrics:**
  - Pasang Prometheus metrics (`/metrics`) via middleware: HTTP request rate, latency percentile (p95, p99), error rate, database connection pool stats, total mutasi ledger.
- [ ] **Security Audit & Penetration Testing Ringan:**
  - Verifikasi OWASP Top 10 API Security (cek IDOR di semua route, injection, broken object-level authorization, rate limit bypass).
  - Audit log: pastikan tidak ada kebocoran PIN, password, data kartu, atau JWT di `slog`.
- [ ] **Multi-Stage Dockerfile:** Buat `Dockerfile` multi-stage build berukuran kecil berbasis `scratch` atau `alpine` non-root user.
- [ ] **Dokumentasi Final & ADR:**
  - Update OpenAPI spesifikasi final mencakup seluruh endpoint.
  - Dokumen Architecture Decision Record (ADR) untuk ledger, saga transfer, outbox, dan FIDO biometrics.
- [ ] **Testing & DoD:** CI pipeline hijau, seluruh suite integrasi lulus, aplikasi mobile berhasil melakukan seluruh alur end-to-end di environment sandbox.

---

## Aturan Khusus Finansial (Enforced across all tasks)
1. **Representasi Uang:** Seluruh nominal wajib bertipe `BIGINT` (rupiah utuh). Dilarang keras menggunakan tipe `float` atau `double`.
2. **Keseimbangan Double-Entry:** Setiap mutasi wajib menghasilkan entri debit dan kredit yang seimbang.
3. **Deadlock Prevention:** Seluruh locking pada transfer harus mengurutkan ID rekening (`ORDER BY id ASC` atau kunci ID terkecil terlebih dahulu).
4. **Idempotensi:** Semua mutasi finansial wajib mewajibkan header `Idempotency-Key`.
5. **No Mutation on Ledger:** Entri ledger bersifat *append-only*. Koreksi hanya boleh dilakukan melalui baris reversal baru.
