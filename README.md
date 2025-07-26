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

To run this project in a development environment, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run the development server:**
   ```bash
   pnpm run dev
   ```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Deployment

This project can be deployed using Docker.

1. **Build the Docker image:**
   ```bash
   docker build -t movie-player .
   ```

2. **Run the Docker container:**
   ```bash
   docker run -d -p 8118:8118 --name movie-player movie-player
   ```

   The application will be accessible at `http://localhost:8118`.

### Redeployment

A `redeploy.sh` script is provided to simplify the process of stopping, removing, rebuilding, and redeploying the Docker container.

```bash
./redeploy.sh
```
