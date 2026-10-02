import 'react-native-url-polyfill/auto';
// Pure JS polyfill for crypto.getRandomValues to avoid native module rebuild
if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = {};
}
if (typeof (globalThis as any).crypto.getRandomValues === 'undefined') {
    (globalThis as any).crypto.getRandomValues = function (array: any) {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    };
}

// @ts-ignore
import { TextEncoder, TextDecoder } from 'text-encoding';

if (typeof globalThis.TextEncoder === 'undefined') {
    (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
    (globalThis as any).TextDecoder = TextDecoder as any;
}

import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import TrackPlayer from '@rntp/player';
import { Colors } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import NowPlayingModal from '@/components/now-playing-modal';
import MiniPlayer from '@/components/mini-player';
import { PoTokenWebView } from '@/components/po-token-webview';
import { PoTokenManager } from '@/services/PoTokenManager';
import { initDB } from '@/services/db';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { setupPlayer, playbackService, backgroundPlaybackService } from '@/services/playbackService';
import { cancelAllActiveDownloadNotifications } from '@/services/downloader';

TrackPlayer.registerBackgroundEventHandler(() => backgroundPlaybackService);



export default function TabLayout() {
  const loadStoreData = usePlaybackStore((state) => state.loadStoreData);
  const isPoTokenWebViewVisible = usePlaybackStore((state) => state.isPoTokenWebViewVisible);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const init = async () => {
      await cancelAllActiveDownloadNotifications();
      await initDB();
      await loadStoreData();
      try {
        const { useThemeStore } = require('@/store/useThemeStore');
        await useThemeStore.getState().loadThemeSettings();
      } catch (tErr) {
        console.error("Failed to load theme settings:", tErr);
      }
      try {
        await setupPlayer();
        playbackService();
        await usePlaybackStore.getState().syncWithNativePlayer();
      } catch (err) {
        console.error("Failed to setup player in _layout:", err);
      }
    };
    init();

    // Auto-close PoTokenWebView to save RAM -- but ONLY when it is safe:
    // never while a mint is in flight, and never when we still lack a fresh
    // token (killing the minter then just forces a cold remount on next play).
    const timer = setTimeout(() => {
      const tokenSecured = PoTokenManager.isSessionTokenFresh();
      const minting = PoTokenManager.isMinting();
      const givenUp = PoTokenManager.isCircuitBreakerTripped();
      const st = usePlaybackStore.getState();
      if (st.isPoTokenWebViewVisible && !minting && (tokenSecured || givenUp)) {
        console.log('[Layout] Auto-closing PoTokenWebView to save RAM (token secured or minting abandoned)');
        usePlaybackStore.setState({ isPoTokenWebViewVisible: false });
      } else {
        console.log(
          '[Layout] Keeping PoTokenWebView mounted ' +
          `(visible=${st.isPoTokenWebViewVisible}, minting=${minting}, tokenFresh=${tokenSecured})`
        );
      }
    }, 30000);

    // Sync Zustand state when app returns to foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        usePlaybackStore.getState().syncWithNativePlayer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      clearTimeout(timer);
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
      <MiniPlayer />
      <NowPlayingModal />
      {isPoTokenWebViewVisible && <PoTokenWebView />}
    </ThemeProvider>
  );
}
