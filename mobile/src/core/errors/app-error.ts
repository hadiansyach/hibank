export interface BackendErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: string[];
  };
}

export class AppError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly details?: string[];
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      requestId?: string;
      details?: string[];
      statusCode?: number;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code || 'UNKNOWN_ERROR';
    this.requestId = options?.requestId;
    this.details = options?.details;
    this.statusCode = options?.statusCode;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static fromBackend(backendError: BackendErrorResponse['error'], statusCode?: number): AppError {
    return new AppError(backendError.message, {
      code: backendError.code,
      requestId: backendError.request_id,
      details: backendError.details,
      statusCode,
    });
  }

  static networkError(message = 'Tidak dapat terhubung ke server perbankan'): AppError {
    return new AppError(message, {
      code: 'NETWORK_ERROR',
    });
  }

  static unauthorized(message = 'Sesi Anda telah berakhir, silakan login kembali'): AppError {
    return new AppError(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  static securityBreach(message: string): AppError {
    return new AppError(message, {
      code: 'SECURITY_INTEGRITY_FAILED',
    });
  }
}

