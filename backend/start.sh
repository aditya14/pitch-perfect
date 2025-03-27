#!/bin/bash

# Set environment variable to indicate we're on Railway
export RAILWAY_ENVIRONMENT=true

# Print environment for debugging (redacted for security)
echo "Running on port: $PORT"
echo "Database connection available: $(if [ -n "$DATABASE_URL" ]; then echo "YES"; else echo "NO"; fi)"

# Create the static directories if they don't exist
mkdir -p static
mkdir -p staticfiles

# Force remove the staticfiles directory and recreate it (to ensure clean collection)
rm -rf staticfiles
mkdir -p staticfiles

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Start Gunicorn server
echo "Starting Gunicorn server on port $PORT..."
exec gunicorn --bind 0.0.0.0:$PORT backend.wsgi:application