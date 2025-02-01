from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, action, authentication_classes
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
    IPLMatch, FantasyLeague, FantasySquad
)
from .serializers import (
    SeasonSerializer, IPLTeamSerializer, TeamSeasonSerializer,
    IPLPlayerSerializer, PlayerTeamHistorySerializer, IPLMatchSerializer,
    IPLMatchCreateUpdateSerializer, RegisterSerializer, UserSerializer,
    CreateLeagueRequestSerializer, LeagueDetailSerializer,
    FantasySquadSerializer, CreateSquadSerializer, SquadDetailSerializer
)

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

    @action(detail=True)
    def history(self, request, pk=None):
        player = self.get_object()
        history = PlayerTeamHistory.objects.filter(player=player)
        serializer = PlayerTeamHistorySerializer(history, many=True)
        return Response(serializer.data)

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
    
class LeagueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    filterset_fields = ['season']
    search_fields = ['name']
    
    def get_queryset(self):
        user = self.request.user
        return FantasyLeague.objects.filter(
            teams__user=user  # Changed from squads__user to teams__user
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateLeagueRequestSerializer
        return LeagueDetailSerializer

    def perform_create(self, serializer):
        # Set requesting user as admin
        serializer.save(admin=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_leagues(self, request):
        """Get all leagues user is part of"""
        print("\n=== My Leagues Debug ===")
        print("User:", request.user)
        print("Headers:", dict(request.headers))
        print("Auth:", request.auth)
        print("=========================\n")
        
        leagues = self.get_queryset()
        print("Query:", leagues.query)
        serializer = LeagueDetailSerializer(leagues, many=True)
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
            if FantasySquad.objects.filter(
                league=league,
                user=request.user
            ).exists():
                return Response(
                    {'error': 'You are already in this league'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if league is full
            if league.squads.count() >= league.max_teams:
                return Response(
                    {'error': 'League is full'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            return Response({
                'league': LeagueDetailSerializer(league).data
            })
            
        except FantasyLeague.DoesNotExist:
            return Response(
                {'error': 'Invalid league code'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        league = serializer.save(admin=request.user)
        response_data = LeagueDetailSerializer(league).data
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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