from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import UserProfile
from .user_serializers import UserProfileUpdateSerializer, ChangePasswordSerializer
import json

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    GET: Retrieve user profile information
    PATCH: Update user profile information
    """
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        # Return user data directly
        return Response({
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'email': request.user.email,
            'theme': profile.theme
        })
    
    elif request.method == 'PATCH':
        # Handle direct update of User model fields
        try:
            if 'first_name' in request.data:
                request.user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                request.user.last_name = request.data['last_name']
            if 'theme' in request.data:
                profile.theme = request.data['theme']
                
            request.user.save()
            profile.save()
            
            return Response({
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'email': request.user.email,
                'theme': profile.theme
            })
        except Exception as e:
            print(f"Error updating user profile: {str(e)}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'detail': 'Both current and new password are required'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    # Check if current password is correct
    if not request.user.check_password(current_password):
        return Response({'detail': 'Current password is incorrect'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    # Set new password
    request.user.set_password(new_password)
    request.user.save()
    
    return Response({'detail': 'Password changed successfully'})
