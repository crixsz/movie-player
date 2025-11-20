import express from "express";
import https from "https";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { Transform } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;
const tmdb_id = process.env.TMDB_API_KEY;
const opensubtitles_api_key = process.env.OPENSUBTITLES_API_KEY;
let TARGET;
const VITE_BACKEND_URL = process.env.VITE_BACKEND_URL;
const BACKEND_HOST = new URL(VITE_BACKEND_URL).host;

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!apiKey || apiKey !== process.env.FRONTEND_API_KEY) {
    console.log(
      `[AUTH] Unauthorized request from ${req.ip} - Invalid or missing API key`
    );
    return res.status(401).json({
      error: "Unauthorized: Invalid API key",
      message: "Access denied. Valid API key required.",
    });
  }

  console.log(`[AUTH] Authorized request from ${req.ip}`);
  next();
};

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Range, X-API-Key, Authorization"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Decode base64 resolution
function decodeBase64Segment(segment) {
  try {
    const decoded = Buffer.from(segment, "base64").toString("utf-8");
    const num = parseInt(decoded.match(/\d+/)?.[0], 10);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
}

// Get movie name (optional)

async function getMovieName(id) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return null;

  const tmdbApiUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&language=en-US`;
  try {
    const res = await fetch(tmdbApiUrl);
    const data = await res.json();
    return data.title;
  } catch {
    return null;
  }
}

// Get TV series name (optional)

async function getTVName(id) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return null;
  const tmdbApiUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbApiKey}&language=en-US`;
  try {
    const res = await fetch(tmdbApiUrl);
    const data = await res.json();
    return data.name;
  } catch {
    return null;
  }
}

