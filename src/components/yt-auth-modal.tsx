import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 🌟 THE FIX: Import the Native Cookie Manager
import CookieManager from '@preeternal/react-native-cookie-manager';

interface YTAuthModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// 🌟 THE ULTIMATE BYPASS: Google iOS Safari ko block nahi karta
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15';

export default function YTAuthModal({ isVisible, onClose, onSuccess }: YTAuthModalProps) {
    const colors = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);

    // 🌟 THE FIX: Native Cookie Fetching Logic (No Injected JS)
    const grabNativeCookies = async () => {
        try {
            // Direct Android System se YouTube Music ki sab cookies fetch karo (including HttpOnly)
            const cookies = await CookieManager.get('https://music.youtube.com');

            // Check karo agar cookies mil gayi hain aur SAPISID mojood hai
            if (cookies && cookies.SAPISID) {

                // Library ek object return karti hai, humein usay ek string banana hai backend ke liye
                const cookieString = Object.values(cookies)
                    .map((c: any) => `${c.name}=${c.value}`)
                    .join('; ');

                console.log("[YTAuthModal] ✅ NATIVE Cookies Grabbed! Length:", cookieString.length);

                // Cookies save karo aur modal band karo
                await AsyncStorage.setItem('yt_cookies', cookieString);
                onSuccess();
                onClose();
                return true;
            }
        } catch (err) {
            console.error("Error grabbing native cookies:", err);
        }
        return false;
    };

    // 🌟 THE FIX: Monitor URL Changes directly from WebView
    const handleNavigationStateChange = (navState: any) => {
        // Agar user login karke wapis YouTube Music par redirect ho gaya hai
        if (navState.url.includes('music.youtube.com')) {

            // 2 seconds ka wait dein taake YouTube properly HttpOnly cookies save kar le
            setTimeout(async () => {
                const success = await grabNativeCookies();

                // Agar internet slow hone ki wajah se pehli baar na milen, toh retry karo
                if (!success) {
                    setTimeout(grabNativeCookies, 2000);
                }
            }, 2000);
        }
    };

    return (
        <Modal visible={isVisible} transparent={false} animationType="slide">
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Sign in to YouTube Music</Text>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <AppIcon ios="xmark" android="close" size={24} color={colors.text} />
                    </Pressable>
                </View>

                {/* WebView Container */}
                <View style={styles.webviewContainer}>
                    <WebView
                        ref={webViewRef}
                        source={{
                            uri: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/',
                            // 👇 YAHAN HEADER ADD KARNA HAI 👇
                            headers: {
                                'X-Requested-With': '' // Isay empty string bhej dein taake app ka package name leak na ho
                            }
                        }}
                        userAgent={USER_AGENT}
                        applicationNameForUserAgent=""
                        onLoadEnd={() => setIsLoading(false)}
                        // Injected JS aur onMessage hata diya, uski jagah Native Navigation Listener laga diya
                        onNavigationStateChange={handleNavigationStateChange}
                        style={styles.webview}
                        domStorageEnabled={true}
                        javaScriptEnabled={true}
                        sharedCookiesEnabled={true}
                        incognito={true} // Hamesha clean login page layega
                    />

                    {isLoading && (
                        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
                            <ActivityIndicator size="large" color={colors.accent} />
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Google Login...</Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: 'bold' },
    closeBtn: { padding: 4 },
    webviewContainer: { flex: 1, position: 'relative' },
    webview: { flex: 1 },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '500' }
});