import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text as RNText, ScrollView, Pressable, Dimensions, Alert, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import YTAuthModal from '@/components/yt-auth-modal'; // 🌟 Auth Modal Import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface SettingRowProps {
  iosIcon: string;
  androidIcon: any;
  title: string;
  value?: string;
  onPress: () => void;
}

const SettingRow = ({ iosIcon, androidIcon, title, value, onPress }: SettingRowProps) => {
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
        <AppIcon ios={iosIcon} android={androidIcon} size={20} color={colors.accent} />
      </View>
      <RNText style={[styles.settingTitle, { color: colors.text }]}>{title}</RNText>
      <View style={{ flex: 1 }} />
      {value && <RNText style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</RNText>}
      <AppIcon
        ios="chevron.right"
        android="chevron-forward"
        size={16}
        color={colors.textSecondary}
        style={{ opacity: 0.5, marginLeft: 8 }}
      />
    </Pressable>
  );
};

interface SettingToggleRowProps {
  iosIcon: string;
  androidIcon: any;
  title: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

const SettingToggleRow = ({ iosIcon, androidIcon, title, value, onValueChange }: SettingToggleRowProps) => {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.settingRow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }
      ]}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
        <AppIcon ios={iosIcon} android={androidIcon} size={20} color={colors.accent} />
      </View>
      <RNText style={[styles.settingTitle, { color: colors.text }]}>{title}</RNText>
      <View style={{ flex: 1 }} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.cardBorder, true: colors.accent }}
        thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
      />
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  // 🌟 Auth Modal States
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isYTConnected, setIsYTConnected] = useState(false);
  const [showSpeedDial, setShowSpeedDial] = useState(true);

  // Check storage status on mount
  useEffect(() => {
    const checkYTAuth = async () => {
      try {
        const cookies = await AsyncStorage.getItem('yt_cookies');
        console.log("[SettingsScreen] Retrieved yt_cookies from AsyncStorage:", cookies ? "Cookies Exist (length: " + cookies.length + ")" : "No Cookies Found");
        setIsYTConnected(!!cookies);
      } catch (err) {
        console.error("Failed to read yt_cookies from AsyncStorage", err);
      }
    };
    checkYTAuth();

    const loadSpeedDialSetting = async () => {
      try {
        const val = await AsyncStorage.getItem('settings_show_speed_dial');
        if (val !== null) {
          setShowSpeedDial(val === 'true');
        }
      } catch (err) {
        console.error("Failed to load settings_show_speed_dial", err);
      }
    };
    loadSpeedDialSetting();
  }, []);

  const handleToggleSpeedDial = async (newVal: boolean) => {
    setShowSpeedDial(newVal);
    try {
      await AsyncStorage.setItem('settings_show_speed_dial', String(newVal));
    } catch (err) {
      console.error("Failed to save settings_show_speed_dial", err);
    }
  };

  const handlePressYT = async () => {
    if (!isYTConnected) {
      setIsAuthModalVisible(true);
    } else {
      Alert.alert(
        "Disconnect YouTube Music",
        "Are you sure you want to disconnect your YouTube Music account?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              try {
                // Logout ya Clear par ye chalayein
                await AsyncStorage.removeItem('yt_cookies');
                await AsyncStorage.clear(); // Ye sab kuch saaf kar dega taake koi purana token na bache
                setIsYTConnected(false);
              } catch (err) {
                console.error("Failed to disconnect YouTube Music", err);
              }
            }
          }
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          {/* Header */}
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
              <AppIcon ios="person.crop.circle.fill" android="person-circle" size={28} color={colors.accent} />
            </Pressable>
          </View>

          {/* 🌟 NAYA SECTION: Account & Integrations */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account & Integrations</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="play.rectangle.fill"
                androidIcon="logo-youtube"
                title="YouTube Music"
                value={isYTConnected ? "Connected" : "Not Connected"}
                onPress={handlePressYT}
              />
            </View>
          </View>

          {/* Section 1: General */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="waveform"
                androidIcon="volume-high"
                title="Audio Quality"
                value="High (320kbps)"
                onPress={() => alert('Select Audio Quality')}
              />
              <SettingRow
                iosIcon="paintpalette"
                androidIcon="color-palette"
                title="Dynamic Theme"
                value="Follow System"
                onPress={() => alert('Change Theme Options')}
              />
              <SettingToggleRow
                iosIcon="square.grid.3x3.fill"
                androidIcon="grid"
                title="Show Speed Dial"
                value={showSpeedDial}
                onValueChange={handleToggleSpeedDial}
              />
            </View>
          </View>

          {/* Section 2: Storage & Scan */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Storage & Scan</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="folder.badge.gearshape"
                androidIcon="folder"
                title="Scan Folders"
                value="2 directories"
                onPress={() => alert('Configure local folder paths')}
              />
              <SettingRow
                iosIcon="arrow.down.circle"
                androidIcon="download"
                title="Download Manager"
                value="Manage active downloads"
                onPress={() => router.push('/download-manager')}
              />
              <SettingRow
                iosIcon="trash"
                androidIcon="trash"
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
                iosIcon="info.circle"
                androidIcon="information-circle"
                title="Version"
                value="v1.0.0 (SDK 56)"
                onPress={() => alert('Omniplayer v1.0.0 - Built with React Native & Expo')}
              />
            </View>
          </View>

          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* 🌟 Auth Modal Mount */}
      <YTAuthModal
        isVisible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onSuccess={() => setIsYTConnected(true)}
      />
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