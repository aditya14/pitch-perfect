# draft_serializers.py

from rest_framework import serializers
from .models import FantasyDraft, FantasySquad, IPLPlayer
from django.utils import timezone
from django.db.models import Case, When, F, Value, CharField, Avg
from django.db.models.functions import Coalesce

class FantasyDraftSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    closes_in = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyDraft
        fields = ['id', 'league', 'squad', 'draft_window', 'type', 'order', 'can_edit', 'closes_in']
        read_only_fields = ['league', 'squad', 'draft_window', 'type']

    def get_can_edit(self, obj):
        now = timezone.now()
        if obj.draft_window:
            return obj.draft_window.open_at <= now <= obj.draft_window.lock_at
        if not obj.league.season:
            return False
        days_until_season = (obj.league.season.start_date - now.date()).days
        return days_until_season >= 2

    def get_closes_in(self, obj):
        now = timezone.now()
        if obj.draft_window:
            closes_at = obj.draft_window.lock_at
            if closes_at < now:
                return 0
            return int((closes_at - now).total_seconds())
        if not obj.league.season:
            return None
        from datetime import datetime, time
        # Convert the season start_date to a datetime object
        start_datetime = datetime.combine(obj.league.season.start_date, time.min)
        if not timezone.is_aware(start_datetime):
            start_datetime = timezone.make_aware(start_datetime, timezone.get_current_timezone())
        closes_at = start_datetime - timezone.timedelta(days=2)
        if closes_at < now:
            return 0
        return int((closes_at - now).total_seconds())

    def validate_order(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Order must be a list of player IDs")
        # Ensure all IDs exist
        from .models import IPLPlayer
        valid_ids = set(IPLPlayer.objects.filter(
            id__in=value, 
            playerteamhistory__season=self.instance.league.season
        ).values_list('id', flat=True))
        
        if len(valid_ids) != len(value):
            raise serializers.ValidationError("Invalid player IDs in order")
        
        # Ensure no duplicates
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate player IDs in order")
            
        return value

class OptimizedFantasyDraftSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    closes_in = serializers.SerializerMethodField()
    players = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyDraft
        fields = ['id', 'league', 'squad', 'draft_window', 'type', 'order', 'can_edit', 'closes_in', 'players']
        read_only_fields = ['league', 'squad', 'draft_window', 'type']

    def get_can_edit(self, obj):
        now = timezone.now()
        if obj.draft_window:
            return obj.draft_window.open_at <= now <= obj.draft_window.lock_at
        if not obj.league.season:
            return False
        days_until_season = (obj.league.season.start_date - now.date()).days
        return days_until_season >= 2

    def get_closes_in(self, obj):
        now = timezone.now()
        if obj.draft_window:
            closes_at = obj.draft_window.lock_at
            if closes_at < now:
                return 0
            return int((closes_at - now).total_seconds())
        if not obj.league.season:
            return None
        from datetime import datetime, time
        # Convert the season start_date to a datetime object
        start_datetime = datetime.combine(obj.league.season.start_date, time.min)
        if not timezone.is_aware(start_datetime):
            start_datetime = timezone.make_aware(start_datetime, timezone.get_current_timezone())
        closes_at = start_datetime - timezone.timedelta(days=2)
        if closes_at < now:
            return 0
        return int((closes_at - now).total_seconds())
    
    def get_players(self, obj):
        """
        Return player data for all players in the draft order.
        Simplified approach to avoid complex query issues.
        """
        # Get player IDs from the order
        player_ids = obj.order
        if not player_ids:
            return []

        # Get the players - simple approach first, we can optimize later
        players_list = []
        season = obj.league.season
        
        try:
            # Fetch all players with a single query
            players = IPLPlayer.objects.filter(id__in=player_ids)
            player_dict = {p.id: p for p in players}
            
            # Get teams in a separate query to avoid the select_related issue
            team_map = {}
            if season:
                from .models import PlayerTeamHistory
                team_histories = PlayerTeamHistory.objects.filter(
                    player_id__in=player_ids,
                    season=season
                ).select_related('team')
                
                for history in team_histories:
                    team_map[history.player_id] = history.team.short_name
            
            # Map role codes to display names
            role_map = {
                'BAT': 'Batter',
                'BOWL': 'Bowler', 
                'ALL': 'All-Rounder',
                'WK': 'Wicket Keeper'
            }
            
            # Build the list of players in the original order
            for player_id in player_ids:
                player = player_dict.get(player_id)
                if player:
                    players_list.append({
                        'id': player.id,
                        'name': player.name,
                        'role': role_map.get(player.role, player.role if player.role else 'Unknown'),
                        'team': team_map.get(player.id, 'NA'),
                        'avg_points': 0.0  # We'll add this later if needed
                    })
            
            return players_list
        except Exception as e:
            # Log the error and return an empty list
            print(f"Error in get_players: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return []

    def validate_order(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Order must be a list of player IDs")
        # Validate player IDs exist
        valid_ids = set(IPLPlayer.objects.filter(id__in=value).values_list('id', flat=True))
        if len(valid_ids) != len(value):
            raise serializers.ValidationError("Invalid player IDs in order")
        return value
