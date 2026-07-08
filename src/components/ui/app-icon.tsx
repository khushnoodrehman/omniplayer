import React from 'react';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

interface AppIconProps {
  ios: string; // SF Symbol Name
  android: React.ComponentProps<typeof Ionicons>['name']; // Ionicons Name
  size?: number;
  color?: string;
  style?: any;
}

export function AppIcon({ ios, android, size = 24, color, style }: AppIconProps) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={ios as any}
        size={size}
        tintColor={color}
        style={style}
      />
    );
  }

  // Android & Web: Render stable vector-icons to prevent native font-rendering crashes
  return (
    <Ionicons
      name={android}
      size={size}
      color={color}
      style={style}
    />
  );
}
