from rest_framework import viewsets, filters, status, generics, permissions
from rest_framework.decorators import api_view, permission_classes, action, authentication_classes
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, 
    IPLMatch, FantasyLeague, FantasySquad, UserProfile, FantasyDraft, FantasyPlayerEvent, FantasyBoostRole, IPLPlayerEvent
)
from .serializers import (
    SeasonSerializer, IPLTeamSerializer, TeamSeasonSerializer,
    IPLPlayerSerializer, PlayerTeamHistorySerializer, IPLMatchSerializer,
    IPLMatchCreateUpdateSerializer, RegisterSerializer, UserSerializer,
    CreateLeagueRequestSerializer, LeagueDetailSerializer,
    FantasySquadSerializer, CreateSquadSerializer, SquadDetailSerializer,
    CoreSquadUpdateSerializer
)
from .roster_serializers import PlayerRosterSerializer
from .draft_serializers import FantasyDraftSerializer
from django.db.models import Q, Prefetch, Count, Avg, Sum

class SeasonViewSet(viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'year']
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
        matches = IPLMatch.objects.filter(season=season).select_related(
            'team_1', 'team_2', 'winner', 'toss_winner', 'player_of_match'
        ).order_by('date', 'match_number')
        
        serializer = IPLMatchSerializer(matches, many=True)
        return Response(serializer.data)

class IPLTeamViewSet(viewsets.ModelViewSet):
    queryset = IPLTeam.objects.filter(is_active=True)
    serializer_class = IPLTeamSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'short_name', 'city']

    @action(detail=True)
    def seasons(self, request, pk=None):
        team = self.get_object()
        seasons = TeamSeason.objects.filter(team=team)
        serializer = TeamSeasonSerializer(seasons, many=True)
        return Response(serializer.data)

    @action(detail=True)
    def players(self, request, pk=None):
        team = self.get_object()
        season = request.query_params.get('season')
        players = PlayerTeamHistory.objects.filter(team=team)
        if season:
            players = players.filter(season__year=season)
        serializer = PlayerTeamHistorySerializer(players, many=True)
        return Response(serializer.data)

