import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlaybackStore } from '../store/usePlaybackStore';

/**
 * Static Identity Profile for strict consistency across all surfaces:
 * 1. Challenge Fetch (/att/get)
 * 2. WebView Minter Sandbox (navigator.userAgent)
 * 3. Innertube Player Request (clientName, clientVersion, userAgent, visitorData)
 * 4. Googlevideo Stream URL Headers (User-Agent, Origin, Referer, X-Goog-Visitor-Id)
 */
export const UNIFIED_IDENTITY = {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20241001.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    origin: 'https://music.youtube.com',
    referer: 'https://music.youtube.com/'
};

const STORAGE_KEYS = {
    INTEGRITY_TOKEN: 'yt_integrity_token',
    INTEGRITY_TTL: 'yt_integrity_ttl',
    INTEGRITY_TIMESTAMP: 'yt_integrity_timestamp',
    PO_TOKEN: 'yt_po_token',
    PO_TOKEN_TIMESTAMP: 'yt_po_token_timestamp',
    VISITOR_DATA: 'yt_visitor_data',
    CIRCUIT_BREAKER_FAILS: 'yt_po_fail_count'
};

const DEFAULT_REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
const WAA_API_KEY = 'AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw';

function parseLooseJSON(looseJson: string): any {
    const s = looseJson.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    let j = s.replace(/,\s*([\]}])/g, '$1');
    j = j.replace(/'((?:[^'\\]|\\[\s\S])*)'/g, (_, inner) => JSON.stringify(inner.replace(/\\'/g, "'")));
    j = j.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    return JSON.parse(j);
}

interface ChallengeData {
    requestKey: string;
    interpreterUrl: string;
    program: string;
    globalName: string;
    ytcfg?: any;
}

export class PoTokenManager {
    private static webViewRef: any = null;
    private static isMinterReady: boolean = false;
    private static isMintingInProgress: boolean = false;
    private static consecutiveFailures: number = 0;
    private static circuitBreakerOpen: boolean = false;

    // Deferred resolvers for WebView bridge actions
    private static snapshotResolver: { resolve: (val: any) => void; reject: (err: any) => void } | null = null;
    private static sessionMintResolver: { resolve: (val: any) => void; reject: (err: any) => void } | null = null;
    private static contentMintResolvers: Map<string, { resolve: (val: string) => void; reject: (err: any) => void }> = new Map();

    public static setWebViewRef(ref: any) {
        this.webViewRef = ref;
    }

    public static isReady(): boolean {
        return this.isMinterReady && !!this.webViewRef;
    }

    public static isCircuitBreakerTripped(): boolean {
        return this.circuitBreakerOpen;
    }

    public static isMinting(): boolean {
        return this.isMintingInProgress;
    }

    /**
     * Called when the minter WebView unmounts. Resets readiness so a later
     * remount must complete a fresh MINTER_READY handshake (no stale state).
     */
    public static notifyWebViewUnmounted() {
        this.isMinterReady = false;
        this.webViewRef = null;
    }

    /**
     * Dispatch an action into the WebView sandbox
     */
    private static postToWebView(action: { type: string; payload?: any }) {
        if (!this.webViewRef) {
            console.warn('[PoTokenManager] Cannot send message: WebView ref is null');
            return;
        }
        const script = `window.handleNativeAction(${JSON.stringify(action)}); true;`;
        this.webViewRef.injectJavaScript(script);
    }

    /**
     * Handle incoming messages from the WebView minter sandbox
     */
    public static handleWebViewMessage(data: any) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'MINTER_READY': {
                console.log('[PoTokenManager] 🟢 WebView Minter Sandbox is ready.');
                this.isMinterReady = true;
                // Auto-prewarm in background if session token is missing or expired
                if (!this.isSessionTokenFresh() && !this.isMintingInProgress) {
                    console.log('[PoTokenManager] 🚀 Auto-prewarming session PO Token in background...');
                    this.mintSessionToken().catch((err) => {
                        console.warn('[PoTokenManager] Background auto-prewarm non-fatal error:', err.message);
                    });
                }
                break;
            }

            case 'LOG': {
                console.log('[PoTokenManager WebView]', data.message);
                break;
            }

            case 'SNAPSHOT_SUCCESS': {
                console.log('[PoTokenManager] 🟢 Snapshot produced successfully by BotGuard VM.');
                if (this.snapshotResolver) {
                    this.snapshotResolver.resolve(data);
                    this.snapshotResolver = null;
                }
                break;
            }

