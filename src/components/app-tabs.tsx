import React from 'react';
import { View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  return (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: colors.tabBarBackground,
        paddingBottom: Math.max(insets.bottom, 10),
        borderTopColor: colors.cardBorder,
      }
    ]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let label = 'Home';
        let iconIos = 'house.fill';
        let iconAndroid = 'home';

        if (route.name === 'index') {
          label = 'Home';
          iconIos = isFocused ? 'house.fill' : 'house';
          iconAndroid = isFocused ? 'home' : 'home-outline';
        } else if (route.name === 'search') {
          label = 'Search';
          iconIos = isFocused ? 'magnifyingglass' : 'magnifyingglass';
          iconAndroid = isFocused ? 'search' : 'search-outline';
        } else if (route.name === 'library') {
          label = 'Library';
          iconIos = isFocused ? 'music.note.house.fill' : 'music.note.house';
          iconAndroid = isFocused ? 'library' : 'library-outline';
        } else if (route.name === 'settings') {
          label = 'Settings';
          iconIos = isFocused ? 'gearshape.fill' : 'gearshape';
          iconAndroid = isFocused ? 'settings' : 'settings-outline';
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={[
              styles.pillWrapper,
              isFocused && { backgroundColor: colors.tabBarPill }
            ]}>
              <AppIcon
                ios={iconIos}
                android={iconAndroid as any}
                size={22}
                color={isFocused ? colors.tabBarIconSelected : colors.tabBarIconUnselected}
              />
            </View>
            <RNText style={[
              styles.tabLabel,
              { color: isFocused ? colors.tabBarIconSelected : colors.tabBarIconUnselected, fontWeight: isFocused ? '600' : '400' }
            ]}>
              {label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    zIndex: 99,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  pillWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
