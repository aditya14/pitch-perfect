from rest_framework import serializers
from .models import Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, IPLMatch, FantasySquad, FantasyLeague
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
            'id', 'season', 'match_number', 'stage', 
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
            'created_at', 'squads', 'draft_completed'
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

    class Meta:
        model = FantasySquad
        fields = [
            'id', 
            'name', 
            'color', 
            'league', 
            'league_name', 
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