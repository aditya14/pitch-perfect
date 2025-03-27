"""
WSGI config for backend project.
"""

import os

from django.core.wsgi import get_wsgi_application

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Create the WSGI application
try:
    application = get_wsgi_application()
except Exception as e:
    import sys
    print(f"Error in wsgi.py: {e}", file=sys.stderr)
    raise
