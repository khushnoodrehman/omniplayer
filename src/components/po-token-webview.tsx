import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MINTER_HTML } from '../services/minterHtml';
import { PoTokenManager, UNIFIED_IDENTITY } from '../services/PoTokenManager';

/**
 * Headless BotGuard Minter WebView
 * 
 * Runs the bundled bgutils-js runtime in an isolated, hidden WebView with full DOM support.
 * All network communication is orchestrated by PoTokenManager in React Native.
 */
export function PoTokenWebView() {
    const webViewRef = useRef<WebView>(null);
    const reloadedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        let timer: any = null;
        if (webViewRef.current) {
            PoTokenManager.setWebViewRef(webViewRef.current);
        }
        // Watchdog: MINTER_READY should arrive via injectedJavaScript right after
        // page load. On some Android builds the postMessage bridge is not present
        // during initial parse, so if it is still missing after 5s, reload once —
        // the bridge listener is registered long before the second load.
        const check = () => {
            if (cancelled) return;
            if (PoTokenManager.isReady()) {
                console.log('[PoTokenWebView] ✅ Minter bridge confirmed ready.');
                return;
            }
            if (!reloadedRef.current && webViewRef.current) {
                reloadedRef.current = true;
                console.warn('[PoTokenWebView] ⚠️ MINTER_READY not received in 5s — reloading hidden WebView once to re-establish the postMessage bridge.');
                webViewRef.current.reload();
                timer = setTimeout(check, 5000);
                return;
            }
            console.error('[PoTokenWebView] ❌ Minter not ready even after reload. The WebView postMessage bridge is broken on this device/build.');
        };
        timer = setTimeout(check, 5000);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            PoTokenManager.notifyWebViewUnmounted();
        };
    }, []);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            PoTokenManager.handleWebViewMessage(data);
        } catch (e) {
            console.error('[PoTokenWebView] Message parse error:', e);
        }
    };

    return (
        <View style={styles.hiddenContainer} pointerEvents="none">
            <WebView
                ref={webViewRef}
                // baseUrl is LOAD-BEARING: without it the page origin is
                // about:blank (null), and the BotGuard VM binds its attestation
                // to window.location.origin — a null origin produces a degraded
                // snapshot (empty webPoSignalOutput) that WAA GenerateIT rejects
                // with an empty integrity token. Verified experimentally.
                source={{ html: MINTER_HTML, baseUrl: 'https://www.youtube.com/' }}
                onMessage={handleMessage}
                // Reliable MINTER_READY: injectedJavaScript runs after page load,
                // when window.ReactNativeWebView is guaranteed to be present.
                // (The page also posts on parse, but on some Android builds the
                // bridge is not injected yet at that point — this covers it.)
                injectedJavaScript={`(function(){try{if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'MINTER_READY'}));}}catch(e){} return true;})();`}
                userAgent={UNIFIED_IDENTITY.userAgent}
                style={styles.hiddenWebView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                cacheEnabled={true}
                onLoadEnd={() => {
                    console.log('[PoTokenWebView] WebView load finished.');
                    if (webViewRef.current) {
                        PoTokenManager.setWebViewRef(webViewRef.current);
                    }
                }}
                onError={(e) => {
                    console.error('[PoTokenWebView] WebView error:', e.nativeEvent?.description || e.nativeEvent);
                }}
                onHttpError={(e) => {
                    console.error('[PoTokenWebView] WebView HTTP error:', e.nativeEvent?.statusCode, e.nativeEvent?.url);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        width: 0,
        height: 0,
        opacity: 0,
        overflow: 'hidden'
    },
    hiddenWebView: {
        width: 0,
        height: 0,
        opacity: 0
    }
});
