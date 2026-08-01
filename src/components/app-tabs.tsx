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
      styles.floatingTabBar,
      {
        backgroundColor: colors.tabBarBackground,
        borderColor: colors.cardBorder,
        bottom: Math.max(insets.bottom, 12),
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
                size={20}
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
  floatingTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    height: 62,
    borderRadius: 28,
    borderWidth: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 99,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  pillWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
