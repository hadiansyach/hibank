import { AppError } from './app-error';

export interface ParsedError {
  title: string;
  message: string;
  details: string[];
  fieldErrors: Record<string, string>;
}

export const parseBackendError = (error: unknown): ParsedError => {
  const result: ParsedError = {
    title: 'Terjadi Kesalahan',
    message: 'Silakan periksa kembali input Anda atau coba beberapa saat lagi.',
    details: [],
    fieldErrors: {},
  };

  if (!(error instanceof AppError)) {
    if (error instanceof Error) {
      result.message = error.message;
    }
    return result;
  }

  // 1. Map known error codes to friendly titles & messages
  switch (error.code) {
    case 'VALIDATION_FAILED':
      result.title = 'Validasi Formulir Gagal';
      result.message = 'Harap perbaiki kolom yang belum sesuai:';
      break;
    case 'EMAIL_ALREADY_EXISTS':
      result.title = 'Email Sudah Terdaftar';
      result.message = 'Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
      result.fieldErrors.email = 'Email sudah digunakan oleh akun lain';
      break;
    case 'PHONE_ALREADY_EXISTS':
      result.title = 'Nomor Ponsel Sudah Terdaftar';
      result.message = 'Nomor ponsel ini sudah terdaftar pada akun lain.';
      result.fieldErrors.phone = 'Nomor ponsel sudah terdaftar';
      break;
    case 'INVALID_CREDENTIALS':
      result.title = 'Login Gagal';
      result.message = 'Email atau kata sandi yang Anda masukkan salah.';
      result.fieldErrors.password = 'Email atau kata sandi tidak sesuai';
      break;
    case 'RATE_LIMIT_EXCEEDED':
      result.title = 'Terlalu Banyak Permintaan';
      result.message = 'Aktivitas melebihi batas yang diizinkan. Silakan tunggu beberapa saat.';
      break;
    case 'PIN_LOCKED':
      result.title = 'PIN Terkunci';
      result.message = 'PIN Anda terkunci selama 15 menit karena 3x percobaan salah berturut-turut.';
      result.fieldErrors.pin = 'PIN terkunci 15 menit';
      break;
    case 'INVALID_PIN':
      result.title = 'PIN Tidak Sesuai';
      result.message = 'PIN transaksi yang Anda masukkan salah.';
      result.fieldErrors.pin = 'PIN transaksi tidak sesuai';
      break;
    case 'PIN_MISMATCH':
      result.title = 'PIN Lama Salah';
      result.message = 'PIN lama atau kata sandi verifikasi tidak sesuai.';
      result.fieldErrors.oldPin = 'PIN lama tidak sesuai';
      break;
    case 'ACCOUNT_LIMIT_EXCEEDED':
      result.title = 'Batas Kuota Tercapai';
      result.message = 'Anda telah mencapai batas maksimal 3 rekening tabungan aktif.';
      break;
    case 'INSUFFICIENT_BALANCE':
      result.title = 'Saldo Tidak Mencukupi';
      result.message = 'Saldo rekening sumber tidak mencukupi untuk nominal transfer ini.';
      result.fieldErrors.amount = 'Saldo tidak mencukupi';
      break;
    case 'TARGET_ACCOUNT_NOT_FOUND':
      result.title = 'Rekening Tidak Ditemukan';
      result.message = 'Nomor rekening tujuan tidak terdaftar di sistem HiBank.';
      result.fieldErrors.targetAccountNumber = 'Nomor rekening tidak ditemukan';
      break;
    case 'SAME_ACCOUNT_TRANSFER':
      result.title = 'Transfer Tidak Valid';
      result.message = 'Tidak dapat melakukan transfer ke nomor rekening sendiri.';
      result.fieldErrors.targetAccountNumber = 'Tidak dapat transfer ke rekening sendiri';
      break;
    case 'DAILY_LIMIT_EXCEEDED':
      result.title = 'Limit Harian Tercapai';
      result.message = 'Akumulasi transfer keluar hari ini melebihi batas maksimal Rp 25.000.000.';
      break;
    default:
      result.title = error.code ? error.code.replace(/_/g, ' ') : 'Pemberitahuan';
      result.message = error.message || result.message;
      break;
  }

  // 2. Map details array to field-specific errors
  if (error.details && Array.isArray(error.details) && error.details.length > 0) {
    result.details = error.details;

    error.details.forEach((detail) => {
      const lower = detail.toLowerCase();
      if (lower.includes('phone') || lower.includes('ponsel') || lower.includes('telepon')) {
        result.fieldErrors.phone = detail;
      } else if (lower.includes('email')) {
        result.fieldErrors.email = detail;
      } else if (lower.includes('full_name') || lower.includes('name') || lower.includes('nama')) {
        result.fieldErrors.fullName = detail;
      } else if (lower.includes('password') || lower.includes('sandi')) {
        result.fieldErrors.password = detail;
      } else if (lower.includes('pin')) {
        result.fieldErrors.pin = detail;
      } else if (lower.includes('amount') || lower.includes('nominal')) {
        result.fieldErrors.amount = detail;
      }
    });
  }

  return result;
};
