import React from 'react';
import { StyleSheet, View, Pressable, Dimensions, Text as RNText, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { usePlayback } from '@/context/PlaybackContext';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { playTrack } = usePlayback();

  const greeting = (() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      return 'Good Morning';
    } else if (hours >= 12 && hours < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  })();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          
          {/* Header: Greeting & Profile */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <RNText style={[styles.headerTitle, { color: colors.text }]}>{greeting}</RNText>
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

          {/* Section 1: Trending Now */}
          <View style={{ gap: 12 }}>
            <View style={[styles.resultsSectionHeader, { paddingHorizontal: 16 }]}>
              <RNText style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</RNText>
              <View style={{ flex: 1 }} />
              <RNText style={[styles.viewAllText, { color: colors.accent }]} onPress={() => alert('Viewing all trending...')}>
                VIEW ALL
              </RNText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                {/* Card 1 */}
                <Pressable 
                  style={[styles.trendingCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '1',
                    title: 'Midnight City',
                    artist: 'M83',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfDQPHqfdMWlnSFtNGjCGU2tsWf_TpMUmYCWaSEAj5TsUK_i9A7JdDXSjHiPVmzRTUf5lfxN7qDA7Xc6SEbew2B40CWecdj5gCSFA8mLnPkNUuisIyCEuypQdDUNMaN_tjacAB2opATgHvFuoepOiAdu9gFMvsxhPyxA3QrOINSuch9Xol67oCmpM90EbKwTvcvj1peKsrojgjZpfCxeeMlBnf91TtHn9hudRUOIyVCIeLGPT8Z3vwIcfEVKG41F01pHVVpVK6W2ho',
                    duration: 275,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.cardImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfDQPHqfdMWlnSFtNGjCGU2tsWf_TpMUmYCWaSEAj5TsUK_i9A7JdDXSjHiPVmzRTUf5lfxN7qDA7Xc6SEbew2B40CWecdj5gCSFA8mLnPkNUuisIyCEuypQdDUNMaN_tjacAB2opATgHvFuoepOiAdu9gFMvsxhPyxA3QrOINSuch9Xol67oCmpM90EbKwTvcvj1peKsrojgjZpfCxeeMlBnf91TtHn9hudRUOIyVCIeLGPT8Z3vwIcfEVKG41F01pHVVpVK6W2ho' }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ gap: 2 }}>
                    <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>Midnight City</RNText>
                    <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>M83 • Hurry Up</RNText>
                  </View>
                </Pressable>

                {/* Card 2 */}
                <Pressable 
                  style={[styles.trendingCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '2',
                    title: 'Digital Dreams',
                    artist: 'Future Bass',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhfq7XJon8xNjH4kku2qi-t0541UtnlKoowqz8gGCflJr1KzVAPqUfeyO3H-vu7OeQQ9nU_Dk_AoqMCqmdQ-p0t6niwm7ALrbjyzxnrift-UsEH6YAUNQ1Oj7apZkdzHUYEo1lk8HjxLQFU6svtf4BEMFWs9Gp2kH5kwUfwo_g623Polz4YemCtc8givXSYOjGUbJxjszml6xsZjUwwo5jISg1rorJ_Jvs--tTDCYjdKNl0LpiN5MEFsNmQzBY69cma00GLySEv5NY',
                    duration: 220,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.cardImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhfq7XJon8xNjH4kku2qi-t0541UtnlKoowqz8gGCflJr1KzVAPqUfeyO3H-vu7OeQQ9nU_Dk_AoqMCqmdQ-p0t6niwm7ALrbjyzxnrift-UsEH6YAUNQ1Oj7apZkdzHUYEo1lk8HjxLQFU6svtf4BEMFWs9Gp2kH5kwUfwo_g623Polz4YemCtc8givXSYOjGUbJxjszml6xsZjUwwo5jISg1rorJ_Jvs--tTDCYjdKNl0LpiN5MEFsNmQzBY69cma00GLySEv5NY' }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ gap: 2 }}>
                    <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>Digital Dreams</RNText>
                    <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>Future Bass</RNText>
                  </View>
                </Pressable>

                {/* Card 3 */}
                <Pressable 
                  style={[styles.trendingCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '3',
                    title: 'Neon Pulse',
                    artist: 'Hyperpop Hits',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBii0ifsO0Oxt2cZuQ6Lr35U6adiMohoAEA5es2m4YnpHmC-4sk_2L7kyGFSWZFaCJ-eGJHD1ZhUVBBdy0bXwprvUnERJWpGs1JGZ7mE2noKFk3RPS2tS09zKCQ5C2-OmeA_R-x9rgsMyTeyoiXCKN2mU7IIODn9VTnkKm7uC8sVA06iT0Mro0QfA2jp63-BM5JVdWM2ehZMwgM5U3dXSpKjmOvgPIlJQBQ53_daH0XejobcTcWrkiQUb3BxGhGLeHS0CgM00RiosJq',
                    duration: 195,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.cardImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBii0ifsO0Oxt2cZuQ6Lr35U6adiMohoAEA5es2m4YnpHmC-4sk_2L7kyGFSWZFaCJ-eGJHD1ZhUVBBdy0bXwprvUnERJWpGs1JGZ7mE2noKFk3RPS2tS09zKCQ5C2-OmeA_R-x9rgsMyTeyoiXCKN2mU7IIODn9VTnkKm7uC8sVA06iT0Mro0QfA2jp63-BM5JVdWM2ehZMwgM5U3dXSpKjmOvgPIlJQBQ53_daH0XejobcTcWrkiQUb3BxGhGLeHS0CgM00RiosJq' }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ gap: 2 }}>
                    <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>Neon Pulse</RNText>
                    <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>Hyperpop Hits</RNText>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Section 2: Top Global Charts */}
          <View style={{ gap: 12 }}>
            <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>Top Global Charts</RNText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                {/* Chart Card 1 */}
                <Pressable 
                  style={[styles.chartCardPurple, { flexDirection: 'row', alignItems: 'center' }]} 
                  onPress={() => alert('Opening Global Top 50...')}
                >
                  <View style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
                    <RNText style={styles.chartTitle}>Global Top 50</RNText>
                    <RNText style={styles.chartSubtitle}>Updated Daily</RNText>
                  </View>
                  <View style={styles.chartIconContainer}>
                    <SymbolView 
                      name={{ ios: 'chart.bar.xaxis', android: 'leaderboard', web: 'leaderboard' }} 
                      size={56} 
                      tintColor="#ffffff" 
                    />
                  </View>
                </Pressable>

                {/* Chart Card 2 */}
                <Pressable 
                  style={[styles.chartCardCyan, { flexDirection: 'row', alignItems: 'center' }]} 
                  onPress={() => alert('Opening Viral Hits...')}
                >
                  <View style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
                    <RNText style={styles.chartTitle}>Viral Hits</RNText>
                    <RNText style={styles.chartSubtitle}>Trending Worldwide</RNText>
                  </View>
                  <View style={styles.chartIconContainer}>
                    <SymbolView 
                      name={{ ios: 'arrow.up.forward.app.fill', android: 'trending_up', web: 'trending_up' }} 
                      size={56} 
                      tintColor="#ffffff" 
                    />
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Section 3: New Releases */}
          <View style={{ gap: 12 }}>
            <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>New Releases</RNText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                {/* Card 1 */}
                <Pressable 
                  style={[styles.releaseCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '4',
                    title: 'After Hours',
                    artist: 'The Weeknd',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVMxlOP41NQwNt6ZJ45a_jh2s2uRtu01WlA9hwudrnyZz76aHqh636WockhAISa6yevCjmL8hnWzTma9NrGXLZAV7I1d5wbCdpiVB3slUA3avMBsiWUt6F8XXs8QjQY4gRroNnXWLFAOGzRzn5VxsseTE6uuLeTnkEGgzlMt8-qKic1zfkXhLskpwue1jwgq6PZo0nQ7raIjK1jXQ-6I-gJ3UuoS8yjElJGkfMDL9PuV6wNvvYu6B32W-5DQxPSb2a8ti593GrJZLy',
                    duration: 361,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.releaseImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVMxlOP41NQwNt6ZJ45a_jh2s2uRtu01WlA9hwudrnyZz76aHqh636WockhAISa6yevCjmL8hnWzTma9NrGXLZAV7I1d5wbCdpiVB3slUA3avMBsiWUt6F8XXs8QjQY4gRroNnXWLFAOGzRzn5VxsseTE6uuLeTnkEGgzlMt8-qKic1zfkXhLskpwue1jwgq6PZo0nQ7raIjK1jXQ-6I-gJ3UuoS8yjElJGkfMDL9PuV6wNvvYu6B32W-5DQxPSb2a8ti593GrJZLy' }}
                      style={styles.releaseImage}
                      contentFit="cover"
                    />
                  </View>
                  <RNText style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={1}>After Hours</RNText>
                </Pressable>

                {/* Card 2 */}
                <Pressable 
                  style={[styles.releaseCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '5',
                    title: 'Rainy Days',
                    artist: 'Lofi Beats',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV5-90Zf5HNZo5JeV0MAuTHdMMYel__xernFKd-e_pR1P_ai07g-nZl9yMxC7Mjidq2ndsRLDmi6y7HV371aqNCbPArDC2NM_1FvuWNhBSBMGOIaxooUsbXH4Okwqj_5WTaUGEU7oEgI55fNlXhg7716VWQefT0rbWrQqpDZSRLzXvCSfonwUtbeoAyg9WlfO_fGwWyAIXp4iDcmH0VE209AX7POWim9BHiT-hYFjpoJ4fZH7S66dvh0Ba_f9xVqpwIl29fDFEBlsW',
                    duration: 178,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.releaseImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV5-90Zf5HNZo5JeV0MAuTHdMMYel__xernFKd-e_pR1P_ai07g-nZl9yMxC7Mjidq2ndsRLDmi6y7HV371aqNCbPArDC2NM_1FvuWNhBSBMGOIaxooUsbXH4Okwqj_5WTaUGEU7oEgI55fNlXhg7716VWQefT0rbWrQqpDZSRLzXvCSfonwUtbeoAyg9WlfO_fGwWyAIXp4iDcmH0VE209AX7POWim9BHiT-hYFjpoJ4fZH7S66dvh0Ba_f9xVqpwIl29fDFEBlsW' }}
                      style={styles.releaseImage}
                      contentFit="cover"
                    />
                  </View>
                  <RNText style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={1}>Rainy Days</RNText>
                </Pressable>

                {/* Card 3 */}
                <Pressable 
                  style={[styles.releaseCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '6',
                    title: 'Hyper Drive',
                    artist: 'Outrun Synth',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOx780HJhvL9V-Bd-TZ133qlATS6SBEG8WPu2hpxlpgq5IVA3KRurrphUNZxA7vbjMjLZWzELTLMZUs5njXIkYH-BUyc9fon6SmFxkLJkeIXRfwE_nnux93z1vXyLoGLARkHSG7SiGGdeQZ_qbE_AeyKYlmeZACxp2l3Y1I7dGZc6OColGsCxI_vKBj4mp3MDKoL2A3ez6AJgMNt3NAGterxwd2VRdy0i2OD7SNQ5gb7h_-DMpht6lN4YXH6-ULqCGfL1YcDMaq8j9',
                    duration: 245,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.releaseImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOx780HJhvL9V-Bd-TZ133qlATS6SBEG8WPu2hpxlpgq5IVA3KRurrphUNZxA7vbjMjLZWzELTLMZUs5njXIkYH-BUyc9fon6SmFxkLJkeIXRfwE_nnux93z1vXyLoGLARkHSG7SiGGdeQZ_qbE_AeyKYlmeZACxp2l3Y1I7dGZc6OColGsCxI_vKBj4mp3MDKoL2A3ez6AJgMNt3NAGterxwd2VRdy0i2OD7SNQ5gb7h_-DMpht6lN4YXH6-ULqCGfL1YcDMaq8j9' }}
                      style={styles.releaseImage}
                      contentFit="cover"
                    />
                  </View>
                  <RNText style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={1}>Hyper Drive</RNText>
                </Pressable>

                {/* Card 4 */}
                <Pressable 
                  style={[styles.releaseCard, { gap: 8 }]} 
                  onPress={() => playTrack({
                    id: '7',
                    title: 'Heritage Mix',
                    artist: 'Folklore Beats',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTna_dCNMIFJ3VTXsh4RR0CcysDUg6NtxfOFCNj226ND7x1mT6NG7s_C_4ujzIbPJoZM8Pdd0IrCFOtZ1IROpDTQxwUju7oNYj5D8ZzpjsWcr6ZyiuEfEtvwzpWu8O3mlwWUv8MifMShgzzzcvUPgchyxdXdsv-pdFcqVcxFrUGnHAOv4o7XalqQUN1yN9iUWNw0Xd8gY0Wp1jeI5G2DurhtE0-5hbquARsP3cWgTf0ZJ2bqn0V1YMHmx53ZW9EgbkRANW0MUbYJIl',
                    duration: 298,
                    sourceType: 'local'
                  })}
                >
                  <View style={[styles.releaseImageContainer, { backgroundColor: colors.backgroundElement }]}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTna_dCNMIFJ3VTXsh4RR0CcysDUg6NtxfOFCNj226ND7x1mT6NG7s_C_4ujzIbPJoZM8Pdd0IrCFOtZ1IROpDTQxwUju7oNYj5D8ZzpjsWcr6ZyiuEfEtvwzpWu8O3mlwWUv8MifMShgzzzcvUPgchyxdXdsv-pdFcqVcxFrUGnHAOv4o7XalqQUN1yN9iUWNw0Xd8gY0Wp1jeI5G2DurhtE0-5hbquARsP3cWgTf0ZJ2bqn0V1YMHmx53ZW9EgbkRANW0MUbYJIl' }}
                      style={styles.releaseImage}
                      contentFit="cover"
                    />
                  </View>
                  <RNText style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={1}>Heritage Mix</RNText>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Section 4: Quick Actions */}
          <View style={[styles.quickActionsRow, { flexDirection: 'row', width: screenWidth, gap: 16 }]}>
            {/* Scan Local Storage Button */}
            <Pressable
              style={[
                styles.quickActionButton, 
                { flex: 1, gap: 8, alignItems: 'center', backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }
              ]}
              onPress={() => alert('Scanning local storage...')}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: colors.accentLight }]}>
                <SymbolView name={{ ios: 'folder.badge.plus', android: 'folder_open', web: 'folder_open' }} size={22} tintColor={colors.accent} />
              </View>
              <RNText style={[styles.actionText, { color: colors.text }]}>Scan Local Storage</RNText>
            </Pressable>

            {/* Import Playlist Button */}
            <Pressable
              style={[
                styles.quickActionButton, 
                { flex: 1, gap: 8, alignItems: 'center', backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }
              ]}
              onPress={() => alert('Importing playlist...')}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: colors.accentLight }]}>
                <SymbolView name={{ ios: 'link', android: 'link', web: 'link' }} size={22} tintColor={colors.accent} />
              </View>
              <RNText style={[styles.actionText, { color: colors.text }]}>Import Playlist</RNText>
            </Pressable>
          </View>

          {/* Inset for floating player & native tabs */}
          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Floating Mini Player */}
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
  resultsSectionHeader: {
    width: screenWidth - 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitlePadding: {
    paddingHorizontal: 16,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  horizontalRow: {
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 160,
  },
  cardImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 160,
    height: 160,
  },
  cardImage: {
    width: 160,
    height: 160,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 12,
  },
  chartCardPurple: {
    width: 270,
    height: 128,
    backgroundColor: '#593090',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  chartCardCyan: {
    width: 270,
    height: 128,
    backgroundColor: '#004f58',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  chartIconContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    opacity: 0.25,
  },
  releaseCard: {
    width: 112,
  },
  releaseImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 112,
    height: 112,
  },
  releaseImage: {
    width: 112,
    height: 112,
  },
  releaseTitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActionsRow: {
    paddingHorizontal: 16,
  },
  quickActionButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    height: 104,
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  miniPlayerRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPlayerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniPlayerSubtitle: {
    fontSize: 10,
  },
  miniPlayerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '0%',
  },
});
