from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp 
import requests
import concurrent.futures
import threading
import time

import glob

import os
import urllib.parse
from mutagen import File as MutagenFile

app = Flask(__name__)
CORS(app) 

ytmusic = YTMusic()

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "OmniPlayer API is running!"})

# --- SEARCH ENDPOINT (Pichla wala) ---
@app.route('/api/search', methods=['GET'])
def search_music():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    try:
        search_results = ytmusic.search(query, filter="songs", limit=50)
        
        formatted_results = []
        for item in search_results:
            formatted_results.append({
                "id": item.get('videoId'),
                "title": item.get('title'),
                "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                "image": item['thumbnails'][-1]['url'] if item.get('thumbnails') else "",
                "duration": item.get('duration_seconds', 0),
                "sourceType": "youtube"
            })

        return jsonify({"results": formatted_results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- STREAM EXTRACTION ENDPOINT (NAYA) ---
@app.route('/api/stream', methods=['GET'])
def get_stream_url():
    video_id = request.args.get('id')
    if not video_id:
        return jsonify({"error": "Video ID is required"}), 400

    youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    # yt-dlp ki settings - sirf audio aur direct link ke liye
    ydl_opts = {
        'format': 'bestaudio', 
        'cookiefile': 'cookies.txt',
        'quiet': True,
        'noplaylist': True,
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Metadata aur direct URL extract karo
            info = ydl.extract_info(youtube_url, download=False)
            
            stream_url = info.get('url')
            
            if not stream_url:
                return jsonify({"error": "Stream URL extract nahi ho saki"}), 404

            return jsonify({
                "id": video_id,
                "stream_url": stream_url,  # Ye link directly expo-audio mein jayega
                "duration": info.get('duration', 0)
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500





# --- ADVANCED HOME SCREEN ENDPOINT (WITH BULLETPROOF FALLBACK) ---
@app.route('/api/home', methods=['GET'])
def get_home_data():
    try:
        # Default global charts fetch karne ki koshish (bina region restrict kiye)
        charts = ytmusic.get_charts()
        
        # Helper function taake code clean rahe
        def extract_from_chart(category, limit=12):
            results = []
            if category in charts and 'items' in charts[category]:
                for item in charts[category]['items'][:limit]:
                    vid_id = item.get('videoId')
                    if not vid_id: continue
                    
                    artists = item.get('artists', [{'name': 'Unknown'}])
                    artist_name = artists[0]['name'] if isinstance(artists, list) and len(artists) > 0 else "Unknown"
                    
                    thumbnails = item.get('thumbnails', [])
                    image_url = thumbnails[-1]['url'] if thumbnails else "https://cdn-icons-png.flaticon.com/512/3844/3844724.png"
                    
                    results.append({
                        "id": vid_id,
                        "title": item.get('title', 'Unknown Title'),
                        "artist": artist_name,
                        "image": image_url,
                        "duration": item.get('duration_seconds', 0),
                        "sourceType": "youtube"
                    })
            return results

        # Pehle official charts se data nikalne ki koshish karte hain
        trending_results = extract_from_chart('trending')
        top_tracks_results = extract_from_chart('tracks')
        new_releases_results = extract_from_chart('videos')
        global_hits_results = []

        # ---------------------------------------------------------
        # 🌟 THE FALLBACK ENGINE: Agar Charts fail ho jayen, toh ye chalega
        # ---------------------------------------------------------
        def get_fallback_data(query):
            fallback = []
            try:
                search_res = ytmusic.search(query, filter="songs", limit=12)
                for item in search_res:
                    fallback.append({
                        "id": item.get('videoId'),
                        "title": item.get('title'),
                        "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                        "image": item['thumbnails'][-1]['url'] if item.get('thumbnails') else "",
                        "duration": item.get('duration_seconds', 0),
                        "sourceType": "youtube"
                    })
            except Exception as e:
                print(f"Fallback search failed for '{query}': {e}")
            return fallback

        # Agar arrays khali hain, toh specifically Pakistani aur Global trending search karo
        if not trending_results:
            trending_results = get_fallback_data("Trending songs Pakistan")
        
        if not top_tracks_results:
            top_tracks_results = get_fallback_data("Top hits 2026")
            
        if not new_releases_results:
            new_releases_results = get_fallback_data("New music releases")
            
        # Global Hits ko hamesha manual search se nikalte hain taake achi variety aaye
        global_hits_results = get_fallback_data("Global Top 50 songs Spotify")

        return jsonify({
            "trending": trending_results,
            "topTracks": top_tracks_results,
            "newReleases": new_releases_results,
            "globalHits": global_hits_results
        })

    except Exception as e:
        print(f"Home API Fatal Error: {str(e)}")
        # Agar kuch bhi kaam na kare toh app crash hone se bachane ke liye empty JSON bhej do
        return jsonify({
            "trending": [],
            "topTracks": [],
            "newReleases": [],
            "globalHits": []
        }), 500



# ==========================================
# 🌟 LYRICS ENGINE ENDPOINT (UPDATED FOR LOCAL EMBEDDED)
# ==========================================
@app.route('/api/lyrics', methods=['GET'])
def get_lyrics():
    track_name = request.args.get('title')
    artist_name = request.args.get('artist')
    track_id = request.args.get('id') # Yeh local audio k liye uri(path) bhi ho sakti ha ya simple id
    
    if not track_name:
        return jsonify({"error": "Title is required"}), 400

    clean_artist = artist_name.split('•')[0].strip() if artist_name and artist_name != 'Local Audio' else ""

   # ---------------------------------------------------------
    # LAYER 0: LOCAL FILE METADATA CHECK (Universal Extractor)
    # ---------------------------------------------------------
    # React native se jab path aata hai wo url encoded hota hai
    if track_id and (track_id.startswith('file://') or track_id.startswith('/')):
        file_path = urllib.parse.unquote(track_id.replace('file://', ''))
        if os.path.exists(file_path):
            try:
                audiofile = MutagenFile(file_path)
                lyrics = None
                
                if audiofile is not None and hasattr(audiofile, 'tags') and audiofile.tags is not None:
                    
                    # 1. MP3 (ID3 Tags check: USLT::eng or any USLT)
                    for tag in audiofile.tags.keys():
                        if tag.startswith('USLT'):
                            lyrics = audiofile.tags[tag].text
                            break
                    
                    # 2. M4A / MP4 / ALAC
                    if not lyrics and '\xa9lyr' in audiofile.tags:
                        lyrics = audiofile.tags['\xa9lyr'][0]
                        
                    # 3. FLAC / OGG / OPUS (Vorbis Comments)
                    if not lyrics:
                        # Check various standard vorbis comment keys (case-insensitive usually, but we check common ones)
                        if 'lyrics' in audiofile:
                            lyrics = audiofile['lyrics'][0]
                        elif 'LYRICS' in audiofile:
                            lyrics = audiofile['LYRICS'][0]
                        elif 'unsyncedlyrics' in audiofile:
                            lyrics = audiofile['unsyncedlyrics'][0]
                        elif 'UNSYNCEDLYRICS' in audiofile:
                            lyrics = audiofile['UNSYNCEDLYRICS'][0]

                if lyrics:
                    return jsonify({
                        "type": "static",
                        "lyrics": str(lyrics),
                        "source": "local_metadata"
                    })
            except Exception as e:
                print(f"Mutagen read error: {e}")

    # ---------------------------------------------------------
    # LAYER 1: LRCLIB (Synced Lyrics)
    # ---------------------------------------------------------
    # Agar local music hai aur uske title me artist mixed hai, try to clean it
    search_title = track_name.split('-')[-1].strip() if 'Local Audio' in (artist_name or '') else track_name

    try:
        if clean_artist:
            lrc_url = f"https://lrclib.net/api/get?track_name={search_title}&artist_name={clean_artist}"
            response = requests.get(lrc_url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get('syncedLyrics'):
                    return jsonify({"type": "synced", "lyrics": data['syncedLyrics'], "source": "lrclib"})
                elif data.get('plainLyrics'):
                    return jsonify({"type": "static", "lyrics": data['plainLyrics'], "source": "lrclib"})
        
        search_url = f"https://lrclib.net/api/search?q={search_title} {clean_artist}".strip()
        search_res = requests.get(search_url, timeout=15)
        
        if search_res.status_code == 200:
            search_data = search_res.json()
            if search_data and isinstance(search_data, list):
                for item in search_data:
                    if item.get('syncedLyrics'):
                        return jsonify({"type": "synced", "lyrics": item['syncedLyrics'], "source": "lrclib_search"})
                if search_data[0].get('plainLyrics'):
                    return jsonify({"type": "static", "lyrics": search_data[0]['plainLyrics'], "source": "lrclib_search"})
    except Exception as e:
        print(f"LRCLIB API Error: {e}")

    # ---------------------------------------------------------
    # LAYER 2: YOUTUBE MUSIC FALLBACK (Static Lyrics)
    # ---------------------------------------------------------
    # Local IDs jaise "4305" ko YT pe nahi bhejna, bas real yt IDs ko jane do
    if track_id and not track_id.isdigit() and not track_id.startswith('file://'):
        try:
            watch = ytmusic.get_watch_playlist(videoId=track_id)
            if watch: # 🌟 Yeh check zaroori hai
                lyrics_id = watch.get('lyrics')
            if lyrics_id:
                lyrics_dict = ytmusic.get_lyrics(lyrics_id)
                return jsonify({"type": "static", "lyrics": lyrics_dict.get('lyrics', ''), "source": "youtube"})
        except Exception as e:
            print(f"YouTube Lyrics API Error: {e}")

    return jsonify({"type": "none", "lyrics": "Lyrics not available for this track."})


# ==========================================
# 🌟 FILE CLEANUP HELPERS (To prevent accumulation on server)
# ==========================================
def delay_delete(track_id, download_dir, delay=15):
    time.sleep(delay)
    try:
        search_pattern = f"{download_dir}/{track_id}.*"
        for f in glob.glob(search_pattern):
            if os.path.exists(f):
                os.remove(f)
                print(f"[Cleanup Thread] Deleted temporary server file: {f}")
    except Exception as e:
        print(f"[Cleanup Thread] Error during file cleanup: {e}")

def cleanup_old_files(download_dir, max_age_seconds=60):
    try:
        now = time.time()
        for f in glob.glob(f"{download_dir}/*"):
            if os.path.isfile(f):
                file_age = now - os.path.getmtime(f)
                if file_age > max_age_seconds:
                    os.remove(f)
                    print(f"[Cleanup GC] Removed old temp file: {f}")
    except Exception as e:
        print(f"[Cleanup GC] Error cleaning old files: {e}")


# ==========================================
# 🌟 LYRICS FETCH & EMBED HELPERS
# ==========================================
def fetch_lyrics_raw(track_name, artist_name, track_id=None):
    if not track_name:
        return None

    clean_artist = artist_name.split('•')[0].strip() if artist_name and artist_name != 'Local Audio' else ""
    search_title = track_name.split('-')[-1].strip() if 'Local Audio' in (artist_name or '') else track_name

    # 1. LRCLIB (Synced Lyrics or Plain Lyrics)
    try:
        if clean_artist:
            lrc_url = f"https://lrclib.net/api/get?track_name={urllib.parse.quote(search_title)}&artist_name={urllib.parse.quote(clean_artist)}"
            response = requests.get(lrc_url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get('syncedLyrics'):
                    return data['syncedLyrics']
                elif data.get('plainLyrics'):
                    return data['plainLyrics']
        
        search_url = f"https://lrclib.net/api/search?q={urllib.parse.quote(search_title + ' ' + clean_artist)}".strip()
        search_res = requests.get(search_url, timeout=15)
        if search_res.status_code == 200:
            search_data = search_res.json()
            if search_data and isinstance(search_data, list):
                for item in search_data:
                    if item.get('syncedLyrics'):
                        return item['syncedLyrics']
                if search_data[0].get('plainLyrics'):
                    return search_data[0]['plainLyrics']
    except Exception as e:
        print(f"LRCLIB fetch error during download: {e}")

    # 2. YT Music Fallback
    if track_id and not track_id.isdigit() and not track_id.startswith('file://'):
        try:
            watch = ytmusic.get_watch_playlist(videoId=track_id)
            lyrics_id = watch.get('lyrics') if watch else None
            if lyrics_id:
                lyrics_dict = ytmusic.get_lyrics(lyrics_id)
                return lyrics_dict.get('lyrics', '')
        except Exception as e:
            print(f"YouTube Lyrics fetch error during download: {e}")

    return None

def embed_lyrics_in_file(file_path, lyrics_text):
    try:
        audiofile = MutagenFile(file_path)
        if audiofile is None:
            print(f"[LyricsEmbedder] Could not load audio file with Mutagen: {file_path}")
            return False

        from mutagen.mp4 import MP4
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.id3 import USLT

        if isinstance(audiofile, MP4):
            audiofile['\xa9lyr'] = [lyrics_text]
            audiofile.save()
            print(f"[LyricsEmbedder] ✅ Successfully embedded lyrics in M4A: {file_path}")
            return True
        elif isinstance(audiofile, MP3):
            try:
                audiofile.add_tags()
            except Exception:
                pass
            audiofile.tags.add(USLT(encoding=3, lang='eng', desc='Lyrics', text=lyrics_text))
            audiofile.save()
            print(f"[LyricsEmbedder] ✅ Successfully embedded lyrics in MP3: {file_path}")
            return True
        elif isinstance(audiofile, FLAC):
            audiofile['lyrics'] = [lyrics_text]
            audiofile.save()
            print(f"[LyricsEmbedder] ✅ Successfully embedded lyrics in FLAC: {file_path}")
            return True
        else:
            if hasattr(audiofile, 'tags') and audiofile.tags is not None:
                try:
                    audiofile['lyrics'] = [lyrics_text]
                    audiofile.save()
                    print(f"[LyricsEmbedder] ✅ Successfully embedded lyrics using fallback tag in: {file_path}")
                    return True
                except Exception:
                    pass
            print(f"[LyricsEmbedder] ❌ Unsupported file type for lyrics embedding: {type(audiofile)}")
            return False
    except Exception as e:
        print(f"[LyricsEmbedder] ❌ Error embedding lyrics: {e}")
        return False


# ==========================================
# 🌟 DYNAMIC DOWNLOAD ENGINE
# ==========================================
@app.route('/api/download', methods=['GET'])
def download_track():
    track_id = request.args.get('id')
    audio_format = request.args.get('format', 'm4a').lower() 
    track_title = request.args.get('title')
    track_artist = request.args.get('artist')

    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    # Temporary folder jahan file process hogi
    download_dir = 'temp_downloads'
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)

    # Clean up any leftover old files in the directory
    cleanup_old_files(download_dir)

    # Choose correct direct stream format to skip transcoding
    ydl_format = 'bestaudio[ext=m4a]/bestaudio/best' if audio_format == 'm4a' else 'bestaudio[ext=webm]/bestaudio/best'

    # yt-dlp ki dynamic options configuration (Direct copy remux format)
    ydl_opts = {
        'format': ydl_format,
        'outtmpl': f'{download_dir}/{track_id}.%(ext)s',
        'writethumbnail': True,
        'cookiefile': 'cookies.txt', # Cover art download karne ke liye
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
        'postprocessors': [
            {
                # 1. Metadata Inject (Title, Artist waghera)
                'key': 'FFmpegMetadata',
            },
            {
                # 2. Album Art Inject
                'key': 'EmbedThumbnail',
            }
        ],
        'quiet': False, # Console mein progress dekhne ke liye
    }

    try:
        # YouTube URL banayein
        target_url = f"https://www.youtube.com/watch?v={track_id}"
        lyrics_text = None
        
        # Parallelize: Fetch lyrics concurrently while downloading audio
        with concurrent.futures.ThreadPoolExecutor() as executor:
            lyrics_future = executor.submit(fetch_lyrics_raw, track_title, track_artist, track_id) if track_title else None
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print(f"Downloading {track_id} in direct-copy {audio_format}...")
                ydl.download([target_url])
                
            if lyrics_future:
                try:
                    lyrics_text = lyrics_future.result(timeout=15)
                except Exception as e:
                    print(f"[Downloader] Lyrics fetch timed out or failed: {e}")
            
        # Download hone ke baad, file dhoondna (kyunki extension change ho sakti hai)
        # Hum wildcard (*) use kar rahe hain taake jo bhi final file bani ho, wo mil jaye
        search_pattern = f"{download_dir}/{track_id}.*"
        downloaded_files = glob.glob(search_pattern)
        
        # Thumbnail files (.jpg, .webp) ko filter out kar rahe hain, sirf audio chahiye
        audio_file = None
        for file in downloaded_files:
            if not file.endswith(('.jpg', '.webp', '.png')):
                audio_file = file
                break
                
        if audio_file:
            # Embed lyrics if fetched
            if lyrics_text:
                print(f"[Downloader] Embedding fetched lyrics in: {audio_file}")
                embed_lyrics_in_file(audio_file, lyrics_text)
            else:
                print("[Downloader] No lyrics found to embed.")

            # File ko frontend ko bhejna
            response = send_file(
                audio_file, 
                as_attachment=True, 
                download_name=os.path.basename(audio_file),
                mimetype=f'audio/{audio_format}'
            )

            # Start background thread to delete the temp files after 15 seconds
            # This bypasses the Windows file lock issues that occur when deleting immediately
            threading.Thread(target=delay_delete, args=(track_id, download_dir)).start()

            return response
        else:
            return jsonify({"error": "File conversion failed"}), 500

    except Exception as e:
        print(f"Download Error: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)