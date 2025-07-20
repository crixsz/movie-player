import { useState, useRef, useEffect } from 'react';
import './App.css'; // Assuming you have some basic CSS in App.css
import Hls from 'hls.js'; // HLS.js for playing HLS streams

// HlsPlayer component to handle video playback with HLS.js and subtitles
const HlsPlayer = ({ src, subtitles }) => {
  const videoRef = useRef(null); // Ref to access the video DOM element

  useEffect(() => {
    const video = videoRef.current;

    if (video && src) {
      // Check if HLS.js is supported by the browser
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src); // Load the HLS stream source
        hls.attachMedia(video); // Attach HLS.js to the video element

        // Cleanup function for HLS.js instance
        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for browsers that natively support HLS (e.g., Safari)
        video.src = src;
      }
    }
  }, [src]); // Re-run effect if src changes

  return (
    <video
      ref={videoRef}
      controls // Show video controls
      crossOrigin="anonymous" // Required for fetching subtitles from different origins
      className="w-full h-auto aspect-video rounded-lg" // Tailwind classes for styling
    >
      {/* Conditionally render the track element for subtitles */}
      {subtitles && (
        <track
          kind="subtitles"
          srcLang="en" // Language of the subtitle track
          label="English" // Label displayed to the user
          src={subtitles} // URL of the VTT subtitle file
          default // Make this the default subtitle track
        />
      )}
    </video>
  );
};

