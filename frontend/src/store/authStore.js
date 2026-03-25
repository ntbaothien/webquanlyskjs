import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axiosInstance from '../utils/axiosInstance';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await axiosInstance.post('/auth/login', { email, password });
          if (data.data.requires2FA) {
            set({ isLoading: false });
            return { requires2FA: true, userId: data.data.userId };
          }
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          set({ user: data.data.user, accessToken: data.data.accessToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (fullName, email, password, phone) => {
        set({ isLoading: true });
        try {
          const { data } = await axiosInstance.post('/auth/register', { fullName, email, password, phone });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          set({ user: data.data.user, accessToken: data.data.accessToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await axiosInstance.post('/auth/logout'); } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null });
      },

      updateUser: (user) => set({ user }),
      setLoading: (v) => set({ isLoading: v }),
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user }) }
  )
);

export default useAuthStore;
