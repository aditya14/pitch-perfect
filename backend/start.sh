#!/bin/bash

# Set environment variable to indicate we're on Railway
export RAILWAY_ENVIRONMENT=true

# Print environment for debugging (redacted for security)
echo "Running on port: $PORT"
echo "Database connection available: $(if [ -n "$DATABASE_URL" ]; then echo "YES"; else echo "NO"; fi)"

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
exec gunicorn --bind 0.0.0.0:$PORT backend.wsgi:application
