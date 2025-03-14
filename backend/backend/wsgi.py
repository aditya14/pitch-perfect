"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Check if we're on Railway (environment variable set by Railway)
if os.environ.get('RAILWAY_ENVIRONMENT'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings_railway')
    print("Using Railway settings")
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    print("Using default settings")

application = get_wsgi_application()
