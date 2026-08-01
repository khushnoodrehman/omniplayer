import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AppLogoProps {
  size?: number;
  style?: any;
}

export function AppLogo({ size = 32, style }: AppLogoProps) {
  const innerSize = size - 4;
  const barWidthSmall = Math.max(2, Math.round(size * 0.07));
  const barWidthMed = Math.max(3, Math.round(size * 0.12));
  
  const h1 = Math.round(size * 0.24);
  const h2 = Math.round(size * 0.46);
  const h3 = Math.round(size * 0.68);
  const h4 = Math.round(size * 0.54);
  const h5 = Math.round(size * 0.24);

  const rSmall = Math.round(barWidthSmall / 2);
  const rMed = Math.round(barWidthMed / 2);

  return (
    <LinearGradient
      colors={['#ff2d75', '#a855f7', '#7c3aed']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.outerCircle,
        { width: size, height: size, borderRadius: size / 2, padding: 2 },
        style
      ]}
    >
      <LinearGradient
        colors={['#2a1847', '#150f26']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.innerCircle,
          { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }
        ]}
      >
        <View style={[styles.barRow, { gap: Math.max(2, Math.round(size * 0.05)) }]}>
          {/* Bar 1 */}
          <LinearGradient
            colors={['#ff2d75', '#e11d48']}
            style={{ width: barWidthSmall, height: h1, borderRadius: rSmall }}
          />
          {/* Bar 2 */}
          <LinearGradient
            colors={['#ff3b8d', '#a855f7']}
            style={{ width: barWidthMed, height: h2, borderRadius: rMed }}
          />
          {/* Bar 3 */}
          <LinearGradient
            colors={['#ffffff', '#ff006e']}
            style={{ width: barWidthMed, height: h3, borderRadius: rMed }}
          />
          {/* Bar 4 */}
          <LinearGradient
            colors={['#ff006e', '#d946ef']}
            style={{ width: barWidthMed, height: h4, borderRadius: rMed }}
          />
          {/* Bar 5 */}
          <LinearGradient
            colors={['#d946ef', '#c084fc']}
            style={{ width: barWidthSmall, height: h5, borderRadius: rSmall }}
          />
        </View>
      </LinearGradient>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
