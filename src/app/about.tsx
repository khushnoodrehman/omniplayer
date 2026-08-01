import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text as RNText, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { AppLogo } from '@/components/ui/app-logo';

interface LinkRowProps {
  iconIos: string;
  iconAndroid: string;
  title: string;
  subtitle: string;
  url: string;
}

function LinkRow({ iconIos, iconAndroid, title, subtitle, url }: LinkRowProps) {
  const colors = useTheme();
  
  const handleOpen = () => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Could not open URL:", err));
    }
  };

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        styles.linkRow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
        pressed && { backgroundColor: colors.backgroundSelected }
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: colors.cardBorder }]}>
        <AppIcon ios={iconIos} android={iconAndroid as any} size={20} color={colors.text} />
      </View>
      <View style={styles.linkInfo}>
        <RNText style={[styles.linkTitle, { color: colors.text }]}>{title}</RNText>
        <RNText style={[styles.linkSubtitle, { color: colors.textSecondary }]}>{subtitle}</RNText>
      </View>
      <AppIcon ios="chevron.right" android="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <AppIcon ios="arrow.left" android="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <RNText style={[styles.headerTitle, { color: colors.text }]}>About</RNText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Top App Card */}
        <View style={[styles.appCard, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
          <AppLogo size={72} />
          <RNText style={[styles.appName, { color: colors.text }]}>OmniPlayer</RNText>
          <View style={[styles.versionBadge, { backgroundColor: colors.backgroundSelected }]}>
            <RNText style={[styles.versionText, { color: colors.textSecondary }]}>1.0.0  RELEASE</RNText>
          </View>
        </View>

        {/* Developer Section */}
        <View style={styles.section}>
          <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>Developer</RNText>
          <View style={styles.group}>
            <LinkRow
              iconIos="camera.fill"
              iconAndroid="logo-instagram"
              title="Instagram"
              subtitle="@khushnoodrehman"
              url="https://www.instagram.com/"
            />
            <LinkRow
              iconIos="at"
              iconAndroid="logo-twitter"
              title="X (Twitter)"
              subtitle="@KhushnoodRehma5"
              url="https://x.com/KhushnoodRehma5"
            />
            <LinkRow
              iconIos="person.2.fill"
              iconAndroid="logo-linkedin"
              title="LinkedIn"
              subtitle="Khushnood Rehman"
              url="https://www.linkedin.com/in/khushnood-rehman-2a058225a/"
            />
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <RNText style={[styles.sectionTitle, { color: colors.textSecondary }]}>App</RNText>
          <View style={styles.group}>
            <LinkRow
              iconIos="code"
              iconAndroid="logo-github"
              title="GitHub"
              subtitle="khushnoodrehman/omniplayer"
              url="https://github.com/khushnoodrehman/omniplayer"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  appCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  group: {
    gap: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkSubtitle: {
    fontSize: 13,
  },
});
