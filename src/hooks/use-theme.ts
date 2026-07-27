import { useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore, AccentPalettes } from '@/store/useThemeStore';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const accentColor = useThemeStore((state) => state.accentColor);
  const loadThemeSettings = useThemeStore((state) => state.loadThemeSettings);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const scheme = themeMode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  const baseTheme = Colors[scheme];
  const palette = AccentPalettes[accentColor] || AccentPalettes['Purple'];
  const accentHex = scheme === 'dark' ? palette.dark : palette.light;
  const pillHex = scheme === 'dark' ? palette.darkPill : palette.lightPill;

  return {
    ...baseTheme,
    accent: accentHex,
    chipActive: accentHex,
    tabBarIconSelected: accentHex,
    tabBarPill: pillHex,
    accentLight: scheme === 'dark' ? `${accentHex}26` : `${accentHex}1F`,
  };
}
