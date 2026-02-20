from rest_framework import viewsets, filters, status, generics, permissions
from rest_framework.decorators import api_view, permission_classes, action, authentication_classes
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Competition,
    Season,
    SeasonPhase,
    DraftWindow,
    SquadPhaseBoost,
    Team,
    SeasonTeam,
    Player,
    PlayerSeasonTeam,
    Match,
    FantasyLeague,
    FantasySquad,
    UserProfile,
    FantasyDraft,
    FantasyPlayerEvent,
    FantasyBoostRole,
    PlayerMatchEvent,
    FantasyTrade,
    FantasyMatchEvent,
    DraftWindowLeagueRun,
)
from .serializers import (
    CompetitionSerializer,
    SeasonSerializer,
    SeasonPhaseSerializer,
    DraftWindowSerializer,
    IPLTeamSerializer,
    TeamSeasonSerializer,
    IPLPlayerSerializer,
    PlayerTeamHistorySerializer,
    IPLMatchSerializer,
    IPLMatchCreateUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
    CreateLeagueRequestSerializer,
    LeagueDetailSerializer,
    FantasySquadSerializer,
    CreateSquadSerializer,
    SquadDetailSerializer,
    CoreSquadUpdateSerializer,
    FantasyPlayerEventSerializer,
    IPLPlayerEventSerializer,
    FantasyTradeSerializer,
    FantasyMatchEventSerializer,
)
from .roster_serializers import PlayerRosterSerializer
from .draft_serializers import FantasyDraftSerializer, OptimizedFantasyDraftSerializer
from django.db.models import Q, Prefetch, Count, Avg, Sum
from functools import reduce
from operator import or_
from django.utils import timezone
from api.services.cricket_data_service import CricketDataService
from api.services.draft_window_service import (
    resolve_draft_window,
    get_retained_player_ids_for_squad,
    get_retained_player_map,
    build_draft_pool,
    compile_draft_window_pool,
    execute_draft_window,
    has_draft_window_run,
)
from django.core.cache import cache
from django.db.models import F, Case, When, BooleanField, Value, DecimalField, ExpressionWrapper

