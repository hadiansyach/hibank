import { hashArgon2idRaw, Argon2RawResult } from '@/core/crypto/argon2';

export class HashPinUseCase {
  /**
   * Hashes a 6-digit transaction PIN using Argon2id.
   * Produces a clean raw hex string without any '$argon2id$...' prefix or PHC suffix.
   */
  execute(pin: string, salt?: string): Argon2RawResult {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }
    return hashArgon2idRaw(pin, {
      salt,
      iterations: 2,
      memoryKiB: 19456,
      parallelism: 1,
      keyLength: 32,
    });
  }
}
