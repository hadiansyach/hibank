import { useMutation } from '@tanstack/react-query';
import { loginUseCase } from '../../data';
import { LoginParams } from '../../domain/repositories/authRepository';
import { useAuthStore } from '../controllers/useAuthStore';

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (params: LoginParams) => {
      return loginUseCase.execute(params);
    },
    onSuccess: (session) => {
      setSession(session);
    },
  });
}
