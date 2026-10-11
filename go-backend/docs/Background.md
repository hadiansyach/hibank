# Backend Context: Digital Bank (Go)

Konteks backend mobile banking sandbox: fitur, arsitektur, konvensi Go, dan roadmap MVP per sprint.

## 1. Ringkasan

- **Jenis app:** REST API backend untuk mobile banking (digital bank). Proyek belajar/portofolio, bukan produksi berlisensi.
- **Arsitektur:** modular monolith (Bank A Core) yang terintegrasi ke external partner bank API melalui outbound REST client.
- **Client:** mobile app (React Native/Expo).
- **Bahasa:** Go. Database: PostgreSQL.
- **Tujuan:** memahami konsep backend fintech: ledger, transaksi DB, idempotency, concurrency, webhook, integrasi antar service.

## 2. Fitur

### In scope

1. **Register:** daftar akun (nama, email, telepon, password).
2. **Login dan sesi:** JWT access token (pendek) + refresh token (dirotasi, per perangkat), logout, logout semua perangkat, set PIN transaksi.
3. **Tambah rekening:** user membuat rekening (nomor unik, saldo awal 0).
4. **Transfer sesama bank:** antar rekening di Bank A.
5. **Transfer antar bank:** Bank A ke external partner bank (outbound client via HMAC-signed REST, saga pattern, dan rekonsiliasi).
6. **Topup:** isi saldo via Midtrans sandbox.
7. **Mutasi:** riwayat transaksi per rekening (pendukung).
8. **Ledger double-entry:** dasar semua perubahan saldo; mutasi dan audit diturunkan darinya.
9. **Biometrik on-device (FIDO):** login dan konfirmasi transfer memakai kunci di perangkat yang dibuka biometrik; PIN sebagai fallback.
10. **Push notification:** transfer masuk/keluar, topup, antar bank selesai/gagal, login dari perangkat baru.

### Out of scope (backlog)

KYC/eKYC, kartu debit, QRIS, admin panel, bunga/deposito, multi-currency, biaya admin antar bank.

## 3. Arsitektur

```
Mobile App  --HTTPS/JSON-->  Bank A API (Go)  --> PostgreSQL A
   ^                              |
   | push (FCM / APNs)            |-- HMAC-signed REST --> External Partner Bank API (Remote Server)
   |                              |
   +-- Notification worker <------+-- Midtrans (Snap + webhook)
        (baca tabel outbox)
```

- Bank A dan partner bank adalah **sistem & DB terpisah**. Tidak ada backend bank mitra di repo ini; integrasi murni lewat network/HTTP API.
- Layer per modul: `handler (HTTP) -> service (bisnis) -> repository (sqlc/pgx)`.
- Satu proses Bank A, modul dipisah per package (`auth`, `account`, `transfer`, `topup`, `interbank`).
- Worker rekonsiliasi berjalan sebagai goroutine di proses yang sama (tahap awal).

* **Notifikasi** memakai pola outbox: event ditulis dalam transaksi DB yang sama dengan transfer/topup, lalu worker mengirim push setelah commit.
* **Biometrik:** app menyimpan kunci privat di Secure Enclave/Keystore; backend hanya menyimpan public key dan memverifikasi tanda tangan challenge.

## 4. Tech stack

| Kebutuhan | Pilihan |
| --- | --- |
| Router | chi |
| Database | PostgreSQL 16 + pgx |
| Query | sqlc (SQL asli, kode type-safe) |
| Migrasi | golang-migrate |
| Validasi | go-playground/validator |
| Auth | golang-jwt, argon2id |
| Biometrik/FIDO | verifikasi tanda tangan ECDSA (`crypto/ecdsa`) atau `go-webauthn/webauthn` untuk passkey penuh |
| Push notification | Firebase Cloud Messaging (Admin SDK Go), APNs lewat FCM |
| Worker | goroutine + tabel outbox (tanpa message broker dulu) |
| Logging | log/slog (stdlib) |
| Config | environment variable (+ godotenv untuk lokal) |
| Test | testing, testify, testcontainers-go |
| Docs API | OpenAPI (swaggo atau spec manual) |
| Lint/CI | golangci-lint, GitHub Actions |
| Dev env | Docker Compose, Makefile |

## 5. Aturan domain (wajib)