class IPLPlayerViewSet(viewsets.ModelViewSet):
    queryset = IPLPlayer.objects.filter(is_active=True)
    serializer_class = IPLPlayerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'nationality', 'is_active']
    search_fields = ['name', 'nationality']

    def get_queryset(self):
        # For history action, include inactive players
        if self.action == 'history':
            return IPLPlayer.objects.all()
        # For other actions, keep the is_active filter
        return IPLPlayer.objects.filter(is_active=True)

    @action(detail=True)
    # def history(self, request, pk=None):
    #     player = self.get_object()
    #     history = PlayerTeamHistory.objects.filter(player=player)
    #     serializer = PlayerTeamHistorySerializer(history, many=True)
    #     return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get historical IPL performance for a player"""
        try:
            player = self.get_object()
        
            # Get all player events
            events = IPLPlayerEvent.objects.filter(
                player=player,
                match__status=IPLMatch.Status.COMPLETED  # Only completed matches
            ).select_related(
                'match', 
                'match__season', 
                'for_team', 
                'vs_team'
            ).order_by('-match__date')

            # Calculate season stats
            season_stats = {}
            for event in events:
                season = event.match.season.year
                if season not in season_stats:
                    season_stats[season] = {
                        'year': season,
                        'matches': 0,
                        'runs': 0,
                        'balls_faced': 0,
                        'wickets': 0,
                        'runs_conceded': 0,
                        'balls_bowled': 0,
                        'catches': 0,
                        'runouts': 0,
                        'total_points': 0
                    }
                
                stats = season_stats[season]
                stats['matches'] += 1
                
                # Batting stats
                stats['runs'] += event.bat_runs or 0
                stats['balls_faced'] += event.bat_balls or 0
                
                # Bowling stats
                stats['wickets'] += event.bowl_wickets or 0
                stats['runs_conceded'] += event.bowl_runs or 0
                stats['balls_bowled'] += event.bowl_balls or 0
                
                # Fielding stats
                stats['catches'] += (event.field_catch or 0) + (event.wk_catch or 0)
                stats['runouts'] += (event.run_out_solo or 0) + (event.run_out_collab or 0)
                
                # Points
                stats['total_points'] += event.total_points_all

            # Calculate averages and rates
            for stats in season_stats.values():
                # Batting averages
                if stats['matches'] > 0:
                    stats['batting_average'] = stats['runs'] / stats['matches']
                    stats['points_per_match'] = stats['total_points'] / stats['matches']
                else:
                    stats['batting_average'] = 0
                    stats['points_per_match'] = 0
                    
                # Strike rate
                if stats['balls_faced'] > 0:
                    stats['strike_rate'] = (stats['runs'] / stats['balls_faced']) * 100
                else:
                    stats['strike_rate'] = 0
                    
                # Bowling average & economy
                if stats['wickets'] > 0:
                    stats['bowling_average'] = stats['runs_conceded'] / stats['wickets']
                else:
                    stats['bowling_average'] = None
                    
                if stats['balls_bowled'] > 0:
                    stats['economy'] = (stats['runs_conceded'] / (stats['balls_bowled']/6))
                else:
                    stats['economy'] = None

            response = {
                'seasonStats': list(season_stats.values()),
                'matches': [
                    {
                        'match': {
                            'date': event.match.date,
                            'season': {'year': event.match.season.year}
                        },
                        'opponent': event.vs_team.short_name,
                        'for_team': event.for_team.short_name,
                        'batting': {
                            'runs': event.bat_runs,
                            'balls': event.bat_balls,
                            'fours': event.bat_fours,
                            'sixes': event.bat_sixes,
                            'not_out': event.bat_not_out,
                            'strike_rate': event.bat_strike_rate
                        } if event.bat_runs or event.bat_balls else None,
                        'bowling': {
                            'overs': f"{event.bowl_balls // 6}.{event.bowl_balls % 6}",
                            'maidens': event.bowl_maidens,
                            'runs': event.bowl_runs,
                            'wickets': event.bowl_wickets,
                            'economy': event.bowl_economy
                        } if event.bowl_balls else None,
                        'fielding': {
                            'catches': (event.field_catch or 0) + (event.wk_catch or 0),
                            'stumpings': event.wk_stumping or 0,
                            'runouts': (event.run_out_solo or 0) + (event.run_out_collab or 0)
                        } if event.field_catch or event.wk_catch or event.wk_stumping or event.run_out_solo or event.run_out_collab else None,
                        'player_of_match': event.player_of_match,
                        'points': event.total_points_all
                    }
                    for event in events
                ]
            }

            print("RESPONSE", response)

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
    filterset_fields = ['season', 'status', 'team_1', 'team_2']
    ordering_fields = ['date', 'match_number']

    def get_queryset(self):
        if self.action in ['upcoming', 'live']:
            return IPLMatch.objects.select_related(
                'team_1', 'team_2', 'season'
            ).filter(is_active=True)
        return IPLMatch.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IPLMatchCreateUpdateSerializer
        return IPLMatchSerializer

    @action(detail=False)
    def upcoming(self, request):
        matches = self.get_queryset().filter(
            status=IPLMatch.Status.SCHEDULED
        ).order_by('date')[:5]
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def live(self, request):
        matches = self.get_queryset().filter(
            status=IPLMatch.Status.LIVE
        )
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

    @action(detail=False)
    def by_season(self, request):
        season_id = request.query_params.get('season')
        if not season_id:
            return Response(
                {"error": "Season parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        matches = self.get_queryset().filter(season_id=season_id)
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

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
            teams__user=request.user
        ).distinct()
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
        """Get all players eligible for drafting in a league"""
        try:
            league = self.get_object()
            
            # Get the last 4 seasons
            past_seasons = list(range(league.season.year - 4, league.season.year))

            # Get players who have team history for this season
            players = IPLPlayer.objects.filter(
                # is_active=True,
                playerteamhistory__season=league.season
            ).distinct()

            # Annotate each player with their match count per season and total points
            for year in past_seasons:
                players = players.annotate(**{
                    f'matches_{year}': Count(
                        'iplplayerevent',
                        filter=Q(iplplayerevent__match__season__year=year),
                        distinct=True
                    ),
                    f'points_{year}': Avg(
                        'iplplayerevent__total_points_all',
                        filter=Q(iplplayerevent__match__season__year=year)
                    )
                })

            # Convert QuerySet to list for custom sorting
            players_list = list(players)

            def calculate_avg_points(player):
                total_points = 0
                total_matches = 0
                has_qualifying_season = False
                
                # Check all 4 seasons
                for year in past_seasons:
                    matches = getattr(player, f'matches_{year}') or 0
                    points = getattr(player, f'points_{year}') or 0
                    
                    if matches >= 4:
                        has_qualifying_season = True
                    
                    total_matches += matches
                    total_points += (points * matches)  # Multiply by matches to get total points
                
                # Calculate average points per game
                avg_points = total_points / total_matches if total_matches > 0 else 0
                
                return (has_qualifying_season, avg_points)

            # Sort players
            sorted_players = sorted(
                players_list,
                key=lambda p: calculate_avg_points(p),
                reverse=True
            )

            # Create ranks after sorting
            player_ranks = {player.id: idx + 1 for idx, player in enumerate(sorted_players)}

            # Calculate overall stats for serializer
            for player in sorted_players:
                total_matches = sum(
                    getattr(player, f'matches_{year}') or 0 
                    for year in past_seasons
                )
                total_points = sum(
                    (getattr(player, f'points_{year}') or 0) * (getattr(player, f'matches_{year}') or 0)
                    for year in past_seasons
                )
                player.matches = total_matches
                player.avg_points = total_points / total_matches if total_matches > 0 else 0

            # Serialize the data
            serializer = PlayerRosterSerializer(
                sorted_players,
                many=True,
                context={
                    'season': league.season,
                    'player_ranks': player_ranks
                }
            )

            return Response(serializer.data)

        except Exception as e:
            import traceback
            print(f"Error in players view: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class FantasySquadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FantasySquad.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update']:
            return CreateSquadSerializer
        return SquadDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DraftViewSet(viewsets.ModelViewSet):
    serializer_class = FantasyDraftSerializer
    
    def get_queryset(self):
        return FantasyDraft.objects.filter(
            squad__user=self.request.user
        ).select_related('league', 'league__season', 'squad')

    @action(detail=False, methods=['get'])
    def get_draft_order(self, request):
        league_id = request.query_params.get('league_id')
        if not league_id:
            return Response(
                {"error": "league_id required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        draft = FantasyDraft.objects.filter(
            league_id=league_id,
            squad__user=request.user,
            type='Pre-Season'
        ).first()
        
        if not draft:
            # Create new draft order using default ranking
            league = FantasyLeague.objects.get(id=league_id)
            squad = FantasySquad.objects.get(league=league, user=request.user)
            
            # Get players in default rank order
            players = IPLPlayer.objects.filter(
                playerteamhistory__season=league.season
            ).annotate(
                matches=Count('iplplayerevent'),
                avg_points=Avg('iplplayerevent__total_points_all')
            ).order_by('-avg_points')
            
            draft = FantasyDraft.objects.create(
                league=league,
                squad=squad,
                type='Pre-Season',
                order=list(players.values_list('id', flat=True))
            )
            
        serializer = self.get_serializer(draft)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_order(self, request, pk=None):
        draft = self.get_object()
            
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
    """Get all players in a squad with their details"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    
    # Get players in current squad
    players = IPLPlayer.objects.filter(id__in=squad.current_squad)
    
    # Include current team info through PlayerTeamHistory
    serializer = IPLPlayerSerializer(players, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def squad_player_events(request, squad_id):
    """Get aggregated fantasy player events/stats for this squad"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    
    # Initialize stats for all players in current squad
    stats_dict = {
        player_id: {
            'player_id': player_id,
            'matches_played': 0,
            'base_points': 0,
            'boost_points': 0
        }
        for player_id in squad.current_squad
    }
    
    # Get any existing event stats (if they exist)
    stats = FantasyPlayerEvent.objects.filter(
        fantasy_squad_id=squad_id,
        match_event__player_id__in=squad.current_squad
    ).values('match_event__player_id').annotate(
        matches_played=Count('match_event__match', distinct=True),
        base_points=Sum('match_event__batting_points_total') + 
                   Sum('match_event__bowling_points_total') + 
                   Sum('match_event__fielding_points_total') + 
                   Sum('match_event__other_points_total'),
        boost_points=Sum('total_points')
    )
    
    # Update stats for players that have events
    for stat in stats:
        player_id = stat['match_event__player_id']
        stats_dict[player_id].update({
            'matches_played': stat['matches_played'],
            'base_points': float(stat['base_points']) if stat['base_points'] else 0,
            'boost_points': float(stat['boost_points']) if stat['boost_points'] else 0
        })
    
    return Response(stats_dict)

@api_view(['GET'])
def fantasy_boost_roles(request):
    """Get all available fantasy boost roles and their multipliers"""
    roles = FantasyBoostRole.objects.all()
    
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
    
    return Response(role_data)

@api_view(['PATCH'])
def update_core_squad(request, squad_id):
    """Update future core squad assignments"""
    squad = get_object_or_404(FantasySquad, id=squad_id)
    
    # Get current future_core_squad or empty list
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
    player = IPLPlayer.objects.get(id=new_assignment['player_id'])
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
    squad.future_core_squad = future_core_squad
    squad.save()
    
    return Response(SquadDetailSerializer(squad).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_player_fantasy_stats(request, league_id, player_id):
    try:
        # Get the league and verify player is in the league
        league = get_object_or_404(FantasyLeague, id=league_id)
        player = get_object_or_404(IPLPlayer, id=player_id)
        
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
            base_points = (
                event.match_event.batting_points_total +
                event.match_event.bowling_points_total +
                event.match_event.fielding_points_total +
                event.match_event.other_points_total
            )
            squad_stats[squad_id]['basePoints'] += base_points
            squad_stats[squad_id]['boostPoints'] += (event.total_points - base_points)
            squad_stats[squad_id]['totalPoints'] += event.total_points

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
            
            match_detail = {
                'opponent': match.team_2.short_name if match.team_1 == player.current_team else match.team_1.short_name,
                'date': match.date.strftime('%d %b %Y'),
                'squad': event.fantasy_squad.name,
                'basePoints': (
                    match_event.batting_points_total +
                    match_event.bowling_points_total +
                    match_event.fielding_points_total +
                    match_event.other_points_total
                ),
                'boostPoints': event.total_points - (
                    match_event.batting_points_total +
                    match_event.bowling_points_total +
                    match_event.fielding_points_total +
                    match_event.other_points_total
                ),
                'totalPoints': event.total_points
            }

            # Add batting details if exists
            if match_event.batting_points_total > 0:
                match_detail['batting'] = {
                    'score': match_event.runs_scored,
                    'balls': match_event.balls_faced,
                    'fours': match_event.fours,
                    'sixes': match_event.sixes,
                    'strikeRate': match_event.strike_rate,
                    'points': match_event.batting_points_total
                }

            # Add bowling details if exists
            if match_event.bowling_points_total > 0:
                match_detail['bowling'] = {
                    'overs': match_event.overs_bowled,
                    'maidens': match_event.maidens,
                    'runs': match_event.runs_conceded,
                    'wickets': match_event.wickets,
                    'economy': match_event.economy_rate,
                    'points': match_event.bowling_points_total
                }

            # Add fielding details if exists
            if match_event.fielding_points_total > 0:
                match_detail['fielding'] = {
                    'catches': match_event.catches,
                    'runouts': match_event.run_outs,
                    'points': match_event.fielding_points_total
                }

            match_details.append(match_detail)

        # Get current team info
        current_team = player.playerteamhistory_set.filter(
            season=league.season
        ).select_related('team').first()

        # Update the response_data section
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
        import traceback
        print("Error in get_player_fantasy_stats: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )