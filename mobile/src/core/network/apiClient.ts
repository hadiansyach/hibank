import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENV } from "../config/env";
import { secureStorage, SecureStorageKeys } from "../storage/secureStorage";

export interface ApiBackendError {
  code: string;
  message: string;
  request_id?: string;
  details?: string[];
}

export interface ApiErrorResponse {
  error?: ApiBackendError;
  message?: string;
}

export class AppApiError extends Error {
  code: string;
  statusCode?: number;
  details?: string[];

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    statusCode?: number,
    details?: string[],
  ) {
    super(message);
    this.name = "AppApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach dynamic base URL, bearer token, and unique X-Request-ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = ENV.API_BASE_URL;

    const token = await secureStorage.getItem(SecureStorageKeys.AUTH_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add X-Request-ID for tracking as recommended in API.md
    if (config.headers && !config.headers["X-Request-ID"]) {
      const uuid =
        "req_" +
        Math.random().toString(36).substring(2, 11) +
        Date.now().toString(36);
      config.headers["X-Request-ID"] = uuid;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Response Interceptor: Parse Go backend error response according to API.md section 3
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const errorData = error.response?.data;
    const backendError = errorData?.error;
    const statusCode = error.response?.status;

    let userFriendlyMessage =
      "Terjadi kesalahan pada jaringan. Silakan coba lagi.";
    let errorCode = "NETWORK_ERROR";
    let details: string[] | undefined = undefined;

    if (backendError) {
      errorCode = backendError.code || "UNKNOWN_ERROR";
      details = backendError.details;

      switch (backendError.code) {
        case "INVALID_CREDENTIALS":
          userFriendlyMessage =
            "Email atau kata sandi yang Anda masukkan salah.";
          break;
        case "EMAIL_ALREADY_EXISTS":
          userFriendlyMessage =
            "Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
          break;
        case "PHONE_ALREADY_EXISTS":
          userFriendlyMessage =
            "Nomor handphone ini sudah terdaftar pada akun lain.";
          break;
        case "VALIDATION_FAILED":
          userFriendlyMessage =
            details && details.length > 0
              ? `Validasi gagal: ${details.join(", ")}`
              : backendError.message || "Data yang dimasukkan tidak valid.";
          break;
        case "TOKEN_EXPIRED":
        case "INVALID_TOKEN":
        case "UNAUTHORIZED":
          userFriendlyMessage =
            "Sesi Anda telah berakhir. Silakan masuk kembali.";
          break;
        case "ACCOUNT_SUSPENDED":
          userFriendlyMessage =
            "Akun Anda sedang dinonaktifkan. Silakan hubungi layanan pelanggan.";
          break;
        case "RATE_LIMIT_EXCEEDED":
          userFriendlyMessage =
            "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.";
          break;
        case "INTERNAL_ERROR":
          userFriendlyMessage =
            "Terjadi kendala pada sistem server. Silakan coba beberapa saat lagi.";
          break;
        default:
          userFriendlyMessage = backendError.message || userFriendlyMessage;
      }
    } else if (
      error.message.includes("Network Error") ||
      error.code === "ERR_NETWORK"
    ) {
      userFriendlyMessage = `Tidak dapat terhubung ke server backend (${ENV.API_BASE_URL}). Pastikan server backend sedang aktif.`;
    } else if (error.message.includes("timeout")) {
      userFriendlyMessage =
        "Waktu permintaan habis (timeout). Silakan periksa koneksi Anda.";
    } else if (error.message) {
      userFriendlyMessage = error.message;
    }

    return Promise.reject(
      new AppApiError(userFriendlyMessage, errorCode, statusCode, details),
    );
  },
);
