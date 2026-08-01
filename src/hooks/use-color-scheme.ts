import { useColorScheme as RNUseColorScheme } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';

export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = RNUseColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  if (themeMode === 'light') return 'light';
  if (themeMode === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
