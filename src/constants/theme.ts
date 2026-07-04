/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#121316',
    background: '#f5f6f8',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#5d6066',
    accent: '#7c3aed',
    accentLight: 'rgba(124, 58, 237, 0.12)',
    chipActive: '#7c3aed',
    chipActiveText: '#ffffff',
    chipInactive: '#ffffff',
    chipInactiveText: '#5d6066',
    divider: 'rgba(0, 0, 0, 0.08)',
    playIconColor: '#ffffff',
    cardBorder: 'rgba(0, 0, 0, 0.04)',
    pulseDot: '#ef4444',
    tabBarBackground: '#ffffff',
    tabBarPill: '#e8e2f7',
    tabBarIconSelected: '#7c3aed',
    tabBarIconUnselected: '#60646c',
    tabBarRipple: 'rgba(124, 58, 237, 0.15)',
    miniPlayerBackground: 'rgba(255, 255, 255, 0.95)',
    dismissButtonBackground: '#e2e8f0',
    audioIconBackground: '#f5f6f8',
  },
  dark: {
    text: '#e3e2e6',
    background: '#121316',
    backgroundElement: '#1e2023',
    backgroundSelected: '#2E3135',
    textSecondary: '#b0b4ba',
    accent: '#d7baff',
    accentLight: 'rgba(215, 186, 255, 0.15)',
    chipActive: '#bd93f9',
    chipActiveText: '#290055',
    chipInactive: '#1e2023',
    chipInactiveText: '#b0b4ba',
    divider: 'rgba(255, 255, 255, 0.1)',
    playIconColor: '#290055',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    pulseDot: '#ffb4ab',
    tabBarBackground: '#1e2023',
    tabBarPill: '#3C354B',
    tabBarIconSelected: '#d7baff',
    tabBarIconUnselected: '#8e9196',
    tabBarRipple: 'rgba(215, 186, 255, 0.15)',
    miniPlayerBackground: 'rgba(30, 32, 35, 0.95)',
    dismissButtonBackground: '#292a2d',
    audioIconBackground: '#1e2023',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