// Puppeteer: sniff for best m3u8 URL
async function sniffMovieVideoLinks(movieId) {
  const url = `https://111movies.com/movie/${movieId}`;
  console.log(`[sniffMovieVideoLinks] Launching Puppeteer for URL: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Block unnecessary resources to speed up page loads.
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["image", "stylesheet", "font"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  const foundLinks = new Set();
  page.on("request", (req) => {
    const rUrl = req.url().split("?")[0].toLowerCase();
    if (rUrl.endsWith(".m3u8")) {
      console.log(`[sniffMovieVideoLinks][request] Found m3u8: ${req.url()}`);
      foundLinks.add(req.url());
    }
  });
  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] || "";
    if (ct.includes("application/vnd.apple.mpegurl")) {
      console.log(
        `[sniffMovieVideoLinks][response] Found m3u8 by content-type: ${res.url()}`
      );
      foundLinks.add(res.url());
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    console.log(`[sniffMovieVideoLinks] Page loaded: ${url}`);
  } catch (err) {
    console.error(`[sniffMovieVideoLinks] Error loading page: ${err}`);
  }
  await browser.close();

  const m3u8Links = Array.from(foundLinks).filter((link) =>
    link.endsWith(".m3u8")
  );
  console.log(`[sniffMovieVideoLinks] All m3u8 links found:`, m3u8Links);

  const parsed = m3u8Links.map((link) => {
    const parts = link.split("/");
    const resolutions = parts.map(decodeBase64Segment).filter((n) => n >= 360);
    const maxRes = resolutions.length ? Math.max(...resolutions) : 0;
    console.log(
      `[sniffMovieVideoLinks] Link: ${link}, Resolutions: ${resolutions}, Max: ${maxRes}`
    );
    return { link, resolution: maxRes };
  });

  parsed.sort((a, b) => b.resolution - a.resolution);
  if (parsed.length) {
    console.log(
      `[sniffMovieVideoLinks] Best stream: ${parsed[0].link} (${parsed[0].resolution}p)`
    );
    // Extract the main origin (protocol + host) from the link
    const urlObj = new URL(parsed[0].link);
    TARGET = `${urlObj.protocol}//${urlObj.host}`;
    console.log(`[sniffMovieVideoLinks] Target MAIN URL : ${TARGET}`);
    return parsed[0].link;
  } else {
    console.log(`[sniffMovieVideoLinks] No suitable m3u8 stream found.`);
    return null;
  }
}
async function sniffTVVideoLinks(seriesId, seasonId, episodeId) {
  const url = `https://111movies.com/tv/${seriesId}/${seasonId}/${episodeId}`;
  console.log(`[sniffTVVideoLinks] Launching Puppeteer for URL: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const foundLinks = new Set();
  page.on("request", (req) => {
    const rUrl = req.url().split("?")[0].toLowerCase();
    if (rUrl.endsWith(".m3u8")) {
      console.log(`[sniffTVVideoLinks][request] Found m3u8: ${req.url()}`);
      foundLinks.add(req.url());
    }
  });
  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] || "";
    if (ct.includes("application/vnd.apple.mpegurl")) {
      console.log(
        `[sniffTVVideoLinks][response] Found m3u8 by content-type: ${res.url()}`
      );
      foundLinks.add(res.url());
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    console.log(`[sniffTVVideoLinks] Page loaded: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (err) {
    console.error(`[sniffTVVideoLinks] Error loading page: ${err}`);
  }
  await browser.close();

  const m3u8Links = Array.from(foundLinks).filter((link) =>
    link.endsWith(".m3u8")
  );
  console.log(`[sniffTVVideoLinks] All m3u8 links found:`, m3u8Links);

  const parsed = m3u8Links.map((link) => {
    const parts = link.split("/");
    const resolutions = parts.map(decodeBase64Segment).filter((n) => n >= 360);
    const maxRes = resolutions.length ? Math.max(...resolutions) : 0;
    console.log(
      `[sniffTVVideoLinks] Link: ${link}, Resolutions: ${resolutions}, Max: ${maxRes}`
    );
    return { link, resolution: maxRes };
  });

  parsed.sort((a, b) => b.resolution - a.resolution);
  if (parsed.length) {
    console.log(
      `[sniffTVVideoLinks] Best stream: ${parsed[0].link} (${parsed[0].resolution}p)`
    );
    // Extract the main origin (protocol + host) from the link
    const urlObj = new URL(parsed[0].link);
    TARGET = `${urlObj.protocol}//${urlObj.host}`;
    console.log(`[sniffTVVideoLinks] Target MAIN URL : ${TARGET}`);
    return parsed[0].link;
  } else {
    console.log(`[sniffTVVideoLinks] No suitable m3u8 stream found.`);
    return null;
  }
}

app.all("/file2/*", (req, res) => {
  // Redirect or proxy to the /proxy equivalent
  const proxiedUrl = `/proxy${req.url}`;
  res.redirect(proxiedUrl);
});
// API Endpoint: Play Movies
app.get("/play/:id", authenticateApiKey, async (req, res) => {
  const movieId = req.params.id;
  const movieName = await getMovieName(movieId);
  const bestStream = await sniffMovieVideoLinks(movieId);

  console.log(`Movie ID: ${movieId}, Name: ${movieName || "Unknown"}`);
  if (!bestStream) {
    return res.status(404).json({ error: "No HD stream found" });
  }

  // Replace origin with proxy
  const proxied = bestStream.replace(TARGET, `http://${BACKEND_HOST}/proxy`);
  res.json({ stream: proxied, movieName: movieName });
});

// API Endpoint: Play TV Series
app.get(
  "/playtv/:id/:seasonId/:episodeId",
  authenticateApiKey,
  async (req, res) => {
    const seriesId = req.params.id;
    const seasonId = req.params.seasonId;
    const episodeId = req.params.episodeId;

    const tvName = await getTVName(seriesId);
    const bestStreamTV = await sniffTVVideoLinks(seriesId, seasonId, episodeId);
    console.log(
      `TV Series ID: ${seriesId}, Season ID: ${seasonId}, Episode ID: ${episodeId}`
    );
    if (!bestStreamTV) {
      return res
        .status(404)
        .json({ error: "No HD stream found for this episode" });
    }

    // Replace origin with proxy
    const proxied = bestStreamTV.replace(
      TARGET,
      `http://${BACKEND_HOST}/proxy`
    );
    res.json({ stream: proxied, tvName: tvName });
  }
);

// Rewrite manifest URLs for m3u8
class HLSRewriter extends Transform {
  constructor() {
    super();
    this.chunks = [];
  }

  _transform(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback();
  }

  _flush(callback) {
    const data = Buffer.concat(this.chunks).toString();
    let segmentOrigin = null;

    // First pass: find the segmentOrigin from the first relative segment URI
    data.split("\n").some((line) => {
      if (
        !line.startsWith("#") &&
        line.trim() !== "" &&
        !line.startsWith("http") &&
        !line.startsWith("https")
      ) {
        try {
          // Extract hostname from a relative path like /foggyhorizon11.wiki/...
          const parts = line.split("/");
          if (parts.length > 1) {
            segmentOrigin = `https://${parts[1]}`;
            return true; // Stop iterating once found
          }
        } catch (e) {
          console.error("[PROXY2 DEBUG] Error extracting segment origin:", e);
        }
      }
      return false;
    });

    let processedData = data
      .split("\n")
      .map((line) => {
        // If it's a segment URI (not a directive and not already absolute)
        if (
          !line.startsWith("#") &&
          line.trim() !== "" &&
          !line.startsWith("http") &&
          !line.startsWith("https")
        ) {
          return `${segmentOrigin}${line}`;
        }
        return line;
      })
      .join("\n");

    let rewritten = processedData;
    if (segmentOrigin) {
      rewritten = processedData.replace(
        new RegExp(segmentOrigin.replace(/\./g, "\\."), "g"),
        `http://${BACKEND_HOST}/proxy`
      );
    }
    this.push(rewritten);
    callback();
  }
}

// Proxy HLS (.m3u8 and segments)
app.all("/proxy/*", (clientReq, clientRes) => {
  const urlObj = new URL(clientReq.url, `http://${clientReq.headers.host}`);
  const targetPath = urlObj.pathname.replace(/^\/proxy/, "") + urlObj.search;

  const options = {
    hostname: new URL(TARGET).hostname,
    port: 443,
    path: targetPath,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      Host: new URL(TARGET).hostname,
      Origin: "https://111movies.com",
      Referer: "https://111movies.com/",
      "Accept-Encoding": "identity",
    },
    rejectUnauthorized: false,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    [
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-headers",
      "access-control-allow-credentials",
    ].forEach((h) => delete proxyRes.headers[h]);

    clientRes.setHeader("Access-Control-Allow-Origin", "*");

    if (targetPath.endsWith(".m3u8")) {
      clientRes.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      proxyRes.pipe(new HLSRewriter()).pipe(clientRes);
    } else {
      proxyRes.pipe(clientRes);
    }
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err);
    if (!clientRes.headersSent) {
      clientRes.status(502).send("Proxy error");
    }
  });

  clientReq.pipe(proxyReq);
});

