import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import TrackPlayer from '@rntp/player';
import { Colors } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import NowPlayingBottomSheet from '@/components/now-playing-bottom-sheet';

import { initDB } from '@/services/db';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { setupPlayer, playbackService, backgroundPlaybackService } from '@/services/playbackService';

TrackPlayer.registerBackgroundEventHandler(() => backgroundPlaybackService);



export default function TabLayout() {
  const loadStoreData = usePlaybackStore((state) => state.loadStoreData);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const init = async () => {
      await initDB();
      await loadStoreData();
      try {
        await setupPlayer();
        playbackService();
        await usePlaybackStore.getState().syncWithNativePlayer();
      } catch (err) {
        console.error("Failed to setup player in _layout:", err);
      }
    };
    init();

    // Sync Zustand state when app returns to foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        usePlaybackStore.getState().syncWithNativePlayer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
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
        <Stack.Screen name="download-manager" />
      </Stack>
      <NowPlayingBottomSheet />
    </ThemeProvider>
  );
}
