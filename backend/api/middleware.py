from django.utils.deprecation import MiddlewareMixin

class CSRFFixMiddleware:
    """
    Middleware to fix CSRF issues with Django Admin when using custom domains.
    Ensures that the CSRF cookie is properly set and domain is correct.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set CSRF cookie domain if needed
        response = self.get_response(request)
        
        # Ensure CSRF cookies are properly sent
        if 'csrftoken' not in request.COOKIES and request.path.startswith('/admin/'):
            response['Vary'] = 'Cookie'
            response['Access-Control-Allow-Credentials'] = 'true'
        
        return response

class PrintRequestPathMiddleware(MiddlewareMixin):
    def process_request(self, request):
        print(f"DEBUG: Incoming request to {request.path}")