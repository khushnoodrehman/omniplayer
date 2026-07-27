import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

export function HomeSkeleton() {
  const colorScheme = useColorScheme();
  const colorMode: 'dark' | 'light' = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Skeleton.Group show={true}>
        <ScrollView
          contentContainerStyle={[styles.contentContainer, { paddingTop: 48 + insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <View style={{ gap: 24 }}>
            {/* Speed Dial Grid Skeleton */}
            <View style={{ gap: 12, paddingHorizontal: 16 }}>
              <Skeleton colorMode={colorMode} width={140} height={22} radius={4} />
              <View style={styles.speedDialGrid}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <View key={`sd-skel-${idx}`} style={[styles.speedDialCard, { backgroundColor: colors.backgroundElement }]}>
                    <Skeleton colorMode={colorMode} width={48} height={48} radius={6} />
                    <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                      <Skeleton colorMode={colorMode} width="85%" height={12} radius={3} />
                      <Skeleton colorMode={colorMode} width="55%" height={10} radius={3} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Horizontal Shelves Skeleton */}
            {Array.from({ length: 3 }).map((_, shelfIdx) => (
              <View key={`shelf-skel-${shelfIdx}`} style={{ gap: 14 }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <Skeleton colorMode={colorMode} width={180} height={22} radius={4} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
                  {Array.from({ length: 5 }).map((_, cardIdx) => (
                    <View key={`card-skel-${shelfIdx}-${cardIdx}`} style={{ width: 140, gap: 8 }}>
                      <Skeleton colorMode={colorMode} width={140} height={140} radius={10} />
                      <Skeleton colorMode={colorMode} width={120} height={14} radius={3} />
                      <Skeleton colorMode={colorMode} width={80} height={12} radius={3} />
                    </View>
                  ))}
                </ScrollView>
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
    paddingBottom: 100,
  },
  speedDialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedDialCard: {
    width: (screenWidth - 40) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 10,
    borderRadius: 8,
  },
});
