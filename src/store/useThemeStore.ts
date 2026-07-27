import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColorName = 'Purple' | 'Ocean Blue' | 'Emerald Green' | 'Rose Red' | 'Amber Gold';

export interface AccentTheme {
  light: string;
  dark: string;
  lightPill: string;
  darkPill: string;
}

export const AccentPalettes: Record<AccentColorName, AccentTheme> = {
  'Purple': {
    light: '#7c3aed',
    dark: '#d7baff',
    lightPill: '#e8e2f7',
    darkPill: '#3C354B',
  },
  'Ocean Blue': {
    light: '#0284c7',
    dark: '#38bdf8',
    lightPill: '#e0f2fe',
    darkPill: '#0c4a6e',
  },
  'Emerald Green': {
    light: '#059669',
    dark: '#34d399',
    lightPill: '#d1fae5',
    darkPill: '#064e3b',
  },
  'Rose Red': {
    light: '#e11d48',
    dark: '#fb7185',
    lightPill: '#ffe4e6',
    darkPill: '#881337',
  },
  'Amber Gold': {
    light: '#d97706',
    dark: '#fbbf24',
    lightPill: '#fef3c7',
    darkPill: '#78350f',
  },
};

interface ThemeState {
  themeMode: ThemeMode;
  accentColor: AccentColorName;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setAccentColor: (color: AccentColorName) => Promise<void>;
  loadThemeSettings: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  accentColor: 'Purple',

  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    try {
      await AsyncStorage.setItem('settings_theme_mode', mode);
    } catch (err) {
      console.error('[ThemeStore] Failed to save theme mode:', err);
    }
  },

  setAccentColor: async (color) => {
    set({ accentColor: color });
    try {
      await AsyncStorage.setItem('settings_accent_color', color);
    } catch (err) {
      console.error('[ThemeStore] Failed to save accent color:', err);
    }
  },

  loadThemeSettings: async () => {
    try {
      const mode = await AsyncStorage.getItem('settings_theme_mode');
      const color = await AsyncStorage.getItem('settings_accent_color');
      set({
        themeMode: (mode as ThemeMode) || 'system',
        accentColor: (color as AccentColorName) || 'Purple',
      });
    } catch (err) {
      console.error('[ThemeStore] Failed to load theme settings:', err);
    }
  },
}));
