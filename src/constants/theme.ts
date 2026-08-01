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
    text: '#f3eefc',
    background: '#161124',
    backgroundElement: '#211836',
    backgroundSelected: '#32234e',
    textSecondary: '#a59bb5',
    accent: '#ff2d75',
    accentLight: 'rgba(255, 45, 117, 0.15)',
    chipActive: '#ff2d75',
    chipActiveText: '#ffffff',
    chipInactive: '#211836',
    chipInactiveText: '#a59bb5',
    divider: 'rgba(255, 255, 255, 0.1)',
    playIconColor: '#ffffff',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    pulseDot: '#ff2d75',
    tabBarBackground: '#191228',
    tabBarPill: '#3a1b4d',
    tabBarIconSelected: '#ff2d75',
    tabBarIconUnselected: '#85799c',
    tabBarRipple: 'rgba(255, 45, 117, 0.15)',
    miniPlayerBackground: 'rgba(33, 24, 54, 0.95)',
    dismissButtonBackground: '#32234e',
    audioIconBackground: '#211836',
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
