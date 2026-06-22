from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp 

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
        'format': 'bestaudio[ext=m4a]/bestaudio/best', # Mobile ke liye m4a best hai
        'quiet': True,             # Fuzool terminal logs hide karega
        'no_warnings': True,
        'skip_download': True,     # Gaana download NAHI karna, sirf link chahiye
        'noplaylist': True,
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)