import { create } from 'zustand';
import { User, AuthSession } from '../../domain/entities/user';
import { authRepository } from '../../data';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session: AuthSession) => {
    set({
      user: session.user,
      token: session.token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearSession: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuthStatus: async () => {
    try {
      const session = await authRepository.getCurrentSession();
      if (session) {
        set({
          user: session.user,
          token: session.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
