import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';

const VideoPlayer = ({ src, subtitles }) => {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressBarRef = useRef(null);
  const wasPlayingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls;

    if (src) {
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleVolumeChange = () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
    };
    const handleFullscreenChange = () => {
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        setIsFullscreen(!!fullscreenElement);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (isSeeking) return;
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isSeeking]);

  const togglePlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeekMouseDown = (e) => {
    e.preventDefault();
    wasPlayingRef.current = !videoRef.current.paused;
    if (wasPlayingRef.current) {
        videoRef.current.pause();
    }
    setIsSeeking(true);

    const progressBar = progressBarRef.current;
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = (offsetX / progressBar.offsetWidth) * duration;
    videoRef.current.currentTime = newTime;
    setProgress((newTime / duration) * 100);
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!isSeeking || !progressBarRef.current) return;
        e.preventDefault();
        const progressBar = progressBarRef.current;
        const rect = progressBar.getBoundingClientRect();
        let offsetX = e.clientX - rect.left;

        if (offsetX < 0) offsetX = 0;
        if (offsetX > progressBar.offsetWidth) offsetX = progressBar.offsetWidth;

        const newTime = (offsetX / progressBar.offsetWidth) * duration;
        videoRef.current.currentTime = newTime;
        setProgress((newTime / duration) * 100);
        setCurrentTime(newTime);
    };

    const handleMouseUp = (e) => {
        e.preventDefault();
        if (isSeeking) {
            if (wasPlayingRef.current) {
                videoRef.current.play();
            }
            setIsSeeking(false);
        }
    };

    if (isSeeking) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, duration]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    if (newVolume > 0) {
        videoRef.current.muted = false;
        setIsMuted(false);
    }
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
        return '00:00:00';
    }
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleMouseEnter = () => {
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    setIsControlsVisible(true);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
            setIsControlsVisible(false);
        }, 2000);
    }
  };
  
  useEffect(() => {
    if (!isPlaying) {
        setIsControlsVisible(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    } else {
        controlsTimeoutRef.current = setTimeout(() => {
            setIsControlsVisible(false);
        }, 2000);
    }
    return () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    }
  }, [isPlaying]);


  // Icons as SVG components
  const PlayIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  );
  const PauseIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
  );
  const VolumeHighIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.28 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
  );
  const VolumeOffIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
  );
  const BigPlayIcon = () => (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  );
  const FullscreenEnterIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
  );
  const FullscreenExitIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
  );

  if (!src) {
    return (
      <div className="w-full h-auto aspect-video rounded-lg bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-red-600"></div>
      </div>
    );
  }

  return (
    <div 
        ref={playerContainerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseEnter}
    >
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        className="w-full h-auto aspect-video rounded-lg bg-black"
        onClick={togglePlayPause}
      >
        {subtitles && (
          <track
            kind="subtitles"
            srcLang="en"
            label="English"
            src={subtitles}
            default
          />
        )}
      </video>
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={togglePlayPause}>
        <button className="text-white bg-black bg-opacity-50 rounded-full p-4 focus:outline-none">
          <BigPlayIcon />
        </button>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          className="relative h-1.5 w-full bg-gray-500/50 rounded-full cursor-pointer" 
          onMouseDown={handleSeekMouseDown}
        >
          <div className="h-full bg-red-600 rounded-full" style={{ width: `${progress}%` }}></div>
          <div className="absolute top-1/3 -mt-1 h-3 w-3 rounded-full bg-red-800" style={{ left: `calc(${progress}% - 6px)` }}></div>
        </div>
        <div className="flex items-center justify-between text-white mt-2">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button onClick={togglePlayPause} className="focus:outline-none">
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="focus:outline-none">
                {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeHighIcon />}
              </button>
              <div className="top-1/3w-0 group-hover/volume:w-24 transition-all duration-300">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className=" w-24 h-1.5 bg-gray-500/50 rounded-full appearance-none cursor-pointer accent-red-600"
                />
              </div>
            </div>
          </div>
          {/* Time Display and Fullscreen button */}
          <div className="flex items-center gap-4">
            <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
            <button onClick={toggleFullscreen} className="focus:outline-none">
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