1. **Uang = `BIGINT`** (rupiah bulat). Tidak pakai float.
2. **Ledger double-entry:** setiap perpindahan uang = baris `ledger_entries` (debit/kredit). `accounts.balance` adalah cache yang konsisten.
3. **Satu DB transaction** untuk seluruh perubahan saldo + ledger + status transaksi.
4. **Row locking:** `SELECT ... FOR UPDATE`. Kunci dua rekening **berurutan berdasarkan ID** untuk mencegah deadlock.
5. **Idempotency:** header `Idempotency-Key` wajib untuk transfer/topup. Kunci `UNIQUE` di DB. Key sama + payload beda = ditolak.
6. **State machine transaksi:** `pending -> success | failed`. Tidak ada transisi mundur.
7. **Constraint DB sebagai pengaman terakhir:** `CHECK (balance >= 0)`, `CHECK (amount > 0)`, FK, `UNIQUE`.
8. **Otorisasi per resource:** setiap endpoint cek kepemilikan rekening (cegah IDOR).
9. **PIN transaksi** terpisah dari password, di-hash, dengan lockout setelah gagal berulang.
10. **Reversal, bukan edit:** koreksi dilakukan dengan entri ledger baru, tidak pernah mengubah/menghapus entri lama.
11. **Sesi aman:** access token pendek (15 menit), refresh token sekali pakai dan dirotasi. Refresh token lama dipakai ulang = seluruh keluarga token perangkat itu dicabut.
12. **Kunci perangkat (FIDO):** kunci privat tidak pernah keluar perangkat. Server hanya menyimpan public key dan memverifikasi tanda tangan atas challenge sekali pakai.
13. **Notifikasi via outbox:** event ditulis dalam transaksi DB yang sama, dikirim worker setelah commit. Kegagalan push tidak boleh membatalkan transaksi uang.

## 6. Struktur proyek Go

```
cmd/api/main.go              # wiring, graceful shutdown
internal/
  auth/                      # handler, service, repository, token
  user/
  account/
  transfer/
  topup/
  interbank/                 # outbound client ke partner bank + worker rekonsiliasi
  platform/
    config/
    database/                # pool pgx, helper transaksi
    httpx/                   # middleware, response, error mapper
    logger/
db/
  migrations/
  queries/                   # .sql untuk sqlc
api/
  openapi.yaml               # spesifikasi OpenAPI 3.0
  client.http                # file request untuk REST Client
sqlc.yaml
docker-compose.yml           # PostgreSQL container (Bank A)
Makefile
```

## 7. Go best practices (konvensi proyek)

- **`internal/`** untuk semua kode aplikasi. Hindari package `utils`/`common`.
- **Dependency injection via constructor** (`NewService(repo, clock)`). Tanpa variabel global/`init()` berefek samping.
- **Interface didefinisikan di sisi konsumen**, kecil, dan hanya bila perlu (untuk test/mock).
- **Error:** bungkus dengan konteks `fmt.Errorf("transfer: lock account: %w", err)`. Pakai sentinel error (`ErrInsufficientBalance`) + `errors.Is/As`. Mapping error domain ke HTTP di satu tempat.
- **`context.Context`** parameter pertama di semua fungsi I/O. Terapkan timeout pada query DB dan panggilan HTTP keluar.
- **Handler tipis:** parse + validasi + panggil service + tulis respons. Logika bisnis hanya di service.
- **Transaksi DB di service** lewat helper `WithTx(ctx, func(q *Queries) error)`. Repository menerima `DBTX` agar bisa dipakai di dalam/luar transaksi.
- **Logging terstruktur** (`slog`) dengan `request_id`. Jangan log password, PIN, token, atau data kartu.
- **Config dari environment**, divalidasi saat startup (fail fast).
- **Graceful shutdown:** tangkap SIGTERM, `server.Shutdown(ctx)`, tutup pool DB.
- **Respons error konsisten:** objek JSON dengan `code` (mis. `INSUFFICIENT_BALANCE`), `message`, dan `request_id`.
- **Pagination cursor-based** untuk mutasi (bukan offset).
- **Waktu lewat interface `Clock`** agar mudah di-test.
- **Test:** table-driven untuk unit; integration test dengan Postgres asli (testcontainers). Jalankan `go test -race ./...`.
- **Migrasi:** file `up/down` berurutan, jangan edit migrasi yang sudah dijalankan.
- **Lint:** `go vet`, `golangci-lint`, `gofmt` wajib lolos di CI.
- **Hindari over-engineering:** tanpa framework DI, tanpa layer abstraksi berlebih, tanpa microservice selain Bank B.

## 8. Data model inti

