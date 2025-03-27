from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from . import admin_views
from . import user_views

router = DefaultRouter()
router.register(r'seasons', views.SeasonViewSet)
router.register(r'teams', views.IPLTeamViewSet)
router.register(r'players', views.IPLPlayerViewSet)
router.register(r'matches', views.IPLMatchViewSet, basename='match')
router.register(r'leagues', views.LeagueViewSet, basename='league')
router.register(r'squads', views.FantasySquadViewSet, basename='squad')
router.register(r'drafts', views.DraftViewSet, basename='draft')
router.register(r'trades', views.FantasyTradeViewSet, basename='trade')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify-token/', views.verify_token, name='verify-token'),
    path('register/', views.register_user, name='register'),
    path('user/', views.get_user_details, name='user-details'),
    path('user/preferences/', views.update_preferences, name='user-preferences'),
    
    # New user profile endpoints
    path('user/profile/', user_views.user_profile, name='user-profile'),
    path('user/change-password/', user_views.change_password, name='user-change-password'),
    
    path('squads/<int:squad_id>/players/', views.squad_players),
    path('squads/<int:squad_id>/player-events/', views.squad_player_events),
    path('fantasy/boost-roles/', views.fantasy_boost_roles),
    path('squads/<int:squad_id>/core-squad/', views.update_core_squad),
    path('leagues/<int:league_id>/players/<int:player_id>/', views.get_player_fantasy_stats),
    path('leagues/<int:league_id>/matches/<int:match_id>/events/', views.league_match_events),
    path('update-match-points/', views.update_match_points, name='update-match-points'),
    path('seasons/<int:season_id>/matches/recent/', views.season_recent_matches),
    path('matches/<int:match_id>/stats/', views.match_fantasy_stats),
    path('leagues/<int:league_id>/matches/<int:match_id>/stats/', views.match_fantasy_stats),
    
    # Admin endpoints
    path('admin/run-fantasy-draft/', admin_views.run_fantasy_draft, name='run-fantasy-draft'),
    
]