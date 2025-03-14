#!/bin/bash

# Set environment variables for debugging and memory
export NODE_OPTIONS="--max-old-space-size=4096 --trace-warnings"
export CI=false
export NPM_CONFIG_LOGLEVEL=verbose

# Print Node and npm versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install dependencies with verbose logging
echo "Installing dependencies..."
npm install --verbose

# Build the app
echo "Building the app..."
npm run build || {
    echo "Build failed. Showing debug information:"
    ls -la
    exit 1
}

# Start the server
echo "Starting the server..."
npm start
