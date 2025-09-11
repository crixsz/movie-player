# Stream Player

A simple web application for streaming movies and TV shows using a TMDB ID. This application supports HLS streaming, subtitle search from OpenSubtitles, and local subtitle file uploads.

## Features

- **Stream Content:** Play movies and TV shows by providing their TMDB ID.
- **HLS Streaming:** Utilizes HLS.js for adaptive bitrate streaming.
- **Subtitle Support:**
  - Search for subtitles from OpenSubtitles.
  - Load subtitles directly from the OpenSubtitles API.
  - Upload and display local SRT subtitle files.
- **Responsive Design:** Built with Tailwind CSS for a responsive user experience.

## Tech Stack

- **Frontend:**
  - React
  - Vite
  - Tailwind CSS
  - HLS.js
- **Deployment:**
  - Docker

## Getting Started

### Development Setup

To run this project in a development environment, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env file with your API keys
   ```

4. **Run the backend server:**

   ```bash
   node src/backend/server.js
   ```

5. **Run the frontend development server (in another terminal):**
   ```bash
   pnpm run dev
   ```

The frontend will be available at `http://localhost:5173` and backend at `http://localhost:3000`.

## Deployment

### Docker Deployment (Recommended)

This project can be easily deployed using Docker with a multi-stage build process:

1. **Quick deployment (automated script):**

   ```bash
   # On Linux/Mac:
   ./build-deploy.sh

   # On Windows:
   build-deploy.bat
   ```

2. **Manual Docker deployment:**

   a. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env file with your API keys:
   # - TMDB_API_KEY: Get from https://www.themoviedb.org/settings/api
   # - OPENSUBTITLES_API_KEY: Get from https://www.opensubtitles.org/en/users/osapi
   ```

   b. **Build the Docker image:**

   ```bash
   docker build -t movie-player .
   ```

   c. **Run with Docker:**

   ```bash
   docker run -d -p 3000:3000 --env-file .env --name movie-player movie-player
   ```

   d. **Or use Docker Compose:**

   ```bash
   docker-compose up -d
   ```

   The application will be accessible at `http://localhost:3000`.

### Production Considerations

- The Docker image includes Chromium for Puppeteer web scraping
- The app runs on a non-root user for security
- Health checks are configured for container monitoring
- Both frontend and backend are served from the same container on port 3000
- Make sure to set proper environment variables for production deployment

### Environment Variables

Required environment variables:

- `TMDB_API_KEY`: API key for The Movie Database
- `OPENSUBTITLES_API_KEY`: API key for OpenSubtitles
- `VITE_BACKEND_URL`: Backend URL (default: http://localhost:3000)
