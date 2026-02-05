from rest_framework import serializers
from .models import Player
from django.db.models import Avg, Count

class PlayerRosterSerializer(serializers.ModelSerializer):
    team = serializers.SerializerMethodField()
    matches = serializers.IntegerField()
    avg_points = serializers.FloatField()
    rank = serializers.SerializerMethodField()
    fantasy_squad = serializers.SerializerMethodField()
    draft_position = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = ['id', 'name', 'role', 'team', 'matches', 'avg_points', 
                 'rank', 'fantasy_squad', 'draft_position']

    def get_team(self, obj):
        team_history = obj.playerseasonteam_set.filter(
            season=self.context['season']
        ).first()
        return team_history.team.short_name if team_history else None

    def get_rank(self, obj):
        return self.context.get('player_ranks', {}).get(obj.id, 0)
        
    def get_fantasy_squad(self, obj):
        return None  # Implement during draft phase
        
    def get_draft_position(self, obj):
        draft = self.context.get('draft_order')
        if not draft:
            return None
        try:
            return draft.order.index(obj.id)
        except (ValueError, AttributeError):
            return None