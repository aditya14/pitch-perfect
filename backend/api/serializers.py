from rest_framework import serializers
from .models import (Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, IPLMatch, FantasySquad, FantasyLeague, 
                     FantasyPlayerEvent, IPLPlayerEvent, FantasyTrade, FantasyMatchEvent)
from django.contrib.auth.models import User
import random
import string

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],  # Using email as username
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
        
class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ['id', 'year', 'name', 'start_date', 'end_date', 'status']

class IPLTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = IPLTeam
        fields = [
            'id', 'name', 'short_name', 'home_ground', 'city',
            'primary_color', 'secondary_color', 'logo', 'other_names',
            'is_active'
        ]

class TeamSeasonSerializer(serializers.ModelSerializer):
    team = IPLTeamSerializer(read_only=True)
    season = SeasonSerializer(read_only=True)
    
    class Meta:
        model = TeamSeason
        fields = ['id', 'team', 'season', 'captain', 'home_ground']

class IPLPlayerSerializer(serializers.ModelSerializer):
    current_team = serializers.SerializerMethodField()

    class Meta:
        model = IPLPlayer
        fields = [
            'id', 'name', 'nationality', 'dob', 'role',
            'batting_style', 'bowling_style', 'img', 'current_team',
            'is_active'
        ]

    def get_current_team(self, obj):
        current_team = obj.current_team
        if current_team:
            return IPLTeamSerializer(current_team.team).data
        return None

class PlayerTeamHistorySerializer(serializers.ModelSerializer):
    player = IPLPlayerSerializer(read_only=True)
    team = IPLTeamSerializer(read_only=True)
    season = SeasonSerializer(read_only=True)

    class Meta:
        model = PlayerTeamHistory
        fields = ['id', 'player', 'team', 'season', 'price']

class IPLMatchSerializer(serializers.ModelSerializer):
    team_1 = IPLTeamSerializer()
    team_2 = IPLTeamSerializer()
    winner = IPLTeamSerializer()
    toss_winner = IPLTeamSerializer()
    player_of_match = IPLPlayerSerializer()

    class Meta:
        model = IPLMatch
        fields = [
            'id', 'season', 'match_number', 'stage', 'phase',
            'team_1', 'team_2', 'date', 'venue', 'status',
            'toss_winner', 'toss_decision', 'winner',
            'win_margin', 'win_type', 'player_of_match',
            'inns_1_runs', 'inns_1_wickets', 'inns_1_overs',
            'inns_2_runs', 'inns_2_wickets', 'inns_2_overs'
        ]

class IPLMatchCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IPLMatch
        fields = '__all__'

class FantasySquadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FantasySquad
        fields = ['id', 'name', 'color', 'total_points', 'user']

class CreateLeagueRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FantasyLeague
        fields = ['id', 'name', 'color', 'max_teams', 'season']  # Added 'id' here

    def validate_season(self, value):
        if value.status != Season.Status.UPCOMING:
            raise serializers.ValidationError(
                "Can only create leagues for upcoming seasons"
            )
        return value

    def create(self, validated_data):
        # Generate a random 5-character code
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            if not FantasyLeague.objects.filter(league_code=code).exists():
                break
        
        validated_data['league_code'] = code
        return super().create(validated_data)

class LeagueDetailSerializer(serializers.ModelSerializer):
    season = SeasonSerializer(read_only=True)
    squads = FantasySquadSerializer(source='teams', many=True, read_only=True)
    my_squad = serializers.SerializerMethodField()
    squads_count = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyLeague
        fields = [
            'id', 'name', 'color', 'max_teams', 'season',
            'league_code', 'squads_count', 'my_squad',
            'created_at', 'squads', 'draft_completed', 'snake_draft_order'
        ]

    def get_squads_count(self, obj):
        return obj.teams.count()
    
    def get_my_squad(self, obj):
        request = self.context.get('request')
        if request:
            print("User:", request.user)
            squad = obj.teams.filter(user=request.user).first()
            print("Squad:", squad)
            if squad:
                return {
                    'id': squad.id,
                    'name': squad.name,
                    'color': squad.color,
                    'logo': squad.logo.url if squad.logo else None,
                    'total_points': squad.total_points
                }
        return None
    
    def get_season(self, obj):
        return obj.season.name

class CreateSquadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FantasySquad
        fields = ['name', 'color', 'league']

    def validate_league(self, value):
        if value.teams.count() >= value.max_teams:
            raise serializers.ValidationError("This league is full")
        return value

class SquadDetailSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name')
    league_id = serializers.IntegerField(source='league.id')  # Add this line
    user_id = serializers.IntegerField(source='user.id')      # Add this line

    class Meta:
        model = FantasySquad
        fields = [
            'id', 
            'name', 
            'color', 
            'league', 
            'league_id',    # Add this
            'league_name', 
            'user_id',      # Add this
            'total_points',
            'current_core_squad',
            'future_core_squad'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Handle JSONField data
        if instance.current_core_squad:
            ret['current_core_squad'] = instance.current_core_squad
        if instance.future_core_squad:
            ret['future_core_squad'] = instance.future_core_squad
        return ret
        
class CoreSquadUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating core squad assignments
    Expects format: {"future_core_squad": [{"boost_id": 1, "player_id": 2}, ...]}
    """
    class CoreSquadAssignmentSerializer(serializers.Serializer):
        boost_id = serializers.IntegerField()
        player_id = serializers.IntegerField()

    future_core_squad = CoreSquadAssignmentSerializer(many=True)

    def validate(self, data):
        assignments = data['future_core_squad']
        
        # Validate we have exactly 8 assignments
        if len(assignments) != 8:
            raise serializers.ValidationError(
                "Must provide exactly 8 core squad assignments"
            )
        
        return data

class SquadSerializer(serializers.ModelSerializer):
    league = LeagueDetailSerializer(read_only=True)
    
    class Meta:
        model = FantasySquad
        fields = [
            'id', 
            'name', 
            'league',
            'current_squad',  # List of player IDs
            'current_core_squad',  # List of {boost_id, player_id} dicts
            'future_core_squad'  # List of {boost_id, player_id} dicts
        ]

    def to_representation(self, instance):
        # Convert JSONField data to Python objects
        ret = super().to_representation(instance)
        if instance.current_core_squad:
            ret['current_core_squad'] = instance.current_core_squad
        if instance.future_core_squad:
            ret['future_core_squad'] = instance.future_core_squad
        return ret
    
class IPLPlayerEventSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name')
    team_name = serializers.CharField(source='for_team.short_name')
    team_color = serializers.CharField(source='for_team.primary_color')
    
    class Meta:
        model = IPLPlayerEvent
        fields = [
            'id', 'player_name', 'team_name', 'team_color',
            # Batting
            'bat_runs', 'bat_not_out', 'bat_balls', 'bat_strike_rate', 'bat_fours', 'bat_sixes',
            'batting_points_total',
            # Bowling
            'bowl_balls', 'bowl_maidens', 'bowl_runs', 'bowl_wickets', 'bowl_economy',
            'bowling_points_total',
            # Fielding
            'field_catch', 'wk_catch', 'wk_stumping', 'run_out_solo', 'run_out_collab',
            'fielding_points_total',
            # Other
            'player_of_match', 'other_points_total', 'total_points_all'
        ]

class FantasyPlayerEventSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='match_event.player.name')
    player_id = serializers.IntegerField(source='match_event.player.id')
    team_name = serializers.CharField(source='match_event.for_team.short_name')
    team_color = serializers.CharField(source='match_event.for_team.primary_color')
    squad_name = serializers.CharField(source='fantasy_squad.name')
    squad_color = serializers.CharField(source='fantasy_squad.color')
    base_stats = IPLPlayerEventSerializer(source='match_event')
    total_points = serializers.SerializerMethodField()  # Changed to SerializerMethodField
    boost_label = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyPlayerEvent
        fields = [
            'id', 'player_name', 'team_name', 'team_color', 'squad_name',
            'base_stats', 'boost_points', 'total_points', 'squad_color', 'boost_label', 'player_id'
        ]
    
    def get_total_points(self, obj):
        """Calculate total points as base points + boost points"""
        base_points = obj.match_event.total_points_all
        boost_points = obj.boost_points
        return base_points + boost_points
    
    def get_boost_label(self, obj):
        if obj.boost:
            return obj.boost.label
        return None
    
class FantasyTradeSerializer(serializers.ModelSerializer):
    initiator_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    initiator_color = serializers.SerializerMethodField()
    receiver_color = serializers.SerializerMethodField()
    players_given_details = serializers.SerializerMethodField()
    players_received_details = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyTrade
        fields = [
            'id', 'initiator', 'initiator_name', 'receiver', 
            'receiver_name', 'players_given', 'players_received', 
            'players_given_details', 'players_received_details',
            'status', 'created_at', 'updated_at', 'initiator_color', 'receiver_color'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']
    
    def get_initiator_name(self, obj):
        return obj.initiator.name if obj.initiator else None
    
    def get_receiver_name(self, obj):
        return obj.receiver.name if obj.receiver else None

    def get_initiator_color(self, obj):
        return obj.initiator.color if obj.initiator else None
    
    def get_receiver_color(self, obj):
        return obj.receiver.color if obj.receiver else None
    
    def get_players_given_details(self, obj):
        """Return details for players being given by initiator"""
        players = []
        
        if not obj.players_given:
            return players
            
        for player_id in obj.players_given:
            try:
                player = IPLPlayer.objects.get(id=player_id)
                players.append({
                    'id': player.id,
                    'name': player.name,
                    'role': player.role,
                    'team': player.current_team.team.short_name if player.current_team else None,
                    'img': player.img.url if player.img else None
                })
            except IPLPlayer.DoesNotExist:
                # Include just the ID if player not found
                players.append({'id': player_id, 'name': f'Unknown Player (ID: {player_id})'})
                
        return players
    
    def get_players_received_details(self, obj):
        """Return details for players being received by initiator"""
        players = []
        
        if not obj.players_received:
            return players
            
        for player_id in obj.players_received:
            try:
                player = IPLPlayer.objects.get(id=player_id)
                players.append({
                    'id': player.id,
                    'name': player.name,
                    'role': player.role,
                    'team': player.current_team.team.short_name if player.current_team else None,
                    'img': player.img.url if player.img else None
                })
            except IPLPlayer.DoesNotExist:
                # Include just the ID if player not found
                players.append({'id': player_id, 'name': f'Unknown Player (ID: {player_id})'})
                
        return players
    
class FantasyMatchEventSerializer(serializers.ModelSerializer):
    squad_name = serializers.CharField(source='fantasy_squad.name')
    squad_color = serializers.CharField(source='fantasy_squad.color')
    match_number = serializers.IntegerField(source='match.match_number')
    match_date = serializers.DateTimeField(source='match.date')
    team_1 = serializers.CharField(source='match.team_1.short_name')
    team_2 = serializers.CharField(source='match.team_2.short_name')
    
    class Meta:
        model = FantasyMatchEvent
        fields = ['id', 'match', 'fantasy_squad', 'squad_name', 'squad_color', 
                  'total_base_points', 'total_boost_points', 'total_points', 
                  'match_rank', 'running_rank', 'running_total_points',
                  'players_count', 'match_number', 'match_date', 'team_1', 'team_2']