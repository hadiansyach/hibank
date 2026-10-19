import { useMutation } from '@tanstack/react-query';
import { registerUseCase } from '../../data';
import { RegisterParams } from '../../domain/repositories/authRepository';

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      return registerUseCase.execute(params);
    },
  });
}
