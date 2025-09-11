#!/bin/bash

# Build and deploy script for Movie Player

echo "🎬 Building Movie Player Docker Images..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example"
    echo "📝 Please edit .env file with your API keys before running the container"
    cp .env.example .env
fi

# Build the Docker images using docker-compose
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Docker images built successfully!"
    echo ""
    echo "🚀 To run the containers:"
    echo "   docker-compose up -d"
    echo ""
    echo "🌐 The application will be available at:"
    echo "   Frontend: http://localhost:8118"
    echo "   Backend API: http://localhost:3000"
    echo ""
    echo "📋 Don't forget to:"
    echo "   1. Edit .env file with your TMDB_API_KEY and OPENSUBTITLES_API_KEY"
    echo "   2. Ensure port 3000 is available"
else
    echo "❌ Docker build failed!"
    exit 1
fi
