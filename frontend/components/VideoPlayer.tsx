import React, { useRef, useEffect } from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
  containerClassName?: string;
}

/**
 * VideoPlayer Component
 * Renders a responsive HTML5 video player
 * Supports local video files (MP4, WebM, OGG, MOV, AVI)
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title = "Product video",
  autoplay = false,
  className = "",
  containerClassName = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle local video autoplay
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      if (autoplay) {
        videoRef.current.play().catch(() => {
          // Autoplay failed (expected in some browsers without user interaction)
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [autoplay]);

  if (!url) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-black ${containerClassName}`}
      style={{ aspectRatio: "16 / 9" }}
    >
      <video
        ref={videoRef}
        src={url}
        title={title}
        className={`h-full w-full object-cover ${className}`}
        muted
        playsInline
        loop
      />
    </div>
  );
};

export default VideoPlayer;
