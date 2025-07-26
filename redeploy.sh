#!/bin/bash

# Define the app name
APP_NAME="link-grabber-app"

# Stop and remove the existing container
echo "Stopping and removing existing container..."
docker stop $APP_NAME
docker rm $APP_NAME

# Build the new image
echo "Building new Docker image..."
docker build -t $APP_NAME .

# Run the new container
echo "Deploying new container..."
docker run -d -p 8118:8118 --name $APP_NAME $APP_NAME

echo "Redeployment complete."
