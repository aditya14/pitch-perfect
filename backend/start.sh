#!/bin/bash

# Set environment variable to indicate we're on Railway
export RAILWAY_ENVIRONMENT=true

# Print environment for debugging
echo "PORT: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Print first 20 chars for security

# Create the static directory if it doesn't exist
mkdir -p staticfiles

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Start Gunicorn server
echo "Starting Gunicorn server on port $PORT..."
gunicorn --bind 0.0.0.0:$PORT backend.wsgi:application
