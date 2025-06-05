from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from . import admin_views
from . import user_views
from . import views_stats
from .views import match_preview, league_match_preview

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
    path('matches/<int:match_id>/standings/', views.match_standings, name='match-standings'),
    path('leagues/<int:league_id>/matches/<int:match_id>/stats/', views.match_fantasy_stats),
    path('matches/<int:match_id>/preview/', match_preview, name='match-preview'),
    path('leagues/<int:league_id>/matches/<int:match_id>/preview/', league_match_preview, name='league-match-preview'),

    # Stats endpoints
    path('leagues/<int:league_id>/stats/season-mvp/', views_stats.league_stats_season_mvp, name='league-stats-season-mvp'),
    path('leagues/<int:league_id>/stats/match-mvp/', views_stats.league_stats_match_mvp, name='league-stats-match-mvp'),
    path('leagues/<int:league_id>/stats/season-total-actives/', views_stats.league_stats_season_total_actives, name='league-stats-season-total-actives'),
    path('leagues/<int:league_id>/stats/most-players-in-match/', views_stats.league_stats_most_players_in_match, name='league-stats-most-players-in-match'),
    path('leagues/<int:league_id>/stats/most-points-in-match/', views_stats.league_stats_most_points_in_match, name='league-stats-most-points-in-match'),
    path('leagues/<int:league_id>/stats/rank-breakdown/', views_stats.league_stats_rank_breakdown, name='league-stats-rank-breakdown'),
    path('leagues/<int:league_id>/stats/domination/', views_stats.league_stats_domination, name='league-stats-domination'),
    path('leagues/<int:league_id>/stats/running-total/', views_stats.league_stats_running_total, name='league-stats-running-total'),
    path('leagues/<int:league_id>/stats/table', views_stats.league_table_stats, name='league_table_stats'),

    # Mid-season draft endpoints
    path('leagues/<int:league_id>/mid-season-draft/order/', views.mid_season_draft_order, name='mid_season_draft_order'),
    path('leagues/<int:league_id>/mid-season-draft/pool/', views.mid_season_draft_pool, name='mid_season_draft_pool'),
    path('leagues/<int:league_id>/mid-season-draft/retained-players/', views.get_retained_players, name='get_retained_players'),
    
    # Admin endpoints
    path('admin/run-fantasy-draft/', admin_views.run_fantasy_draft, name='run-fantasy-draft'),
    path('admin/run-mid-season-draft/', admin_views.run_mid_season_draft, name='run-mid-season-draft'),
    path('admin/compile-mid-season-draft-pools/', views.compile_mid_season_draft_pools, name='compile_mid_season_draft_pools'),
    path('admin/execute-mid-season-draft/<int:league_id>/', views.execute_mid_season_draft_api, name='execute_mid_season_draft'),
    path('admin/compile-mid-season-draft-pools-view/', admin_views.compile_mid_season_draft_pools_view, name='admin-compile-mid-season-draft-pools')

]