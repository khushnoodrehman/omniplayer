import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';

interface PlayingBarsProps {
  color?: string;
  size?: number;
}

export function PlayingBars({ color = '#ff2d75', size = 18 }: PlayingBarsProps) {
  const bar1 = useSharedValue(0.3);
  const bar2 = useSharedValue(0.8);
  const bar3 = useSharedValue(0.5);

  useEffect(() => {
    bar1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.linear }),
        withTiming(0.2, { duration: 400, easing: Easing.linear })
      ),
      -1,
      true
    );

    bar2.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 350, easing: Easing.linear }),
        withTiming(0.9, { duration: 350, easing: Easing.linear })
      ),
      -1,
      true
    );

    bar3.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 450, easing: Easing.linear }),
        withTiming(0.4, { duration: 450, easing: Easing.linear })
      ),
      -1,
      true
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ scaleY: bar1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ scaleY: bar2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ scaleY: bar3.value }] }));

  const barWidth = Math.max(2.5, Math.round(size * 0.15));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, style1]} />
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, style2]} />
      <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: color }, style3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
});
