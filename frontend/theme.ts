/**
 * Theme Store - manages light/dark mode (Zustand)
 */
import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark }))
}));

export const colors = {
  light: {
    primary: '#137fec',
    background: '#f6f7f8',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0'
  },
  dark: {
    primary: '#137fec',
    background: '#101922',
    surface: '#0f172a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#1f2937'
  },
  status: {
    retraction: '#ef4444',
    correction: '#f59e0b',
    original: '#22c55e',
    inciting: '#137fec'
  }
};

export const getColors = (isDark: boolean) => isDark ? colors.dark : colors.light;
