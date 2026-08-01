import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text as RNText, Modal, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLogo } from '@/components/ui/app-logo';
import YTAuthModal from '@/components/yt-auth-modal';

interface AppHeaderProps {
  title: string;
  onPressProfile?: () => void;
  headerTranslateY?: SharedValue<number>;
  showSearchIcon?: boolean;
  isSearchActive?: boolean;
  onToggleSearch?: (active: boolean) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function AppHeader({
  title,
  onPressProfile,
  headerTranslateY,
  showSearchIcon,
  isSearchActive,
  onToggleSearch,
  searchQuery = '',
  onSearchQueryChange,
  searchPlaceholder = 'Search library...'
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const router = useRouter();
  const accountInfo = usePlaybackStore((state) => state.accountInfo);
  const fetchAccountInfo = usePlaybackStore((state) => state.fetchAccountInfo);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);

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

  const handleAvatarPress = () => {
    if (onPressProfile) {
      onPressProfile();
    } else {
      setIsProfileModalOpen(true);
    }
  };

  const isConnected = !!accountInfo?.avatar || !!accountInfo?.name;

  const handleConnectPress = () => {
    setIsProfileModalOpen(false);
    setIsAuthModalVisible(true);
  };

  const handleDisconnectPress = () => {
    Alert.alert(
      "Disconnect YouTube Music",
      "Are you sure you want to log out of your YouTube Music account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('yt_cookies');
              await AsyncStorage.removeItem('yt_account_info');
              await fetchAccountInfo();
              setIsProfileModalOpen(false);
              Alert.alert("Success", "Disconnected from YouTube Music.");
            } catch (err) {
              console.error("Logout error:", err);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Animated.View style={animatedHeaderStyle}>
        {isSearchActive ? (
          /* Search Input Header View */
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => {
                onSearchQueryChange?.('');
                onToggleSearch?.(false);
              }}
              style={({ pressed }) => [{ padding: 6 }, pressed && styles.pressed]}
            >
              <AppIcon ios="chevron.left" android="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
              <AppIcon ios="magnifyingglass" android="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => onSearchQueryChange?.('')} style={{ padding: 4 }}>
                  <AppIcon ios="xmark.circle.fill" android="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          /* Standard Title Header View */
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppLogo size={28} />
              <RNText style={[styles.headerTitle, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {title}
              </RNText>
            </View>
            <View style={{ flex: 1 }} />
            {showSearchIcon && (
              <Pressable
                onPress={() => onToggleSearch?.(true)}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                  pressed && styles.pressed
                ]}
              >
                <AppIcon ios="magnifyingglass" android="search" size={20} color={colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [
                styles.profileButton,
                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder, marginLeft: showSearchIcon ? 8 : 0 },
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
          </>
        )}
      </Animated.View>

      {/* Profile & Account Modal */}
      <Modal
        visible={isProfileModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsProfileModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
            <View style={styles.avatarSection}>
              {accountInfo?.avatar ? (
                <Image
                  source={{ uri: accountInfo.avatar }}
                  style={styles.modalAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.accentLight }]}>
                  <AppIcon ios="person.fill" android="person" size={36} color={colors.accent} />
                </View>
              )}
              <RNText style={[styles.modalUserName, { color: colors.text }]}>
                {accountInfo?.name || "Guest User"}
              </RNText>
              <View style={[styles.statusBadge, { backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : colors.cardBorder }]}>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : colors.textSecondary }]} />
                <RNText style={[styles.statusText, { color: isConnected ? '#10B981' : colors.textSecondary }]}>
                  {isConnected ? "YouTube Music Connected" : "Not Connected (Guest Mode)"}
                </RNText>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 8, width: '100%' }}>
              {!isConnected ? (
                <Pressable
                  onPress={handleConnectPress}
                  style={({ pressed }) => [
                    styles.modalActionButton,
                    { backgroundColor: colors.accent },
                    pressed && styles.pressed
                  ]}
                >
                  <RNText style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                    Connect YouTube Music
                  </RNText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleDisconnectPress}
                  style={({ pressed }) => [
                    styles.modalActionButton,
                    { backgroundColor: '#ef4444' },
                    pressed && styles.pressed
                  ]}
                >
                  <RNText style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                    Disconnect YouTube Music
                  </RNText>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setIsProfileModalOpen(false);
                  router.push('/settings');
                }}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  { borderColor: colors.cardBorder },
                  pressed && styles.pressed
                ]}
              >
                <RNText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                  Manage Settings
                </RNText>
              </Pressable>

              <Pressable
                onPress={() => setIsProfileModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  { borderColor: colors.cardBorder },
                  pressed && styles.pressed
                ]}
              >
                <RNText style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
                  Close
                </RNText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* YouTube WebView Login Modal */}
      <YTAuthModal
        isVisible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onSuccess={() => {
          fetchAccountInfo();
          Alert.alert("Connected!", "Successfully logged in to YouTube Music.");
        }}
      />
    </>
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },
  modalAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  modalAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryButton: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseButton: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
