import { useEffect, useRef, useState } from "react";

export const useVideoController = ({ isActive }) => {
  const videoRef = useRef(null);

  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(!isActive);

  useEffect(() => {
    setIsPaused(!isActive);
  }, [isActive]);

  const toggleMute = () => {
    setIsVideoMuted(prev => !prev);
  };

  return {
    videoRef,
    isVideoMuted,
    isPaused,
    setIsPaused,
    toggleMute
  };
};