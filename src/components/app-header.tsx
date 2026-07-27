import React from 'react';
import { StyleSheet, View, Pressable, Text as RNText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

interface AppHeaderProps {
  title: string;
  onPressProfile?: () => void;
  headerTranslateY?: SharedValue<number>;
}

export function AppHeader({ title, onPressProfile, headerTranslateY }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const accountInfo = usePlaybackStore((state) => state.accountInfo);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const headerHeight = 48 + insets.top;
    const translateY = headerTranslateY ? headerTranslateY.value : 0;
    return {
      transform: [{ translateY }],
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: headerHeight,
      paddingTop: insets.top,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      zIndex: 10,
    };
  });

  return (
    <Animated.View style={animatedHeaderStyle}>
      <RNText style={[styles.headerTitle, { color: title === 'Omniplayer' ? colors.accent : colors.text, fontWeight: '700' }]} numberOfLines={1}>
        {title}
      </RNText>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={onPressProfile}
        style={({ pressed }) => [
          styles.profileButton,
          { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
          pressed && styles.pressed
        ]}
      >
        {accountInfo?.avatar ? (
          <Image
            source={{ uri: accountInfo.avatar }}
            style={{ width: 34, height: 34, borderRadius: 17 }}
            contentFit="cover"
          />
        ) : (
          <AppIcon ios="person.crop.circle.fill" android="person-circle" size={28} color={colors.accent} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
