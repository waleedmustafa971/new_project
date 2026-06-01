import { useEffect, useRef, useState } from "react";
import Sound from "react-native-sound";
import * as base from "../../component/global";

/**
 * Custom hook to manage video playback and optional audio.
 *
 * @param {object} params
 * @param {boolean} params.isActive - Whether the video is currently in view or focused.
 * @param {string} params.videoUrl - The video URL to be played (used for ref).
 * @param {object|string} params.soundData - JSON object or string containing sound file info.
 * @param {string} params.checkvideosoundisenableornot - "enabled" or "disabled".
 * @param {boolean} params.hasSound - Whether the reel has an associated sound.
 */
export const useVideoController = ({
  isActive,
  videoUrl,
  soundData,
  checkvideosoundisenableornot,
  hasSound,
}) => {
  const videoRef = useRef(null);
  const soundRef = useRef(null);

  const [isVideoMuted, setIsVideoMuted] = useState(
    checkvideosoundisenableornot === "disabled"
  );
  const [isPaused, setIsPaused] = useState(!isActive);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      if (!isActive || !hasSound) return;

      console.log("load useVideoController", hasSound);

      let parsedSound = soundData;
     
      // Parse soundData if it's a JSON string
      if (typeof soundData === "string") {
        try {
          parsedSound = JSON.parse(soundData);
           console.log('parsedSound....' + JSON.stringify(parsedSound))
        } catch (e) {
          console.error("Failed to parse soundData:", e);
          return;
        }
      }

      //const shouldPlaySound = checkvideosoundisenableornot === "disabled" && parsedSound?.file;
      const shouldPlaySound = parsedSound?.file;
        console.log('shouldPlaySound......' + parsedSound.file)

      if (shouldPlaySound) {
        // Stop and clean up any previous sound
        if (soundRef.current) {

          soundRef.current.release();
          soundRef.current = null;
        }
        console.log('release sound file shouldPlaySound' + parsedSound.file)

     //   const soundUrl = base.BASE_URL + parsedSound.file;
      //  const soundUrl = 'https://myvybe.s3.eu-north-1.amazonaws.com/1751369181587-1.mp3'; 
        const soundUrl = parsedSound.file; //'https://myvybe.s3.eu-north-1.amazonaws.com/1751369181587-1.mp3'; 
        //parsedSound.file;

        console.log("🔊 Attempting to play sound from:", soundUrl);

        const sound = new Sound(soundUrl, null, (error) => {
          if (error) {
            console.error("❌ Failed to load the sound:", error);
            return;
          }

          if (isMounted) {
            sound.setNumberOfLoops(-1); // Loop sound indefinitely
            sound.play((success) => {
              if (!success) {
                console.error("❌ Sound playback failed");
              }
            });

            soundRef.current = sound;
          }
        });
      } else {
        console.log('..............','here not found')
      }
    };

    loadSound();

    return () => {
      isMounted = false;

      if (soundRef.current) {
        soundRef.current.stop(() => {
          soundRef.current.release();
          soundRef.current = null;
        });
      }
    };
  }, [isActive, soundData, hasSound, checkvideosoundisenableornot]);

  useEffect(() => {
    setIsPaused(!isActive); // Update pause state when video activity changes
  }, [isActive]);

  return {
    videoRef,
    isVideoMuted,
    isPaused,
    setIsPaused,
  };
};
