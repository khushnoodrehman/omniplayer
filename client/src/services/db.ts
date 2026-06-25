import * as SQLite from 'expo-sqlite';
import { Track } from '@/store/usePlaybackStore';

// 🌟 THE FIX: Database ka naam v2 kar diya taake fresh schema apply ho
const db = SQLite.openDatabaseSync('omniplayer_v2.db');

export const initDB = async () => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      /* 🌟 ADDED 'uri' COLUMN TO ALL TRACK TABLES */

      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        image TEXT,
        duration INTEGER,
        sourceType TEXT,
        uri TEXT 
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        image TEXT,
        duration INTEGER,
        localPath TEXT,
        fileSize TEXT
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        image TEXT,
        duration INTEGER,
        sourceType TEXT,
        uri TEXT,
        playedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT,
        image TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlistId TEXT,
        trackId TEXT,
        title TEXT,
        artist TEXT,
        image TEXT,
        duration INTEGER,
        sourceType TEXT,
        uri TEXT,
        addedAt INTEGER,
        PRIMARY KEY (playlistId, trackId)
      );

      CREATE TABLE IF NOT EXISTS recent_searches (
        id TEXT PRIMARY KEY,
        searchQuery TEXT UNIQUE,
        searchedAt INTEGER
      );
    `);
    
    // Alter table if columns don't exist (Migration for lyrics)
    try {
      await db.execAsync('ALTER TABLE downloads ADD COLUMN lyrics TEXT;');
    } catch (e) { /* Column already exists */ }
    try {
      await db.execAsync('ALTER TABLE downloads ADD COLUMN lyricsType TEXT;');
    } catch (e) { /* Column already exists */ }

    console.log('✅ SQLite Database v2 Initialized with URI and Lyrics support!');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// ==========================================
// 🌟 FAVORITES FUNCTIONS
// ==========================================
export const addFavoriteDB = async (track: Track) => {
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO favorites (id, title, artist, image, duration, sourceType, uri) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [track.id, track.title, track.artist, track.image, track.duration, track.sourceType, track.uri || '']
    );
  } catch (error) {
    console.error('Error adding favorite to DB:', error);
  }
};

export const removeFavoriteDB = async (id: string) => {
  try {
    await db.runAsync('DELETE FROM favorites WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error removing favorite from DB:', error);
  }
};

export const getFavoritesDB = async (): Promise<Track[]> => {
  try {
    return await db.getAllAsync<Track>('SELECT * FROM favorites');
  } catch (error) {
    console.error('Error getting favorites from DB:', error);
    return [];
  }
};

// ==========================================
// 🌟 HISTORY FUNCTIONS
// ==========================================
export const addToHistoryDB = async (track: Track) => {
  try {
    const playedAt = Date.now();
    await db.runAsync(
      'INSERT OR REPLACE INTO history (id, title, artist, image, duration, sourceType, uri, playedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [track.id, track.title, track.artist, track.image, track.duration, track.sourceType, track.uri || '', playedAt]
    );
  } catch (error) {
    console.error('Error adding to history DB:', error);
  }
};

export const getHistoryDB = async (): Promise<Track[]> => {
  try {
    return await db.getAllAsync<Track>('SELECT * FROM history ORDER BY playedAt DESC LIMIT 30');
  } catch (error) {
    console.error('Error getting history from DB:', error);
    return [];
  }
};

// ==========================================
// 🌟 RECENT SEARCHES FUNCTIONS
// ==========================================
export const addRecentSearchDB = async (query: string) => {
  try {
    const searchedAt = Date.now();
    await db.runAsync(
      'INSERT OR REPLACE INTO recent_searches (id, searchQuery, searchedAt) VALUES ((SELECT id FROM recent_searches WHERE searchQuery = ?), ?, ?)',
      [query, query, searchedAt]
    );
  } catch (error) {
    console.error('Error adding recent search to DB:', error);
  }
};

export const getRecentSearchesDB = async (): Promise<string[]> => {
  try {
    const rows = await db.getAllAsync<{ searchQuery: string }>('SELECT searchQuery FROM recent_searches ORDER BY searchedAt DESC LIMIT 10');
    return rows.map(r => r.searchQuery);
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

export const deleteRecentSearchDB = async (query: string) => {
  try {
    await db.runAsync('DELETE FROM recent_searches WHERE searchQuery = ?', [query]);
  } catch (error) {
    console.error('Error deleting single recent search:', error);
  }
};

export const clearAllRecentSearchesDB = async () => {
  try {
    await db.runAsync('DELETE FROM recent_searches');
  } catch (error) {
    console.error('Error clearing all recent searches:', error);
  }
};

// ==========================================
// 🌟 PLAYLISTS FUNCTIONS
// ==========================================
export const createPlaylistDB = async (name: string, image = '') => {
  try {
    const id = 'pl_' + Math.random().toString(36).substring(2, 9);
    const createdAt = Date.now();
    await db.runAsync('INSERT INTO playlists (id, name, image, createdAt) VALUES (?, ?, ?, ?)', [id, name, image, createdAt]);
    return id;
  } catch (error) {
    console.error('Error creating playlist:', error);
    return null;
  }
};

export const getPlaylistsDB = async () => {
  try {
    return await db.getAllAsync<{ id: string, name: string, image: string, createdAt: number }>('SELECT * FROM playlists ORDER BY createdAt DESC');
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
};

export const addTrackToPlaylistDB = async (playlistId: string, track: Track) => {
  try {
    const addedAt = Date.now();
    await db.runAsync(
      'INSERT OR IGNORE INTO playlist_tracks (playlistId, trackId, title, artist, image, duration, sourceType, uri, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [playlistId, track.id, track.title, track.artist, track.image, track.duration, track.sourceType, track.uri || '', addedAt]
    );
  } catch (error) {
    console.error('Error adding track to playlist:', error);
  }
};

export const getPlaylistTracksDB = async (playlistId: string): Promise<Track[]> => {
  try {
    return await db.getAllAsync<Track>('SELECT trackId as id, title, artist, image, duration, sourceType, uri FROM playlist_tracks WHERE playlistId = ? ORDER BY addedAt DESC', [playlistId]);
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    return [];
  }
};

// ==========================================
// 🌟 DOWNLOADS FUNCTIONS
// ==========================================
export const addDownloadDB = async (track: Track, localPath: string, fileSize = '', lyrics = '', lyricsType = 'none') => {
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO downloads (id, title, artist, image, duration, localPath, fileSize, lyrics, lyricsType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [track.id, track.title, track.artist, track.image, track.duration, localPath, fileSize, lyrics, lyricsType]
    );
    console.log(`✅ Download added to DB: ${track.title} -> ${localPath} (Lyrics: ${lyricsType})`);
  } catch (error) {
    console.error('Error adding download to DB:', error);
  }
};

export const getDownloadDB = async (id: string): Promise<{ id: string, title: string, artist: string, image: string, duration: number, localPath: string, fileSize: string, lyrics?: string, lyricsType?: string } | null> => {
  try {
    const row = await db.getFirstAsync<{ id: string, title: string, artist: string, image: string, duration: number, localPath: string, fileSize: string, lyrics?: string, lyricsType?: string }>(
      'SELECT * FROM downloads WHERE id = ?',
      [id]
    );
    return row || null;
  } catch (error) {
    console.error('Error getting download from DB:', error);
    return null;
  }
};

export const getDownloadsDB = async (): Promise<Track[]> => {
  try {
    const rows = await db.getAllAsync<{ id: string, title: string, artist: string, image: string, duration: number, localPath: string, fileSize: string, lyrics?: string, lyricsType?: string }>(
      'SELECT * FROM downloads'
    );
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      image: r.image,
      duration: r.duration,
      sourceType: 'local',
      uri: r.localPath,
      fileSize: r.fileSize,
      lyrics: r.lyrics,
      lyricsType: r.lyricsType
    }));
  } catch (error) {
    console.error('Error getting downloads from DB:', error);
    return [];
  }
};

export const removeDownloadDB = async (id: string) => {
  try {
    await db.runAsync('DELETE FROM downloads WHERE id = ?', [id]);
    console.log(`✅ Download deleted from DB: ${id}`);
  } catch (error) {
    console.error('Error removing download from DB:', error);
  }
};

export default db;