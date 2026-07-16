import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 🌟 PURE JAVASCRIPT SHA-1 IMPLEMENTATION (For SAPISIDHASH without Native dependencies)
// ============================================================================
function sha1(message: string): string {
    let wordCount = ((message.length + 8) >> 6) + 1;
    let words = new Int32Array(wordCount * 16);
    for (let i = 0; i < message.length; i++) {
        words[i >> 2] |= message.charCodeAt(i) << (24 - (i % 4) * 8);
    }
    words[message.length >> 2] |= 0x80 << (24 - (message.length % 4) * 8);
    words[wordCount * 16 - 1] = message.length * 8;

    let h0 = 1732584193;
    let h1 = -271733879;
    let h2 = -1732584194;
    let h3 = 271733878;
    let h4 = -1009589776;

    let w = new Int32Array(80);

    for (let i = 0; i < words.length; i += 16) {
        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;

        for (let j = 0; j < 80; j++) {
            if (j < 16) {
                w[j] = words[i + j];
            } else {
                let val = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
                w[j] = (val << 1) | (val >>> 31);
            }

            let f = 0;
            let k = 0;
            if (j < 20) {
                f = (b & c) | (~b & d);
                k = 1518500249;
            } else if (j < 40) {
                f = b ^ c ^ d;
                k = 1859775393;
            } else if (j < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = -1894007588;
            } else {
                f = b ^ c ^ d;
                k = -899497514;
            }

            let temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
            e = d;
            d = c;
            c = (b << 30) | (b >>> 2);
            b = a;
            a = temp;
        }

        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
    }

    let result = '';
    const hex = [h0, h1, h2, h3, h4];
    for (let i = 0; i < 5; i++) {
        let word = hex[i];
        let str = (word >>> 0).toString(16);
        result += ('00000000' + str).slice(-8);
    }
    return result;
}

// ============================================================================
// 🌟 INNER TUBE CONFIGURATIONS
// ============================================================================
const API_KEY = 'AIzaSyAO_JVGg5V5W2mXWla5qaJ239t-1kF03Z8';
const BASE_URL = 'https://music.youtube.com/youtubei/v1';

interface ClientConfig {
    clientName: string;
    clientVersion: string;
    userAgent: string;
    androidSdkVersion?: number;
}

const CLIENTS: Record<string, ClientConfig> = {
    ANDROID_MUSIC: {
        clientName: 'ANDROID_MUSIC',
        clientVersion: '6.45.52',
        userAgent: 'com.google.android.apps.youtube.music/6.45.52 (Linux; U; Android 13; en_US; Pixel 7 Pro; Build/TD1A.220804.031)',
        androidSdkVersion: 33
    },
    WEB_REMIX: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20240618.01.00',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    ANDROID_VR: {
        clientName: 'ANDROID_VR',
        clientVersion: '1.57.19',
        userAgent: 'com.google.android.apps.youtube.vr/1.57.19 (Linux; U; Android 10; en_US; Quest 2; Build/QP1A.190711.020)'
    }
};

export class InnerTubeClient {
    private static visitorData: string | null = null;
    private static glCode: string | null = null;
    private static hlCode: string | null = null;
    private static countryName: string | null = null;

    /**
     * Resolve the user's IP region / country code
     */
    public static async resolveRegion(): Promise<{ gl: string; hl: string; countryName: string }> {
        // Return cached memory if already resolved
        if (this.glCode && this.hlCode) {
            return { gl: this.glCode, hl: this.hlCode, countryName: this.countryName || 'United States' };
        }

        // Try load from AsyncStorage
        try {
            const cachedGl = await AsyncStorage.getItem('yt_gl_region');
            const cachedHl = await AsyncStorage.getItem('yt_hl_locale');
            const cachedCountry = await AsyncStorage.getItem('yt_country_name');
            if (cachedGl && cachedHl) {
                this.glCode = cachedGl;
                this.hlCode = cachedHl;
                this.countryName = cachedCountry || 'United States';
                console.log(`[InnerTubeClient] Loaded cached region: GL=${cachedGl}, HL=${cachedHl}, Country=${cachedCountry}`);
                return { gl: this.glCode, hl: this.hlCode, countryName: this.countryName };
            }
        } catch (e) {
            console.error('[InnerTubeClient] Failed to read cached region:', e);
        }

        // Fallbacks
        let gl = 'US';
        let hl = 'en';
        let countryName = 'United States';

        // 1. Try to get system language/locale
        try {
            const localeStr = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : 'en-US';
            if (localeStr) {
                const parts = localeStr.split('-');
                if (parts[0]) hl = parts[0];
                if (parts[1]) gl = parts[1].toUpperCase();
            }
        } catch (e) {
            console.warn('[InnerTubeClient] Failed to read system locale:', e);
        }

        // 2. Fetch IP Geolocation (freeipapi.com is fast, CORS-friendly, and has no API key)
        const geoAPIs = [
            'https://freeipapi.com/api/json',
            'https://ipapi.co/json/',
            'http://ip-api.com/json/'
        ];

        for (const api of geoAPIs) {
            try {
                console.log(`[InnerTubeClient] Fetching region from: ${api}`);
                const res = await fetch(api, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    const resolvedGl = data.countryCode || data.country || data.country_code;
                    const resolvedName = data.countryName || data.country_name || data.country;
                    if (resolvedGl && resolvedGl.length === 2) {
                        gl = resolvedGl.toUpperCase();
                        if (resolvedName) countryName = resolvedName;
                        console.log(`[InnerTubeClient] IP Region Resolved: GL=${gl}, Country=${countryName} via ${api}`);
                        break;
                    }
                }
            } catch (err: any) {
                console.warn(`[InnerTubeClient] Geolocation API ${api} failed:`, err.message);
            }
        }

        // Save to cache
        this.glCode = gl;
        this.hlCode = hl;
        this.countryName = countryName;
        try {
            await AsyncStorage.setItem('yt_gl_region', gl);
            await AsyncStorage.setItem('yt_hl_locale', hl);
            await AsyncStorage.setItem('yt_country_name', countryName);
        } catch (e) {
            console.error('[InnerTubeClient] Failed to cache region:', e);
        }

        return { gl, hl, countryName };
    }

