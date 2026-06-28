from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp 
import requests
import concurrent.futures
import threading
import time
import json
import glob
import os
import urllib.parse
from mutagen import File as MutagenFile
import hashlib
import re

app = Flask(__name__)
CORS(app) 

# 🌟 THE FINAL STATELESS YTMUSIC INITIALIZER
from ytmusicapi.auth.types import AuthType
import re
import time
import hashlib

def get_ytmusic(auth_string=None):
    if auth_string:
        cookie_str = auth_string
        print(f"[get_ytmusic] Received cookie string length: {len(cookie_str)}")
        
        # 1. Missing HttpOnly cookies ko duplicate karne ka hack
        if "SAPISID=" in cookie_str and "__Secure-3PAPISID=" not in cookie_str:
            m = re.search(r'SAPISID=([^;]+)', cookie_str)
            if m: cookie_str += f"; __Secure-3PAPISID={m.group(1)}"
            
        if "SID=" in cookie_str:
            sid_match = re.search(r'SID=([^;]+)', cookie_str)
            if sid_match:
                sid_val = sid_match.group(1)
                if "__Secure-3PSID=" not in cookie_str: cookie_str += f"; __Secure-3PSID={sid_val}"
                if "__Secure-1PSID=" not in cookie_str: cookie_str += f"; __Secure-1PSID={sid_val}"

        # 2. Cryptographic SAPISIDHASH (Kyunki LOGIN_INFO missing hai)
        auth_header_value = ""
        sapisid_match = re.search(r'SAPISID=([^;]+)', cookie_str)
        if sapisid_match:
            sapisid = sapisid_match.group(1)
            timestamp = int(time.time())
            hash_msg = f"{timestamp} {sapisid} https://music.youtube.com"
            hash_val = hashlib.sha1(hash_msg.encode('utf-8')).hexdigest()
            auth_header_value = f"SAPISIDHASH {timestamp}_{hash_val}"

        # 3. DIRECT DICTIONARY (NO json.dumps!)
        headers_dict = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "X-Goog-AuthUser": "0",
            "x-origin": "https://music.youtube.com",
            "Cookie": cookie_str
        }
        
        if auth_header_value:
            headers_dict["authorization"] = auth_header_value
            
        try:
            # 🌟 DICTIONARY DIRECT PASS KAR RAHE HAIN
            yt = YTMusic(auth=headers_dict)
            
            # 🌟 FORCE BROWSER MODE (Taake strict HttpOnly check bypass ho jaye)
            yt.auth_type = AuthType.BROWSER 
            
            print(f"[get_ytmusic] Setup successful! Auth forced to BROWSER.")
            return yt
        except Exception as e:
            print(f"Error initializing YTMusic with cookie: {e}")
            
    return YTMusic()



@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "OmniPlayer API is running!"})

# --- SEARCH ENDPOINT (Updated with get_ytmusic) ---
@app.route('/api/search', methods=['GET'])
def search_music():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    try:
        # 🌟 Changed to get_ytmusic()
        search_results = get_ytmusic().search(query, filter="songs", limit=50)
        
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