class SeasonViewSet(viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['competition', 'status', 'year']
    ordering_fields = ['year', 'start_date']

    def list(self, request, *args, **kwargs):
        # Debug print
        print("\n=== Season List Debug ===")
        print("Headers:", dict(request.headers))
        print("User:", request.user)
        print("Auth:", request.auth)
        print("=========================\n")
        
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """Get all matches for a specific season"""
        season = self.get_object()
        matches = Match.objects.filter(season=season).select_related(
            'team_1', 'team_2', 'winner', 'toss_winner', 'player_of_match'
        ).order_by('date', 'match_number')
        
        serializer = IPLMatchSerializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def phases(self, request, pk=None):
        """Get all phases for a specific season"""
        season = self.get_object()
        phases = SeasonPhase.objects.filter(season=season).order_by('phase')
        serializer = SeasonPhaseSerializer(phases, many=True)
        return Response(serializer.data)


class CompetitionViewSet(viewsets.ModelViewSet):
    queryset = Competition.objects.all()
    serializer_class = CompetitionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['format', 'grade']
    ordering_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class SeasonPhaseViewSet(viewsets.ModelViewSet):
    queryset = SeasonPhase.objects.all()
    serializer_class = SeasonPhaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season']
    ordering_fields = ['phase', 'start', 'open_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class DraftWindowViewSet(viewsets.ModelViewSet):
    queryset = DraftWindow.objects.all()
    serializer_class = DraftWindowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season', 'kind']
    ordering_fields = ['sequence', 'open_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class IPLTeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.filter(is_active=True)
    serializer_class = IPLTeamSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'short_name', 'city']

    @action(detail=True)
    def seasons(self, request, pk=None):
        team = self.get_object()
        seasons = SeasonTeam.objects.filter(team=team)
        serializer = TeamSeasonSerializer(seasons, many=True)
        return Response(serializer.data)

    @action(detail=True)
    def players(self, request, pk=None):
        team = self.get_object()
        season = request.query_params.get('season')
        players = PlayerSeasonTeam.objects.filter(team=team)
        if season:
            players = players.filter(season__year=season)
        serializer = PlayerTeamHistorySerializer(players, many=True)
        return Response(serializer.data)

class IPLPlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.filter(is_active=True)
    serializer_class = IPLPlayerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'nationality', 'is_active']
    search_fields = ['name', 'nationality']

    def get_queryset(self):
        # For history action, include inactive players
        if self.action == 'history':
            return Player.objects.all()
        # For other actions, keep the is_active filter
        return Player.objects.filter(is_active=True)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get historical IPL performance for a player with optimized queries"""
        try:
            player = self.get_object()
            
            # Try to get from cache first
            cache_key = f'player_history_{player.id}'
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)
            
            # Use efficient database-level aggregation for season stats
            season_stats = PlayerMatchEvent.objects.filter(
                player=player,
                match__status__in=['COMPLETED', 'NO_RESULT']
            ).values(
                'match__season__year'
            ).annotate(
                year=F('match__season__year'),
                matches=Count('id'),
                runs=Sum('bat_runs'),
                balls_faced=Sum('bat_balls'),
                wickets=Sum('bowl_wickets'),
                runs_conceded=Sum('bowl_runs'),
                balls_bowled=Sum('bowl_balls'),
                catches=Sum(
                    Case(
                        When(field_catch__isnull=False, then=F('field_catch')),
                        default=0
                    ) + 
                    Case(
                        When(wk_catch__isnull=False, then=F('wk_catch')),
                        default=0
                    )
                ),
                runouts=Sum(
                    Case(
                        When(run_out_solo__isnull=False, then=F('run_out_solo')),
                        default=0
                    ) +
                    Case(
                        When(run_out_collab__isnull=False, then=F('run_out_collab')),
                        default=0
                    )
                ),
                total_points=Sum('total_points_all')
            ).order_by('-year')
            
            # Post-process to calculate rates that are complex in pure SQL
            for stat in season_stats:
                # Calculate points per match
                stat['points_per_match'] = round(stat['total_points'] / stat['matches'], 2) if stat['matches'] > 0 else 0
                
                # Strike rate calculation
                stat['strike_rate'] = round((stat['runs'] * 100.0 / stat['balls_faced']), 2) if stat.get('balls_faced') and stat['balls_faced'] > 0 else None
                
                # Economy rate calculation (runs per over)
                if stat.get('balls_bowled') and stat['balls_bowled'] > 0:
                    overs = stat['balls_bowled'] / 6.0
                    stat['economy'] = round(stat['runs_conceded'] / overs, 2)
                else:
                    stat['economy'] = None
                    
                # Batting average
                if stat.get('matches') and stat['matches'] > 0:
                    stat['batting_average'] = round(stat['runs'] / stat['matches'], 2)
                else:
                    stat['batting_average'] = 0
            
            # Fetch match details with a single efficient query
            match_events = PlayerMatchEvent.objects.filter(
                player=player,
                match__status__in=['COMPLETED', 'NO_RESULT']
            ).select_related(
                'match', 
                'match__season', 
                'for_team', 
                'vs_team'
            ).order_by('-match__date')  # Limit to most recent 20 matches for performance
            
            # Format the match details efficiently
            match_details = []
            for event in match_events:
                match_detail = {
                    'match': {
                        'date': event.match.date,
                        'season': {'year': event.match.season.year},
                        'id': event.match.id
                    },
                    'opponent': event.vs_team.short_name,
                    'for_team': event.for_team.short_name,
                    'points': event.total_points_all
                }
                
                # Only add details if they exist
                if event.bat_runs is not None or event.bat_balls is not None:
                    match_detail['batting'] = {
                        'runs': event.bat_runs,
                        'balls': event.bat_balls,
                        'fours': event.bat_fours,
                        'sixes': event.bat_sixes,
                        'not_out': event.bat_not_out,
                        'strike_rate': event.bat_strike_rate
                    }
                    
                if event.bowl_balls is not None and event.bowl_balls > 0:
                    match_detail['bowling'] = {
                        'overs': f"{event.bowl_balls // 6}.{event.bowl_balls % 6}",
                        'maidens': event.bowl_maidens,
                        'runs': event.bowl_runs,
                        'wickets': event.bowl_wickets,
                        'economy': event.bowl_economy
                    }
                    
                if any(filter(None, [event.field_catch, event.wk_catch, 
                    event.wk_stumping, event.run_out_solo, event.run_out_collab])):
                    match_detail['fielding'] = {
                        'catches': (event.field_catch or 0) + (event.wk_catch or 0),
                        'stumpings': event.wk_stumping or 0,
                        'runouts': (event.run_out_solo or 0) + (event.run_out_collab or 0)
                    }
                    
                match_details.append(match_detail)

            # Compile final response
            response = {
                'seasonStats': list(season_stats),
                'matches': match_details
            }
            
            # Cache the response for 1 hour
            cache.set(cache_key, response, 60 * 60)
            
            return Response(response)

        except Exception as e:
            print(f"Error in get_player_history: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class IPLMatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season', 'season_phase', 'status', 'team_1', 'team_2']
    ordering_fields = ['date', 'match_number']

    def get_queryset(self):
        if self.action in ['upcoming', 'live']:
            return Match.objects.select_related(
                'team_1', 'team_2', 'season'
            ).filter(is_active=True)
        return Match.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IPLMatchCreateUpdateSerializer
        return IPLMatchSerializer

    @action(detail=False)
    def upcoming(self, request):
        matches = self.get_queryset().filter(
            status=Match.Status.SCHEDULED
        ).order_by('date')[:5]
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def live(self, request):
        matches = self.get_queryset().filter(
            status=Match.Status.LIVE
        )
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def by_season(self, request):
        season_id = request.query_params.get('season')
        phase_number = request.query_params.get('phase')
        if not season_id:
            return Response(
                {"error": "Season parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        matches = self.get_queryset().filter(season_id=season_id)
        if phase_number and phase_number.isdigit():
            matches = matches.filter(season_phase__phase=int(phase_number))
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get all player events for a specific match with optimized queries"""
        try:
            match = self.get_object()
            league_id = request.query_params.get('league_id')
            
            # Define cache key
            cache_key = f'match_events_{match.id}_{league_id or "no_league"}'
            cached_data = cache.get(cache_key)
            
            if cached_data:
                return Response(cached_data)
            
            if league_id:
                # Get fantasy events if they exist using optimized query
                fantasy_events = FantasyPlayerEvent.objects.filter(
                    match_event__match=match,
                    fantasy_squad__league_id=league_id
                ).select_related(
                    'match_event',
                    'match_event__player',
                    'match_event__for_team',
                    'fantasy_squad'
                ).prefetch_related(
                    'boost'
                )
                
                if fantasy_events.exists():
                    serializer = FantasyPlayerEventSerializer(fantasy_events, many=True)
                    data = serializer.data
                    cache.set(cache_key, data, 60 * 15)  # Cache for 15 minutes
                    return Response(data)
            
            # If no league_id or no fantasy events, return IPL events with an optimized query
            ipl_events = PlayerMatchEvent.objects.filter(
                match=match
            ).select_related(
                'player',
                'for_team'
            ).order_by('-total_points_all')  # Order by points for better UX
            
            serializer = IPLPlayerEventSerializer(ipl_events, many=True)
            data = [{**item, 'player_id': item.pop('id')} for item in serializer.data]
            cache.set(cache_key, data, 60 * 15)  # Cache for 15 minutes
            return Response(data)
                
        except Exception as e:
            print(f"Error in match events: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_match_events(request, league_id, match_id):
    """Get all player events for a specific match in a league context"""
    try:
        # First check if any fantasy events exist
        fantasy_events = FantasyPlayerEvent.objects.filter(
            match_event__match_id=match_id,
            fantasy_squad__league_id=league_id
        ).select_related(
            'match_event',
            'match_event__player',
            'match_event__for_team',
            'fantasy_squad'
        )
        
        if fantasy_events.exists():
            serializer = FantasyPlayerEventSerializer(fantasy_events, many=True)
            # print("Fantasy events found", serializer.data)
            return Response(serializer.data)
        
        # If no fantasy events, return IPL events
        ipl_events = PlayerMatchEvent.objects.filter(
            match_id=match_id
        ).select_related(
            'player',
            'for_team'
        )
        
        serializer = IPLPlayerEventSerializer(ipl_events, many=True)
        return Response(serializer.data)
            
    except Exception as e:
        print(f"Error in league match events: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = authenticate(email=email, password=password)
    
    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email
            }
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

User = get_user_model()

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    try:
        # Debug prints
        print("\n=== User Details Debug ===")
        print("Headers:", dict(request.headers))
        print("META:", {k: v for k, v in request.META.items() if k.startswith('HTTP_')})
        print("User:", request.user)
        print("User is authenticated:", request.user.is_authenticated)
        print("Auth:", request.auth)
        print("=========================\n")

        if not request.user.is_authenticated:
            return Response(
                {"detail": "Not authenticated"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    except Exception as e:
        print(f"Error in get_user_details: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to fetch user details: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    try:
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            # Debug prints
            print(f"Created user: {user.id} - {user.email}")
            print(f"Generated token: {access_token[:20]}...")
            
            response_data = {
                'user': {
                    'id': user.id,
                    'email': user.email,
                },
                'tokens': {
                    'access': access_token,
                    'refresh': str(refresh),
                }
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_token(request):
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': 'No Authorization header'}, status=400)
            
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return Response({'error': 'Invalid Authorization header format'}, status=400)
            
        token = parts[1]
        # Add your token verification logic here
        
        return Response({'message': 'Token is valid', 'token': token})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_preferences(request):
    """Update user preferences including theme"""
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if 'theme' in request.data:
        profile.theme = request.data['theme']
        profile.save()
    
    return Response({'theme': profile.theme})

# Update your get_user_details view to include theme
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        'id': request.user.id,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'is_staff': request.user.is_staff,
        'is_superuser': request.user.is_superuser,
        'profile': {
            'theme': profile.theme
        }
    })  

class LeagueAccessPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Allow if user is league admin or has a squad in the league
        return (obj.admin == request.user or 
                obj.teams.filter(user=request.user).exists())

class LeagueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, LeagueAccessPermission]
    authentication_classes = [JWTAuthentication]
    filterset_fields = ['season']
    search_fields = ['name']
    pagination_class = None
    
    def get_queryset(self):
        # For list actions, only show leagues user is part of
        if self.action == 'list':
            return FantasyLeague.objects.filter(
                teams__user=self.request.user
            ).distinct()
            
        # For other actions (including retrieve), allow access to leagues where user is admin or has a team
        return FantasyLeague.objects.filter(
            Q(teams__user=self.request.user) | Q(admin=self.request.user)
        ).distinct().select_related('season').prefetch_related('teams', 'teams__user')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateLeagueRequestSerializer
        return LeagueDetailSerializer

    def perform_create(self, serializer):
        serializer.save(admin=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Annotate my_squad directly on the instance
        instance.my_squad = instance.teams.filter(user=request.user).first()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_leagues(self, request):
        leagues = FantasyLeague.objects.filter(
            Q(teams__user=request.user) | Q(admin=request.user)
        ).select_related('season').prefetch_related('teams').distinct()
        serializer = LeagueDetailSerializer(leagues, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def join(self, request):
        """Join a league using league code"""
        league_code = request.data.get('league_code')
        if not league_code:
            return Response(
                {'error': 'League code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            league = FantasyLeague.objects.get(league_code=league_code)
            
            # Check if user already in league
            if FantasySquad.objects.filter(league=league, user=request.user).exists():
                return Response(
                    {'error': 'You are already in this league'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if league is full
            if league.teams.count() >= league.max_teams:
                return Response(
                    {'error': 'League is full'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            return Response({
                'league': LeagueDetailSerializer(league, context={'request': request}).data
            })
            
        except FantasyLeague.DoesNotExist:
            return Response(
                {'error': 'Invalid league code'},
                status=status.HTTP_404_NOT_FOUND
            )
        
    @action(detail=True, methods=['get'])
    def players(self, request, pk=None):
        import time
        from django.core.cache import cache

        """Get all players eligible for drafting in a league with optimized queries and caching"""
        start_time = time.time()
        
        try:
            league = self.get_object()
            season = league.season
            season_id = request.query_params.get('season')
            if season_id:
                season = Season.objects.filter(id=season_id).first()
                if not season:
                    return Response(
                        {'error': 'Season not found'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            if not season:
                return Response([])
            
            # Check cache first
            cache_key = f'league_players_{league.id}_{season.id}'
            use_cache = request.query_params.get('no_cache', '0') != '1'
            
            if use_cache:
                cached_data = cache.get(cache_key)
                if cached_data:
                    print(f"Cache hit for {cache_key}")
                    return Response(cached_data)
                print(f"Cache miss for {cache_key}")
            
            # Get the last 4 seasons (including current)
            current_year = season.year
            past_seasons = list(range(current_year - 4, current_year + 1))
            print(f"Analyzing seasons: {past_seasons}")
            
            # 1. Get player_ids who are in the current season
            player_ids = list(
                PlayerSeasonTeam.objects.filter(
                    season=season
                ).values_list('player_id', flat=True).distinct()
            )
            players = Player.objects.filter(id__in=player_ids)
            print(f"Found {len(player_ids)} players in current season")
            
            # 2. Efficiently get player stats by season with a single query
            from django.db.models import Case, When, BooleanField, Value, DecimalField, ExpressionWrapper
            
            # Create a combined stats query with window functions
            player_stats = PlayerMatchEvent.objects.filter(
                player_id__in=player_ids,
                match__season__year__in=past_seasons
            ).values(
                'player_id', 
                'match__season__year'
            ).annotate(
                matches=Count('id'),
                points=Sum('total_points_all'),
                avg_points=ExpressionWrapper(
                    Sum('total_points_all') * 1.0 / Count('id'), 
                    output_field=DecimalField()
                ),
                has_qualifying_season=Case(
                    When(matches__gte=4, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField()
                )
            ).order_by('player_id', 'match__season__year')
            
            # 3. Organize data by player
            player_data = {}
            for player_id in player_ids:
                player_data[player_id] = {
                    'id': player_id,
                    'total_matches': 0,
                    'total_points': 0,
                    'has_qualifying_season': False,
                    'seasons': {},
                    'avg_points': 0
                }
            
            # 4. Process stats
            for stat in player_stats:
                player_id = stat['player_id']
                year = stat['match__season__year']
                
                # Add season data
                player_data[player_id]['seasons'][year] = {
                    'matches': stat['matches'],
                    'points': stat['points'],
                    'avg_points': stat['avg_points']
                }
                
                # Update totals
                player_data[player_id]['total_matches'] += stat['matches']
                player_data[player_id]['total_points'] += stat['points']
                
                # Check qualifying status
                if stat['has_qualifying_season']:
                    player_data[player_id]['has_qualifying_season'] = True
            
            # 5. Get player details and team info
            player_details = {
                p.id: {
                    'name': p.name,
                    'role': p.role
                } for p in players
            }
            
            # Get current season mapping for each player in a single query
            season_mappings = PlayerSeasonTeam.objects.filter(
                player_id__in=player_ids,
                season=season
            ).select_related('team', 'replacement').values(
                'player_id',
                'team__short_name',
                'ruled_out',
                'replacement_id',
                'replacement__name',
            )

            season_mapping_dict = {mapping['player_id']: mapping for mapping in season_mappings}
            
            # 6. Calculate average points and prepare final data
            complete_data = []
            for player_id, data in player_data.items():
                # Calculate average
                if data['total_matches'] > 0:
                    data['avg_points'] = data['total_points'] / data['total_matches']
                
                # Add player details
                data.update(player_details.get(player_id, {'name': 'Unknown', 'role': None}))
                
                # Add team info
                mapping = season_mapping_dict.get(player_id, {})
                data['team'] = mapping.get('team__short_name')
                data['ruled_out'] = bool(mapping.get('ruled_out'))
                data['replacement'] = (
                    {
                        'id': mapping.get('replacement_id'),
                        'name': mapping.get('replacement__name'),
                    }
                    if mapping.get('replacement_id')
                    else None
                )
                
                complete_data.append(data)
            
            # 7. Sort players
            sorted_players = sorted(
                complete_data,
                key=lambda p: (p['has_qualifying_season'], p['avg_points']),
                reverse=True
            )
            
            # 8. Add rank and prepare response
            response_data = []
            for idx, player in enumerate(sorted_players):
                response_data.append({
                    'id': player['id'],
                    'name': player['name'],
                    'role': player['role'],
                    'team': player['team'],
                    'ruled_out': player['ruled_out'],
                    'replacement': player['replacement'],
                    'matches': player['total_matches'],
                    'avg_points': round(player['avg_points'], 2) if player['avg_points'] else 0,
                    'rank': idx + 1,
                    'fantasy_squad': None,
                    'draft_position': None
                })
            
            # 9. Cache the result (30 minutes)
            if use_cache:
                cache.set(cache_key, response_data, 30 * 60)
            
            total_time = time.time() - start_time
            print(f"Players endpoint completed in {total_time:.2f} seconds")
            
            return Response(response_data)

        except Exception as e:
            import traceback
            print(f"Error in players view: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=True, methods=['get'], url_path='players/(?P<player_id>[^/.]+)/performance')
    def player_performance(self, request, pk=None, player_id=None):
        """Get fantasy stats for a player in this league"""
        try:
            league = self.get_object()
            player = get_object_or_404(Player, id=player_id)
            
            # Get all fantasy events for this player in this league
            events = FantasyPlayerEvent.objects.filter(
                match_event__player=player,
                fantasy_squad__league=league
            ).select_related(
                'match_event',
                'match_event__match',
                'fantasy_squad',
                'match_event__player',
                'match_event__match__team_1',
                'match_event__match__team_2'
            ).order_by('-match_event__match__date')

            # Calculate season stats per squad
            squad_stats = {}
            match_details = []

            for event in events:
                # Update squad stats
                squad_id = event.fantasy_squad_id
                if squad_id not in squad_stats:
                    squad_stats[squad_id] = {
                        'squad': event.fantasy_squad.name,
                        'squad_color': event.fantasy_squad.color,
                        'matches': 0,
                        'basePoints': 0,
                        'boostPoints': 0,
                        'totalPoints': 0
                    }
                
                match_event = event.match_event
                base_points = match_event.total_points_all
                boost_points = event.boost_points  # UPDATED: Use boost_points directly

                stats = squad_stats[squad_id]
                stats['matches'] += 1
                stats['basePoints'] += base_points
                stats['boostPoints'] += boost_points
                stats['totalPoints'] += (base_points + boost_points)

                # Add match detail
                match_detail = {
                    'match': {
                        'id': match_event.match.id,
                        'date': match_event.match.date,
                    },
                    'opponent': match_event.match.team_2.short_name if match_event.match.team_1 == match_event.for_team else match_event.match.team_1.short_name,
                    'squad': event.fantasy_squad.name,
                    'squad_color': event.fantasy_squad.color,
                    'basePoints': base_points,
                    'boostPoints': boost_points,
                    'boost_label': event.boost.label if event.boost else None,
                    'totalPoints': base_points + boost_points,
                    'player_of_match': match_event.player_of_match,
                }

                # Add batting details if exists
                if match_event.bat_runs or match_event.bat_balls:
                    match_detail['batting'] = {
                        'runs': match_event.bat_runs,
                        'balls': match_event.bat_balls,
                        'fours': match_event.bat_fours,
                        'sixes': match_event.bat_sixes,
                        'not_out': match_event.bat_not_out,
                        'strike_rate': match_event.bat_strike_rate,
                        'points': match_event.batting_points_total
                    }

                # Add bowling details if exists
                if match_event.bowl_balls:
                    match_detail['bowling'] = {
                        'overs': f"{match_event.bowl_balls // 6}.{match_event.bowl_balls % 6}",
                        'maidens': match_event.bowl_maidens,
                        'runs': match_event.bowl_runs,
                        'wickets': match_event.bowl_wickets,
                        'economy': match_event.bowl_economy,
                        'points': match_event.bowling_points_total
                    }

                # Add fielding details if exists
                if (match_event.field_catch or match_event.wk_catch or 
                    match_event.wk_stumping or match_event.run_out_solo):
                    match_detail['fielding'] = {
                        'catches': (match_event.field_catch or 0) + (match_event.wk_catch or 0),
                        'stumpings': match_event.wk_stumping,
                        'runouts': (match_event.run_out_solo or 0) + (match_event.run_out_collab or 0),
                        'points': match_event.fielding_points_total
                    }

                match_details.append(match_detail)

            # Calculate overall stats
            overall_stats = {
                'squad': 'Overall',
                'matches': sum(s['matches'] for s in squad_stats.values()),
                'basePoints': sum(s['basePoints'] for s in squad_stats.values()),
                'boostPoints': sum(s['boostPoints'] for s in squad_stats.values()),
                'totalPoints': sum(s['totalPoints'] for s in squad_stats.values())
            }

            # Calculate averages for each squad
            for stats in squad_stats.values():
                stats['average'] = stats['totalPoints'] / stats['matches'] if stats['matches'] > 0 else 0

            overall_stats['average'] = overall_stats['totalPoints'] / overall_stats['matches'] if overall_stats['matches'] > 0 else 0

            # Get current team info
            current_team = player.playerseasonteam_set.filter(
                season=league.season
            ).select_related('team').first()

            response_data = {
                'id': player.id,
                'name': player.name,
                'team': current_team.team.name if current_team else None,
                'seasonStats': list(squad_stats.values()) + [overall_stats],
                'matches': match_details
            }

            return Response(response_data)

        except Exception as e:
            print(f"Error in player_performance: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    

    @action(detail=True, methods=['get'])
    def squads(self, request, pk=None):
        from django.core.cache import cache
        import time
        """Get all squads in a league with their players and draft data with optimized performance""" 
        start_time = time.time()
        
        try:
            league = self.get_object()
            
            # Check cache first
            cache_key = f'league_squads_v3_{league.id}'
            use_cache = request.query_params.get('no_cache', '0') != '1'
            
            if use_cache:
                cached_data = cache.get(cache_key)
                if cached_data:
                    print(f"Cache hit for {cache_key}")
                    return Response(cached_data)
                print(f"Cache miss for {cache_key}")
            
            # 1. Efficiently get all squads in a single query with needed relations
            squads = FantasySquad.objects.filter(
                league=league
            ).select_related(
                'user'
            ).prefetch_related(
                'user__profile'
            )
            print(f"Found {squads.count()} squads")
            
            # 2. Only expose completed draft windows in squad views.
            # Mid-season drafts must come from executed windows; ongoing windows stay hidden.
            completed_window_ids = set(
                DraftWindowLeagueRun.objects.filter(
                    league=league,
                    dry_run=False,
                ).values_list('draft_window_id', flat=True)
            )
            completed_pre_window_id = DraftWindow.objects.filter(
                season=league.season,
                kind=DraftWindow.Kind.PRE_SEASON,
                id__in=completed_window_ids,
            ).order_by('-sequence').values_list('id', flat=True).first()
            completed_mid_window_id = DraftWindow.objects.filter(
                season=league.season,
                kind=DraftWindow.Kind.MID_SEASON,
                id__in=completed_window_ids,
            ).order_by('-sequence').values_list('id', flat=True).first()

            completed_run_by_window_id = {}
            run_window_ids = [wid for wid in [completed_pre_window_id, completed_mid_window_id] if wid]
            if run_window_ids:
                run_rows = DraftWindowLeagueRun.objects.filter(
                    league=league,
                    dry_run=False,
                    draft_window_id__in=run_window_ids,
                ).values('draft_window_id', 'result_payload')
                completed_run_by_window_id = {
                    row['draft_window_id']: row.get('result_payload') or {}
                    for row in run_rows
                }

            def _post_draft_player_ids(window_id, squad_id):
                payload = completed_run_by_window_id.get(window_id) or {}
                if not isinstance(payload, dict):
                    return []
                snapshots = payload.get('squad_snapshots')
                if not isinstance(snapshots, dict):
                    return []

                snapshot = snapshots.get(str(squad_id))
                if snapshot is None:
                    snapshot = snapshots.get(squad_id)
                if not isinstance(snapshot, dict):
                    return []

                raw_ids = snapshot.get('post_draft_player_ids')
                if not isinstance(raw_ids, list):
                    return []

                normalized_ids = []
                seen_ids = set()
                for raw_id in raw_ids:
                    try:
                        player_id = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    if player_id in seen_ids:
                        continue
                    normalized_ids.append(player_id)
                    seen_ids.add(player_id)
                return normalized_ids

            now_ts = timezone.now()

            pre_season_drafts_qs = FantasyDraft.objects.filter(
                league=league,
                type='Pre-Season',
            )
            if completed_pre_window_id:
                pre_season_drafts_qs = pre_season_drafts_qs.filter(
                    draft_window_id=completed_pre_window_id
                )
            elif league.draft_completed:
                # Legacy pre-season fallback for leagues that pre-date DraftWindow runs.
                pre_season_drafts_qs = pre_season_drafts_qs.filter(
                    Q(draft_window__isnull=True) |
                    Q(
                        draft_window__kind=DraftWindow.Kind.PRE_SEASON,
                        draft_window__lock_at__lte=now_ts,
                    )
                )
            else:
                pre_season_drafts_qs = pre_season_drafts_qs.none()

            mid_season_drafts_qs = FantasyDraft.objects.filter(
                league=league,
                type='Mid-Season',
            )
            if completed_mid_window_id:
                mid_season_drafts_qs = mid_season_drafts_qs.filter(
                    draft_window_id=completed_mid_window_id
                )
            else:
                mid_season_drafts_qs = mid_season_drafts_qs.none()

            pre_season_drafts = pre_season_drafts_qs.select_related('squad').values('squad_id', 'order', 'role')
            mid_season_drafts = mid_season_drafts_qs.select_related('squad').values('squad_id', 'order', 'role')
            
            # Convert to dicts for faster lookups
            role_keys = [
                FantasyDraft.Role.BAT,
                FantasyDraft.Role.WK,
                FantasyDraft.Role.ALL,
                FantasyDraft.Role.BOWL,
            ]

            pre_season_rankings = {}
            pre_season_rankings_by_role = {}
            for draft_data in pre_season_drafts:
                squad_id = draft_data['squad_id']
                role = draft_data.get('role')
                if squad_id not in pre_season_rankings_by_role:
                    pre_season_rankings_by_role[squad_id] = {key: [] for key in role_keys}

                if role in role_keys:
                    pre_season_rankings_by_role[squad_id][role] = draft_data['order']

                # Prefer explicit BAT rankings when both legacy (null role) and role-based rows exist.
                if role == FantasyDraft.Role.BAT or squad_id not in pre_season_rankings:
                    pre_season_rankings[squad_id] = draft_data['order']

            for squad_id, ranking in pre_season_rankings.items():
                if squad_id not in pre_season_rankings_by_role:
                    pre_season_rankings_by_role[squad_id] = {key: [] for key in role_keys}
                if not pre_season_rankings_by_role[squad_id][FantasyDraft.Role.BAT]:
                    pre_season_rankings_by_role[squad_id][FantasyDraft.Role.BAT] = ranking

            mid_season_rankings = {}
            mid_season_rankings_by_role = {}
            for draft_data in mid_season_drafts:
                squad_id = draft_data['squad_id']
                role = draft_data.get('role')

                if squad_id not in mid_season_rankings:
                    mid_season_rankings[squad_id] = draft_data['order']

                if squad_id not in mid_season_rankings_by_role:
                    mid_season_rankings_by_role[squad_id] = {key: [] for key in role_keys}
                if role in role_keys:
                    mid_season_rankings_by_role[squad_id][role] = draft_data['order']
            
            print(f"Found pre-season draft data for {len(pre_season_rankings)} squads")
            print(f"Found mid-season draft data for {len(mid_season_rankings)} squads")
            
            # 3. Get all player IDs that we need to process
            # This includes current squad members and historical players
            all_squad_player_ids = set()
            squad_dict = {}
            
            for squad in squads:
                # Initialize squad info
                squad_dict[squad.id] = {
                    'id': squad.id,
                    'name': squad.name,
                    'color': squad.color,
                    'user_id': squad.user.id,
                    'user_name': squad.user.username,
                    'total_points': float(squad.total_points),
                      'current_core_squad': squad.current_core_squad or {},
                      'draft_ranking': pre_season_rankings.get(squad.id, []),
                      'pre_season_rankings_by_role': pre_season_rankings_by_role.get(
                          squad.id,
                          {key: [] for key in role_keys}
                      ),
                      'mid_season_draft_ranking': mid_season_rankings.get(squad.id, []),
                      'mid_season_rankings_by_role': mid_season_rankings_by_role.get(
                          squad.id,
                          {key: [] for key in role_keys}
                      ),
                      'pre_season_post_draft_player_ids': _post_draft_player_ids(
                          completed_pre_window_id,
                          squad.id,
                      ),
                      'mid_season_post_draft_player_ids': _post_draft_player_ids(
                          completed_mid_window_id,
                          squad.id,
                      ),
                      'current_player_ids': set(squad.current_squad or []),
                      'all_player_ids': set(squad.current_squad or [])
                  }
                
                # Add current squad player IDs to the set
                all_squad_player_ids.update(squad.current_squad or [])
            
            # 4. Get all historical players (from fantasy events) in a single query
            historical_player_data = FantasyPlayerEvent.objects.filter(
                fantasy_squad__league=league
            ).values(
                'fantasy_squad_id', 
                'match_event__player_id'
            ).distinct()
            
            # Update squads with historical player IDs
            for data in historical_player_data:
                squad_id = data['fantasy_squad_id']
                player_id = data['match_event__player_id']
                
                if squad_id in squad_dict:
                    squad_dict[squad_id]['all_player_ids'].add(player_id)
                    all_squad_player_ids.add(player_id)
            
            # 5. Get all player details and season mappings in single queries
            players = Player.objects.filter(id__in=all_squad_player_ids)
            season_player_mappings = {
                mapping.player_id: mapping
                for mapping in PlayerSeasonTeam.objects.filter(
                    player_id__in=all_squad_player_ids,
                    season=league.season
                ).select_related('team', 'replacement')
            }
            
            # Create a player lookup dictionary
            player_dict = {}
            for player in players:
                current_team = season_player_mappings.get(player.id)
                
                player_dict[player.id] = {
                    'id': player.id,
                    'name': player.name,
                    'role': player.role,
                    'team_code': current_team.team.short_name if current_team else None,
                    'team_color': current_team.team.primary_color if current_team else None,
                    'ruled_out': bool(current_team.ruled_out) if current_team else False,
                    'replacement': (
                        {
                            'id': current_team.replacement_id,
                            'name': current_team.replacement.name,
                        }
                        if current_team and current_team.replacement_id
                        else None
                    ),
                }
            
            # 6. Calculate average draft ranks for both draft types
            pre_season_player_rankings = {}
            mid_season_player_rankings = {}
            
            # Pre-season
            for squad_id, rankings in pre_season_rankings.items():
                for rank, player_id in enumerate(rankings):
                    if player_id not in pre_season_player_rankings:
                        pre_season_player_rankings[player_id] = []
                    
                    # Add the 1-indexed rank to the player's rankings
                    pre_season_player_rankings[player_id].append(rank + 1)
            
            # Mid-season
            for squad_id, rankings in mid_season_rankings.items():
                # Calculate retained players for each squad
                retained_player_ids = []
                if squad_id in squad_dict and squad_dict[squad_id]['current_core_squad']:
                    retained_player_ids = [
                        boost['player_id'] 
                        for boost in squad_dict[squad_id]['current_core_squad'] 
                        if 'player_id' in boost
                    ]
                
                # Only include non-retained players in rank calculations
                for rank, player_id in enumerate(rankings):
                    if player_id in retained_player_ids:
                        continue  # Skip retained players
                        
                    if player_id not in mid_season_player_rankings:
                        mid_season_player_rankings[player_id] = []
                    
                    # Add the 1-indexed rank to the player's rankings
                    mid_season_player_rankings[player_id].append(rank + 1)
            
            # Calculate average ranks
            pre_season_avg_ranks = {}
            for player_id, ranks in pre_season_player_rankings.items():
                if ranks:
                    pre_season_avg_ranks[player_id] = round(sum(ranks) / len(ranks), 2)
            
            mid_season_avg_ranks = {}
            for player_id, ranks in mid_season_player_rankings.items():
                if ranks:
                    mid_season_avg_ranks[player_id] = round(sum(ranks) / len(ranks), 2)
            
            # 7. Build the final response data
            squad_data = []
            for squad_id, squad_info in squad_dict.items():
                players_list = []
                for player_id in squad_info['all_player_ids']:
                    if player_id in player_dict:
                        player_info = player_dict[player_id].copy()
                        # Add status (current or traded)
                        player_info['status'] = 'current' if player_id in squad_info['current_player_ids'] else 'traded'
                        players_list.append(player_info)
                
                # Add player list to squad data
                squad_info['players'] = players_list
                
                # Remove temporary fields used for processing
                del squad_info['current_player_ids']
                del squad_info['all_player_ids']
                
                squad_data.append(squad_info)
            
            # 8. Prepare the final response
            response_data = {
                'squads': squad_data,
                'avg_draft_ranks': pre_season_avg_ranks,
                'avg_mid_season_draft_ranks': mid_season_avg_ranks
            }
            
            # 9. Cache the result (15 minutes)
            if use_cache:
                cache.set(cache_key, response_data, 15 * 60)
            
            total_time = time.time() - start_time
            print(f"Squads endpoint completed in {total_time:.2f} seconds")
            
            return Response(response_data)
        
        except Exception as e:
            import traceback
            print(f"Error in league squads view: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class FantasySquadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # For modifications, only allow own squads
            return FantasySquad.objects.filter(user=self.request.user)
        
        # For viewing (list/retrieve), allow viewing of all squads in leagues where user has a team
        return FantasySquad.objects.filter(
            league__teams__user=self.request.user
        ).distinct()

    def get_serializer_class(self):
        if self.action in ['create', 'update']:
            return CreateSquadSerializer
        return SquadDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DraftViewSet(viewsets.ModelViewSet):
    # Instead of a fixed serializer_class, use get_serializer_class method
    # serializer_class = FantasyDraftSerializer  # Remove/comment this line
    
    def get_queryset(self):
        return FantasyDraft.objects.filter(
            squad__user=self.request.user
        ).select_related('league', 'league__season', 'squad', 'draft_window')

    # Add this method to return the appropriate serializer
    def get_serializer_class(self):
        # Use optimized serializer for GET requests
        if self.request and self.request.method == 'GET':
            return OptimizedFantasyDraftSerializer
        # Use standard serializer for other methods (POST, PATCH, etc.)
        return FantasyDraftSerializer

    def _build_preseason_default_order(self, league, role):
        season_player_ids = list(
            PlayerSeasonTeam.objects.filter(
                season=league.season,
                player__role=role,
            ).values_list('player_id', flat=True).distinct()
        )
        season_player_set = set(season_player_ids)

        configured_default = []
        configured_default_set = set()
        default_payload = league.season.default_draft_order if league.season else []
        if isinstance(default_payload, list):
            raw_default_ids = []
            role_matched = False
            for item in default_payload:
                if isinstance(item, dict):
                    item_role = str(item.get('role', '')).upper()
                    if item_role == role:
                        role_matched = True
                        if isinstance(item.get('order'), list):
                            raw_default_ids.extend(item['order'])
                elif not role_matched:
                    # Backward compatible support for legacy flat default order lists.
                    raw_default_ids.append(item)

            for raw_player_id in raw_default_ids:
                try:
                    player_id = int(raw_player_id)
                except (TypeError, ValueError):
                    continue
                if player_id in season_player_set and player_id not in configured_default_set:
                    configured_default.append(player_id)
                    configured_default_set.add(player_id)

        if configured_default:
            default_order = configured_default + [
                player_id for player_id in season_player_ids if player_id not in configured_default_set
            ]
        else:
            ranked_players = Player.objects.filter(
                id__in=season_player_ids,
                role=role,
            ).annotate(
                matches=Count('playermatchevent', filter=Q(playermatchevent__match__season=league.season)),
                avg_points=Avg('playermatchevent__total_points_all', filter=Q(playermatchevent__match__season=league.season)),
            ).order_by('-avg_points', 'name')
            ranked_ids = list(ranked_players.values_list('id', flat=True))
            ranked_set = set(ranked_ids)
            default_order = ranked_ids + [player_id for player_id in season_player_ids if player_id not in ranked_set]

        return default_order, season_player_set

    def _normalize_preseason_order(self, existing_order, season_player_set, default_order):
        existing_order = existing_order if isinstance(existing_order, list) else []
        normalized_existing = []
        seen_existing = set()
        for raw_player_id in existing_order:
            try:
                player_id = int(raw_player_id)
            except (TypeError, ValueError):
                continue
            if player_id in season_player_set and player_id not in seen_existing:
                normalized_existing.append(player_id)
                seen_existing.add(player_id)

        return normalized_existing + [
            player_id for player_id in default_order if player_id not in seen_existing
        ]

    @action(detail=False, methods=['get'])
    def get_draft_order(self, request):
        league_id = request.query_params.get('league_id')
        if not league_id:
            return Response(
                {"error": "league_id required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            league = FantasyLeague.objects.get(id=league_id)
            squad = FantasySquad.objects.get(league=league, user=request.user)
        except FantasyLeague.DoesNotExist:
            return Response(
                {"error": "League not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except FantasySquad.DoesNotExist:
            return Response(
                {"error": "You don't have a squad in this league"},
                status=status.HTTP_404_NOT_FOUND
            )

        requested_role = (request.query_params.get('role') or FantasyDraft.Role.BAT).upper()
        valid_roles = {choice[0] for choice in FantasyDraft.Role.choices}
        if requested_role not in valid_roles:
            return Response(
                {"error": f"Invalid role '{requested_role}'. Expected one of: {', '.join(sorted(valid_roles))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        draft_window = None
        draft_window_id = request.query_params.get('draft_window')
        try:
            draft_window = resolve_draft_window(
                league,
                draft_window_id=int(draft_window_id) if draft_window_id else None,
                kind=DraftWindow.Kind.PRE_SEASON
            )
        except Exception:
            # Fallback to legacy behavior when no pre-season window is configured.
            draft_window = None

        draft_qs = FantasyDraft.objects.filter(
            league=league,
            squad=squad,
            type='Pre-Season',
            role=requested_role,
        )

        if draft_window:
            draft = draft_qs.filter(draft_window=draft_window).first()
        else:
            draft = draft_qs.first()

        default_order, season_player_set = self._build_preseason_default_order(league, requested_role)

        if not draft:
            draft = FantasyDraft.objects.create(
                league=league,
                squad=squad,
                draft_window=draft_window,
                type='Pre-Season',
                role=requested_role,
                order=default_order,
            )
        else:
            normalized_order = self._normalize_preseason_order(draft.order, season_player_set, default_order)
            if normalized_order != draft.order:
                draft.order = normalized_order
                draft.save(update_fields=['order'])

        serializer = FantasyDraftSerializer(draft)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_order(self, request, pk=None):
        draft = self.get_object()

        now = timezone.now()
        if draft.draft_window:
            if not (draft.draft_window.open_at <= now <= draft.draft_window.lock_at):
                return Response(
                    {"error": "Draft window is closed"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif not draft.league.season or (draft.league.season.start_date - now.date()).days < 2:
            return Response(
                {"error": "Draft editing is closed"},
                status=status.HTTP_400_BAD_REQUEST
            )
             
        serializer = self.get_serializer(
            draft, 
            data={"order": request.data.get("order")},
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(['GET'])
def squad_players(request, squad_id):
    """Get all players in a squad with their details, including historical players"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    
    # Get players in current squad
    current_players = set(squad.current_squad or [])
    
    # Get all players who have fantasy events for this squad (historical players)
    historical_player_ids = set(FantasyPlayerEvent.objects.filter(
        fantasy_squad_id=squad_id
    ).values_list('match_event__player_id', flat=True).distinct())
    
    # Combine both sets to get all players we need to fetch
    all_player_ids = current_players.union(historical_player_ids)

    season = squad.league.season
    season_player_mappings = {}
    if season:
        season_player_mappings = {
            mapping.player_id: mapping
            for mapping in PlayerSeasonTeam.objects.filter(
                season=season,
                player_id__in=all_player_ids
            ).select_related('replacement')
        }
    
    # Get full player data
    players = Player.objects.filter(id__in=all_player_ids)
    
    # Create a custom response with player status (current or traded)
    response_data = []
    for player in players:
        is_current = player.id in current_players
        player_data = IPLPlayerSerializer(player).data
        season_mapping = season_player_mappings.get(player.id)
        player_data['status'] = 'current' if is_current else 'traded'
        player_data['ruled_out'] = bool(season_mapping.ruled_out) if season_mapping else False
        player_data['replacement'] = (
            {
                'id': season_mapping.replacement_id,
                'name': season_mapping.replacement.name
            }
            if season_mapping and season_mapping.replacement_id
            else None
        )
        response_data.append(player_data)
    
    return Response(response_data)

@api_view(['GET'])
def squad_player_events(request, squad_id):
    """Get aggregated fantasy player events/stats for this squad including traded players"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    
    # Get all unique player IDs that have ever had an event for this squad
    player_ids_with_events = FantasyPlayerEvent.objects.filter(
        fantasy_squad_id=squad_id
    ).values_list('match_event__player_id', flat=True).distinct()
    
    # Add current squad players to ensure we include everyone
    all_player_ids = set(list(player_ids_with_events) + (squad.current_squad or []))
    
    # Initialize stats for all players in current and historical squad
    stats_dict = {
        player_id: {
            'player_id': player_id,
            'matches_played': 0,
            'base_points': 0,
            'boost_points': 0
        }
        for player_id in all_player_ids
    }
    
    # Get any existing event stats (if they exist)
    stats = FantasyPlayerEvent.objects.filter(
        fantasy_squad_id=squad_id,
        match_event__player_id__in=all_player_ids
    ).values('match_event__player_id').annotate(
        matches_played=Count('match_event__match', distinct=True),
        base_points=Sum('match_event__total_points_all'),
        boost_points=Sum('boost_points')
    )
    
    # Update stats for players that have events
    for stat in stats:
        player_id = stat['match_event__player_id']
        if player_id in stats_dict:  # This check is just a safeguard
            stats_dict[player_id].update({
                'matches_played': stat['matches_played'],
                'base_points': float(stat['base_points']) if stat['base_points'] else 0,
                'boost_points': float(stat['boost_points']) if stat['boost_points'] else 0
            })
    
    return Response(stats_dict)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def squad_phase_boosts(request, squad_id):
    """Get phase boosts for a squad along with season phases."""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    season = squad.league.season
    if not season:
        return Response({'error': 'Squad has no season set'}, status=status.HTTP_400_BAD_REQUEST)

    phases = SeasonPhase.objects.filter(season=season).order_by('phase')
    phase_ids = list(phases.values_list('id', flat=True))
    # For a squad owner, when a phase is ongoing, pre-create the next phase
    # assignments by carrying over the current phase assignments.
    if squad.user_id == request.user.id and phases.exists():
        now = timezone.now()
        current_phase = None
        for phase in phases:
            if phase.start <= now <= phase.end:
                current_phase = phase
                break

        if current_phase:
            next_phase = phases.filter(phase__gt=current_phase.phase).order_by('phase').first()
            if next_phase:
                next_boost, created = SquadPhaseBoost.objects.get_or_create(
                    fantasy_squad=squad,
                    phase=next_phase,
                    defaults={'assignments': []}
                )
                if created:
                    current_boost = SquadPhaseBoost.objects.filter(
                        fantasy_squad=squad,
                        phase=current_phase
                    ).first()
                    source_assignments = current_boost.assignments if current_boost else (squad.current_core_squad or [])
                    copied_assignments = []
                    for assignment in source_assignments or []:
                        if isinstance(assignment, dict) and 'boost_id' in assignment and 'player_id' in assignment:
                            copied_assignments.append({
                                'boost_id': assignment['boost_id'],
                                'player_id': assignment['player_id'],
                            })
                    next_boost.assignments = copied_assignments
                    next_boost.save()

    boosts = SquadPhaseBoost.objects.filter(
        fantasy_squad=squad,
        phase_id__in=phase_ids
    )
    assignments = {boost.phase_id: boost.assignments for boost in boosts}

    return Response({
        'season_id': season.id,
        'phases': SeasonPhaseSerializer(phases, many=True).data,
        'assignments': assignments
    })

@api_view(['GET'])
def fantasy_boost_roles(request):
    """Get all available fantasy boost roles and their multipliers in a specific order"""
    # Define the preferred order of roles
    role_order = [
        "Captain",
        "Vice-Captain", 
        "Slogger", 
        "Anchor", 
        "Safe Hands", 
        "Virtuoso", 
        "Rattler", 
        "Guardian"
    ]
    
    # Get all roles from database
    roles = FantasyBoostRole.objects.all()
    
    # Create a mapping for ordering
    role_data = []
    for role in roles:
        role_data.append({
            'id': role.id,
            'name': role.label,
            'allowed_player_types': role.role,  # This is already a list thanks to MultiSelectField
            'multipliers': {
                'runs': role.multiplier_runs,
                'fours': role.multiplier_fours,
                'sixes': role.multiplier_sixes,
                'strike_rate': role.multiplier_sr,
                'bat_milestones': role.multiplier_bat_milestones,
                'wickets': role.multiplier_wickets,
                'maidens': role.multiplier_maidens,
                'economy': role.multiplier_economy,
                'bowl_milestones': role.multiplier_bowl_milestones,
                'catches': role.multiplier_catches,
                'stumpings': role.multiplier_stumpings,
                'run_outs': role.multiplier_run_outs,
                'potm': role.multiplier_potm,
                'playing': role.multiplier_playing
            }
        })
    
    # Sort the role_data based on the role_order list
    role_data.sort(key=lambda x: role_order.index(x['name']) if x['name'] in role_order else len(role_order))
    
    return Response(role_data)

@api_view(['PATCH'])
def update_core_squad(request, squad_id):
    """Update future core squad assignments"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    phase_id = request.data.get('phase_id')
    
    # Get current future_core_squad or empty list
    if phase_id:
        phase = get_object_or_404(SeasonPhase, id=phase_id)
        phase_boost, _ = SquadPhaseBoost.objects.get_or_create(
            fantasy_squad=squad,
            phase=phase
        )
        future_core_squad = list(phase_boost.assignments or [])
    else:
        future_core_squad = list(squad.future_core_squad or [])
    new_assignment = request.data
    
    # Update specific role assignment
    existing_idx = next((i for i, x in enumerate(future_core_squad) 
                        if x['boost_id'] == new_assignment['boost_id']), None)
    if existing_idx is not None:
        future_core_squad[existing_idx] = new_assignment
    else:
        future_core_squad.append(new_assignment)
    
    # Validate player types match role requirements
    player = Player.objects.get(id=new_assignment['player_id'])
    role = FantasyBoostRole.objects.get(id=new_assignment['boost_id'])
    if player.role not in role.role:
        return Response(
            {'error': f'Invalid player type for role: {player.name} as {role.label}'},
            status=400
        )
    
    # Check for duplicate player assignments
    player_assignments = [a['player_id'] for a in future_core_squad]
    if player_assignments.count(new_assignment['player_id']) > 1:
        return Response(
            {'error': 'Player cannot be assigned to multiple roles'},
            status=400
        )
    
    # Update the squad
    if phase_id:
        phase_boost.assignments = future_core_squad
        phase_boost.save()
        return Response({
            'phase_id': phase.id,
            'assignments': future_core_squad
        })

    squad.future_core_squad = future_core_squad
    squad.save()
    
    return Response(SquadDetailSerializer(squad).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_player_fantasy_stats(request, league_id, player_id):
    try:
        # Get the league and verify player is in the league
        league = get_object_or_404(FantasyLeague, id=league_id)
        player = get_object_or_404(Player, id=player_id)
        
        # Get all fantasy events for this player in this league
        events = FantasyPlayerEvent.objects.filter(
            match_event__player=player,
            fantasy_squad__league=league
        ).select_related(
            'match_event',
            'match_event__match',
            'fantasy_squad'
        ).order_by('-match_event__match__date')

        # Calculate season stats per squad
        squad_stats = {}
        for event in events:
            squad_id = event.fantasy_squad_id
            if squad_id not in squad_stats:
                squad_stats[squad_id] = {
                    'squad': event.fantasy_squad.name,
                    'matches': 0,
                    'basePoints': 0,
                    'boostPoints': 0,
                    'totalPoints': 0
                }
            
            squad_stats[squad_id]['matches'] += 1
            base_points = event.match_event.total_points_all  # Use total_points_all from PlayerMatchEvent
            boost_points = event.boost_points  # UPDATED: Changed from calculating to using boost_points directly
            squad_stats[squad_id]['basePoints'] += base_points
            squad_stats[squad_id]['boostPoints'] += boost_points
            squad_stats[squad_id]['totalPoints'] += (base_points + boost_points)

        # Calculate overall stats
        overall_stats = {
            'matches': sum(s['matches'] for s in squad_stats.values()),
            'basePoints': sum(s['basePoints'] for s in squad_stats.values()),
            'boostPoints': sum(s['boostPoints'] for s in squad_stats.values()),
            'totalPoints': sum(s['totalPoints'] for s in squad_stats.values())
        }
        overall_stats['average'] = overall_stats['totalPoints'] / overall_stats['matches'] if overall_stats['matches'] > 0 else 0

        # Format match details
        match_details = []
        for event in events:
            match_event = event.match_event
            match = match_event.match
            
            base_points = match_event.total_points_all  # Use total_points_all from PlayerMatchEvent
            boost_points = event.boost_points  # UPDATED: Use boost_points directly
            
            match_detail = {
                'opponent': match.team_2.short_name if match.team_1 == match_event.for_team else match.team_1.short_name,
                'date': match.date.strftime('%d %b %Y'),
                'squad': event.fantasy_squad.name,
                'basePoints': base_points,
                'boostPoints': boost_points,
                'totalPoints': base_points + boost_points
            }

            # Add batting details if exists
            if match_event.bat_runs or match_event.bat_balls:
                match_detail['batting'] = {
                    'runs': match_event.bat_runs,
                    'balls': match_event.bat_balls,
                    'fours': match_event.bat_fours,
                    'sixes': match_event.bat_sixes,
                    'not_out': match_event.bat_not_out,
                    'strike_rate': match_event.bat_strike_rate,
                    'points': match_event.batting_points_total
                }

            # Add bowling details if exists
            if match_event.bowl_balls:
                match_detail['bowling'] = {
                    'overs': f"{match_event.bowl_balls // 6}.{match_event.bowl_balls % 6}",
                    'maidens': match_event.bowl_maidens,
                    'runs': match_event.bowl_runs,
                    'wickets': match_event.bowl_wickets,
                    'economy': match_event.bowl_economy,
                    'points': match_event.bowling_points_total
                }

            # Add fielding details if exists
            if (match_event.field_catch or match_event.wk_catch or 
                match_event.wk_stumping or match_event.run_out_solo):
                match_detail['fielding'] = {
                    'catches': (match_event.field_catch or 0) + (match_event.wk_catch or 0),
                    'stumpings': match_event.wk_stumping,
                    'runouts': (match_event.run_out_solo or 0) + (match_event.run_out_collab or 0),
                    'points': match_event.fielding_points_total
                }

            match_details.append(match_detail)

        # Get current team info
        current_team = player.playerseasonteam_set.filter(
            season=league.season
        ).select_related('team').first()

        # Format the response data
        response_data = {
            'id': player.id,
            'name': player.name,
            'team': current_team.team.name if current_team else None,
            'seasonStats': [
                {**stats, 'squad': squad}
                for squad, stats in squad_stats.items()
            ] + [{**overall_stats, 'squad': 'Overall'}],
            'matches': match_details
        }

        return Response(response_data)

    except Exception as e:
        print(f"Error in get_player_fantasy_stats: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
class FantasyTradeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FantasyTradeSerializer
    
    def get_queryset(self):
        queryset = FantasyTrade.objects.all()
        
        # Filter by league if provided
        league_id = self.request.query_params.get('league')
        if league_id:
            queryset = queryset.filter(
                Q(initiator__league_id=league_id) | Q(receiver__league_id=league_id)
            )
        
        return queryset.select_related('initiator', 'receiver')
    
    @action(detail=True, methods=['patch'])
    def accept(self, request, pk=None):
        trade = self.get_object()
        
        # Check if user is the receiver
        if trade.receiver.user != request.user:
            return Response(
                {"error": "Only the receiver can accept a trade"}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if trade is pending
        if trade.status != 'Pending':
            return Response(
                {"error": f"Cannot accept a trade with status: {trade.status}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all players involved in this trade
        involved_players = trade.players_given + trade.players_received
        
        # Create a query to find conflicting trades
        conflicting_trades = []
        
        # Find all pending trades (excluding current one)
        pending_trades = FantasyTrade.objects.filter(
            status='Pending'
        ).exclude(
            id=trade.id
        )
        
        # Check each trade to see if it involves any of the same players
        for pending_trade in pending_trades:
            pending_players = pending_trade.players_given + pending_trade.players_received
            
            # If any player in this trade is also in the accepted trade, it's a conflict
            if any(player_id in involved_players for player_id in pending_players):
                conflicting_trades.append(pending_trade)
        
        # Automatically reject conflicting trades
        conflict_count = 0
        for conflicting_trade in conflicting_trades:
            conflicting_trade.status = 'Rejected'
            conflicting_trade.updated_at = timezone.now()
            conflicting_trade.save()
            conflict_count += 1
        
        # Check if there's an ongoing match
        live_match = Match.objects.filter(status='LIVE').exists()
        
        if live_match:
            # Just mark as accepted, will be processed after match
            trade.status = 'Accepted'
            trade.updated_at = timezone.now()
            trade.save()
            return Response({
                "status": "Trade accepted and will be processed after the current match",
                "conflicts_resolved": conflict_count
            })
        else:
            # Process trade immediately
            process_trade(trade)
            return Response({
                "status": "Trade accepted and processed",
                "conflicts_resolved": conflict_count
            })
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        trade = self.get_object()
        
        # Only initiator or receiver can reject
        if trade.receiver.user != request.user and trade.initiator.user != request.user:
            return Response(
                {"error": "Only trade participants can reject a trade"}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if trade is pending
        if trade.status != 'Pending':
            return Response(
                {"error": f"Cannot reject a trade with status: {trade.status}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trade.status = 'Rejected'
        trade.save()
        return Response({"status": "Trade rejected"})
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        user = request.user
        pending_trades = FantasyTrade.objects.filter(
            receiver__user=user,
            status='Pending'
        ).select_related('initiator', 'receiver')
        
        serializer = self.get_serializer(pending_trades, many=True)
        return Response(serializer.data)
    
def process_trade(trade):
    """Process an accepted trade by swapping players between squads"""
    from django.utils import timezone
    
    initiator = trade.initiator
    receiver = trade.receiver
    
    # Update initiator's squad
    for player_id in trade.players_received:
        if player_id in receiver.current_squad:
            receiver.current_squad.remove(player_id)
            initiator.current_squad.append(player_id)
    
    # Update receiver's squad
    for player_id in trade.players_given:
        if player_id in initiator.current_squad:
            initiator.current_squad.remove(player_id)
            receiver.current_squad.append(player_id)
    
    # Update core squad if needed
    if initiator.current_core_squad:
        update_core_squad_after_trade(initiator, trade.players_given, trade.players_received)
    
    if receiver.current_core_squad:
        update_core_squad_after_trade(receiver, trade.players_received, trade.players_given)
    
    # Save changes
    initiator.save()
    receiver.save()
    
    # Mark trade as closed
    trade.status = 'Closed'
    trade.updated_at = timezone.now()
    trade.save()
    
def update_core_squad_after_trade(squad, players_removed, players_added):
    """Update core squad roles when players are traded"""
    core_squad = squad.current_core_squad
    
    # Find any core roles assigned to traded players
    for i, assignment in enumerate(core_squad):
        if assignment['player_id'] in players_removed:
            # Check if we received a player that can take this role
            for new_player_id in players_added:
                player = Player.objects.get(id=new_player_id)
                role = FantasyBoostRole.objects.get(id=assignment['boost_id'])
                
                # If player role matches the boost role requirements
                if player.role in role.role:
                    # Assign the new player to this role
                    core_squad[i]['player_id'] = new_player_id
                    break

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_match_points(request):
    """
    Update fantasy points for a specific match or all live matches.
    Only accessible to admin users.
    """
    service = CricketDataService()
    
    match_id = request.data.get('match_id')
    update_all = request.data.get('update_all', False)
    print(f"Updating match points: {match_id} | {update_all}")
    
    if match_id:
        # Update specific match
        try:
            match = Match.objects.get(cricdata_id=match_id)
        except Match.DoesNotExist:
            return Response(
                {"error": f"Match not found with cricdata_id: {match_id}"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        result = service.update_match_points(match_id)
        
        if 'error' in result:
            logger.error(f"Error updating match {match_id}: {result['error']}")
            return Response(
                {"error": result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return Response(
            {
                "success": True,
                "match": match.id,
                "player_events_updated": result.get('player_events_updated', 0),
                "fantasy_events_updated": result.get('fantasy_events_updated', 0),
                "fantasy_squads_updated": result.get('fantasy_squads_updated', 0)
            },
            status=status.HTTP_200_OK
        )
        
    elif update_all:
        # Update all live matches with CricData IDs
        matches_to_update = service.get_bulk_update_queryset()
        if not matches_to_update.exists():
            return Response(
                {"message": "No live matches found"},
                status=status.HTTP_200_OK
            )
            
        print(f"Updating {matches_to_update.count()} live matches")
        results = service.update_all_eligible_matches(matches_to_update)
        
        successful = [r for r in results if 'error' not in r]
        failed = [r for r in results if 'error' in r]
        
        total_player_events = sum(r.get('player_events_updated', 0) for r in successful)
        total_fantasy_events = sum(r.get('fantasy_events_updated', 0) for r in successful)
        total_squads_updated = sum(r.get('fantasy_squads_updated', 0) for r in successful)
        
        return Response(
            {
                "success": True,
                "matches_considered": matches_to_update.count(),
                "matches_updated": len(successful),
                "matches_failed": len(failed),
                "player_events_updated": total_player_events,
                "fantasy_events_updated": total_fantasy_events,
                "fantasy_squads_updated": total_squads_updated,
                "details": results
            },
            status=status.HTTP_200_OK
        )
        
    else:
        return Response(
            {"error": "Either match_id or update_all must be provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def match_fantasy_stats(request, match_id, league_id=None):
    """
    Fetch top performers and top squads for a specific match.
    Uses FantasyMatchEvent for more efficient squad data retrieval.
    
    Args:
        match_id: ID of the match to get stats for
        league_id: Optional league ID to filter results by league
    
    Returns:
        Dictionary with top_players and top_squads lists
    """
    try:
        match = get_object_or_404(Match, id=match_id)
        
        # Get league_id from URL parameter or query parameter
        league_id = league_id or request.query_params.get('league_id')
        
        # Initialize response data
        top_players = []
        top_squads = []
        
        if league_id:
            # For league-specific data
            league = get_object_or_404(FantasyLeague, id=league_id)
            
            # Get top squads directly from FantasyMatchEvent
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__league=league
            ).select_related(
                'fantasy_squad'
            ).order_by('match_rank')[:5]
            
            top_squads = [{
                'id': event.fantasy_squad.id,
                'name': event.fantasy_squad.name,
                'color': event.fantasy_squad.color,
                'match_points': event.total_points,
                'match_rank': event.match_rank,
                'base_points': event.total_base_points,
                'boost_points': event.total_boost_points
            } for event in match_events]
            
            # Get top players (this part still needs player events)
            player_events = FantasyPlayerEvent.objects.filter(
                match_event__match=match,
                fantasy_squad__league=league
            ).select_related(
                'match_event__player',
                'match_event__for_team',
                'fantasy_squad',
                'boost'
            )
            
            # Use a more efficient approach with a single pass
            player_performances = {}
            
            for event in player_events:
                player = event.match_event.player
                points = event.match_event.total_points_all + event.boost_points
                
                # Store only the best performance for each player
                if player.id not in player_performances or points > player_performances[player.id]['fantasy_points']:
                    player_performances[player.id] = {
                        'player_id': player.id,
                        'player_name': player.name,
                        'base_points': event.match_event.total_points_all,
                        'boost_points': event.boost_points,
                        'fantasy_points': points,
                        'squad_id': event.fantasy_squad.id,
                        'squad_name': event.fantasy_squad.name,
                        'squad_color': event.fantasy_squad.color,
                        'boost_label': event.boost.label if event.boost else None,
                        'team_id': event.match_event.for_team.id,
                        'team_name': event.match_event.for_team.name,
                        'team_color': event.match_event.for_team.primary_color
                    }
            
            # Sort and get top 5 players
            top_players = sorted(
                player_performances.values(),
                key=lambda x: x['fantasy_points'],
                reverse=True
            )[:5]
            
        else:
            # For global (non-league) stats
            # Get top players directly from PlayerMatchEvent
            player_events = PlayerMatchEvent.objects.filter(
                match=match
            ).select_related(
                'player',
                'for_team'
            ).order_by('-total_points_all')[:5]
            
            top_players = [{
                'player_id': event.player_id,
                'player_name': event.player.name,
                'base_points': event.total_points_all,
                'boost_points': 0,
                'fantasy_points': event.total_points_all,
                'team_id': event.for_team.id,
                'team_name': event.for_team.name,
                'team_color': event.for_team.primary_color
            } for event in player_events]
        
        return Response({
            'top_players': top_players,
            'top_squads': top_squads
        })
    
    except Exception as e:
        print(f"Error in match_fantasy_stats: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def season_recent_matches(request, season_id):
    """
    Fetch recent matches for a season.
    Returns both completed and live matches, sorted by recency.
    """
    try:
        season = get_object_or_404(Season, id=season_id)
        
        # Get recent completed and live matches
        recent_matches = Match.objects.filter(
            season=season,
            status__in=['COMPLETED', 'LIVE', 'ABANDONED', 'NO_RESULT']
        ).select_related(
            'team_1', 'team_2', 'winner', 'player_of_match'
        ).order_by('-date')[:2]  # Get 2 most recent matches
        
        serializer = IPLMatchSerializer(recent_matches, many=True)
        return Response(serializer.data)
    
    except Exception as e:
        print(f"Error in season_recent_matches: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def match_standings(request, match_id):
    """
    Get match standings for all fantasy squads in a specific match.
    Optionally filter by league ID.
    """
    try:
        match = get_object_or_404(Match, id=match_id)
        
        # Get filter parameters
        league_id = request.query_params.get('league_id')
        
        # Build the query
        query = FantasyMatchEvent.objects.filter(match=match)
        if league_id:
            query = query.filter(fantasy_squad__league_id=league_id)
        
        # Get standings, ordered by match rank
        standings = query.select_related(
            'fantasy_squad',
            'match'
        ).order_by('match_rank')
        
        # Serialize and return
        serializer = FantasyMatchEventSerializer(standings, many=True)
        return Response(serializer.data)
    
    except Exception as e:
        print(f"Error in match_standings: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mid_season_draft_pool(request, league_id):
    """Get all players available in the mid-season draft pool with stats"""
    try:
        league = get_object_or_404(FantasyLeague, id=league_id)
        squad = get_object_or_404(FantasySquad, league=league, user=request.user)

        draft_window_id = request.query_params.get('draft_window')
        draft_window = resolve_draft_window(
            league,
            draft_window_id=int(draft_window_id) if draft_window_id else None,
            kind=DraftWindow.Kind.MID_SEASON
        )
        
        requested_role = request.query_params.get('role')
        if requested_role:
            requested_role = requested_role.upper()
            valid_roles = {choice[0] for choice in FantasyDraft.Role.choices}
            if requested_role not in valid_roles:
                return Response(
                    {'error': f"Invalid role '{requested_role}'. Expected one of: {', '.join(sorted(valid_roles))}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        draft_pool = build_draft_pool(league, draft_window)
        if not draft_pool:
            return Response(
                {'error': 'Draft pool is empty for this draft window'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get player details with season stats
        from django.db.models import Avg, Count, Q
        
        players = Player.objects.filter(id__in=draft_pool).annotate(
            matches=Count('playermatchevent', filter=Q(playermatchevent__match__season=league.season)),
            avg_points=Avg('playermatchevent__total_points_all', filter=Q(playermatchevent__match__season=league.season))
        )
        if requested_role:
            players = players.filter(role=requested_role)
        
        # Get existing draft order if any
        draft_filters = {
            'league': league,
            'squad': squad,
            'draft_window': draft_window,
            'type': 'Mid-Season',
        }
        if requested_role:
            draft_filters['role'] = requested_role

        draft = FantasyDraft.objects.filter(
            **draft_filters
        ).first()
        if not draft and requested_role:
            draft = FantasyDraft.objects.filter(
            league=league,
            squad=squad,
            draft_window=draft_window,
            type='Mid-Season',
            role__isnull=True,
        ).first()
        
        # Get player retention status
        retained_player_ids = get_retained_player_ids_for_squad(squad, draft_window)
        
        # Prepare response with player details
        player_data = []
        for player in players:
            # Get current team
            team =player.playerseasonteam_set.filter(
                season=league.season
            ).select_related('team', 'replacement').first()
            
            # Calculate draft position if available
            draft_position = None
            if draft and draft.order:
                try:
                    draft_position = draft.order.index(player.id)
                except ValueError:
                    draft_position = None
            
            # For players with no current season data, get historical average
            historical_avg = None
            if player.avg_points is None:
                historical_stats = PlayerMatchEvent.objects.filter(
                    player=player,
                    match__season__year__in=range(2021, 2025)  # 2021-2024
                ).aggregate(
                    matches=Count('id'),
                    avg_points=Avg('total_points_all')
                )
                historical_avg = historical_stats['avg_points']
            
            player_data.append({
                'id': player.id,
                'name': player.name,
                'role': player.role,
                'team': team.team.short_name if team else None,
                'ruled_out': bool(team.ruled_out) if team else False,
                'replacement': (
                    {
                        'id': team.replacement_id,
                        'name': team.replacement.name,
                    }
                    if team and team.replacement_id
                    else None
                ),
                'matches': player.matches or 0,
                'avg_points': player.avg_points or historical_avg or 0,
                'draft_position': draft_position,
                'is_retained': player.id in retained_player_ids
            })
        
        # Sort by average points
        player_data.sort(key=lambda x: x['avg_points'], reverse=True)
        
        # Add rank
        for i, player in enumerate(player_data):
            player['rank'] = i + 1
        
        return Response(player_data)
        
    except Exception as e:
        print(f"Error in mid_season_draft_pool: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


def _build_mid_season_default_order(league, player_ids):
    if not player_ids:
        return []

    ranked_players = Player.objects.filter(id__in=player_ids).annotate(
        avg_points=Avg(
            'playermatchevent__total_points_all',
            filter=Q(playermatchevent__match__season=league.season),
        )
    ).order_by('-avg_points', 'name')

    ranked_ids = list(ranked_players.values_list('id', flat=True))
    ranked_set = set(ranked_ids)
    ranked_ids.extend([player_id for player_id in player_ids if player_id not in ranked_set])
    return ranked_ids


def _normalize_mid_season_order(existing_order, eligible_player_ids, default_order):
    eligible_set = set(eligible_player_ids)
    normalized = []
    seen = set()
    for raw_player_id in existing_order or []:
        try:
            player_id = int(raw_player_id)
        except (TypeError, ValueError):
            continue
        if player_id in eligible_set and player_id not in seen:
            normalized.append(player_id)
            seen.add(player_id)

    normalized.extend([player_id for player_id in default_order if player_id not in seen])
    return normalized


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mid_season_draft_order(request, league_id):
    """Get or update draft preferences for mid-season draft"""
    try:
        league = get_object_or_404(FantasyLeague, id=league_id)
        squad = get_object_or_404(FantasySquad, league=league, user=request.user)

        draft_window_id = request.query_params.get('draft_window')
        if request.method == 'POST' and not draft_window_id:
            draft_window_id = request.data.get('draft_window')

        requested_role = request.query_params.get('role')
        if request.method == 'POST' and not requested_role:
            requested_role = request.data.get('role')
        requested_role = (requested_role or FantasyDraft.Role.BAT).upper()
        valid_roles = {choice[0] for choice in FantasyDraft.Role.choices}
        if requested_role not in valid_roles:
            return Response(
                {'error': f"Invalid role '{requested_role}'. Expected one of: {', '.join(sorted(valid_roles))}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        draft_window = resolve_draft_window(
            league,
            draft_window_id=int(draft_window_id) if draft_window_id else None,
            kind=DraftWindow.Kind.MID_SEASON
        )
        
        # Check if this draft window has already been executed for the league
        if has_draft_window_run(league, draft_window):
            return Response(
                {'error': 'This draft window has already been completed for this league'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        role_pool = list(Player.objects.filter(
            id__in=build_draft_pool(league, draft_window),
            role=requested_role,
        ).values_list('id', flat=True))

        role_pool_set = set(role_pool)
        default_order = _build_mid_season_default_order(league, role_pool)

        # Get role-specific draft order with legacy fallback support
        draft = FantasyDraft.objects.filter(
            league=league,
            squad=squad,
            draft_window=draft_window,
            type='Mid-Season',
            role=requested_role,
        ).first()

        legacy_draft = FantasyDraft.objects.filter(
            league=league,
            squad=squad,
            draft_window=draft_window,
            type='Mid-Season',
            role__isnull=True,
        ).first()
        
        if request.method == 'GET':
            base_order = []
            if draft and isinstance(draft.order, list):
                base_order = draft.order
            elif legacy_draft and isinstance(legacy_draft.order, list):
                base_order = [player_id for player_id in legacy_draft.order if player_id in role_pool_set]

            normalized_order = _normalize_mid_season_order(base_order, role_pool, default_order)
            if not draft:
                draft = FantasyDraft.objects.create(
                    league=league,
                    squad=squad,
                    draft_window=draft_window,
                    type='Mid-Season',
                    role=requested_role,
                    order=normalized_order,
                )
            elif normalized_order != (draft.order or []):
                draft.order = normalized_order
                draft.save(update_fields=['order'])

            serializer = FantasyDraftSerializer(draft)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            now = timezone.now()
            if not (draft_window.open_at <= now <= draft_window.lock_at):
                return Response(
                    {'error': 'Draft window is closed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update draft order
            order = request.data.get('order')
            
            if not isinstance(order, list) or not order:
                return Response(
                    {'error': 'No order provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            normalized_input = []
            seen = set()
            for raw_player_id in order:
                try:
                    player_id = int(raw_player_id)
                except (TypeError, ValueError):
                    return Response(
                        {'error': f'Invalid player ID in order: {raw_player_id}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if player_id in seen:
                    return Response(
                        {'error': f'Duplicate player ID in order: {player_id}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                seen.add(player_id)
                normalized_input.append(player_id)

            invalid_ids = [player_id for player_id in normalized_input if player_id not in role_pool_set]
            if invalid_ids:
                return Response(
                    {'error': f'Invalid player IDs for role {requested_role}: {invalid_ids}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            missing_ids = [player_id for player_id in role_pool if player_id not in seen]
            if missing_ids:
                return Response(
                    {'error': f'Missing player IDs in order: {missing_ids}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not draft:
                draft = FantasyDraft.objects.create(
                    league=league,
                    squad=squad,
                    draft_window=draft_window,
                    type='Mid-Season',
                    role=requested_role,
                    order=normalized_input,
                )
            else:
                draft.order = normalized_input
                draft.save(update_fields=['order'])
            
            serializer = FantasyDraftSerializer(draft)
            return Response(serializer.data)
        
    except Exception as e:
        print(f"Error in mid_season_draft_order: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_retained_players(request, league_id):
    """Get the list of retained players for the mid-season draft"""
    try:
        league = get_object_or_404(FantasyLeague, id=league_id)
        squad = get_object_or_404(FantasySquad, league=league, user=request.user)

        draft_window_id = request.query_params.get('draft_window')
        draft_window = resolve_draft_window(
            league,
            draft_window_id=int(draft_window_id) if draft_window_id else None,
            kind=DraftWindow.Kind.MID_SEASON
        )
        
        # Get retained player IDs from current_core_squad
        retained_player_ids = get_retained_player_ids_for_squad(squad, draft_window)
        
        # Get player details
        retained_players = []
        if retained_player_ids:
            retained_players = Player.objects.filter(
                id__in=retained_player_ids,
                playerseasonteam__season=league.season,
            ).annotate(
                team_name=F('playerseasonteam__team__short_name'),
            ).values('id', 'name', 'role', 'team_name')
        
        return Response({
            'retained_players': retained_players,
            'count': len(retained_players)
        })
        
    except Exception as e:
        print(f"Error in get_retained_players: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# This function compiles the draft pool for all leagues (admin use)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def compile_mid_season_draft_pools(request):
    """Admin endpoint to compile the mid-season draft pools for all leagues"""
    try:
        draft_window_id = request.data.get('draft_window')
        if draft_window_id:
            draft_window = DraftWindow.objects.filter(id=draft_window_id).first()
            if not draft_window:
                return Response(
                    {'error': 'Draft window not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            leagues = FantasyLeague.objects.filter(season=draft_window.season)
        else:
            draft_window = None
            leagues = FantasyLeague.objects.filter(season__status='ONGOING')
        
        results = []
        compiled_window_ids = set()
        for league in leagues:
            active_window = draft_window or resolve_draft_window(league, kind=DraftWindow.Kind.MID_SEASON)
            if active_window.id not in compiled_window_ids:
                compile_draft_window_pool(active_window)
                compiled_window_ids.add(active_window.id)

            draft_pool = build_draft_pool(league, active_window)
            retained_players = get_retained_player_map(league, active_window)
            
            results.append({
                'league_id': league.id,
                'league_name': league.name,
                'draft_window_id': active_window.id,
                'draft_pool_size': len(draft_pool),
                'retained_players': retained_players
            })
        
        return Response({
            'success': True,
            'leagues_updated': len(results),
            'details': results
        })
        
    except Exception as e:
        print(f"Error in compile_mid_season_draft_pools: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# This function executes the mid-season draft for a specific league (admin use)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def execute_mid_season_draft_api(request, league_id):
    """Execute the mid-season draft for a league"""
    try:
        league = get_object_or_404(FantasyLeague, id=league_id)

        draft_window_id = request.data.get('draft_window') or request.query_params.get('draft_window')
        draft_window = resolve_draft_window(
            league,
            draft_window_id=int(draft_window_id) if draft_window_id else None,
            kind=DraftWindow.Kind.MID_SEASON
        )
        result = execute_draft_window(
            league,
            draft_window,
            dry_run=False,
            executed_by=request.user,
        )
        return Response({
            'success': True,
            'result': result,
        })
        
    except Exception as e:
        print(f"Error executing mid-season draft: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def match_preview(request, match_id):
    # Get the match and season
    match = Match.objects.select_related('team_1', 'team_2', 'season').get(id=match_id)
    season = match.season

    # Get all IPL players in both teams for this season
    team_ids = [match.team_1.id, match.team_2.id]
    player_ids = PlayerSeasonTeam.objects.filter(
        team_id__in=team_ids, season=season
    ).values_list('player_id', flat=True).distinct()
    players = Player.objects.filter(id__in=player_ids)

    # For each player, get matches played and base points this season
    player_stats = PlayerMatchEvent.objects.filter(
        player_id__in=player_ids, match__season=season
    ).values('player_id').annotate(
        matches=Count('id'),
        base_points=Sum('total_points_all')
    )
    stats_map = {s['player_id']: s for s in player_stats}

    data = []
    for player in players:
        stat = stats_map.get(player.id, {})
        data.append({
            'id': player.id,
            'name': player.name,
            'role': player.role,
            'ipl_team': player.playerseasonteam_set.filter(season=season).first().team.short_name if player.playerseasonteam_set.filter(season=season).exists() else None,
            'matches': stat.get('matches', 0),
            'base_points': stat.get('base_points', 0),
        })
    # Add match info for frontend overview
    match_info = {
        'id': match.id,
        'team_1': {
            'id': match.team_1.id,
            'name': match.team_1.name,
            'short_name': match.team_1.short_name,
            'primary_color': getattr(match.team_1, 'primary_color', None),
        },
        'team_2': {
            'id': match.team_2.id,
            'name': match.team_2.name,
            'short_name': match.team_2.short_name,
            'primary_color': getattr(match.team_2, 'primary_color', None),
        },
        'date': match.date,
        'stage': getattr(match, 'stage', None),
        'venue': getattr(match, 'venue', None),
        'match_number': getattr(match, 'match_number', None),
        'status': getattr(match, 'status', None),
        'toss_winner': {
            'id': match.toss_winner.id,
            'short_name': match.toss_winner.short_name,
            'primary_color': getattr(match.toss_winner, 'primary_color', None),
        } if getattr(match, 'toss_winner', None) else None,
        'toss_decision': getattr(match, 'toss_decision', None),
        'winner': {
            'id': match.winner.id,
            'short_name': match.winner.short_name,
            'primary_color': getattr(match.winner, 'primary_color', None),
        } if getattr(match, 'winner', None) else None,
        'win_margin': getattr(match, 'win_margin', None),
        'win_type': getattr(match, 'win_type', None),
        'player_of_match': {
            'id': match.player_of_match.id,
            'name': match.player_of_match.name,
        } if getattr(match, 'player_of_match', None) else None,
        'inns_1_runs': getattr(match, 'inns_1_runs', None),
        'inns_1_wickets': getattr(match, 'inns_1_wickets', None),
        'inns_1_overs': getattr(match, 'inns_1_overs', None),
        'inns_2_runs': getattr(match, 'inns_2_runs', None),
        'inns_2_wickets': getattr(match, 'inns_2_wickets', None),
        'inns_2_overs': getattr(match, 'inns_2_overs', None),
    }
    return Response({'players': data, 'match': match_info})

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def league_match_preview(request, league_id, match_id):
    # Get the match, league, and season
    match = Match.objects.select_related('team_1', 'team_2', 'season').get(id=match_id)
    league = FantasyLeague.objects.get(id=league_id)
    season = match.season

    # Get all IPL players in both teams for this season
    team_ids = [match.team_1.id, match.team_2.id]
    player_ids = PlayerSeasonTeam.objects.filter(
        team_id__in=team_ids, season=season
    ).values_list('player_id', flat=True).distinct()
    players = Player.objects.filter(id__in=player_ids)

    # Map player_id to fantasy squad name and color (if assigned in this league)
    squad_map = {}
    squad_color_map = {}
    for squad in FantasySquad.objects.filter(league=league):
        for pid in squad.current_squad or []:
            squad_map[pid] = squad.name
            squad_color_map[pid] = squad.color

    # For each player, get matches played and base points this season (in league context)
    player_stats = FantasyPlayerEvent.objects.filter(
        match_event__player_id__in=player_ids,
        fantasy_squad__league=league,
        match_event__match__season=season
    ).values('match_event__player_id').annotate(
        matches=Count('id'),
        base_points=Sum('match_event__total_points_all')
    )
    stats_map = {s['match_event__player_id']: s for s in player_stats}

    data = []
    for player in players:
        stat = stats_map.get(player.id, {})
        data.append({
            'id': player.id,
            'name': player.name,
            'role': player.role,
            'ipl_team': player.playerseasonteam_set.filter(season=season).first().team.short_name if player.playerseasonteam_set.filter(season=season).exists() else None,
            'fantasy_squad': squad_map.get(player.id),
            'squad_color': squad_color_map.get(player.id),  # <-- Add squad color here
            'matches': stat.get('matches', 0),
            'base_points': stat.get('base_points', 0),
        })
    # Add match info for frontend overview (same as above)
    match_info = {
        'id': match.id,
        'team_1': {
            'id': match.team_1.id,
            'name': match.team_1.name,
            'short_name': match.team_1.short_name,
            'primary_color': getattr(match.team_1, 'primary_color', None),
        },
        'team_2': {
            'id': match.team_2.id,
            'name': match.team_2.name,
            'short_name': match.team_2.short_name,
            'primary_color': getattr(match.team_2, 'primary_color', None),
        },
        'date': match.date,
        'stage': getattr(match, 'stage', None),
        'venue': getattr(match, 'venue', None),
        'match_number': getattr(match, 'match_number', None),
        'status': getattr(match, 'status', None),
        'toss_winner': {
            'id': match.toss_winner.id,
            'short_name': match.toss_winner.short_name,
            'primary_color': getattr(match.toss_winner, 'primary_color', None),
        } if getattr(match, 'toss_winner', None) else None,
        'toss_decision': getattr(match, 'toss_decision', None),
        'winner': {
            'id': match.winner.id,
            'short_name': match.winner.short_name,
            'primary_color': getattr(match.winner, 'primary_color', None),
        } if getattr(match, 'winner', None) else None,
        'win_margin': getattr(match, 'win_margin', None),
        'win_type': getattr(match, 'win_type', None),
        'player_of_match': {
            'id': match.player_of_match.id,
            'name': match.player_of_match.name,
        } if getattr(match, 'player_of_match', None) else None,
        'inns_1_runs': getattr(match, 'inns_1_runs', None),
        'inns_1_wickets': getattr(match, 'inns_1_wickets', None),
        'inns_1_overs': getattr(match, 'inns_1_overs', None),
        'inns_2_runs': getattr(match, 'inns_2_runs', None),
        'inns_2_wickets': getattr(match, 'inns_2_wickets', None),
        'inns_2_overs': getattr(match, 'inns_2_overs', None),
    }
    return Response({'players': data, 'match': match_info})
