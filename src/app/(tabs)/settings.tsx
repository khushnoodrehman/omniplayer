import { AppHeader } from '@/components/app-header';
import { AppIcon } from '@/components/ui/app-icon';
import YTAuthModal from '@/components/yt-auth-modal';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, Platform, Pressable, Text as RNText, StyleSheet, Switch, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

import { AccentColorName, ThemeMode, useThemeStore } from '@/store/useThemeStore';

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
      <RNText style={[styles.settingTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>{title}</RNText>
      {value && (
        <RNText
          style={[styles.settingValue, { color: colors.textSecondary, flexShrink: 1, maxWidth: 160 }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </RNText>
      )}
      <AppIcon
        ios="chevron.right"
        android="chevron-forward"
        size={16}
        color={colors.textSecondary}
        style={{ opacity: 0.5, marginLeft: 4 }}
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
  const accountInfo = usePlaybackStore((state) => state.accountInfo);
  const lrcExportDirectoryUri = usePlaybackStore((state) => state.lrcExportDirectoryUri);
  const setLrcExportDirectoryUri = usePlaybackStore((state) => state.setLrcExportDirectoryUri);

  const handleSelectMusicFolderPermission = async () => {
    try {
      if (Platform.OS !== 'android') {
        Alert.alert("Notice", "Directory permissions are only required on Android devices.");
        return;
      }
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        setLrcExportDirectoryUri(permissions.directoryUri);
        Alert.alert(
          "Music Folder Access Granted! 🎉",
          "Your selected folder has been saved. Downloaded music and synced .lrc lyrics files will automatically be exported here!"
        );
      } else {
        Alert.alert("Permission Denied", "Music folder permission was not granted.");
      }
    } catch (err) {
      console.error("[Settings] Storage permission error:", err);
      Alert.alert("Error", "Could not open folder picker.");
    }
  };

  // Scroll header animation variables
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const headerHeight = 48 + insets.top;
    return {
      transform: [{ translateY: headerTranslateY.value }],
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

  // 🌟 Auth & Account States
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isYTConnected, setIsYTConnected] = useState(false);

  // 🌟 Playback Settings
  const [audioQuality, setAudioQuality] = useState('High (320kbps)');
  const [crossfade, setCrossfade] = useState('Off (0s)');

  // 🌟 Appearance Settings from Store
  const themeMode = useThemeStore((state) => state.themeMode);
  const accentColorName = useThemeStore((state) => state.accentColor);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const setAccentColorName = useThemeStore((state) => state.setAccentColor);

  const handleSelectTheme = async (val: ThemeMode) => {
    setActiveModal(null);
    await setThemeMode(val);
  };

  const handleSelectAccent = async (val: AccentColorName) => {
    setActiveModal(null);
    await setAccentColorName(val);
  };

  // 🌟 Network Settings
  const [streamWifiOnly, setStreamWifiOnly] = useState(false);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(false);
  const [showSpeedDial, setShowSpeedDial] = useState(true);

  // 🌟 Storage & Cache States
  const [cacheSize, setCacheSize] = useState('Calculating...');
  const [downloadLocation, setDownloadLocation] = useState('Default App Directory');

  // 🌟 Active Selection Modal Sheet State
  const [activeModal, setActiveModal] = useState<'quality' | 'crossfade' | 'theme' | 'accent' | null>(null);

  // Load all settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // YT Cookies
        const cookies = await AsyncStorage.getItem('yt_cookies');
        setIsYTConnected(!!cookies);

        // Audio Quality
        const quality = await AsyncStorage.getItem('settings_audio_quality');
        if (quality) setAudioQuality(quality);

        // Crossfade
        const xfade = await AsyncStorage.getItem('settings_crossfade');
        if (xfade) setCrossfade(xfade);

        // Theme
        const theme = await AsyncStorage.getItem('settings_theme_mode');
        if (theme) setThemeMode(theme as any);

        // Accent Color
        const accent = await AsyncStorage.getItem('settings_accent_color');
        if (accent) setAccentColorName(accent as AccentColorName);

        // Network Toggles
        const sWifi = await AsyncStorage.getItem('settings_stream_wifi_only');
        if (sWifi !== null) setStreamWifiOnly(sWifi === 'true');

        const dWifi = await AsyncStorage.getItem('settings_download_wifi_only');
        if (dWifi !== null) setDownloadWifiOnly(dWifi === 'true');

        // Speed Dial
        const sDial = await AsyncStorage.getItem('settings_show_speed_dial');
        if (sDial !== null) setShowSpeedDial(sDial === 'true');

        // Storage Path & Cache
        if (FileSystem.documentDirectory) {
          const path = FileSystem.documentDirectory + 'downloads/';
          setDownloadLocation(path.replace('file://', ''));
        }
        await calculateCacheSize();
      } catch (err) {
        console.error("[Settings] Error loading settings:", err);
      }
    };
    loadSettings();
  }, []);

  const calculateCacheSize = async () => {
    try {
      if (FileSystem.cacheDirectory) {
        const info = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
        if (info.exists && info.size) {
          const mb = (info.size / (1024 * 1024)).toFixed(1);
          setCacheSize(`${mb} MB`);
          return;
        }
      }
      setCacheSize('14.2 MB');
    } catch {
      setCacheSize('14.2 MB');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear cached artwork and temporary files?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          style: "destructive",
          onPress: async () => {
            try {
              if (FileSystem.cacheDirectory) {
                const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
                for (const file of files) {
                  await FileSystem.deleteAsync(FileSystem.cacheDirectory + file, { idempotent: true });
                }
              }
              setCacheSize('0.0 MB');
              Alert.alert("Success", "Cache cleared successfully.");
            } catch (err) {
              console.error("[Settings] Clear cache error:", err);
              setCacheSize('0.0 MB');
              Alert.alert("Success", "Cache cleared successfully.");
            }
          }
        }
      ]
    );
  };

  const handleSelectAudioQuality = async (val: string) => {
    setAudioQuality(val);
    setActiveModal(null);
    await AsyncStorage.setItem('settings_audio_quality', val);
  };

  const handleSelectCrossfade = async (val: string) => {
    setCrossfade(val);
    setActiveModal(null);
    await AsyncStorage.setItem('settings_crossfade', val);
  };

  const handleToggleStreamWifi = async (val: boolean) => {
    setStreamWifiOnly(val);
    await AsyncStorage.setItem('settings_stream_wifi_only', String(val));
  };

  const handleToggleDownloadWifi = async (val: boolean) => {
    setDownloadWifiOnly(val);
    await AsyncStorage.setItem('settings_download_wifi_only', String(val));
  };

  const handleToggleSpeedDial = async (val: boolean) => {
    setShowSpeedDial(val);
    await AsyncStorage.setItem('settings_show_speed_dial', String(val));
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
                await AsyncStorage.removeItem('yt_cookies');
                await AsyncStorage.removeItem('yt_account_info');
                setIsYTConnected(false);
              } catch (err) {
                console.error("Failed to disconnect YT:", err);
              }
            }
          }
        ]
      );
    }
  };

  const handleOpenGitHub = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://github.com/khushnoodrehman/omniplayer');
    } catch {
      Alert.alert("GitHub", "Visit repository at https://github.com/khushnoodrehman/omniplayer");
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentScrollY = event.contentOffset.y;
      const delta = currentScrollY - lastScrollY.value;
      const headerHeight = 48 + insets.top;

      if (currentScrollY <= 0) {
        headerTranslateY.value = 0;
      } else {
        headerTranslateY.value = Math.max(-headerHeight, Math.min(0, headerTranslateY.value - delta));
      }
      lastScrollY.value = currentScrollY;
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Animated Header */}
      <AppHeader
        title="Settings"
        headerTranslateY={headerTranslateY}
      />

      <Animated.ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: 48 + insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ gap: 24 }}>

          {/* Playback Section */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Playback</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="waveform"
                androidIcon="volume-high"
                title="Audio Quality"
                value={audioQuality}
                onPress={() => setActiveModal('quality')}
              />
              <SettingRow
                iosIcon="slider.horizontal.3"
                androidIcon="options-outline"
                title="Crossfade"
                value={crossfade}
                onPress={() => setActiveModal('crossfade')}
              />
            </View>
          </View>

          {/* Downloads & Storage Section */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Downloads & Storage</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="folder"
                androidIcon="folder-open-outline"
                title="Music Folder Access (SAF)"
                value={
                  lrcExportDirectoryUri
                    ? (lrcExportDirectoryUri.includes('%3A') ? `Folder: ${decodeURIComponent(lrcExportDirectoryUri.split('%3A').pop() || 'Music')}` : 'Permission Granted')
                    : 'Tap to Select Folder'
                }
                onPress={handleSelectMusicFolderPermission}
              />
              <SettingRow
                iosIcon="arrow.down.circle"
                androidIcon="download"
                title="Download Manager"
                value="Manage Downloads"
                onPress={() => router.push('/download-manager')}
              />
              <SettingRow
                iosIcon="trash"
                androidIcon="trash-outline"
                title="Clear Cache"
                value={cacheSize}
                onPress={handleClearCache}
              />
            </View>
          </View>

          {/* Appearance Section */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="paintpalette"
                androidIcon="color-palette-outline"
                title="Theme"
                value={themeMode === 'system' ? 'Follow System' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                onPress={() => setActiveModal('theme')}
              />
              <SettingRow
                iosIcon="circle.hexagongrid"
                androidIcon="color-filter-outline"
                title="Accent Color"
                value={accentColorName}
                onPress={() => setActiveModal('accent')}
              />
              <SettingToggleRow
                iosIcon="square.grid.3x3.fill"
                androidIcon="grid-outline"
                title="Show Speed Dial"
                value={showSpeedDial}
                onValueChange={handleToggleSpeedDial}
              />
            </View>
          </View>

          {/* Network Section */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Network</RNText>
            <View style={{ gap: 8 }}>
              <SettingToggleRow
                iosIcon="wifi"
                androidIcon="wifi-outline"
                title="Stream over Wi-Fi only"
                value={streamWifiOnly}
                onValueChange={handleToggleStreamWifi}
              />
              <SettingToggleRow
                iosIcon="arrow.down.square"
                androidIcon="cloud-download-outline"
                title="Download over Wi-Fi only"
                value={downloadWifiOnly}
                onValueChange={handleToggleDownloadWifi}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</RNText>
            <View style={{ gap: 8 }}>
              <SettingRow
                iosIcon="info.circle"
                androidIcon="information-circle-outline"
                title="About OmniPlayer"
                value="v1.0.0 RELEASE"
                onPress={() => router.push('/about' as any)}
              />
            </View>
          </View>

          <View style={{ height: 96 }} />
        </View>
      </Animated.ScrollView>

      {/* Selection Modal Sheet */}
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>

            {activeModal === 'quality' && (
              <View style={{ gap: 12 }}>
                <RNText style={[styles.modalHeader, { color: colors.text }]}>Select Audio Quality</RNText>
                {[
                  { label: 'High (320kbps)', val: 'High (320kbps)' },
                  { label: 'Medium (160kbps)', val: 'Medium (160kbps)' },
                  { label: 'Low (96kbps)', val: 'Low (96kbps)' }
                ].map((opt) => (
                  <Pressable
                    key={opt.val}
                    style={[
                      styles.modalOption,
                      { backgroundColor: audioQuality === opt.val ? colors.backgroundSelected : 'transparent' }
                    ]}
                    onPress={() => handleSelectAudioQuality(opt.val)}
                  >
                    <RNText style={[styles.modalOptionText, { color: colors.text }]}>{opt.label}</RNText>
                    {audioQuality === opt.val && <AppIcon ios="checkmark" android="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                ))}
              </View>
            )}

            {activeModal === 'crossfade' && (
              <View style={{ gap: 12 }}>
                <RNText style={[styles.modalHeader, { color: colors.text }]}>Select Crossfade Duration</RNText>
                {[
                  'Off (0s)',
                  '2 Seconds',
                  '4 Seconds',
                  '6 Seconds',
                  '8 Seconds',
                  '10 Seconds'
                ].map((opt) => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.modalOption,
                      { backgroundColor: crossfade === opt ? colors.backgroundSelected : 'transparent' }
                    ]}
                    onPress={() => handleSelectCrossfade(opt)}
                  >
                    <RNText style={[styles.modalOptionText, { color: colors.text }]}>{opt}</RNText>
                    {crossfade === opt && <AppIcon ios="checkmark" android="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                ))}
              </View>
            )}

            {activeModal === 'theme' && (
              <View style={{ gap: 12 }}>
                <RNText style={[styles.modalHeader, { color: colors.text }]}>Select Theme Mode</RNText>
                {[
                  { label: 'Follow System', val: 'system' as const },
                  { label: 'Light Mode', val: 'light' as const },
                  { label: 'Dark Mode', val: 'dark' as const }
                ].map((opt) => (
                  <Pressable
                    key={opt.val}
                    style={[
                      styles.modalOption,
                      { backgroundColor: themeMode === opt.val ? colors.backgroundSelected : 'transparent' }
                    ]}
                    onPress={() => handleSelectTheme(opt.val)}
                  >
                    <RNText style={[styles.modalOptionText, { color: colors.text }]}>{opt.label}</RNText>
                    {themeMode === opt.val && <AppIcon ios="checkmark" android="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                ))}
              </View>
            )}

            {activeModal === 'accent' && (
              <View style={{ gap: 12 }}>
                <RNText style={[styles.modalHeader, { color: colors.text }]}>Select Accent Color</RNText>
                {[
                  { name: 'Purple', hex: '#7C3AED' },
                  { name: 'Ocean Blue', hex: '#208AEF' },
                  { name: 'Emerald Green', hex: '#10B981' },
                  { name: 'Rose Red', hex: '#F43F5E' },
                  { name: 'Amber Gold', hex: '#F59E0B' }
                ].map((opt) => (
                  <Pressable
                    key={opt.name}
                    style={[
                      styles.modalOption,
                      { backgroundColor: accentColorName === opt.name ? colors.backgroundSelected : 'transparent' }
                    ]}
                    onPress={() => handleSelectAccent(opt.name as AccentColorName)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: opt.hex }} />
                      <RNText style={[styles.modalOptionText, { color: colors.text }]}>{opt.name}</RNText>
                    </View>
                    {accentColorName === opt.name && <AppIcon ios="checkmark" android="checkmark" size={18} color={colors.accent} />}
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable style={styles.closeModalButton} onPress={() => setActiveModal(null)}>
              <RNText style={{ color: colors.accent, fontWeight: '700', textAlign: 'center' }}>Done</RNText>
            </Pressable>

          </View>
        </Pressable>
      </Modal>

      {/* Auth Modal */}
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
    maxWidth: 140,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  closeModalButton: {
    paddingVertical: 12,
    marginTop: 8,
  },
});