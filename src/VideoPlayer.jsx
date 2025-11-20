import React, { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

const VideoPlayer = ({ src, subtitles }) => {
  const artRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!src || !artRef.current) return;

    // Destroy previous instance if it exists to prevent duplicates
    if (playerRef.current) {
      playerRef.current.destroy(true);
    }

    const art = new Artplayer({
      container: artRef.current,
      url: src,
      title: "Stream",
      volume: 0.5,
      isLive: false,
      muted: false,
      autoplay: false,
      pip: true,
      autoSize: false, // Disable autoSize to respect container dimensions
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#23ade5",
      lang: navigator.language.toLowerCase(),
      moreVideoAttr: {
        crossOrigin: "anonymous",
      },
      subtitle: {
        url: subtitles || "",
        type: "vtt",
        style: {
          color: "#fff",
          fontSize: "20px",
        },
        encoding: "utf-8",
      },
      customType: {
        m3u8: function (video, url) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            // Optional: Load quality levels if needed
            art.hls = hls;
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },
      },
    });

    playerRef.current = art;

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy(true);
        playerRef.current = null;
      }
    };
  }, [src]);

  // Handle subtitle updates separately to avoid full player reload
  useEffect(() => {
    if (playerRef.current && subtitles) {
      playerRef.current.subtitle.url = subtitles;
    }
  }, [subtitles]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white rounded-lg">
        <h1 className="text-xl font-semibold">No sources selected</h1>
      </div>
    );
  }

  return <div ref={artRef} className="w-full h-full rounded-lg overflow-hidden" />;
};

export default VideoPlayer;
