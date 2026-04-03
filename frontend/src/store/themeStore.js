import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light'

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      initTheme: () => {
        const theme = get().theme;
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    { name: 'eventhub-theme', partialize: (s) => ({ theme: s.theme }) }
  )
);

export default useThemeStore;
