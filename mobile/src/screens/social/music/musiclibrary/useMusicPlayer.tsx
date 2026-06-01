import TrackPlayer, { State, Track } from 'react-native-track-player';
import { useRef, useState } from 'react';

interface MusicItem {
  _id: string;
  musicfile: string;
  title?: string;
  artist?: string;
}

interface HandlePlayPauseProps {
  item: MusicItem;
  base: { MUSIC_URL: string };
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  setLoadingId: (id: string | null) => void;
}

export const useMusicPlayer = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePlayPause = async (item: MusicItem, base: { MUSIC_URL: string }) => {
    const fullUrl = base.MUSIC_URL + item?.musicfile;
    console.log('Attempting Play:', fullUrl);

    setLoadingId(item._id);

    try {
      // 1️⃣ Setup player if not already
      const playerState = await TrackPlayer.getState();
      if (playerState === State.None) {
        await TrackPlayer.setupPlayer();
        console.log('TrackPlayer initialized');
      }

      // 2️⃣ Check if same song is already playing
      const currentTrack = await TrackPlayer.getCurrentTrack();
      if (currentTrack === item._id) {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
          await TrackPlayer.pause();
          setPlayingId(null);
          setLoadingId(null);
          return;
        } else {
          await TrackPlayer.play();
          setPlayingId(item._id);
          setLoadingId(null);
          return;
        }
      }

      // 3️⃣ Stop/reset any previous track
      await TrackPlayer.reset();

      // 4️⃣ Add new track
      const track: Track = {
        id: item._id,
        url: fullUrl, // online URL
        title: item.title || 'Unknown',
        artist: item.artist || 'Unknown',
      };
      await TrackPlayer.add(track);

      // 5️⃣ Play
      await TrackPlayer.play();
      setPlayingId(item._id);
      setLoadingId(null);
    } catch (error) {
      console.error('TrackPlayer error:', error);
      setPlayingId(null);
      setLoadingId(null);
    }
  };

  return { playingId, loadingId, handlePlayPause };
};
