import React, { useRef, useState, useCallback, useEffect } from 'react';
import ReactPlayer from 'react-player';

import {
  Play,
  Pause,
  VolumeX,
  Volume2,
  Volume1,
  Volume,
  Rewind,
  FastForward,
} from 'lucide-react';

const VideoPlayer = ({
  reactPlayerRef,
  onPlay,
  onPause,
  onSeek,
  url,
  subtitleUrl,
}) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showOverlayControls, setShowOverlayControls] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const [isMouseOverWrapper, setIsMouseOverWrapper] = useState(false);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing && !isMouseOverWrapper) {
        setShowControls(false);
      }
    }, 1000);
  }, [playing, isMouseOverWrapper]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    onPlay();
    triggerShowControls();
  }, [onPlay, triggerShowControls]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    onPause();
    triggerShowControls();
  }, [onPause, triggerShowControls]);

  const handleProgress = useCallback(
    (state) => {
      if (!seeking) {
        setPlayed(state.played);
      }
      if (isMouseOverWrapper) {
        triggerShowControls();
      }
    },
    [seeking, isMouseOverWrapper, triggerShowControls]
  );

  const handleDuration = useCallback((d) => {
    setDuration(d);
  }, []);

  const handleSeek = useCallback(
    (seconds) => {
      onSeek(seconds);
      triggerShowControls();
    },
    [onSeek, triggerShowControls]
  );

  const togglePlayPause = useCallback(() => {
    if (playing) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [playing, handlePlay, handlePause]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setMuted(newVolume === 0);
  }, []);

  const handleToggleMuted = useCallback(() => {
    setMuted(!muted);
    if (!muted && volume === 0) {
      setVolume(0.5);
    }
  }, [muted, volume]);

  const handleSeekMouseDown = useCallback(() => {
    setSeeking(true);
  }, []);

  const handleSeekChange = useCallback((e) => {
    setPlayed(parseFloat(e.target.value));
  }, []);

  const handleSeekMouseUp = useCallback(
    (e) => {
      setSeeking(false);
      if (reactPlayerRef.current) {
        const newPlayed = parseFloat(e.currentTarget.value);
        reactPlayerRef.current.seekTo(newPlayed, 'fraction');
        handleSeek(newPlayed * duration);
      }
    },
    [reactPlayerRef, handleSeek, duration]
  );

  const handleRewind = useCallback(() => {
    if (reactPlayerRef.current) {
      const newTime = reactPlayerRef.current.getCurrentTime() - 10;
      reactPlayerRef.current.seekTo(newTime, 'seconds');
      handleSeek(newTime);
    }
  }, [reactPlayerRef, handleSeek]);

  const handleForward = useCallback(() => {
    if (reactPlayerRef.current) {
      const newTime = reactPlayerRef.current.getCurrentTime() + 10;
      reactPlayerRef.current.seekTo(newTime, 'seconds');
      handleSeek(newTime);
    }
  }, [reactPlayerRef, handleSeek]);

  useEffect(() => {
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) {
        setShowControls(false);
      }
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing]);

  const handleMouseMove = useCallback(() => {
    setShowOverlayControls(true);
    setIsMouseOverWrapper(true);
    triggerShowControls();
  }, [triggerShowControls]);

  const handleMouseLeave = useCallback(() => {
    setShowOverlayControls(false);
    setIsMouseOverWrapper(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1);
    } else {
      setShowControls(true);
    }
  }, [playing]);

  const getVolumeIcon = () => {
    if (muted || volume === 0) {
      return <VolumeX size={24} color="white" />;
    } else if (volume > 0.5) {
      return <Volume2 size={24} color="white" />;
    } else if (volume > 0) {
      return <Volume1 size={24} color="white" />;
    } else {
      return <Volume size={24} color="white" />;
    }
  };

  return (
    <div
      className="video-player-wrapper relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl font-inter"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ReactPlayer
        ref={reactPlayerRef}
        url={url}
        width="fit-content"
        height="fit-content"
        playing={playing}
        volume={volume}
        muted={muted}
        controls={false}
        onPlay={handlePlay}
        onPause={handlePause}
        onProgress={handleProgress}
        onDuration={handleDuration}
        onEnded={() => setPlaying(false)}
        className="react-player absolute top-0 left-0"
        config={{
          file: {
            tracks: subtitleUrl
              ? [
                  {
                    kind: 'subtitles',
                    src: subtitleUrl,
                    srcLang: 'en',
                    label: 'English',
                    default: true,
                  },
                ]
              : [],
          },
        }}
      />

      {/* Overlay Controls */}
      <div
        className={`overlay-controls absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          showOverlayControls ? 'opacity-100' : 'opacity-0'
        } ${!playing ? 'opacity-100' : ''} pointer-events-none`}
      >
        <div className="flex space-x-8">
          <button
            onClick={handleRewind}
            className="p-4 rounded-full bg-blue-700 bg-opacity-50 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 pointer-events-auto hover:bg-blue-900"
            aria-label="Rewind 10 seconds"
          >
            <Rewind size={32} color="white" />
          </button>
          <button
            onClick={togglePlayPause}
            className="p-4 rounded-full bg-blue-700 bg-opacity-50 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 pointer-events-auto hover:bg-blue-900"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={32} color="white" /> : <Play size={32} color="white" />}
          </button>
          <button
            onClick={handleForward}
            className="p-4 rounded-full bg-blue-700 bg-opacity-50 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 pointer-events-auto hover:bg-blue-900"
            aria-label="Forward 10 seconds"
          >
            <FastForward size={32} color="white" />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className={`controls-bar absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        } pointer-events-none`}
      >
        <input
          type="range"
          min={0}
          max={0.999999}
          step="any"
          value={played}
          onMouseDown={handleSeekMouseDown}
          onChange={handleSeekChange}
          onMouseUp={handleSeekMouseUp}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer range-slider-thumb-blue pointer-events-auto hover:bg-blue-900 bg-white"
          aria-label="Video progress"
        />

        <div className="flex items-center justify-between mt-2 text-white text-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 pointer-events-auto"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
            </button>

            <button
              onClick={handleToggleMuted}
              className="p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200 pointer-events-auto"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 rounded-lg appearance-none cursor-pointer range-slider-thumb-blue pointer-events-auto hover:bg-blue-900 bg-white"
              aria-label="Volume control"
            />

            <span className="ml-2">
              {formatTime(played * duration)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