# --- STREAM EXTRACTION ENDPOINT ---
@app.route('/api/stream', methods=['GET'])
def get_stream_url():
    video_id = request.args.get('id')
    if not video_id:
        return jsonify({"error": "Video ID is required"}), 400

    youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'format': 'bestaudio', 
        'cookiefile': 'cookies.txt',
        'quiet': True,
        'noplaylist': True,
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            stream_url = info.get('url')
            
            if not stream_url:
                return jsonify({"error": "Stream URL extract nahi ho saki"}), 404

            return jsonify({
                "id": video_id,
                "stream_url": stream_url,
                "duration": info.get('duration', 0)
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- ADVANCED HOME SCREEN ENDPOINT (Updated with get_ytmusic) ---
@app.route('/api/home', methods=['GET'])
def get_home_data():
    try:
        auth_header = request.headers.get('Authorization')
        auth_string = None
        if auth_header and auth_header.startswith('Bearer '):
            auth_string = auth_header.replace('Bearer ', '')

        if auth_string:
            try:
                yt = get_ytmusic(auth_string)
                if yt.auth_type != AuthType.BROWSER:
                    raise Exception("YTMusic authentication status is not BROWSER")
                home_sections = yt.get_home(limit=25)
                
                liked_playlist = None
                try:
                    liked_songs = yt.get_liked_songs(limit=4)
                    liked_images = []
                    for song in liked_songs.get('tracks', []):
                        thumbs = song.get('thumbnails', [])
                        if thumbs:
                            liked_images.append(thumbs[-1]['url'])
                    
                    liked_playlist = {
                        "id": "LM",
                        "title": liked_songs.get('title') or "Favorite Songs",
                        "trackCount": liked_songs.get('trackCount', 0),
                        "images": liked_images,
                        "description": "Your liked tracks from YouTube Music"
                    }
                except Exception as e:
                    print(f"Error fetching liked songs details for home: {e}")

                shelves = []
                for shelf in home_sections:
                    shelf_title = shelf.get('title', 'Recommended')
                    items = []
                    for item in shelf.get('contents', []):
                        title = item.get('title', 'Unknown')
                        thumbnails = item.get('thumbnails', [])
                        image_url = thumbnails[-1]['url'] if thumbnails else ""
                        
                        if item.get('videoId'):
                            artists = item.get('artists', [])
                            artist_name = artists[0]['name'] if isinstance(artists, list) and len(artists) > 0 else "Unknown"
                            items.append({
                                "id": item.get('videoId'),
                                "title": title,
                                "artist": artist_name,
                                "image": image_url,
                                "duration": item.get('duration_seconds', 0),
                                "sourceType": "youtube",
                                "itemType": "track"
                            })
                        elif item.get('playlistId') or item.get('browseId'):
                            desc = item.get('description', '')
                            if not desc and item.get('artists'):
                                artists = item.get('artists', [])
                                desc = artists[0]['name'] if isinstance(artists, list) and len(artists) > 0 else "Unknown"
                                
                            b_id = item.get('playlistId') or item.get('browseId')
                            item_type = "playlist"
                            if item.get('playlistId'):
                                item_type = "playlist"
                            elif b_id and b_id.startswith('UC'):
                                item_type = "artist"
                            else:
                                item_type = "album"

                            items.append({
                                "id": b_id,
                                "title": title,
                                "artist": desc or "YouTube Music",
                                "image": image_url,
                                "itemType": item_type
                            })
                    
                    if items:
                        shelves.append({
                            "title": shelf_title,
                            "items": items
                        })
                
                return jsonify({
                    "isLoggedIn": True,
                    "shelves": shelves,
                    "likedPlaylist": liked_playlist
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error loading personalized home feed: {e}")
        
        # Guest flow / Old Home Screen data
        yt = get_ytmusic()
        charts = yt.get_charts()
        
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

        trending_results = extract_from_chart('trending')
        top_tracks_results = extract_from_chart('tracks')
        new_releases_results = extract_from_chart('videos')
        
        def get_fallback_data(query):
            fallback = []
            try:
                search_res = get_ytmusic().search(query, filter="songs", limit=12)
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

        if not trending_results:
            trending_results = get_fallback_data("Trending songs Pakistan")
        if not top_tracks_results:
            top_tracks_results = get_fallback_data("Top hits 2026")
        if not new_releases_results:
            new_releases_results = get_fallback_data("New music releases")
            
        global_hits_results = get_fallback_data("Global Top 50 songs Spotify")

        return jsonify({
            "isLoggedIn": False,
            "trending": trending_results,
            "topTracks": top_tracks_results,
            "newReleases": new_releases_results,
            "globalHits": global_hits_results
        })

    except Exception as e:
        print(f"Home API Fatal Error: {str(e)}")
        return jsonify({"trending": [], "topTracks": [], "newReleases": [], "globalHits": []}), 500


# --- LYRICS ENGINE ENDPOINT (Updated with get_ytmusic) ---
@app.route('/api/lyrics', methods=['GET'])
def get_lyrics():
    track_name = request.args.get('title')
    artist_name = request.args.get('artist')
    track_id = request.args.get('id') 
    
    if not track_name:
        return jsonify({"error": "Title is required"}), 400

    clean_artist = artist_name.split('•')[0].strip() if artist_name and artist_name != 'Local Audio' else ""

    if track_id and (track_id.startswith('file://') or track_id.startswith('/')):
        file_path = urllib.parse.unquote(track_id.replace('file://', ''))
        if os.path.exists(file_path):
            try:
                audiofile = MutagenFile(file_path)
                lyrics = None
                if audiofile is not None and hasattr(audiofile, 'tags') and audiofile.tags is not None:
                    for tag in audiofile.tags.keys():
                        if tag.startswith('USLT'):
                            lyrics = audiofile.tags[tag].text
                            break
                    if not lyrics and '\xa9lyr' in audiofile.tags:
                        lyrics = audiofile.tags['\xa9lyr'][0]
                    if not lyrics:
                        if 'lyrics' in audiofile: lyrics = audiofile['lyrics'][0]
                        elif 'LYRICS' in audiofile: lyrics = audiofile['LYRICS'][0]

                if lyrics:
                    return jsonify({"type": "static", "lyrics": str(lyrics), "source": "local_metadata"})
            except Exception as e:
                print(f"Mutagen read error: {e}")

    # LAYER 1: LRCLIB
    search_title = track_name.split('-')[-1].strip() if 'Local Audio' in (artist_name or '') else track_name
    try:
        if clean_artist:
            lrc_url = f"https://lrclib.net/api/get?track_name={search_title}&artist_name={clean_artist}"
            response = requests.get(lrc_url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get('syncedLyrics'): return jsonify({"type": "synced", "lyrics": data['syncedLyrics'], "source": "lrclib"})
                elif data.get('plainLyrics'): return jsonify({"type": "static", "lyrics": data['plainLyrics'], "source": "lrclib"})
        
        search_url = f"https://lrclib.net/api/search?q={search_title} {clean_artist}".strip()
        search_res = requests.get(search_url, timeout=15)
        if search_res.status_code == 200:
            search_data = search_res.json()
            if search_data and isinstance(search_data, list):
                for item in search_data:
                    if item.get('syncedLyrics'): return jsonify({"type": "synced", "lyrics": item['syncedLyrics'], "source": "lrclib_search"})
                if search_data[0].get('plainLyrics'): return jsonify({"type": "static", "lyrics": search_data[0]['plainLyrics'], "source": "lrclib_search"})
    except Exception as e:
        print(f"LRCLIB API Error: {e}")

    # LAYER 2: YOUTUBE MUSIC FALLBACK (🌟 Updated with get_ytmusic)
    if track_id and not track_id.isdigit() and not track_id.startswith('file://'):
        try:
            yt = get_ytmusic()
            watch = yt.get_watch_playlist(videoId=track_id)
            lyrics_id = watch.get('lyrics') if watch else None
            if lyrics_id:
                lyrics_dict = yt.get_lyrics(lyrics_id)
                return jsonify({"type": "static", "lyrics": lyrics_dict.get('lyrics', ''), "source": "youtube"})
        except Exception as e:
            print(f"YouTube Lyrics API Error: {e}")

    return jsonify({"type": "none", "lyrics": "Lyrics not available for this track."})


# --- FILE CLEANUP HELPERS ---
def delay_delete(track_id, download_dir, delay=15):
    time.sleep(delay)
    try:
        search_pattern = f"{download_dir}/{track_id}.*"
        for f in glob.glob(search_pattern):
            if os.path.exists(f): os.remove(f)
    except Exception as e:
        print(f"Cleanup Error: {e}")

def cleanup_old_files(download_dir, max_age_seconds=60):
    try:
        now = time.time()
        for f in glob.glob(f"{download_dir}/*"):
            if os.path.isfile(f) and (now - os.path.getmtime(f) > max_age_seconds):
                os.remove(f)
    except Exception as e:
        print(f"GC Error: {e}")


# --- LYRICS FETCH & EMBED HELPERS (🌟 Updated with get_ytmusic) ---
def fetch_lyrics_raw(track_name, artist_name, track_id=None):
    if not track_name: return None
    clean_artist = artist_name.split('•')[0].strip() if artist_name and artist_name != 'Local Audio' else ""
    search_title = track_name.split('-')[-1].strip() if 'Local Audio' in (artist_name or '') else track_name

    try:
        if clean_artist:
            lrc_url = f"https://lrclib.net/api/get?track_name={urllib.parse.quote(search_title)}&artist_name={urllib.parse.quote(clean_artist)}"
            response = requests.get(lrc_url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                return data.get('syncedLyrics') or data.get('plainLyrics')
    except Exception:
        pass

    if track_id and not track_id.isdigit() and not track_id.startswith('file://'):
        try:
            yt = get_ytmusic()
            watch = yt.get_watch_playlist(videoId=track_id)
            lyrics_id = watch.get('lyrics') if watch else None
            if lyrics_id:
                return yt.get_lyrics(lyrics_id).get('lyrics', '')
        except Exception:
            pass
    return None

def embed_lyrics_in_file(file_path, lyrics_text):
    try:
        audiofile = MutagenFile(file_path)
        if audiofile is None: return False
        from mutagen.mp4 import MP4
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.id3 import USLT

        if isinstance(audiofile, MP4):
            audiofile['\xa9lyr'] = [lyrics_text]
            audiofile.save()
            return True
        elif isinstance(audiofile, MP3):
            try: audiofile.add_tags()
            except Exception: pass
            audiofile.tags.add(USLT(encoding=3, lang='eng', desc='Lyrics', text=lyrics_text))
            audiofile.save()
            return True
        elif isinstance(audiofile, FLAC):
            audiofile['lyrics'] = [lyrics_text]
            audiofile.save()
            return True
    except Exception as e:
        print(f"Embed Error: {e}")
    return False


# --- DYNAMIC DOWNLOAD ENGINE ---
@app.route('/api/download', methods=['GET'])
def download_track():
    track_id = request.args.get('id')
    audio_format = request.args.get('format', 'm4a').lower() 
    track_title = request.args.get('title')
    track_artist = request.args.get('artist')

    if not track_id: return jsonify({"error": "Track ID is required"}), 400

    download_dir = 'temp_downloads'
    if not os.path.exists(download_dir): os.makedirs(download_dir)
    cleanup_old_files(download_dir)

    ydl_format = 'bestaudio[ext=m4a]/bestaudio/best' if audio_format == 'm4a' else 'bestaudio[ext=webm]/bestaudio/best'

    ydl_opts = {
        'format': ydl_format,
        'outtmpl': f'{download_dir}/{track_id}.%(ext)s',
        'writethumbnail': True,
        'cookiefile': 'cookies.txt',
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
        'postprocessors': [{'key': 'FFmpegMetadata'}, {'key': 'EmbedThumbnail'}],
        'quiet': True,
    }

    try:
        target_url = f"https://www.youtube.com/watch?v={track_id}"
        lyrics_text = None
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            lyrics_future = executor.submit(fetch_lyrics_raw, track_title, track_artist, track_id) if track_title else None
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([target_url])
                
            if lyrics_future:
                try: lyrics_text = lyrics_future.result(timeout=15)
                except Exception: pass
            
        downloaded_files = glob.glob(f"{download_dir}/{track_id}.*")
        audio_file = None
        for file in downloaded_files:
            if not file.endswith(('.jpg', '.webp', '.png')):
                audio_file = file
                break
                
        if audio_file:
            if lyrics_text: embed_lyrics_in_file(audio_file, lyrics_text)
            response = send_file(audio_file, as_attachment=True, download_name=os.path.basename(audio_file), mimetype=f'audio/{audio_format}')
            threading.Thread(target=delay_delete, args=(track_id, download_dir)).start()
            return response
        return jsonify({"error": "File conversion failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# 🌟 FETCH PERSONALIZED DATA (STATELESS)
# ==========================================
@app.route('/api/me/liked', methods=['GET'])
def get_my_liked_songs():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "User not connected. No cookies provided."}), 401
        
    try:
        cookie_string = auth_header.replace('Bearer ', '')
        
        # Load authenticated YTMusic
        yt = get_ytmusic(cookie_string)
        
        if yt.auth_type != AuthType.BROWSER:
            return jsonify({"error": "Session is invalid or expired. Please reconnect."}), 401
        
        liked_data = yt.get_liked_songs(limit=20)
        
        formatted_songs = []
        if 'tracks' in liked_data:
            for item in liked_data['tracks']:
                formatted_songs.append({
                    "id": item.get('videoId'),
                    "title": item.get('title'),
                    "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                    "image": item['thumbnails'][-1]['url'] if item.get('thumbnails') else "",
                    "duration": item.get('duration_seconds', 0),
                    "sourceType": "youtube"
                })
                
        return jsonify({
            "playlist_name": "Liked Songs",
            "total_songs": liked_data.get('trackCount', len(formatted_songs)),
            "songs": formatted_songs
        })

    except Exception as e:
        print(f"Liked Songs Error: {e}")
        return jsonify({"error": str(e)}), 500


# --- PLAYLIST DETAILS ENDPOINT ---
@app.route('/api/playlist/<playlist_id>', methods=['GET'])
def get_playlist_details(playlist_id):
    auth_header = request.headers.get('Authorization')
    cookie_string = None
    if auth_header and auth_header.startswith('Bearer '):
        cookie_string = auth_header.replace('Bearer ', '')
    
    try:
        yt = get_ytmusic(cookie_string)
        if playlist_id == "LM":
            try:
                liked_songs = yt.get_liked_songs(limit=100)
            except Exception as e:
                print(f"Error fetching liked songs with get_liked_songs: {e}")
                liked_songs = {"tracks": [], "trackCount": 0, "title": "Favorite Songs"}
                
            details = {
                "id": "LM",
                "title": liked_songs.get('title') or "Favorite Songs",
                "description": "Your liked tracks from YouTube Music",
                "duration": None,
                "trackCount": liked_songs.get('trackCount', len(liked_songs.get('tracks', []))),
                "thumbnails": liked_songs.get('thumbnails') or (liked_songs.get('tracks', [{}])[0].get('thumbnails') if liked_songs.get('tracks') else []),
                "tracks": liked_songs.get('tracks', [])
            }
        else:
            details = yt.get_playlist(playlist_id)
        
        formatted_songs = []
        for item in details.get('tracks', []):
            vid_id = item.get('videoId')
            if not vid_id:
                continue
            
            artists = item.get('artists', [])
            artist_name = artists[0]['name'] if isinstance(artists, list) and len(artists) > 0 else "Unknown"
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            
            formatted_songs.append({
                "id": vid_id,
                "title": item.get('title', 'Unknown Title'),
                "artist": artist_name,
                "image": image_url,
                "duration": item.get('duration_seconds', 0),
                "isExplicit": item.get('isExplicit', False),
                "sourceType": "youtube"
            })
            
        thumbnails = details.get('thumbnails', [])
        image_url = thumbnails[-1]['url'] if thumbnails else ""
        
        return jsonify({
            "id": details.get('id'),
            "title": details.get('title'),
            "description": details.get('description'),
            "duration": details.get('duration'),
            "trackCount": details.get('trackCount'),
            "image": image_url,
            "songs": formatted_songs
        })
    except Exception as e:
        print(f"Playlist Details Error: {e}")
        return jsonify({"error": str(e)}), 500


# --- ARTIST DETAILS ENDPOINT ---
@app.route('/api/artist/<channel_id>', methods=['GET'])
def get_artist_details(channel_id):
    auth_header = request.headers.get('Authorization')
    cookie_string = None
    if auth_header and auth_header.startswith('Bearer '):
        cookie_string = auth_header.replace('Bearer ', '')
    
    try:
        yt = get_ytmusic(cookie_string)
        details = yt.get_artist(channel_id)
        
        # Format Top Songs
        top_songs = []
        songs_section = details.get('songs', {})
        for item in songs_section.get('results', []):
            vid_id = item.get('videoId')
            if not vid_id:
                continue
            artists = item.get('artists', [])
            artist_name = artists[0]['name'] if isinstance(artists, list) and len(artists) > 0 else details.get('name', 'Unknown')
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            top_songs.append({
                "id": vid_id,
                "title": item.get('title'),
                "artist": artist_name,
                "image": image_url,
                "duration": item.get('duration_seconds', 0),
                "isExplicit": item.get('isExplicit', False),
                "sourceType": "youtube"
            })
        
        # Format Singles & EPs
        singles = []
        singles_section = details.get('singles', {})
        for item in singles_section.get('results', []):
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            singles.append({
                "id": item.get('browseId') or item.get('playlistId'),
                "title": item.get('title'),
                "year": item.get('year'),
                "image": image_url,
                "itemType": "album"
            })

        # Format Albums
        albums = []
        albums_section = details.get('albums', {})
        for item in albums_section.get('results', []):
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            albums.append({
                "id": item.get('browseId') or item.get('playlistId'),
                "title": item.get('title'),
                "year": item.get('year'),
                "image": image_url,
                "itemType": "album"
            })
            
        # Format Videos
        videos = []
        videos_section = details.get('videos', {})
        for item in videos_section.get('results', []):
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            videos.append({
                "id": item.get('videoId'),
                "title": item.get('title'),
                "views": item.get('views'),
                "image": image_url,
                "sourceType": "youtube",
                "itemType": "track"
            })
            
        # Format Playlists
        playlists = []
        playlists_section = details.get('playlists', {})
        for item in playlists_section.get('results', []):
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            playlists.append({
                "id": item.get('browseId') or item.get('playlistId'),
                "title": item.get('title'),
                "image": image_url,
                "itemType": "playlist"
            })
            
        # Format Related Artists
        related = []
        related_section = details.get('related', {})
        for item in related_section.get('results', []):
            thumbnails = item.get('thumbnails', [])
            image_url = thumbnails[-1]['url'] if thumbnails else ""
            related.append({
                "id": item.get('browseId'),
                "name": item.get('title'),
                "image": image_url,
                "subscribers": item.get('subscribers')
            })
            
        thumbnails = details.get('thumbnails', [])
        image_url = thumbnails[-1]['url'] if thumbnails else ""
        
        return jsonify({
            "id": details.get('channelId'),
            "name": details.get('name'),
            "subscribers": details.get('subscribers'),
            "monthlyListeners": details.get('monthlyListeners'),
            "image": image_url,
            "topSongs": top_songs,
            "albums": albums,
            "singles": singles,
            "videos": videos,
            "playlists": playlists,
            "related": related
        })
    except Exception as e:
        print(f"Artist Details Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)