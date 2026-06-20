import React from 'react';
import { StyleSheet, View, Text as RNText, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');

interface SettingRowProps {
  icon: { ios: string; android: string; web: string };
  title: string;
  value?: string;
  onPress: () => void;
}

const SettingRow = ({ icon, title, value, onPress }: SettingRowProps) => {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
        pressed && { backgroundColor: colors.backgroundSelected }
      ]}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
        <SymbolView name={icon} size={20} tintColor={colors.accent} />
      </View>
      <RNText style={[styles.settingTitle, { color: colors.text }]}>{title}</RNText>
      <View style={{ flex: 1 }} />
      {value && <RNText style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</RNText>}
      <SymbolView 
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} 
        size={16} 
        tintColor={colors.textSecondary} 
        style={{ opacity: 0.5, marginLeft: 8 }}
      />
    </Pressable>
  );
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          {/* Header: Greeting & Profile (Matching HomeScreen / LibraryScreen) */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <RNText style={[styles.headerTitle, { color: colors.text }]}>Settings</RNText>
            <View style={{ flex: 1 }} />
            <Pressable 
              onPress={() => alert('Profile Details')}
              style={({ pressed }) => [
                styles.profileButton, 
                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                pressed && styles.pressed
              ]}
            >
              <SymbolView 
                name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }} 
                size={28} 
                tintColor={colors.accent} 
              />
            </Pressable>
          </View>

          {/* Section 1: General */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow 
                icon={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }}
                title="Audio Quality"
                value="High (320kbps)"
                onPress={() => alert('Select Audio Quality')}
              />
              <SettingRow 
                icon={{ ios: 'paintpalette', android: 'palette', web: 'palette' }}
                title="Dynamic Theme"
                value="Follow System"
                onPress={() => alert('Change Theme Options')}
              />
            </View>
          </View>

          {/* Section 2: Storage & Scan */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Storage & Scan</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow 
                icon={{ ios: 'folder.badge.gearshape', android: 'folder_open', web: 'folder_open' }}
                title="Scan Folders"
                value="2 directories"
                onPress={() => alert('Configure local folder paths')}
              />
              <SettingRow 
                icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
                title="Clear Cached Artwork"
                value="24.5 MB"
                onPress={() => alert('Cached artwork cleared successfully')}
              />
            </View>
          </View>

          {/* Section 3: About */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow 
                icon={{ ios: 'info.circle', android: 'info', web: 'info' }}
                title="Version"
                value="v1.0.0 (SDK 56)"
                onPress={() => alert('Omniplayer v1.0.0 - Built with React Native & Expo')}
              />
            </View>
          </View>

          {/* Bottom padding spacer to clear floating mini player */}
          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Unified Mini Player */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  headerTitle: {
    fontSize: 24,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: screenWidth - 32,
    gap: 12,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 13,
  },
});
