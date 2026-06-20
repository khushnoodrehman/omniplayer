import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  image: string;
  duration: number; // in seconds
  sourceType: 'local' | 'youtube';
  audioFormat?: string;
  fileSize?: string;
}

interface PlaybackContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isPlayerVisible: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  favoriteTracks: string[];
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  toggleFavorite: (trackId: string) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seek: (position: number) => void;
  setPlayerVisible: (visible: boolean) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerVisible, setPlayerVisible] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [favoriteTracks, setFavoriteTracks] = useState<string[]>([]);

  // Simulation timer for track progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setPosition((prev) => {
          if (prev >= duration) {
            if (isRepeat) {
              return 0; // loop
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack, duration, isRepeat]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setDuration(track.duration);
    setPosition(0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (currentTrack) {
      setIsPlaying((prev) => !prev);
    }
  };

  const toggleFavorite = (trackId: string) => {
    setFavoriteTracks((prev) => {
      if (prev.includes(trackId)) {
        return prev.filter((id) => id !== trackId);
      }
      return [...prev, trackId];
    });
  };

  const toggleShuffle = () => setIsShuffle((prev) => !prev);
  const toggleRepeat = () => setIsRepeat((prev) => !prev);

  const seek = (newPosition: number) => {
    if (currentTrack) {
      setPosition(Math.max(0, Math.min(newPosition, duration)));
    }
  };

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        position,
        duration,
        isPlayerVisible,
        isShuffle,
        isRepeat,
        favoriteTracks,
        playTrack,
        togglePlay,
        toggleFavorite,
        toggleShuffle,
        toggleRepeat,
        seek,
        setPlayerVisible,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};
