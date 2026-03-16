import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

export type UserRole = 'SUPER_ADMIN' | 'PROMOTION_MANAGER' | 'SALES_AGENT' | 'PARTNER' | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginAsPartner: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = res.data;

          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
          }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      loginAsPartner: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/partners/login', { email, password });
          const { partner, accessToken } = res.data;

          const user: AuthUser = {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            role: 'PARTNER',
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken);
          }

          set({
            user,
            accessToken,
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch {}

        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'portalon-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