    // ============================================================================
    // 🌟 THE HACK: FORMAT COOKIES FOR HTTPONLY BYPASS
    // ============================================================================
    private static formatCookies(cookieStr: string): string {
        let updatedCookie = cookieStr;

        // 1. Missing SAPISID HttpOnly duplicate hack
        if (updatedCookie.includes('SAPISID=') && !updatedCookie.includes('__Secure-3PAPISID=')) {
            const match = updatedCookie.match(/SAPISID=([^;]+)/);
            if (match) updatedCookie += `; __Secure-3PAPISID=${match[1]}`;
        }

        // 2. Missing SID HttpOnly duplicate hack
        if (updatedCookie.includes('SID=')) {
            const match = updatedCookie.match(/SID=([^;]+)/);
            if (match) {
                if (!updatedCookie.includes('__Secure-3PSID=')) updatedCookie += `; __Secure-3PSID=${match[1]}`;
                if (!updatedCookie.includes('__Secure-1PSID=')) updatedCookie += `; __Secure-1PSID=${match[1]}`;
            }
        }

        return updatedCookie;
    }

    /**
     * Parse cookies and generate SAPISIDHASH if SAPISID exists
     */
    private static generateSapisidHash(cookieString: string): string | null {
        const match = cookieString.match(/(?:^|;)\s*SAPISID=([^;]+)/);
        if (!match) return null;

        const sapisid = match[1];
        const timestamp = Math.floor(Date.now() / 1000);
        const hashMsg = `${timestamp} ${sapisid} https://music.youtube.com`;
        const hashVal = sha1(hashMsg);
        return `SAPISIDHASH ${timestamp}_${hashVal}`;
    }

    /**
     * Construct request headers and context payload
     */
    private static async getRequestDetails(
        clientKey: 'ANDROID_MUSIC' | 'WEB_REMIX' | 'ANDROID_VR' = 'WEB_REMIX',
        excludeAuth = false
    ) {
        const client = CLIENTS[clientKey];
        let cookies = excludeAuth ? null : await AsyncStorage.getItem('yt_cookies');

        // Initialize Region details if not resolved
        if (!this.glCode || !this.hlCode) {
            await this.resolveRegion();
        }

        // Initialize Visitor Data if not cached in memory
        if (!this.visitorData) {
            this.visitorData = await AsyncStorage.getItem('yt_visitor_data');
        }

        const headers: Record<string, string> = {
            'User-Agent': client.userAgent,
            'Content-Type': 'application/json',
        };

        // Web-specific headers only when NOT excluding auth
        if (!excludeAuth) {
            if (clientKey === 'WEB_REMIX') {
                headers['X-Goog-Api-Format-Version'] = '2';
                headers['X-Origin'] = 'https://music.youtube.com';
                headers['Origin'] = 'https://music.youtube.com';
                headers['X-Youtube-Client-Name'] = '26';
                headers['X-Youtube-Client-Version'] = client.clientVersion;
            } else if (clientKey === 'ANDROID_MUSIC') {
                headers['X-Goog-Api-Format-Version'] = '2';
                headers['X-Origin'] = 'https://music.youtube.com';
                headers['Origin'] = 'https://music.youtube.com';
                headers['X-Youtube-Client-Name'] = '67';
                headers['X-Youtube-Client-Version'] = client.clientVersion;
            }
        }

        if (cookies && !excludeAuth) {
            // 🌟 APPLYING THE COOKIE HACK HERE
            cookies = this.formatCookies(cookies);

            headers['Cookie'] = cookies;
            headers['X-Goog-AuthUser'] = '0';
            const authHash = this.generateSapisidHash(cookies);
            if (authHash) {
                headers['Authorization'] = authHash;
            }
        }

        // Always pass visitorData if available
        if (this.visitorData) {
            headers['X-Goog-Visitor-Id'] = this.visitorData;
        }

        const context: any = {
            client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion,
                hl: this.hlCode || 'en',
                gl: this.glCode || 'US',
                utcOffsetMinutes: -new Date().getTimezoneOffset(),
            },
            user: {
                lockedSafetyMode: false
            }
        };

