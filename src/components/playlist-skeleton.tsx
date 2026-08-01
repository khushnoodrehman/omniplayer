import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

export function PlaylistSkeleton() {
  const colorScheme = useColorScheme();
  const colorMode: 'dark' | 'light' = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Skeleton.Group show={true}>
        <ScrollView
          contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top, 16) }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Header Bar Placeholder */}
          <View style={styles.headerBar}>
            <Skeleton colorMode={colorMode} width={36} height={36} radius={18} />
            <Skeleton colorMode={colorMode} width={120} height={20} radius={4} />
            <Skeleton colorMode={colorMode} width={36} height={36} radius={18} />
          </View>

          {/* Banner / Cover Art Header Block */}
          <View style={styles.bannerSection}>
            {/* Large Square Cover Art Block */}
            <Skeleton colorMode={colorMode} width={180} height={180} radius={16} />

            <View style={styles.bannerMeta}>
              {/* Title Block */}
              <Skeleton colorMode={colorMode} width={200} height={24} radius={6} />
              {/* Subtitle / Metadata Block */}
              <Skeleton colorMode={colorMode} width={140} height={16} radius={4} />
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <Skeleton colorMode={colorMode} width={120} height={42} radius={21} />
              <Skeleton colorMode={colorMode} width={42} height={42} radius={21} />
            </View>
          </View>

          {/* Tracklist Rows */}
          <View style={styles.tracklistSection}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <View
                key={`track-skel-${idx}`}
                style={[styles.trackRow, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
              >
                {/* Index / Thumbnail Placeholder */}
                <Skeleton colorMode={colorMode} width={40} height={40} radius={8} />

                {/* Track Title & Artist Lines */}
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton colorMode={colorMode} width="70%" height={14} radius={3} />
                  <Skeleton colorMode={colorMode} width="45%" height={12} radius={3} />
                </View>

                {/* Options Icon Placeholder */}
                <Skeleton colorMode={colorMode} width={24} height={24} radius={12} />
              </View>
            ))}
          </View>
        </ScrollView>
      </Skeleton.Group>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  bannerSection: {
    alignItems: 'center',
    gap: 16,
  },
  bannerMeta: {
    alignItems: 'center',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  tracklistSection: {
    gap: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
});
