import { argon2id } from '@noble/hashes/argon2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { ENV } from '../config/env';

export interface Argon2Options {
  salt?: Uint8Array | string;
  iterations?: number;
  memoryKiB?: number;
  parallelism?: number;
  keyLength?: number;
}

export interface Argon2RawResult {
  /** Raw hexadecimal hash string - strictly NO prefix ($argon2id$...) and NO suffix */
  rawHashHex: string;
  /** Raw salt in hexadecimal format used during computation */
  saltHex: string;
}

/**
 * Computes an Argon2id hash without any standard PHC prefix or suffix.
 * Returns only the raw cryptographic hash digest in hex string format.
 *
 * @param input - The raw string or byte array to hash (e.g. PIN or password)
 * @param options - Configurable Argon2 parameters (iterations, memory, parallelism, salt)
 * @returns Argon2RawResult containing rawHashHex and saltHex
 */
export function hashArgon2idRaw(
  input: string | Uint8Array,
  options?: Argon2Options
): Argon2RawResult {
  const encoder = new TextEncoder();
  const inputBytes = typeof input === 'string' ? encoder.encode(input) : input;

  let saltBytes: Uint8Array;
  if (!options?.salt) {
    saltBytes = randomBytes(16);
  } else if (typeof options.salt === 'string') {
    saltBytes = encoder.encode(options.salt);
  } else {
    saltBytes = options.salt;
  }

  const iterations = options?.iterations ?? ENV.ARGON2_PARAMS.iterations;
  const memory = options?.memoryKiB ?? ENV.ARGON2_PARAMS.memoryKiB;
  const parallelism = options?.parallelism ?? ENV.ARGON2_PARAMS.parallelism;
  const dkLen = options?.keyLength ?? ENV.ARGON2_PARAMS.keyLength;

  const derivedHashBytes = argon2id(inputBytes, saltBytes, {
    t: iterations,
    m: memory,
    p: parallelism,
    dkLen,
  });

  // Convert strictly to raw hex representation without any prefix or suffix
  const rawHashHex = bytesToHex(derivedHashBytes);
  const saltHex = bytesToHex(saltBytes);

  return {
    rawHashHex,
    saltHex,
  };
}

/**
 * Verifies if an input matches a target raw hex hash using the given salt.
 */
export function verifyArgon2idRaw(
  input: string | Uint8Array,
  saltHex: string,
  targetRawHashHex: string,
  options?: Omit<Argon2Options, 'salt'>
): boolean {
  const saltBytes = hexToBytes(saltHex);
  const { rawHashHex } = hashArgon2idRaw(input, { ...options, salt: saltBytes });

  // Constant-time comparison
  if (rawHashHex.length !== targetRawHashHex.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < rawHashHex.length; i++) {
    result |= rawHashHex.charCodeAt(i) ^ targetRawHashHex.charCodeAt(i);
  }

  return result === 0;
}