            case 'MINT_SESSION_SUCCESS': {
                console.log(`[PoTokenManager] 🎯 Session PO Token minted. Token length: ${data.poToken ? data.poToken.length : 0}`);
                this.consecutiveFailures = 0;
                this.circuitBreakerOpen = false;

                // Update store and persistence
                const store = usePlaybackStore.getState();
                store.setPoToken(data.poToken);
                if (data.visitorData) {
                    store.setVisitorData(data.visitorData);
                }

                if (this.sessionMintResolver) {
                    this.sessionMintResolver.resolve(data.poToken);
                    this.sessionMintResolver = null;
                }
                break;
            }

            case 'MINT_CONTENT_SUCCESS': {
                console.log(`[PoTokenManager] 🎯 Content PO Token minted for videoId: ${data.videoId}`);
                const resolver = this.contentMintResolvers.get(data.videoId);
                if (resolver) {
                    resolver.resolve(data.poToken);
                    this.contentMintResolvers.delete(data.videoId);
                }
                break;
            }

            case 'ERROR': {
                console.error(`[PoTokenManager] ❌ WebView Error in action "${data.action}":`, data.error);
                this.consecutiveFailures++;
                if (this.consecutiveFailures >= 3) {
                    console.warn('[PoTokenManager] ⚠️ Tripping circuit breaker due to 3 consecutive failures. Falling back to Tier 2 (ANDROID_VR).');
                    this.circuitBreakerOpen = true;
                }

                if (data.action === 'INIT_VM_AND_SNAPSHOT' && this.snapshotResolver) {
                    this.snapshotResolver.reject(new Error(data.error));
                    this.snapshotResolver = null;
                } else if (data.action === 'MINT_SESSION' && this.sessionMintResolver) {
                    this.sessionMintResolver.reject(new Error(data.error));
                    this.sessionMintResolver = null;
                } else if (data.action === 'MINT_CONTENT' && data.videoId) {
                    const resolver = this.contentMintResolvers.get(data.videoId);
                    if (resolver) {
                        resolver.reject(new Error(data.error));
                        this.contentMintResolvers.delete(data.videoId);
                    }
                }
                break;
            }
        }
    }

    /**
     * Step 1: Native Network Call - Fetch attestation challenge from YouTube homepage
     * Derives challenge directly from www.youtube.com (ytcfg, ytAtN) pair so BotGuard sees EVENT_ID.
     */
    private static async fetchChallenge(visitorData?: string): Promise<ChallengeData> {
        console.log('[PoTokenManager] 🌐 Fetching BotGuard challenge from YouTube homepage (www.youtube.com)...');

        // Primary: YouTube Desktop Homepage (www.youtube.com)
        try {
            const response = await fetch('https://www.youtube.com/', {
                headers: {
                    'User-Agent': UNIFIED_IDENTITY.userAgent,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            if (response.ok) {
                const html = await response.text();

                // 1. Extract ytcfg configuration (contains EVENT_ID, VISITOR_DATA, etc.)
                let ytcfg: any = null;
                const ytcfgMatch = html.match(/ytcfg\.set\s*\(\s*(\{.+?\})\s*\)\s*;/s);
                if (ytcfgMatch) {
                    try {
                        ytcfg = JSON.parse(ytcfgMatch[1]);
                        console.log(`[PoTokenManager] ✅ Extracted ytcfg (EVENT_ID: ${ytcfg.EVENT_ID || 'present'})`);
                        if (ytcfg.VISITOR_DATA) {
                            usePlaybackStore.getState().setVisitorData(ytcfg.VISITOR_DATA);
                        }
                    } catch (cfgErr: any) {
                        console.warn('[PoTokenManager] ytcfg JSON parse failed:', cfgErr.message);
                    }
                }

                // 2. Extract window.ytAtN challenge
                const ytAtNMatch = html.match(/(?:window\.)?ytAtN\s*\(\s*(\{.+?\})\s*\)/s);
                if (ytAtNMatch) {
                    const parsed = parseLooseJSON(ytAtNMatch[1]);
                    const R = typeof parsed.R === 'string' ? JSON.parse(parsed.R) : parsed.R;
                    const bgChallenge = R?.bgChallenge || R?.bg_challenge;

                    if (bgChallenge) {
                        const interpreterUrl = bgChallenge.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue ||
                                               bgChallenge.interpreter_url?.private_do_not_access_or_else_trusted_resource_url_wrapped_value ||
                                               bgChallenge.interpreterUrl;
                        const program = bgChallenge.program;
                        const globalName = bgChallenge.globalName || bgChallenge.global_name;

                        if (interpreterUrl && program && globalName) {
                            const formattedUrl = typeof interpreterUrl === 'string'
                                ? (interpreterUrl.startsWith('http') ? interpreterUrl : `https:${interpreterUrl}`)
                                : `https:${interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue}`;

                            console.log(`[PoTokenManager] ✅ Successfully extracted challenge from homepage (globalName: ${globalName}, program length: ${program.length})`);
                            return {
                                requestKey: DEFAULT_REQUEST_KEY,
                                interpreterUrl: formattedUrl,
                                program,
                                globalName,
                                ytcfg
                            };
                        }
                    }
                }
            }
        } catch (homeErr: any) {
            console.warn('[PoTokenManager] Homepage challenge extraction failed, falling back to WAA Create API:', homeErr.message);
        }

        // Emergency Fallback: WAA Create Private API
        console.log('[PoTokenManager] 🌐 Attempting emergency WAA Create API fallback...');
        const waaResponse = await fetch('https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/Create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json+protobuf',
                'x-goog-api-key': WAA_API_KEY,
                'x-user-agent': 'grpc-web-javascript/0.1',
                'User-Agent': UNIFIED_IDENTITY.userAgent
            },
            body: JSON.stringify([DEFAULT_REQUEST_KEY])
        });

        if (!waaResponse.ok) {
            throw new Error(`WAA challenge fetch failed: HTTP ${waaResponse.status}`);
        }

        const rawData = await waaResponse.json() as any[];
        const interpreterUrl = rawData[4]?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue || rawData[4];
        const program = rawData[2];
        const globalName = rawData[3];

        if (!interpreterUrl || !program || !globalName) {
            throw new Error('Incomplete WAA challenge data received from server');
        }

        console.log('[PoTokenManager] ✅ Successfully retrieved challenge via WAA Create API');
        return {
            requestKey: rawData[0] || DEFAULT_REQUEST_KEY,
            interpreterUrl: interpreterUrl.startsWith('http') ? interpreterUrl : `https:${interpreterUrl}`,
            program,
            globalName
        };
    }

    /**
     * Step 2: Native Network Call - Request Integrity Token from WAA GenerateIT
     */
    private static async requestIntegrityToken(requestKey: string, botguardResponse: string): Promise<{ integrityToken: string; estimatedTtlSecs: number }> {
        console.log('[PoTokenManager] 🌐 Requesting Integrity Token from WAA GenerateIT...');

        const payload = [requestKey, botguardResponse];
        const response = await fetch('https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/GenerateIT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json+protobuf',
                'x-goog-api-key': WAA_API_KEY,
                'x-user-agent': 'grpc-web-javascript/0.1',
                'User-Agent': UNIFIED_IDENTITY.userAgent
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`GenerateIT failed with status ${response.status}`);
        }

        const json = await response.json() as [string, number, number, string];
        const [integrityToken, estimatedTtlSecs] = json;

        if (!integrityToken) {
            throw new Error('GenerateIT returned empty integrity token');
        }

        console.log(`[PoTokenManager] ✅ Received Integrity Token. Estimated TTL: ${estimatedTtlSecs}s (~${Math.round(estimatedTtlSecs / 3600)}h)`);

        // Persist integrity token in AsyncStorage
        AsyncStorage.setItem(STORAGE_KEYS.INTEGRITY_TOKEN, integrityToken).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEYS.INTEGRITY_TTL, String(estimatedTtlSecs || 21600)).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEYS.INTEGRITY_TIMESTAMP, String(Date.now())).catch(() => {});

        return { integrityToken, estimatedTtlSecs: estimatedTtlSecs || 21600 };
    }

    /**
     * Full Handshake:
     * 1. Fetch challenge natively
     * 2. Download BotGuard VM script (~500KB) natively
     * 3. Send to WebView to execute snapshot
     * 4. Call GenerateIT natively
     * 5. Send integrityToken into WebView to mint session PO token
     */
    public static async mintSessionToken(targetVisitorData?: string): Promise<string> {
        if (this.isMintingInProgress) {
            console.log('[PoTokenManager] Minting already in progress. Waiting for active handshake...');
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const checkInterval = setInterval(() => {
                    const token = usePlaybackStore.getState().poToken;
                    if (token) {
                        clearInterval(checkInterval);
                        resolve(token);
                    } else if (Date.now() - start > 10000) {
                        clearInterval(checkInterval);
                        reject(new Error('Minting lock timeout'));
                    }
                }, 100);
            });
        }

        this.isMintingInProgress = true;
        try {
            // Ensure WebView minter is ready
            let waitAttempts = 0;
            while (!this.isReady() && waitAttempts < 30) {
                await new Promise((r) => setTimeout(r, 100));
                waitAttempts++;
            }

            if (!this.isReady()) {
                throw new Error(
                    `WebView Minter Sandbox not ready after 3s (ref=${!!this.webViewRef}, minterReady=${this.isMinterReady}). ` +
                    `The hidden WebView was unmounted or its postMessage bridge never delivered MINTER_READY.`
                );
            }

            const visitorData = targetVisitorData || usePlaybackStore.getState().visitorData || '';

            // Step 1: Fetch challenge natively
            const challenge = await this.fetchChallenge(visitorData);

            // Step 2: Download interpreter JS (~500KB) natively (CORS free!)
            console.log(`[PoTokenManager] 🌐 Downloading BotGuard VM interpreter from ${challenge.interpreterUrl}...`);
            const scriptRes = await fetch(challenge.interpreterUrl);
            if (!scriptRes.ok) {
                throw new Error(`Failed to download BotGuard interpreter: HTTP ${scriptRes.status}`);
            }
            const interpreterJavascript = await scriptRes.text();
            console.log(`[PoTokenManager] ✅ Downloaded interpreter script (${Math.round(interpreterJavascript.length / 1024)} KB)`);

            // Step 3: Run BotGuard VM & Snapshot inside WebView DOM
            const snapshotPromise = new Promise<{ botguardResponse: string; requestKey: string }>((resolve, reject) => {
                this.snapshotResolver = { resolve, reject };
                setTimeout(() => {
                    if (this.snapshotResolver) {
                        this.snapshotResolver.reject(new Error('BotGuard VM snapshot timed out in WebView'));
                        this.snapshotResolver = null;
                    }
                }, 6000);
            });

            this.postToWebView({
                type: 'INIT_VM_AND_SNAPSHOT',
                payload: {
                    program: challenge.program,
                    globalName: challenge.globalName,
                    interpreterJavascript,
                    requestKey: challenge.requestKey,
                    ytcfg: challenge.ytcfg
                }
            });

            const snapshotResult = await snapshotPromise;

            // Step 4: Request Integrity Token via native WAA RPC
            const { integrityToken, estimatedTtlSecs } = await this.requestIntegrityToken(
                snapshotResult.requestKey,
                snapshotResult.botguardResponse
            );

            // Step 5: Mint session token in WebView
            const mintPromise = new Promise<string>((resolve, reject) => {
                this.sessionMintResolver = { resolve, reject };
                setTimeout(() => {
                    if (this.sessionMintResolver) {
                        this.sessionMintResolver.reject(new Error('Session PO token minting timed out'));
                        this.sessionMintResolver = null;
                    }
                }, 4000);
            });

            this.postToWebView({
                type: 'MINT_SESSION',
                payload: {
                    integrityToken,
                    visitorData,
                    estimatedTtlSecs
                }
            });

            const poToken = await mintPromise;
            return poToken;
        } catch (err: any) {
            console.error('[PoTokenManager] ❌ Mint session token failed:', err.message);
            throw err;
        } finally {
            this.isMintingInProgress = false;
        }
    }

    /**
     * Mint a video-bound content PO token on demand
     */
    public static async mintContentToken(videoId: string): Promise<string> {
        if (!this.isReady()) {
            throw new Error('WebView Minter not ready for content minting');
        }

        return new Promise((resolve, reject) => {
            this.contentMintResolvers.set(videoId, { resolve, reject });
            setTimeout(() => {
                if (this.contentMintResolvers.has(videoId)) {
                    this.contentMintResolvers.delete(videoId);
                    reject(new Error(`Content token mint timed out for videoId: ${videoId}`));
                }
            }, 3000);

            this.postToWebView({
                type: 'MINT_CONTENT',
                payload: { videoId }
            });
        });
    }

    /**
     * Check if current session token is fresh and valid
     */
    public static isSessionTokenFresh(): boolean {
        const state = usePlaybackStore.getState();
        const MAX_AGE = 3.5 * 60 * 60 * 1000; // 3.5 hours
        return !!(
            state.poToken &&
            state.poToken.length > 50 &&
            state.poTokenTimestamp &&
            Date.now() - state.poTokenTimestamp < MAX_AGE
        );
    }
}
