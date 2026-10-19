import { useAuthStore } from '../presentation/controllers/useAuthStore';
import { logoutUseCase } from '../data';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
  const clearSession = useAuthStore((state) => state.clearSession);

  const logout = async () => {
    await logoutUseCase.execute();
    clearSession();
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    checkAuthStatus,
    logout,
  };
}