        if (client.androidSdkVersion) {
            context.client.androidSdkVersion = client.androidSdkVersion;
        }

        // Always pass visitorData if available
        if (this.visitorData) {
            context.client.visitorData = this.visitorData;
        }

        return { headers, context };
    }

    /**
     * Send POST request to InnerTube API
     */
    private static async postRequest(
        endpoint: string,
        body: any,
        clientKey: 'ANDROID_MUSIC' | 'WEB_REMIX' | 'ANDROID_VR' = 'WEB_REMIX',
        excludeAuth = false
    ): Promise<any> {
        const { headers, context } = await this.getRequestDetails(clientKey, excludeAuth);

        const fullBody = {
            context,
            ...body
        };

        console.log(`[InnerTubeClient] Sending POST to '${endpoint}' with headers:`, JSON.stringify(headers, null, 2));
        console.log(`[InnerTubeClient] Sending POST to '${endpoint}' with body:`, JSON.stringify(fullBody, null, 2));

        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/${endpoint}?key=${API_KEY}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(fullBody)
        });

        const duration = Math.max(1, Date.now() - startTime);

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`[InnerTubeClient] POST to '${endpoint}' failed. Status: ${response.status}. Response:`, errBody);
            throw new Error(`InnerTube Error (${response.status}): ${response.statusText}`);
        }

        const rawText = await response.text();
        const dataSize = rawText.length;
        const speedMbps = ((dataSize * 8) / (duration / 1000)) / 1000000;
        console.log(`[InnerTubeClient] POST to '${endpoint}' took ${duration}ms. Size: ${dataSize} bytes. Estimated Internet Speed: ${speedMbps.toFixed(2)} Mbps`);

        const data = JSON.parse(rawText);

        // Capture visitor data token from response body if present
        const resVisitorId = data.responseContext?.visitorData;
        if (resVisitorId && resVisitorId !== this.visitorData) {
            this.visitorData = resVisitorId;
            AsyncStorage.setItem('yt_visitor_data', resVisitorId).catch(err => {
                console.error('[InnerTube] Failed to save visitor data to AsyncStorage:', err);
            });
            console.log('[InnerTube] Captured new VISITOR_DATA token from body:', resVisitorId);
        }

        return data;
    }

    // ============================================================================
    // 🌟 RESPONSE PARSERS
    // ============================================================================

    private static parseMusicResponsiveListItem(renderer: any): any {
        if (!renderer) return null;

        // Extract Video ID / Playlist ID / Artist ID
        let id = renderer.playlistItemData?.videoId || renderer.navigationEndpoint?.watchEndpoint?.videoId;
        let isPlayable = !!id;
        let itemType: 'track' | 'playlist' | 'artist' | 'album' = 'track';

        if (!id) {
            const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId ||
                renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
            if (browseId) {
                id = browseId;
                if (browseId.startsWith('UC')) {
                    itemType = 'artist';
                } else if (browseId.startsWith('MPRE') || browseId.startsWith('FEmusic_album')) {
                    itemType = 'album';
                } else {
                    itemType = 'playlist';
                }
            }
        }

        if (!id) {
            // Check if nested in second column or check first column title watchEndpoint
            const titleRun = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
            id = titleRun?.navigationEndpoint?.watchEndpoint?.videoId || titleRun?.navigationEndpoint?.browseEndpoint?.browseId;
            isPlayable = !!titleRun?.navigationEndpoint?.watchEndpoint?.videoId;
            if (id && !isPlayable) {
                if (id.startsWith('UC')) itemType = 'artist';
                else if (id.startsWith('MPRE')) itemType = 'album';
                else itemType = 'playlist';
            }
        }

        if (!id) return null;

        // Extract Title
        const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown';

        // Extract Artists
        const runs = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const artistNames: string[] = [];
        for (const run of runs) {
            if (run.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC') ||
                run.navigationEndpoint?.browseEndpoint?.browsePageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                artistNames.push(run.text);
            }
        }

        // Fallback: if no browse endpoints but we have text runs (usually separated by •)
        if (artistNames.length === 0 && runs.length > 0) {
            const text = runs[0]?.text;
            if (text && text !== '•' && !text.includes(':') && text.trim().length > 0) {
                artistNames.push(text);
            }
        }
        const artist = artistNames.join(', ') || 'Unknown Artist';

        // Extract Thumbnails
        const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const image = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png';

        // Extract Duration (in seconds)
        let duration = 0;
        const fixedCols = renderer.fixedColumns || [];
        for (const column of fixedCols) {
            const colRuns = column.musicResponsiveListItemFixedColumnRenderer?.text?.runs || [];
            for (const r of colRuns) {
                if (r.text && /^\d+:\d+(:\d+)?$/.test(r.text.trim())) {
                    const parts = r.text.trim().split(':').map(Number);
                    if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                    else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    break;
                }
            }
            if (duration > 0) break;
        }

        if (duration === 0) {
            for (const column of renderer.flexColumns || []) {
                const colRuns = column.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
                for (const r of colRuns) {
                    if (r.text && /^\d+:\d+(:\d+)?$/.test(r.text.trim())) {
                        const parts = r.text.trim().split(':').map(Number);
                        if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                        else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        break;
                    }
                }
                if (duration > 0) break;
            }
        }

        const isExplicit = !!(renderer.badges?.some((b: any) =>
            b.musicInlineBadgeRenderer?.icon?.iconType === 'OWNER_BADGE' ||
            b.musicInlineBadgeRenderer?.accessibilityData?.label === 'Explicit'
        ));

        return {
            id,
            title,
            artist,
            image,
            duration,
            isExplicit,
            sourceType: 'youtube',
            itemType
        };
    }

    private static parseMusicTwoRowItem(renderer: any): any {
        if (!renderer) return null;

        const id = renderer.navigationEndpoint?.watchEndpoint?.videoId ||
            renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
            renderer.navigationEndpoint?.browseEndpoint?.browseId;
        if (!id) return null;

        const title = renderer.title?.runs?.[0]?.text || 'Unknown';
        const artist = renderer.subtitle?.runs?.map((r: any) => r.text).join('') || 'YouTube Music';
        const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const image = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png';

        let itemType: 'track' | 'playlist' | 'artist' | 'album' = 'playlist';
        if (renderer.navigationEndpoint?.watchEndpoint?.videoId) {
            itemType = 'track';
        } else {
            const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId || '';
            if (browseId.startsWith('UC')) {
                itemType = 'artist';
            } else if (browseId.startsWith('MPRE') || id.startsWith('OLAK5uy_')) {
                itemType = 'album';
            }
        }

        return {
            id,
            title,
            artist,
            image,
            itemType,
            sourceType: 'youtube',
            duration: 0
        };
    }

    // ============================================================================
    // 🌟 API METHODS
    // ============================================================================

    /**
     * Search YouTube Music
     */
    public static async search(query: string): Promise<any[]> {
        try {
            // Params for filtering "Songs" in YouTube Music Search
            const response = await this.postRequest('search', {
                query,
                params: 'EgWKAQIIAWoKEAkQBRAFGBQQAQ%3D%3D' // Filter for songs
            });

            const results: any[] = [];
            const sectionList = response.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer;

            if (sectionList && sectionList.contents) {
                for (const section of sectionList.contents) {
                    const shelf = section.musicShelfRenderer;
                    if (shelf && shelf.contents) {
                        for (const item of shelf.contents) {
                            const parsed = this.parseMusicResponsiveListItem(item.musicResponsiveListItemRenderer);
                            if (parsed) results.push(parsed);
                        }
                    }
                }
            }

            return results;
        } catch (err) {
            console.error('[InnerTubeClient] Search error:', err);
            return [];
        }
    }

    /**
     * Fetch Home Screen Data (Personalized or Guest Charts)
     */
    public static async getHomeData(): Promise<any> {
        try {
            const cookies = await AsyncStorage.getItem('yt_cookies');
            const isLoggedIn = !!cookies;

            // Initialize Region if not yet resolved
            if (!this.glCode || !this.countryName) {
                await this.resolveRegion();
            }

            // Fetch Home Feed (FEmusic_home) for both logged-in and guest
            const response = await this.postRequest('browse', {
                browseId: 'FEmusic_home'
            });

            const shelves: any[] = [];
            let likedPlaylist: any = null;

            const sectionList = response.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer;
            if (sectionList && sectionList.contents) {
                for (const section of sectionList.contents) {
                    const carousel = section.musicCarouselShelfRenderer;
                    if (carousel) {
                        const title = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || 'Recommended';
                        const items: any[] = [];

                        for (const contentItem of carousel.contents || []) {
                            if (contentItem.musicTwoRowItemRenderer) {
                                const parsed = this.parseMusicTwoRowItem(contentItem.musicTwoRowItemRenderer);
                                if (parsed) items.push(parsed);
                            } else if (contentItem.musicResponsiveListItemRenderer) {
                                const parsed = this.parseMusicResponsiveListItem(contentItem.musicResponsiveListItemRenderer);
                                if (parsed) items.push(parsed);
                            }
                        }

                        if (items.length > 0) {
                            shelves.push({ title, items });
                        }
                    }
                }
            }

            let chartsPlaylists: any[] = [];

            if (isLoggedIn) {
                // Fetch Liked Songs details (ID: LM)
                try {
                    const likedResponse = await this.postRequest('browse', {
                        browseId: 'VLLM'
                    });

                    const header = likedResponse.header?.musicHeaderRenderer || likedResponse.header?.musicDetailHeaderRenderer;
                    const title = header?.title?.runs?.[0]?.text || 'Favorite Songs';

                    // Grab track count
                    const subtitleRuns = header?.subtitle?.runs || [];
                    let trackCount = 0;
                    for (const run of subtitleRuns) {
                        const num = parseInt(run.text.replace(/[^0-9]/g, ''));
                        if (!isNaN(num)) {
                            trackCount = num;
                            break;
                        }
                    }

                    // Grab first 4 thumbnails for cover grid
                    const tracksSection = likedResponse.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer;
                    const likedImages: string[] = [];
                    if (tracksSection && tracksSection.contents) {
                        for (const trackItem of tracksSection.contents.slice(0, 4)) {
                            const renderer = trackItem.musicResponsiveListItemRenderer;
                            const thumbs = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
                            if (thumbs.length > 0) {
                                likedImages.push(thumbs[thumbs.length - 1].url);
                            }
                        }
                    }

                    likedPlaylist = {
                        id: 'LM',
                        title,
                        trackCount,
                        images: likedImages,
                        description: 'Your liked tracks from YouTube Music'
                    };
                } catch (likedErr) {
                    console.error('[InnerTubeClient] Error loading liked playlist metadata:', likedErr);
                }
            } else {
                // For guest user, fetch regional charts playlists from FEmusic_charts
                try {
                    const chartsResponse = await this.postRequest('browse', {
                        browseId: 'FEmusic_charts'
                    });

                    const chartsSectionList = chartsResponse.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer;
                    if (chartsSectionList && chartsSectionList.contents) {
                        for (const section of chartsSectionList.contents) {
                            const carousel = section.musicCarouselShelfRenderer;
                            if (carousel) {
                                for (const contentItem of carousel.contents || []) {
                                    if (contentItem.musicTwoRowItemRenderer) {
                                        const parsed = this.parseMusicTwoRowItem(contentItem.musicTwoRowItemRenderer);
                                        if (parsed && (parsed.itemType === 'playlist' || parsed.itemType === 'album')) {
                                            chartsPlaylists.push(parsed);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (chartsErr) {
                    console.error('[InnerTubeClient] Error fetching charts playlists:', chartsErr);
                }

                // Query regional and global hits via search and append them as shelves
                try {
                    const regionalHits = await this.search(`Top 50 songs ${this.countryName || 'Global'}`);
                    if (regionalHits && regionalHits.length > 0) {
                        shelves.push({
                            title: `Top Hits in ${this.countryName || 'Your Region'}`,
                            items: regionalHits.slice(0, 15)
                        });
                    }

                    const globalHits = await this.search('Global Top 50 songs Spotify');
                    if (globalHits && globalHits.length > 0) {
                        shelves.push({
                            title: 'Global Hits',
                            items: globalHits.slice(0, 15)
                        });
                    }
                } catch (searchErr) {
                    console.error('[InnerTubeClient] Error fetching guest hits:', searchErr);
                }
            }

            const continuationToken = sectionList?.continuations?.[0]?.nextContinuationData?.continuation || null;

            return {
                isLoggedIn,
                shelves,
                likedPlaylist,
                chartsPlaylists: isLoggedIn ? [] : chartsPlaylists.slice(0, 6),
                countryName: this.countryName || 'Your Region',
                continuationToken
            };
        } catch (err) {
            console.error('[InnerTubeClient] GetHomeData error:', err);
            return {
                isLoggedIn: false,
                shelves: [],
                likedPlaylist: null,
                chartsPlaylists: [],
                countryName: 'Your Region',
                continuationToken: null
            };
        }
    }

    /**
     * Fetch YouTube Music / Google profile information of the logged-in user
     */
    public static async getAccountInfo(): Promise<{ name: string; avatar: string } | null> {
        try {
            const cookies = await AsyncStorage.getItem('yt_cookies');
            if (!cookies) return null;

            // Fetch Home Feed using WEB_REMIX client to obtain the topbar metadata
            const response = await this.postRequest('browse', {
                browseId: 'FEmusic_home'
            }, 'WEB_REMIX');

            let name = 'Connected User';
            let avatar = '';

            const topbar = response.topbar || response.globalNavigation;
            if (topbar) {
                // Find account details inside topbar activeAccountHeaderRenderer
                const accountRenderer = topbar.activeAccountHeaderRenderer || topbar.avatarHeaderRenderer;
                if (accountRenderer) {
                    name = accountRenderer.accountName?.runs?.[0]?.text || accountRenderer.displayName?.runs?.[0]?.text || name;
                    const thumbs = accountRenderer.avatar?.thumbnails || [];
                    if (thumbs.length > 0) {
                        avatar = thumbs[thumbs.length - 1].url;
                    }
                } else {
                    // Try alternative avatar locations
                    const avatarRenderer = topbar.avatar || topbar.accountLinkButton?.avatar;
                    if (avatarRenderer) {
                        const thumbs = avatarRenderer.thumbnails || [];
                        if (thumbs.length > 0) {
                            avatar = thumbs[thumbs.length - 1].url;
                        }
                    }
                }
            }

            return { name, avatar };
        } catch (err) {
            console.error('[InnerTubeClient] Error fetching account info:', err);
            return { name: 'Connected User', avatar: '' };
        }
    }

    /**
     * Fetch continuation shelves for Home Feed (Infinite Scroll)
     */
    public static async getHomeContinuation(continuationToken: string): Promise<{ shelves: any[], continuationToken: string | null }> {
        try {
            const decodedToken = continuationToken.includes('%') ? decodeURIComponent(continuationToken) : continuationToken;

            const response = await this.postRequest('browse', {
                continuation: decodedToken
            });

            const shelves: any[] = [];
            let nextContinuationToken: string | null = null;

            const continuationContents = response.continuationContents;
            if (continuationContents) {
                const sectionListContinuation = continuationContents.sectionListContinuation;
                if (sectionListContinuation) {
                    nextContinuationToken = sectionListContinuation.continuations?.[0]?.nextContinuationData?.continuation || null;

                    if (sectionListContinuation.contents) {
                        for (const section of sectionListContinuation.contents) {
                            const carousel = section.musicCarouselShelfRenderer;
                            if (carousel) {
                                const title = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || 'Recommended';
                                const items: any[] = [];

                                for (const contentItem of carousel.contents || []) {
                                    if (contentItem.musicTwoRowItemRenderer) {
                                        const parsed = this.parseMusicTwoRowItem(contentItem.musicTwoRowItemRenderer);
                                        if (parsed) items.push(parsed);
                                    } else if (contentItem.musicResponsiveListItemRenderer) {
                                        const parsed = this.parseMusicResponsiveListItem(contentItem.musicResponsiveListItemRenderer);
                                        if (parsed) items.push(parsed);
                                    }
                                }

                                if (items.length > 0) {
                                    shelves.push({ title, items });
                                }
                            }
                        }
                    }
                }
            }

            return {
                shelves,
                continuationToken: nextContinuationToken
            };
        } catch (err) {
            console.error('[InnerTubeClient] GetHomeContinuation error:', err);
            return {
                shelves: [],
                continuationToken: null
            };
        }
    }


    /**
     * Fetch Playlist/Album Details
     */
    public static async getPlaylistDetails(playlistId: string): Promise<any> {
        try {
            let browseId = playlistId === 'LM' ? 'VLLM' : playlistId;
            if ((browseId.startsWith('PL') || browseId.startsWith('OLAK5uy_') || browseId.startsWith('RD')) && !browseId.startsWith('VL')) {
                browseId = 'VL' + browseId;
            }

            let response;
            try {
                response = await this.postRequest('browse', {
                    browseId
                });
            } catch (err) {
                console.log(`[InnerTubeClient] Browse failed for ${browseId}, retrying fallbacks...`);
                // Fallback 1: Try without VL prefix
                if (browseId.startsWith('VL') && browseId !== 'VLLM') {
                    const fallbackId = browseId.substring(2);
                    try {
                        console.log(`[InnerTubeClient] Retrying without VL prefix: ${fallbackId}`);
                        response = await this.postRequest('browse', { browseId: fallbackId });
                    } catch (fallbackErr) {
                        // Fallback 2: Try without authentication headers (guest session)
                        console.log(`[InnerTubeClient] Non-prefixed browse failed, retrying guest browse for ${fallbackId}`);
                        response = await this.postRequest('browse', { browseId: fallbackId }, 'WEB_REMIX', true);
                    }
                } else {
                    // Fallback 2: Try guest browse directly
                    console.log(`[InnerTubeClient] Browse failed, retrying guest browse for ${browseId}`);
                    response = await this.postRequest('browse', { browseId }, 'WEB_REMIX', true);
                }
            }

            // Parse metadata (Title, Description, Image)
            const header = response.header?.musicHeaderRenderer ||
                response.header?.musicDetailHeaderRenderer ||
                response.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;

            let title = header?.title?.runs?.[0]?.text;
            let description = header?.description?.runs?.[0]?.text;
            let image = '';

            const thumbnails = header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
                header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            if (thumbnails.length > 0) {
                image = thumbnails[thumbnails.length - 1].url;
            }

            // Fallback to microformat for standard playlists/albums
            const microformat = response.microformat?.microformatDataRenderer;
            if (microformat) {
                if (!title) title = microformat.title;
                if (!description) description = microformat.description;
                if (!image && microformat.thumbnail?.thumbnails?.length > 0) {
                    image = microformat.thumbnail.thumbnails[microformat.thumbnail.thumbnails.length - 1].url;
                }
            }

            if (!title) title = 'Playlist';
            if (!description) description = 'YouTube Music Playlist';

            // Extract songs
            const songs: any[] = [];

            // Find section list in any potential layout location
            const sectionList = response.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer ||
                                response.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer ||
                                response.contents?.sectionListRenderer;

            let shelfRenderer: any = null;
            if (sectionList && sectionList.contents) {
                for (const section of sectionList.contents) {
                    if (section.musicPlaylistShelfRenderer) {
                        shelfRenderer = section.musicPlaylistShelfRenderer;
                        break;
                    }
                    if (section.musicShelfRenderer) {
                        shelfRenderer = section.musicShelfRenderer;
                        break;
                    }
                }
            }

            if (shelfRenderer && shelfRenderer.contents) {
                for (const item of shelfRenderer.contents) {
                    const parsed = this.parseMusicResponsiveListItem(item.musicResponsiveListItemRenderer);
                    if (parsed) songs.push(parsed);
                }
            }

            return {
                id: playlistId,
                title,
                description,
                image,
                trackCount: songs.length,
                songs
            };
        } catch (err) {
            console.error('[InnerTubeClient] GetPlaylistDetails error:', err);
            throw err;
        }
    }

    /**
     * Fetch Artist Details
     */
    public static async getArtistDetails(channelId: string): Promise<any> {
        try {
            const response = await this.postRequest('browse', {
                browseId: channelId
            });

            const header = response.header?.musicImmersiveHeaderRenderer || response.header?.musicVisualHeaderRenderer;
            const name = header?.title?.runs?.[0]?.text || 'Artist';
            const subscribers = header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text || '';
            const thumbnails = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const image = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';

            const topSongs: any[] = [];
            const albums: any[] = [];
            const singles: any[] = [];
            const videos: any[] = [];
            const playlists: any[] = [];
            const related: any[] = [];

            const sectionList = response.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer;
            if (sectionList && sectionList.contents) {
                for (const section of sectionList.contents) {
                    const shelf = section.musicShelfRenderer;
                    const carousel = section.musicCarouselShelfRenderer;

                    if (shelf) {
                        const title = (shelf.title?.runs?.[0]?.text || '').toLowerCase();
                        if (title.includes('song')) {
                            for (const item of shelf.contents || []) {
                                const parsed = this.parseMusicResponsiveListItem(item.musicResponsiveListItemRenderer);
                                if (parsed) topSongs.push(parsed);
                            }
                        }
                    } else if (carousel) {
                        const title = (carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || '').toLowerCase();
                        const targetList = title.includes('album') ? albums :
                            title.includes('single') ? singles :
                                title.includes('video') ? videos :
                                    title.includes('playlist') ? playlists :
                                        (title.includes('fans') || title.includes('similar') || title.includes('related')) ? related : null;

                        if (targetList) {
                            for (const item of carousel.contents || []) {
                                if (item.musicTwoRowItemRenderer) {
                                    const parsed = this.parseMusicTwoRowItem(item.musicTwoRowItemRenderer);
                                    if (parsed) {
                                        if (targetList === related) {
                                            targetList.push({
                                                id: parsed.id,
                                                name: parsed.title,
                                                image: parsed.image,
                                                subscribers: parsed.artist
                                            });
                                        } else {
                                            targetList.push({
                                                ...parsed,
                                                year: parsed.artist
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return {
                id: channelId,
                name,
                subscribers,
                monthlyListeners: '',
                image,
                topSongs: topSongs.slice(0, 10),
                albums,
                singles,
                videos,
                playlists,
                related
            };
        } catch (err) {
            console.error('[InnerTubeClient] GetArtistDetails error:', err);
            throw err;
        }
    }

    /**
     * Resolve Direct Stream URL using ANDROID_MUSIC client spoofing
     */
    public static async getStreamUrl(videoId: string): Promise<any> {
        console.log('[InnerTubeClient] getStreamUrl called with videoId:', videoId);
        try {
            // Load visitor data if not loaded
            if (!this.visitorData) {
                this.visitorData = await AsyncStorage.getItem('yt_visitor_data');
            }

            // If we still don't have visitorData (first time cold run), fetch a visitor token first
            if (!this.visitorData) {
                console.log('[InnerTubeClient] No visitorData found, fetching dummy search to capture visitor token...');
                try {
                    await this.postRequest('search', {
                        query: 'music',
                        params: 'EgWKAQIIAWoKEAkQBRAFGBQQAQ%3D%3D'
                    }, 'WEB_REMIX', true);
                } catch (err) {
                    console.warn('[InnerTubeClient] Pre-fetch visitor search failed:', err);
                }
            }

            // Hit `/player` endpoint with ANDROID_VR client to get direct stream URLs
            const response = await this.postRequest('player', {
                videoId,
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp: 19800
                    }
                }
            }, 'ANDROID_VR', true);

            const streamingData = response.streamingData;
            if (!streamingData || !streamingData.adaptiveFormats) {
                console.log('[InnerTubeClient] No formats. PlayabilityStatus:', JSON.stringify(response.playabilityStatus, null, 2));
                throw new Error('No streaming formats found in player response');
            }

            // Extract audio formats that have a direct playable URL
            const audioFormats = streamingData.adaptiveFormats.filter((format: any) =>
                format.mimeType?.startsWith('audio/') && !!format.url
            );

            if (audioFormats.length === 0) {
                throw new Error('No direct playable audio streams found');
            }

            // Sort descending by bitrate
            audioFormats.sort((a: any, b: any) => {
                return (b.bitrate || 0) - (a.bitrate || 0);
            });

            const bestFormat = audioFormats[0];

            return {
                id: videoId,
                stream_url: bestFormat.url,
                duration: Math.round(Number(response.videoDetails?.lengthSeconds || 0))
            };
        } catch (err) {
            console.error('[InnerTubeClient] Stream URL extraction error:', err);
            throw err;
        }
    }

    /**
     * Retrieve Sync/Static Lyrics from LRCLIB or InnerTube fallback
     */
    public static async getLyrics(title: string, artist: string, videoId?: string): Promise<any> {
        const cleanArtist = artist.split('•')[0].trim();
        const searchTitle = title.split('-').pop()?.trim() || title;

        // Layer 1: LRCLIB (Direct from Client-Side)
        try {
            if (cleanArtist) {
                const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(searchTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.syncedLyrics) return { type: 'synced', lyrics: data.syncedLyrics, source: 'lrclib' };
                    if (data.plainLyrics) return { type: 'static', lyrics: data.plainLyrics, source: 'lrclib' };
                }
            }

            // Try search in LRCLIB
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${searchTitle} ${cleanArtist}`.trim())}`;
            const searchRes = await fetch(searchUrl);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData && searchData.length > 0) {
                    const best = searchData[0];
                    if (best.syncedLyrics) return { type: 'synced', lyrics: best.syncedLyrics, source: 'lrclib_search' };
                    if (best.plainLyrics) return { type: 'static', lyrics: best.plainLyrics, source: 'lrclib_search' };
                }
            }
        } catch (lrclibErr) {
            console.warn('[InnerTubeClient] LRCLIB lyrics lookup failed, trying YouTube fallback...', lrclibErr);
        }

        // Layer 2: YouTube Music Fallback via `/next` and `/browse`
        if (videoId) {
            try {
                // Call `/next` to get watch playlist, which contains the lyrics browse ID
                const nextResponse = await this.postRequest('next', {
                    videoId
                });

                const tabs = nextResponse.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
                const lyricsTab = tabs?.find((t: any) => t.tabRenderer?.title?.runs?.[0]?.text?.toLowerCase() === 'lyrics');
                const lyricsBrowseId = lyricsTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;

                if (lyricsBrowseId) {
                    // Call `/browse` with the lyrics browse ID
                    const browseResponse = await this.postRequest('browse', {
                        browseId: lyricsBrowseId
                    });

                    const lyricsText = browseResponse.contents?.sectionListRenderer?.contents?.[0]?.musicLyricsRenderer?.description?.runs?.[0]?.text;
                    if (lyricsText) {
                        return {
                            type: 'static',
                            lyrics: lyricsText,
                            source: 'youtube'
                        };
                    }
                }
            } catch (ytLyricsErr) {
                console.error('[InnerTubeClient] YouTube fallback lyrics failed:', ytLyricsErr);
            }
        }

        return {
            type: 'none',
            lyrics: 'Lyrics not available for this track.'
        };
    }
}