import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import NowPlayingModal from '@/components/now-playing-modal';

import { initDB } from '@/services/db';
import { usePlaybackStore } from '@/store/usePlaybackStore';

export default function TabLayout() {
  const loadStoreData = usePlaybackStore((state) => state.loadStoreData);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const init = async () => {
      await initDB();
      await loadStoreData();
    };
    init();
  }, []);

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="collection" />
        <Stack.Screen name="playlist" />
        <Stack.Screen name="artist" />
      </Stack>
      <NowPlayingModal />
    </ThemeProvider>
  );
}
