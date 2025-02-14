# draft_serializers.py

from rest_framework import serializers
from .models import FantasyDraft, FantasySquad
from django.utils import timezone


class FantasyDraftSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    closes_in = serializers.SerializerMethodField()
    
    class Meta:
        model = FantasyDraft
        fields = ['id', 'league', 'squad', 'type', 'order', 'can_edit', 'closes_in']
        read_only_fields = ['league', 'squad', 'type']

    def get_can_edit(self, obj):
        if not obj.league.season:
            return False
        days_until_season = (obj.league.season.start_date - timezone.now().date()).days
        return days_until_season >= 2

    def get_closes_in(self, obj):
        if not obj.league.season:
            return None
        from datetime import datetime, time
        # Convert the season start_date to a datetime object
        start_datetime = datetime.combine(obj.league.season.start_date, time.min)
        if not timezone.is_aware(start_datetime):
            start_datetime = timezone.make_aware(start_datetime, timezone.get_current_timezone())
        closes_at = start_datetime - timezone.timedelta(days=2)
        now = timezone.now()
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