| Tabel | Isi | Sprint |
| --- | --- | --- |
| `users` | identitas, password\_hash, pin\_hash, status | 1 |
| `refresh_tokens` | token\_hash, family\_id, device\_id, expires\_at, revoked\_at, replaced\_by | 1 |
| `accounts` | account\_number, balance, user\_id, status | 3 |
| `transactions` | idempotency\_key, type, status, amount, from/to | 4 |
| `ledger_entries` | transaction\_id, account\_id, direction, amount, balance\_after | 4 |
| `topups` | order\_id Midtrans, status, amount, payload | 7 |
| `interbank_transfers` | bank\_code, rekening tujuan, ref eksternal, status | 9 |
| `devices` | user\_id, platform, nama perangkat, push\_token, last\_seen | 10 |
| `notifications` | user\_id, type, title, body, data, sent\_at, read\_at (outbox + riwayat) | 10 |
| `device_credentials` | device\_id, public\_key, algoritma, last\_used\_at, revoked\_at | 11 |
| `auth_challenges` | challenge sekali pakai, purpose (login/transfer), payload\_hash, expires\_at | 11 |

Bank B memiliki skema sendiri: `users`, `accounts`, `transactions`, `ledger_entries`.

## 9. Endpoint API (v1)

| Area | Endpoint |
| --- | --- |
| Auth | `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `POST /v1/auth/logout-all` |
| User | `GET /v1/users/me`, `PUT /v1/users/me/pin` |
| Rekening | `POST /v1/accounts`, `GET /v1/accounts`, `GET /v1/accounts/{id}`, `GET /v1/accounts/{id}/mutations` |
| Transfer | `POST /v1/transfers/inquiry`, `POST /v1/transfers` (konfirmasi dengan PIN atau tanda tangan biometrik), `GET /v1/transfers/{id}` |
| Topup | `POST /v1/topups`, `GET /v1/topups/{id}`, `POST /v1/webhooks/midtrans` |
| Perangkat | `POST /v1/devices`, `PUT /v1/devices/{id}/push-token`, `DELETE /v1/devices/{id}` |
| Biometrik (FIDO) | `POST /v1/devices/{id}/credentials/challenge`, `POST /v1/devices/{id}/credentials`, `POST /v1/auth/biometric/challenge`, `POST /v1/auth/biometric/verify` |
| Notifikasi | `GET /v1/notifications`, `POST /v1/notifications/{id}/read`, `POST /v1/notifications/read-all` |
| Antar bank (di Bank B) | `POST /interbank/v1/inquiry`, `POST /interbank/v1/transfer`, `GET /interbank/v1/transfer/{ref}` |
| Ops | `GET /healthz`, `GET /readyz` |

## 10. Roadmap: MVP dan Sprint

Asumsi: **1 sprint = 1 minggu** (kerja part-time, boleh diperlebar). Urutan sengaja dari fondasi ke bagian paling berisiko, dengan demo kecil di akhir tiap MVP.

### MVP 1: Fondasi dan Identitas (Sprint 0-2)

**Demo:** user bisa daftar, login, refresh token, dan set PIN.

#### Sprint 0: Setup

- `go mod`, struktur folder, Makefile (`run`, `migrate`, `sqlc`, `test`, `lint`).
- Docker Compose Postgres, golang-migrate, sqlc.
- Config env, slog, graceful shutdown, `GET /healthz` dan `/readyz`.
- golangci-lint + GitHub Actions (vet, lint, test).
- **DoD:** `make run` menjalankan server, `/healthz` 200, CI hijau.

#### Sprint 1: Register dan Login

- Migrasi `users`, `refresh_tokens`.
- Register: validasi input, hash argon2id, email/telepon unik.
- Login: JWT access (15 menit) + refresh token (disimpan hash, satu keluarga token per perangkat, rotasi tiap refresh, reuse detection: token lama dipakai ulang = keluarga dicabut).
- Middleware auth, rate limit login, format error konsisten.
- **DoD:** unit test service + integration test handler lulus.

#### Sprint 2: Profil, PIN, Hardening

- `GET /users/me`, set/ubah PIN (hash), logout (revoke refresh token).
- Lockout PIN setelah N kali gagal.
- Middleware: request ID, panic recovery, access log, CORS, security header.
- OpenAPI awal.
- **DoD:** alur auth terdokumentasi dan teruji via Postman/Bruno.

### MVP 2: Rekening dan Ledger (Sprint 3-4)

**Demo:** user membuat rekening, melihat saldo dan mutasi.

#### Sprint 3: Rekening

- Migrasi `accounts`.
- Generator nomor rekening (kode bank + angka acak + check digit), retry bila bentrok `UNIQUE`.
- `POST /accounts` (batas rekening per user), `GET /accounts`, detail dengan cek kepemilikan.
- **DoD:** user lain tidak bisa mengakses rekening orang (test IDOR).

#### Sprint 4: Ledger dan Mutasi

- Migrasi `transactions`, `ledger_entries`.
- Helper `WithTx` dan fungsi internal pencatatan ledger.
- `GET /accounts/{id}/mutations` dengan cursor pagination.
- Perintah CLI dev-only untuk mengisi saldo (sebelum topup ada).
- **DoD:** test invarian: saldo rekening = jumlah kredit - jumlah debit di ledger.

### MVP 3: Transfer Sesama Bank (Sprint 5-6)

**Demo:** transfer antar dua user di Bank A, aman dari request ganda dan balapan.

#### Sprint 5: Transfer Inti

- `POST /transfers/inquiry`: cek rekening tujuan, nama penerima disamarkan.
- `POST /transfers`: verifikasi PIN, `Idempotency-Key`, satu transaksi DB: lock dua rekening urut ID, cek saldo, update saldo, tulis 2 entri ledger, status `success`.
- Aturan: bukan ke rekening sendiri, nominal min/max.
- `GET /transfers/{id}`.
- **DoD:** transfer sukses/gagal tercatat benar; saldo tidak pernah negatif.

#### Sprint 6: Concurrency dan Reliabilitas

- Test paralel: 50 goroutine transfer dari satu rekening, saldo akhir harus tepat.
- Test deadlock: A->B dan B->A bersamaan.
- Test idempotency: replay mengembalikan respons sama; payload beda dengan key sama ditolak.
- Limit harian, rate limit transfer.
- Job pengecekan invarian ledger vs saldo.
- **DoD:** `go test -race` lulus; tidak ada deadlock pada skenario uji.

### MVP 4: Topup Midtrans (Sprint 7)

**Demo:** topup via Midtrans sandbox menambah saldo.

#### Sprint 7: Topup

- Migrasi `topups`.
- `POST /topups`: buat transaksi Snap sandbox, status `pending`, kembalikan token/redirect URL.
- `POST /webhooks/midtrans`: verifikasi signature SHA512 (`order_id + status_code + gross_amount + server_key`), cocokkan nominal, proses **idempoten**.
- `settlement` -> kredit saldo + ledger dalam satu transaksi. `expire/cancel/deny` -> `failed`.
- `GET /topups/{id}`, fallback cek status ke API Midtrans.
- Dev lokal: ngrok/cloudflared untuk webhook.
- **DoD:** webhook dikirim dua kali, saldo bertambah sekali; signature palsu ditolak.

### MVP 5: Transfer Antar Bank (Sprint 8-9)

**Demo:** transfer dari Bank A ke rekening di external partner bank, termasuk skenario sukses, gagal, dan timeout.

#### Sprint 8: Integrasi Client & Simulasi Mock Partner Bank

- Modul `internal/interbank`: HTTP client ke API bank mitra (`inquiry`, `transfer` idempoten berdasar ref, `status`).
- Autentikasi antar service: HMAC-SHA256 + timestamp (anti replay) + secret per bank.
- Test fixture / mock server (`httptest.Server`) untuk mensimulasikan respon partner bank (sukses, rekening tidak ditemukan, invalid signature, error 500).
- **DoD:** client Bank A bisa mengirim payload ber-signature valid, memverifikasi respon partner, dan meng-handle skenario penolakan/error.

#### Sprint 9: Saga Transfer Keluar & Rekonsiliasi

- Migrasi `interbank_transfers`.
- Alur saga: tahan dana (debit ke rekening penampung internal, status `pending`) -> panggil partner bank (timeout via `context`, retry dengan idempotency key sama) -> sukses: finalisasi (`settled`); gagal: reversal ledger (kembalikan dana ke user).
- Timeout/tidak jelas: tetap `pending`, worker rekonsiliasi cek status ke partner bank secara berkala.
- **DoD:** test skenario partner bank mati, timeout, balasan duplikat, dan gagal; saldo internal Bank A selalu konsisten (double-entry).

### MVP 6: Notifikasi dan Biometrik (Sprint 10-11)

**Demo:** transfer masuk memunculkan push di perangkat; login dan konfirmasi transfer memakai biometrik.

#### Sprint 10: Push Notification

- Migrasi `devices`, `notifications`.
- Registrasi perangkat + push token FCM (`POST /devices`), perbarui token saat berubah.
- Pola **outbox:** event ditulis dalam transaksi DB yang sama dengan transfer/topup. Worker membaca outbox setelah commit, mengirim via FCM (retry + backoff), lalu menandai `sent_at`.
- Event: transfer masuk/keluar, topup sukses/gagal, antar bank selesai/gagal, login dari perangkat baru.
- Riwayat in-app: `GET /notifications`, tandai dibaca. Hapus token tidak valid saat FCM membalas token tidak terdaftar.
- Isi push tanpa data sensitif (tidak memuat nomor rekening lengkap).
- **DoD:** push gagal tidak membatalkan transfer; worker teruji untuk sukses, gagal, retry, dan token tidak valid.

#### Sprint 11: Biometrik On-Device (FIDO)

- Konsep: biometrik hanya membuka kunci privat di Secure Enclave/Keystore perangkat. Server tidak pernah menerima data biometrik; ia menyimpan **public key** dan memverifikasi tanda tangan atas challenge.
- Migrasi `device_credentials`, `auth_challenges`.
- Enrollment: user yang sudah terautentikasi (PIN) mendaftarkan public key perangkat. Challenge sekali pakai, kedaluwarsa pendek (mis. 2 menit).
- Login biometrik: `challenge` -> app menandatangani -> `verify` -> server menerbitkan access + refresh token.
- Konfirmasi transfer: challenge terikat ke payload transaksi (nominal + rekening tujuan), sehingga tanda tangan tidak bisa dipakai untuk transaksi lain. PIN tetap fallback.
- Keputusan di awal sprint: (a) kunci perangkat ECDSA + challenge-response (lebih sederhana, default), atau (b) FIDO2/passkey penuh dengan `go-webauthn`.
- Cabut kredensial saat logout-all atau perangkat dihapus.
- **DoD:** challenge tidak bisa dipakai dua kali; tanda tangan transaksi A ditolak untuk transaksi B; kredensial dicabut = login biometrik gagal.

### MVP 7: Integrasi dan Kesiapan Rilis (Sprint 12)

#### Sprint 12: Integrasi dan Hardening

- OpenAPI final, integrasi dengan app mobile.
- Observability: metrics Prometheus, readiness check, log terstruktur.
- Review keamanan (checklist bagian 12), pen-test ringan.
- Dockerfile multi-stage, deploy sandbox (Fly.io/Railway/VPS).
- README, ERD, catatan keputusan desain (ADR).
- **DoD:** alur end-to-end dari mobile berjalan di environment deploy.

## 11. Definition of Done (berlaku semua sprint)

- Test unit + integrasi lulus, `go test -race ./...` hijau.
- `go vet` dan `golangci-lint` bersih, CI hijau.
- Migrasi up/down teruji.
- Endpoint baru tercatat di OpenAPI.
- Tidak ada secret di repo; log bebas data sensitif.
- Edge case uang (saldo kurang, nominal 0/negatif, request ganda) punya test.

## 12. Checklist keamanan

- Password argon2id; PIN di-hash; token refresh disimpan sebagai hash.
- Rate limit pada login, PIN, transfer, dan endpoint publik.
- Validasi dan batasi ukuran semua input; query hanya lewat sqlc/parameter.
- Cek kepemilikan resource di setiap endpoint.
- Verifikasi signature webhook dan panggilan antar bank.
- CORS ketat, HTTPS, security header, secret dari environment.
- Audit trail: setiap transaksi punya request ID dan jejak ledger.

* Biometrik: hanya public key yang disimpan; challenge sekali pakai, singkat, dan terikat konteks (login atau transaksi tertentu).
* Push: payload tanpa data rahasia; token perangkat dicabut saat logout atau perangkat dihapus.

## 13. Risiko dan catatan

| Risiko | Mitigasi |
| --- | --- |
| Belajar Go dan backend bersamaan | Belajar Go secukupnya di Sprint 0-1, sisanya sambil membangun |
| Race condition saldo | Row lock + test paralel di Sprint 6 |
| Webhook Midtrans terkirim ganda/telat | Idempotensi + status `pending` + cek status manual |
| Bank B timeout saat transfer | Saga + status `pending` + worker rekonsiliasi |
| Scope membengkak | Patuhi daftar out-of-scope, tambahkan hanya setelah MVP 5 selesai |

## 14. Referensi belajar

- Tour of Go, Go by Example, Effective Go.
- *Designing Data-Intensive Applications* (bab transaksi dan konsistensi).
- Dokumentasi Midtrans Snap dan HTTP notification.
- Artikel double-entry bookkeeping untuk engineer.