app.options("/proxy/*", (req, res) => {
  res.status(204).end();
});
// NEW ENDPOINT: Search for subtitles using OpenSubtitles API with tmdb_id
app.get("/subtitles/search", authenticateApiKey, async (req, res) => {
  const { tmdb_id, language } = req.query; // tmdb_id and optional language (e.g., 'en')

  if (!opensubtitles_api_key) {
    return res
      .status(500)
      .json({ error: "OpenSubtitles API key not configured in .env" });
  }
  if (!tmdb_id) {
    return res
      .status(400)
      .json({ error: "tmdb_id is required for subtitle search." });
  }

  const searchUrl = new URL("https://api.opensubtitles.com/api/v1/subtitles");
  searchUrl.searchParams.append("tmdb_id", tmdb_id);
  if (language) {
    searchUrl.searchParams.append("languages", language);
  } else {
    searchUrl.searchParams.append("languages", "en"); // Default to English if no language is specified
  }
  searchUrl.searchParams.append("order_by", "score"); // Order by relevance
  searchUrl.searchParams.append("order_direction", "desc");

  try {
    const osRes = await fetch(searchUrl.toString(), {
      headers: {
        "Api-Key": opensubtitles_api_key,
        "User-Agent": "x3n0nzox", // Required by OpenSubtitles API
      },
    });

    if (!osRes.ok) {
      const errorText = await osRes.text();
      console.error(`OpenSubtitles API error: ${osRes.status} - ${errorText}`);
      throw new Error(
        `OpenSubtitles API returned ${osRes.status}: ${errorText}`
      );
    }

    const data = await osRes.json();
    res.json(data); // Send the raw response from OpenSubtitles to the frontend
    // Log a summary of the subtitle search results
    if (Array.isArray(data.data)) {
      // Pretty-print subtitle search results with expanded attributes
      console.log(
        "Subtitles search results:",
        data.data.map((sub) => ({
          id: sub.id,
          language: sub.attributes.language,
          release: sub.attributes.release,
          download_count: sub.attributes.download_count,
          hearing_impaired: sub.attributes.hearing_impaired,
          hd: sub.attributes.hd,
          trusted: sub.attributes.from_trusted,
          uploader: sub.attributes.uploader?.name,
          url: sub.attributes.url,
          file_id: sub.attributes.files?.[0]?.file_id,
        }))
      );
    } else {
      console.log("Subtitles search results:", data);
    }
  } catch (error) {
    console.error("Error fetching subtitles:", error);
    res.status(500).json({ error: "Failed to search for subtitles." });
  }
});
// NEW ENDPOINT: Search for subtitles using OpenSubtitles API with tmdb_id, season_id and episode_id
app.get("/tvsubtitles/search", authenticateApiKey, async (req, res) => {
  const { tmdb_id, season_id, episode_id, language } = req.query; // tmdb_id, season_id, episode_id and optional language (e.g., 'en')

  if (!opensubtitles_api_key) {
    return res
      .status(500)
      .json({ error: "OpenSubtitles API key not configured in .env" });
  }
  if (!tmdb_id) {
    return res
      .status(400)
      .json({ error: "tmdb_id is required for subtitle search." });
  }

  const searchUrl = new URL("https://api.opensubtitles.com/api/v1/subtitles");
  searchUrl.searchParams.append("tmdb_id", tmdb_id);
  searchUrl.searchParams.append("season_number", season_id);
  searchUrl.searchParams.append("episode_number", episode_id);
  if (language) {
    searchUrl.searchParams.append("languages", language);
  } else {
    searchUrl.searchParams.append("languages", "en"); // Default to English if no language is specified
  }
  searchUrl.searchParams.append("order_by", "score"); // Order by relevance
  searchUrl.searchParams.append("order_direction", "desc");

  try {
    const osRes = await fetch(searchUrl.toString(), {
      headers: {
        "Api-Key": opensubtitles_api_key,
        "User-Agent": "x3n0nzox", // Required by OpenSubtitles API
      },
    });

    if (!osRes.ok) {
      const errorText = await osRes.text();
      console.error(`OpenSubtitles API error: ${osRes.status} - ${errorText}`);
      throw new Error(
        `OpenSubtitles API returned ${osRes.status}: ${errorText}`
      );
    }

    const data = await osRes.json();
    res.json(data); // Send the raw response from OpenSubtitles to the frontend
    // Log a summary of the subtitle search results
    if (Array.isArray(data.data)) {
      // Pretty-print subtitle search results with expanded attributes
      console.log(
        "Subtitles search results:",
        data.data.map((sub) => ({
          id: sub.id,
          language: sub.attributes.language,
          release: sub.attributes.release,
          download_count: sub.attributes.download_count,
          hearing_impaired: sub.attributes.hearing_impaired,
          hd: sub.attributes.hd,
          trusted: sub.attributes.from_trusted,
          uploader: sub.attributes.uploader?.name,
          url: sub.attributes.url,
          file_id: sub.attributes.files?.[0]?.file_id,
        }))
      );
    } else {
      console.log("Subtitles search results:", data);
    }
  } catch (error) {
    console.error("Error fetching subtitles:", error);
    res.status(500).json({ error: "Failed to search for subtitles." });
  }
});
// NEW ENDPOINT: Download a specific subtitle file from OpenSubtitles
app.get("/subtitles/download/:fileId", authenticateApiKey, async (req, res) => {
  const { fileId } = req.params;

  if (!opensubtitles_api_key) {
    return res
      .status(500)
      .json({ error: "OpenSubtitles API key not configured in .env" });
  }

  const downloadUrl = `https://api.opensubtitles.com/api/v1/download`;

  try {
    const osRes = await fetch(downloadUrl, {
      method: "POST",
      headers: {
        "Api-Key": opensubtitles_api_key,
        "User-Agent": "x3n0nzox",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_id: fileId }), // Request the download link for the given file_id
    });

    if (!osRes.ok) {
      const errorText = await osRes.text();
      console.error(
        `OpenSubtitles download error: ${osRes.status} - ${errorText}`
      );
      throw new Error(
        `OpenSubtitles download API returned ${osRes.status}: ${errorText}`
      );
    }

    const data = await osRes.json();
    // The download API returns a temporary download URL for the subtitle content
    if (data.link) {
      // Fetch the actual subtitle content (SRT format) from the temporary link
      const subtitleContentRes = await fetch(data.link);
      if (!subtitleContentRes.ok) {
        throw new Error(
          `Failed to fetch subtitle content from temporary URL: ${subtitleContentRes.status}`
        );
      }
      const srtText = await subtitleContentRes.text();
      res.setHeader("Content-Type", "text/plain"); // Set content type for SRT
      res.send(srtText); // Send the SRT content back to the frontend
    } else {
      throw new Error("No download link provided by OpenSubtitles.");
    }
  } catch (error) {
    console.error("Error downloading subtitle:", error);
    res.status(500).json({ error: "Failed to download subtitle." });
  }
});

