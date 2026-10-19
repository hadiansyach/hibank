import { useMutation } from '@tanstack/react-query';
import { hashPinUseCase, authRepository } from '../../data';

export interface SetPinArgs {
  pin: string;
  salt?: string;
}

export function useSetPinMutation() {
  return useMutation({
    mutationFn: async ({ pin, salt }: SetPinArgs) => {
      // 1. Hash PIN client-side with Argon2id (No prefix, No suffix)
      const { rawHashHex } = hashPinUseCase.execute(pin, salt);

      // 2. Submit the PIN / raw hash to backend
      const result = await authRepository.savePin(pin);

      return {
        ...result,
        clientRawHashHex: rawHashHex,
      };
    },
  });
}
