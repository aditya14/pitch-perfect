from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r'seasons', views.SeasonViewSet)
router.register(r'teams', views.IPLTeamViewSet)
router.register(r'players', views.IPLPlayerViewSet)
router.register(r'matches', views.IPLMatchViewSet, basename='match')
router.register(r'leagues', views.LeagueViewSet, basename='league')
router.register(r'squads', views.FantasySquadViewSet, basename='squad')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify-token/', views.verify_token, name='verify-token'),
    path('register/', views.register_user, name='register'),
    path('user/', views.get_user_details, name='user-details'),
]