// TMDB Movie search endpoint
app.get("/search/movie", async (req, res) => {
  const { query, page = 1 } = req.query;
  const tmdbApiKey = process.env.TMDB_API_KEY;

  if (!tmdbApiKey) {
    return res
      .status(500)
      .json({ error: "TMDB API key not configured in .env" });
  }
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }
  const tmdbApiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
    query
  )}&page=${page}`;
  try {
    const response = await fetch(tmdbApiUrl);
    if (!response.ok) {
      throw new Error(`TMDB API returned ${response.status}`);
    }
    const data = await response.json();
    // Change poster_path to full url
    data.results = data.results.map((movie) => {
      if (movie.poster_path) {
        movie.poster_path = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      }
      return movie;
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching TMDB movie search:", error);
    res.status(500).json({ error: "Failed to search for movies." });
  }
});

// TMDB TV search endpoint
app.get("/search/tv", async (req, res) => {
  const { query, page = 1 } = req.query;
  const tmdbApiKey = process.env.TMDB_API_KEY;

  if (!tmdbApiKey) {
    return res
      .status(500)
      .json({ error: "TMDB API key not configured in .env" });
  }
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }
  const tmdbApiUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(
    query
  )}&page=${page}`;
  try {
    const response = await fetch(tmdbApiUrl);
    if (!response.ok) {
      throw new Error(`TMDB API returned ${response.status}`);
    }
    const data = await response.json();
    // Change poster_path to full url
    data.results = data.results.map((tv) => {
      if (tv.poster_path) {
        tv.poster_path = `https://image.tmdb.org/t/p/w500${tv.poster_path}`;
      }
      return tv;
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching TMDB TV search:", error);
    res.status(500).json({ error: "Failed to search for TV shows." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