// CustomAlertModal component for displaying error messages
const CustomAlertModal = ({ message, onClose }) => {
  if (!message) return null; // Don't render if no message

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Error</h3>
        <p className="text-slate-700 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

function App() {
  // State variables for TMDB ID, movie title, error messages, loading states, and URLs
  const [tmdbId, setTmdbId] = useState(''); // Changed from movieId to tmdbId
  const [movieTitle, setMovieTitle] = useState(''); // New state for movie title for subtitle search
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For movie loading
  const [subtitleVttUrl, setSubtitleVttUrl] = useState(null); // URL for the loaded VTT subtitle
  const [streamUrl, setStreamUrl] = useState(null); // URL for the video stream
  const [subtitleResults, setSubtitleResults] = useState([]); // Array to store subtitle search results
  const [isSearchingSubtitles, setIsSearchingSubtitles] = useState(false); // For subtitle search loading

  const playerRef = useRef(null); // Ref for the video player (not directly used in HlsPlayer, but kept for potential future use)

  // Function to convert SRT subtitle format to VTT format
  const srtToVtt = (srtText) => {
    let vttContent = 'WEBVTT\n\n'; // VTT header
    const cues = srtText.split(/\r?\n\r?\n/); // Split SRT into individual cues

    cues.forEach(cue => {
      if (!cue.trim()) return; // Skip empty cues
      const lines = cue.split(/\r?\n/);
      if (lines.length >= 2) {
        const timeString = lines[1].trim(); // Get time string (e.g., "00:00:00,000 --> 00:00:02,000")
        const textLines = lines.slice(2); // Get subtitle text lines
        // Convert SRT time format (comma for milliseconds) to VTT format (dot for milliseconds)
        const vttTime = timeString.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        vttContent += `${lines[0]}\n${vttTime}\n${textLines.join('\n')}\n\n`; // Reconstruct VTT cue
      }
    });

    return vttContent.trim(); // Return the complete VTT content
  };

  // Handler for manually uploading an SRT subtitle file
  const handleSubtitleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSubtitleVttUrl(null);
      return;
    }
    if (!file.name.endsWith('.srt')) {
      setErrorMessage('Please upload a valid .srt file.');
      event.target.value = ''; // Clear file input
      setSubtitleVttUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const vttText = srtToVtt(reader.result); // Convert SRT to VTT
        const blob = new Blob([vttText], { type: 'text/vtt' }); // Create a Blob from VTT text
        const url = URL.createObjectURL(blob); // Create a URL for the Blob

        // Revoke previous Blob URL to prevent memory leaks
        if (subtitleVttUrl) URL.revokeObjectURL(subtitleVttUrl);

        setSubtitleVttUrl(url); // Set the new VTT URL
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to process subtitle file.');
        event.target.value = '';
        setSubtitleVttUrl(null);
      }
    };

    reader.readAsText(file); // Read the uploaded file as text
  };

  // Function to load a movie stream based on TMDB ID
  const loadMovie = async () => {
    if (!tmdbId) { // Use tmdbId
      setErrorMessage('Please enter a TMDB ID.');
      return;
    }

    setIsLoading(true); // Set loading state
    setErrorMessage(''); // Clear previous errors
    setStreamUrl(null); // Clear previous stream
    setSubtitleVttUrl(null); // Clear previous subtitles
    setSubtitleResults([]); // Clear previous subtitle search results

    try {
      const res = await fetch(`http://localhost:3000/play/${tmdbId}`); // Use tmdbId here
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!data.stream) throw new Error('No stream URL returned.');

      setStreamUrl(data.stream); // Set the stream URL
      // If the backend returns movieName, set it for subtitle search
      if (data.movieName) {
        setMovieTitle(data.movieName); // Pre-fill movie title for subtitle search
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load stream.');
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Function to search for subtitles using the OpenSubtitles API proxy with tmdb_id
  const searchSubtitles = async () => {
    if (!tmdbId) { // Search using tmdbId, not movieTitle
      setErrorMessage('Please load a movie first or enter a TMDB ID to search for subtitles.');
      return;
    }

    setIsSearchingSubtitles(true); // Set subtitle search loading state
    setErrorMessage(''); // Clear previous errors
    setSubtitleResults([]); // Clear previous results

    try {
      // Call the backend proxy for OpenSubtitles search, passing tmdb_id
      const res = await fetch(`http://localhost:3000/subtitles/search?tmdb_id=${encodeURIComponent(tmdbId)}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();

      if (data.data && data.data.length > 0) {
        setSubtitleResults(data.data); // Store the subtitle results
      } else {
        setErrorMessage('No subtitles found for this movie TMDB ID.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to search for subtitles.');
    } finally {
      setIsSearchingSubtitles(false); // Reset subtitle search loading state
    }
  };

  // Function to load a subtitle from the OpenSubtitles API based on fileId
  const loadSubtitleFromApi = async (fileId) => {
    setIsLoading(true); // Use general loading state while fetching subtitle
    setErrorMessage(''); // Clear previous errors
    setSubtitleVttUrl(null); // Clear previous subtitle

    try {
      // Call the backend proxy to download the subtitle
      const res = await fetch(`http://localhost:3000/subtitles/download/${fileId}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const srtText = await res.text(); // Get the SRT content

      const vttText = srtToVtt(srtText); // Convert SRT to VTT
      const blob = new Blob([vttText], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);

      if (subtitleVttUrl) URL.revokeObjectURL(subtitleVttUrl);
      setSubtitleVttUrl(url); // Set the VTT URL for the video player
      setSubtitleResults([]); // Clear search results after a subtitle is loaded
    } catch (err) {
      console.addError(err);
      setErrorMessage(err.message || 'Failed to load subtitle from API.');
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Effect to revoke Blob URL when component unmounts or subtitleVttUrl changes
  useEffect(() => {
    return () => {
      if (subtitleVttUrl) URL.revokeObjectURL(subtitleVttUrl);
    };
  }, [subtitleVttUrl]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 p-4 sm:p-6 lg:p-8 flex items-center justify-center font-sans">
      <div className="container max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-700 mb-4 flex items-center">
          Movie Player <span className="ml-2 text-4xl">🎬</span>
        </h1>
        <p className="text-slate-600 mb-6 text-base sm:text-lg">
          Load a movie by entering its TMDB ID, search for subtitles using the TMDB ID, or upload your own SRT file.
        </p>

        {/* TMDB ID Input and Load Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <input
            type="text"
            value={tmdbId} // Use tmdbId
            onChange={(e) => setTmdbId(e.target.value)} // Set tmdbId
            placeholder="Enter TMDB ID (e.g., 550 for Fight Club)" // Updated placeholder
            className="flex-grow p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 placeholder-slate-400 text-base"
          />
          <button
            onClick={loadMovie}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isLoading ? 'Loading Movie...' : 'Load Movie'}
          </button>
        </div>

        {/* Subtitle Search Input and Button (now uses tmdbId implicitly for search API) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <input
            type="text"
            value={movieTitle} // Still display movie title for user clarity
            onChange={(e) => setMovieTitle(e.target.value)} // Allow manual entry if needed
            placeholder="Movie Title (auto-filled on load, or enter for search)" // Updated placeholder
            className="flex-grow p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 text-slate-800 placeholder-slate-400 text-base"
          />
          <button
            onClick={searchSubtitles}
            disabled={isSearchingSubtitles || isLoading || !tmdbId} // Disable if no TMDB ID
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isSearchingSubtitles ? 'Searching...' : 'Search Subtitles by TMDB ID'} {/* Updated button text */}
          </button>
        </div>

        {/* Subtitle Search Results Display */}
        {subtitleResults.length > 0 && (
          <div className="mb-6 p-4 border border-slate-300 rounded-lg bg-slate-50 max-h-60 overflow-y-auto shadow-inner">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Found Subtitles:</h3>
            <ul className="space-y-2">
              {subtitleResults.map((sub) => (
                <li key={sub.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm border border-slate-200"> {/* Use sub.id as key */}
                  <span className="text-slate-700 text-sm flex-grow mr-4">
                    <span className="font-medium">{sub.attributes.language}</span> - {sub.attributes.movie_name || sub.attributes.title} {/* Access attributes */}
                    {sub.attributes.release && <span className="text-slate-500 ml-2 text-xs">({sub.attributes.release})</span>} {/* Access attributes */}
                  </span>
                  <button
                    onClick={() => loadSubtitleFromApi(sub.attributes.files?.[0]?.file_id)}
                    disabled={isLoading} // Disable while any loading is active
                    className="ml-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-800 transition-colors duration-200 disabled:opacity-50"
                  >
                    Load
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Video Player Section */}
        {//streamUrl && 
        (
          <div className="w-full bg-black rounded-lg overflow-hidden shadow-md aspect-video">
            <HlsPlayer src={streamUrl} subtitles={subtitleVttUrl} />
          </div>
        )}
      </div>
      {/* Error Alert Modal */}
      <CustomAlertModal message={errorMessage} onClose={() => setErrorMessage('')} />
    </div>
  );
}

export default App;