import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import NowPlayingModal from '@/components/now-playing-modal';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  const customTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: Colors[theme].accent,
      background: Colors[theme].background,
      card: Colors[theme].backgroundElement,
      text: Colors[theme].text,
      border: Colors[theme].cardBorder,
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <StatusBar style="auto" />
      <AnimatedSplashOverlay />
      <AppTabs />
      <NowPlayingModal />
    </ThemeProvider>
  );
}
