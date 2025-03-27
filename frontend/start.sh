#!/bin/sh

# Determine port
PORT=${PORT:-3000}
echo "Starting server on port: $PORT"

# Check if npm is available
if command -v npm >/dev/null 2>&1; then
    echo "Using npm to start the application"
    npm start
else
    echo "npm not found, trying node directly"
    
    # Check if node is available
    if command -v node >/dev/null 2>&1; then
        echo "Using node to run the server"
        
        # Try to find serve in various locations
        if [ -x "$(command -v serve)" ]; then
            serve -s build -l $PORT
        elif [ -d "node_modules/.bin" ] && [ -x "node_modules/.bin/serve" ]; then
            node_modules/.bin/serve -s build -l $PORT
        else
            echo "Cannot find serve. Using express fallback."
            node server.js
        fi
    else
        echo "Neither npm nor node found. Cannot start the application."
        exit 1
    fi
fi
