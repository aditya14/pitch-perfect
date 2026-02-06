from django.contrib import admin, messages
from django.contrib.auth.models import User
from django.db.models import Prefetch, Index
from django.db import models
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.shortcuts import render, redirect
from django.urls import path, reverse
from .models import (
    Competition,
    CompetitionTeam,
    Season,
    SeasonPhase,
    DraftWindow,
    Team,
    SeasonTeam,
    Player,
    PlayerSeasonTeam,
    Match,
    PlayerMatchEvent,
    FantasyLeague,
    FantasySquad,
    SquadPhaseBoost,
    UserProfile,
    FantasyDraft,
    FantasyPlayerEvent,
    FantasyBoostRole,
    FantasyTrade,
    FantasyMatchEvent,
    FantasyStats,
)

from .forms import CSVUploadForm
import csv
from io import TextIOWrapper
from django.db.models import Q, Avg, F
from decimal import Decimal, ROUND_HALF_UP
from .services.stats_service import update_fantasy_stats

import logging
_logger = logging.getLogger(__name__)

@admin.action(description="Update default draft order based on current roster and historical performance")
def update_default_draft_order(modeladmin, request, queryset):
    for season in queryset:
        try:
            # Get all players with a valid team history for this season
            player_histories = PlayerSeasonTeam.objects.filter(
                season=season,
                is_active=True  # Assuming there's a field to mark active mappings
            ).select_related('player')
            
            # Get all relevant players
            players = [history.player for history in player_histories]
            player_ids = [player.id for player in players]
            
            # Calculate average points for each player (2021-2024)
            # First, let's get relevant seasons for filtering
            relevant_seasons = Season.objects.filter(
                Q(name__icontains='2021') | 
                Q(name__icontains='2022') | 
                Q(name__icontains='2023') | 
                Q(name__icontains='2024')
            )
            
            # Dictionary to store player averages
            player_averages = {}
            
            # For each player, calculate their average
            for player_id in player_ids:
                # Get all events for this player in 2021-2024 seasons
                events = PlayerMatchEvent.objects.filter(
                    player_id=player_id,
                    match__season__in=relevant_seasons
                )
                
                # If player has events, calculate average
                if events.exists():
                    avg_points = events.aggregate(avg_points=Avg('total_points'))['avg_points'] or 0
                else:
                    avg_points = 0
                
                player_averages[player_id] = avg_points
            
            # Sort player IDs by average points (highest first)
            sorted_player_ids = sorted(
                player_ids,
                key=lambda pid: player_averages.get(pid, 0),
                reverse=True
            )
            
            # Update the season's default draft order
            season.default_draft_order = sorted_player_ids
            season.save()
            
            # Also update existing draft orders if needed
            from .models import Draft
            drafts = Draft.objects.filter(season=season, is_completed=False)
            for draft in drafts:
                draft.order = season.default_draft_order
                draft.save()
            
            messages.success(
                request, 
                f"Successfully updated default draft order for {season.name} with {len(sorted_player_ids)} players."
            )
            
            # Log detailed information for admin review
            admin_message = f"Player rankings for {season.name}:\n"
            for i, pid in enumerate(sorted_player_ids[:20], 1):
                player = next((p for p in players if p.id == pid), None)
                if player:
                    admin_message += f"{i}. {player.name}: {player_averages[pid]:.2f} avg points\n"
            admin_message += f"... and {len(sorted_player_ids) - 20} more players"
            
            messages.info(request, admin_message)
            
        except Exception as e:
            messages.error(
                request, 
                f"Error updating default draft order for {season.name}: {str(e)}"
            )


# Register the action with the Season admin
@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'format', 'grade')
    list_filter = ('format', 'grade')
    search_fields = ('name',)


@admin.register(CompetitionTeam)
class CompetitionTeamAdmin(admin.ModelAdmin):
    list_display = ('competition', 'team')
    list_filter = ('competition',)
    search_fields = ('competition__name', 'team__name', 'team__short_name')


@admin.register(SeasonPhase)
class SeasonPhaseAdmin(admin.ModelAdmin):
    list_display = ('season', 'phase', 'label', 'open_at', 'lock_at')
    list_filter = ('season',)
    search_fields = ('label', 'season__name')


@admin.register(DraftWindow)
class DraftWindowAdmin(admin.ModelAdmin):
    list_display = ('season', 'label', 'kind', 'sequence', 'open_at', 'lock_at', 'retention_phase')
    list_filter = ('season', 'kind')
    search_fields = ('label', 'season__name')


@admin.register(SquadPhaseBoost)
class SquadPhaseBoostAdmin(admin.ModelAdmin):
    list_display = ('fantasy_squad', 'phase', 'created_at', 'updated_at')
    list_filter = ('phase', 'fantasy_squad__league')
    search_fields = ('fantasy_squad__name', 'phase__label')


class SeasonAdmin(admin.ModelAdmin):
    actions = [update_default_draft_order]
    list_display = ('competition', 'year', 'name', 'start_date', 'end_date', 'status', 'default_draft_order')
    list_filter = ('competition', 'status')
    search_fields = ('name', 'year', 'competition__name')

admin.site.register(Season, SeasonAdmin)

@admin.register(Team)
class IPLTeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'city', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'short_name', 'city')

@admin.register(SeasonTeam)
class TeamSeasonAdmin(admin.ModelAdmin):
    list_display = ('team', 'season')
    list_filter = ('season',)
    search_fields = ('team__name',)

# START IPL Player Admin Definition
from django.db.models import Count, Sum, F, ExpressionWrapper, IntegerField, Case, When, Value, FloatField, Prefetch
from .models import Season, PlayerSeasonTeam
import logging
_logger = logging.getLogger(__name__)

@admin.register(Player)
class IPLPlayerAdmin(admin.ModelAdmin):
    # Further simplify list_display
    list_display = ('id', 'name', 'role', 'is_active')  # Removed get_current_team
    list_filter = (
        'role',
        'is_active',
    )
    search_fields = ('name',)

    # Add save_model override for debugging
    def save_model(self, request, obj, form, change):
        _logger.info(f"Attempting to save Player: {obj.name}, change={change}")
        try:
            super().save_model(request, obj, form, change)
            _logger.info(f"Successfully saved Player: {obj.name}")
        except Exception as e:
            _logger.exception(f"Error saving Player {obj.name}: {e}")
            raise

# END IPL Player Admin Definition

@admin.register(PlayerSeasonTeam)
class PlayerTeamHistoryAdmin(admin.ModelAdmin):
    list_display = ('player', 'team', 'season', 'points')
    list_filter = ('team', 'season')
    search_fields = ('player__name', 'team__name')
    # Use raw_id_fields for potentially large foreign keys
    raw_id_fields = ('player', 'team', 'season')

    # Add save_model override for debugging
    def save_model(self, request, obj, form, change):
        player_name = obj.player.name if obj.player else "Unknown Player"
        team_name = obj.team.name if obj.team else "Unknown Team"
        season_name = obj.season.name if obj.season else "Unknown Season"
        _logger.info(f"Attempting to save PlayerSeasonTeam: Player='{player_name}', Team='{team_name}', Season='{season_name}', change={change}")
        try:
            super().save_model(request, obj, form, change)
            _logger.info(f"Successfully saved PlayerSeasonTeam for Player='{player_name}', Season='{season_name}'")
        except Exception as e:
            _logger.exception(f"Error saving PlayerSeasonTeam for Player='{player_name}', Season='{season_name}': {e}")
            # Add a user-facing message as well
            messages.error(request, f"Failed to save history record: {e}")
            # Re-raise the exception for Django's default handling, but we've logged it.
            raise

@admin.register(Match)
class IPLMatchAdmin(admin.ModelAdmin):
    list_display = ('formatted_match', 'match_number', 'season', 'date', 'status', 'player_of_match')
    list_filter = ('season', 'season_phase', 'status', 'team_1', 'team_2')
    search_fields = ('team_1__name', 'team_2__name', 'venue')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('season', 'season_phase', 'match_number', 'stage', 'phase', 'date', 'venue', 'status')
        }),
        ('Teams', {
            'fields': ('team_1', 'team_2')
        }),
        ('Match Details', {
            'fields': (
                'toss_winner',
                'toss_decision',
                'winner',
                'win_type',
                'win_margin',
                'player_of_match'
            )
        }),
        ('Innings Details', {
            'fields': (
                'inns_1_runs',
                'inns_1_wickets',
                'inns_1_overs',
                'inns_2_runs',
                'inns_2_wickets',
                'inns_2_overs'
            )
        }),
        ('Other', {
            'fields': ('cricdata_id',)
        })
    )

    def formatted_match(self, obj):
        if obj.stage == "LEAGUE":
            return f"Match {obj.match_number} - {obj.team_1} vs {obj.team_2}"
        else:
            team_1 = obj.team_1.short_name if obj.team_1 else "TBD"
            team_2 = obj.team_2.short_name if obj.team_2 else "TBD"
            return f"{obj.stage} - {team_1} vs {team_2}"
    formatted_match.short_description = "Match"

    def save_model(self, request, obj, form, change):
        # Track if player_of_match was changed
        player_of_match_changed = False
        old_player_of_match = None
        
        # Check if this is an update and if player_of_match field changed
        if change and 'player_of_match' in form.changed_data:
            # Get the original object from database to find old player_of_match
            old_obj = self.model.objects.get(pk=obj.pk)
            old_player_of_match = old_obj.player_of_match
            player_of_match_changed = True
        
        # Save the match
        super().save_model(request, obj, form, change)
        
        # If player_of_match field was changed, update related events
        if player_of_match_changed:
            from api.models import PlayerMatchEvent, FantasyPlayerEvent, FantasyMatchEvent, FantasySquad
            from api.services.cricket_data_service import CricketDataService
            
            # Create service instance
            service = CricketDataService()
            
            # Get all player events for this match
            all_player_events = PlayerMatchEvent.objects.filter(match=obj)
            
            # First reset player_of_match for all events
            for event in all_player_events:
                if event.player_of_match:
                    event.player_of_match = False
                    # We need to force recalculation of the point totals
                    # First store the current values for our debugging
                    old_total = event.total_points_all
                    old_other = event.other_points_total
                    
                    # Trigger a full recalculation by calling save()
                    event.save()
                    
                    # For debugging, check if values changed
                    event.refresh_from_db()
                    print(f"Old POM: Total points changed from {old_total} to {event.total_points_all}")
                    print(f"Old POM: Other points changed from {old_other} to {event.other_points_total}")
            
            # Then set the new player of the match (if there is one)
            if obj.player_of_match:
                for event in all_player_events.filter(player=obj.player_of_match):
                    event.player_of_match = True
                    
                    # Debug current values
                    old_total = event.total_points_all
                    old_other = event.other_points_total
                    
                    # Save to trigger recalculation
                    event.save()
                    
                    # Check if values changed
                    event.refresh_from_db()
                    print(f"New POM: Total points changed from {old_total} to {event.total_points_all}")
                    print(f"New POM: Other points changed from {old_other} to {event.other_points_total}")
            
            # Get affected player IDs (old and new player of the match)
            affected_player_ids = []
            if old_player_of_match:
                affected_player_ids.append(old_player_of_match.id)
            if obj.player_of_match:
                affected_player_ids.append(obj.player_of_match.id)
            
            # Get all fantasy player events that need to be updated
            if affected_player_ids:
                # Get all affected IPL player events (both old and new POM)
                affected_ipl_events = all_player_events.filter(
                    player_id__in=affected_player_ids
                )
                
                # Refresh our local copies from the database to ensure we have the updated values
                refreshed_ipl_events = list(PlayerMatchEvent.objects.filter(id__in=[e.id for e in affected_ipl_events]))
                
                # Update all fantasy player events that use these IPL events
                affected_fantasy_events = FantasyPlayerEvent.objects.filter(
                    match_event__in=refreshed_ipl_events
                ).select_related('match_event', 'fantasy_squad')
                
                # Update each fantasy player event
                affected_squad_ids = set()
                for fantasy_event in affected_fantasy_events:
                    # Get the fresh event from our refreshed list
                    ipl_event = next((e for e in refreshed_ipl_events if e.id == fantasy_event.match_event_id), None)
                    
                    old_boost = fantasy_event.boost_points
                    
                    # Recalculate boost points with the updated base points
                    fantasy_event.boost_points = service._calculate_boost_points(ipl_event, fantasy_event.boost)
                    fantasy_event.save()
                    
                    print(f"Fantasy Event: Boost points changed from {old_boost} to {fantasy_event.boost_points}")
                    
                    affected_squad_ids.add(fantasy_event.fantasy_squad_id)
                
                # Update all fantasy match events for affected squads
                for squad_id in affected_squad_ids:
                    # Get all fantasy player events for this squad and match (refresh from DB)
                    squad_events = FantasyPlayerEvent.objects.filter(
                        fantasy_squad_id=squad_id,
                        match_event__match=obj
                    ).select_related('match_event')
                    
                    # Calculate totals with Decimal precision
                    base_decimal = sum(Decimal(str(e.match_event.total_points_all)) for e in squad_events)
                    boost_decimal = sum(Decimal(str(e.boost_points)) for e in squad_events)
                    total_decimal = base_decimal + boost_decimal

                    # Round to 1 decimal place with consistent rounding
                    base_points = float(base_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    boost_points = float(boost_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    total_points = float(total_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    
                    # Get existing match event if any
                    try:
                        match_event = FantasyMatchEvent.objects.get(
                            match=obj,
                            fantasy_squad_id=squad_id
                        )
                        
                        old_base = match_event.total_base_points
                        old_boost = match_event.total_boost_points
                        old_total = match_event.total_points
                        
                        # Update with new values
                        match_event.total_base_points = base_points
                        match_event.total_boost_points = boost_points
                        match_event.total_points = total_points
                        match_event.save()
                        
                        print(f"Squad {squad_id}: Base points changed from {old_base} to {base_points}")
                        print(f"Squad {squad_id}: Boost points changed from {old_boost} to {boost_points}")
                        print(f"Squad {squad_id}: Total points changed from {old_total} to {total_points}")
                        
                    except FantasyMatchEvent.DoesNotExist:
                        # Create new match event
                        match_event = FantasyMatchEvent.objects.create(
                            match=obj,
                            fantasy_squad_id=squad_id,
                            total_base_points=base_points,
                            total_boost_points=boost_points,
                            total_points=total_points,
                            players_count=squad_events.count()
                        )
                        print(f"Created new match event for squad {squad_id} with {total_points} points")
                
                # Update ranks for all fantasy match events
                service._update_match_ranks(obj)
                service._update_running_ranks(obj)
                
                # NEW CODE: Update total_points for all affected FantasySquads
                for squad_id in affected_squad_ids:
                    squad = FantasySquad.objects.get(id=squad_id)
                    old_total = squad.total_points
                    
                    # Calculate new total from all fantasy player events
                    total_points = FantasyPlayerEvent.objects.filter(
                        fantasy_squad=squad
                    ).annotate(
                        event_total=F('match_event__total_points_all') + F('boost_points')
                    ).aggregate(
                        total=Sum('event_total')
                    )['total'] or 0
                    
                    # Update the squad's total points
                    squad.total_points = total_points
                    squad.save(update_fields=['total_points'])
                    
                    print(f"Updated FantasySquad {squad.name} total points: {old_total} -> {total_points}")

@admin.register(PlayerMatchEvent)
class IPLPlayerEventAdmin(admin.ModelAdmin):
    # Select only the fields you need to display in the list view
    list_display = ('id', 'player_name', 'match_info', 'total_points_all')
    
    # Add search capability
    search_fields = ('player__name', 'match__match_number')
    
    # Add list filtering
    list_filter = ('player__role', 'match__status')
    
    # Optimize the queryset with select_related
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'player', 
            'match',
            'for_team', 
            'vs_team'
        )
    
    # Custom display methods
    def player_name(self, obj):
        try:
            return obj.player.name if obj.player else "N/A"
        except:
            return f"Player {obj.player_id}"
    player_name.short_description = 'Player'
    
    def match_info(self, obj):
        try:
            if obj.match:
                return f"Match {obj.match.match_number} - {obj.for_team.short_name} vs {obj.vs_team.short_name}"
            return "N/A"
        except:
            return f"Match {obj.match_id}"
    match_info.short_description = 'Match'
    
    # Use raw_id_fields to prevent Django from loading full querysets
    raw_id_fields = ('player', 'match', 'for_team', 'vs_team')
    
    # Limit fields shown in the admin form
    fields = (
        'player', 'match', 'for_team', 'vs_team',
        'bat_runs', 'bat_balls', 'bat_fours', 'bat_sixes', 'bat_not_out',
        'bowl_balls', 'bowl_maidens', 'bowl_runs', 'bowl_wickets',
        'field_catch', 'wk_catch', 'wk_stumping', 'run_out_solo', 'run_out_collab',
        'player_of_match',
        'total_points_all'
    )
    
    # Make some fields read-only
    readonly_fields = ('total_points_all',)
    
    # Customize the way the change form loads data
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        
        # This is optional - disable some fields for better performance
        if obj:  # Only on edit, not on create
            form.base_fields['player'].queryset = form.base_fields['player'].queryset.select_related('playerseasonteam_set__team')
            form.base_fields['match'].queryset = form.base_fields['match'].queryset.select_related('team_1', 'team_2')
            
        return form
    
    def team_name(self, obj):
        try:
            return obj.for_team.short_name if obj.for_team else None
        except Exception:
            return "Error loading team"
    team_name.short_description = 'Team'
    team_name.admin_order_field = 'for_team__short_name'
    
    def save_model(self, request, obj, form, change):
        """Override save_model to add error handling and proper point calculation"""
        try:
            # Only calculate the points if they are NULL or user is changing data
            obj.batting_points_total = obj.bat_points
            obj.bowling_points_total = obj.bowl_points
            obj.fielding_points_total = obj.field_points
            obj.other_points_total = obj.other_points
            obj.total_points_all = obj.base_points
            
            # Save the model
            super().save_model(request, obj, form, change)
            
            # Update affected fantasy player events
            self._update_fantasy_events(obj, request)
            
            messages.success(request, f"Successfully saved player event for {obj.player.name}")
        except Exception as e:
            logger.error(f"Error saving PlayerMatchEvent: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            messages.error(request, f"Error saving player event: {str(e)}")
            # Do not re-raise the exception to prevent the admin from crashing
    
    def _update_fantasy_events(self, ipl_event, request):
        """Update related fantasy events when an IPL event changes"""
        try:
            from .models import FantasyPlayerEvent, FantasySquad, FantasyMatchEvent
            from django.db.models import F, Sum
            from .services.cricket_data_service import CricketDataService
            
            # Find all related fantasy events
            fantasy_events = FantasyPlayerEvent.objects.filter(match_event=ipl_event)
            updated_count = 0
            
            # Keep track of affected fantasy squads
            affected_squads = set()
            
            # Create service instance for boost calculations
            service = CricketDataService()
            
            # Update each fantasy event
            for fantasy_event in fantasy_events:
                if fantasy_event.boost:
                    # Recalculate boost points based on the updated IPL event
                    boost = fantasy_event.boost
                    
                    # For Captain (2x) and Vice Captain (1.5x) roles that apply to all points
                    if boost.label in ['Captain', 'Vice Captain']:
                        # The boost is (multiplier - 1) * base_points
                        multiplier = boost.multiplier_runs  # All multipliers are the same for these roles
                        fantasy_event.boost_points = (multiplier - 1.0) * ipl_event.total_points_all
                    else:
                        # For specialized roles, we need to do more detailed calculations
                        fantasy_event.boost_points = service._calculate_boost_points(ipl_event, boost)
                    
                    fantasy_event.save(update_fields=['boost_points'])
                    affected_squads.add(fantasy_event.fantasy_squad_id)
                    updated_count += 1
            
            # Get the match
            match = ipl_event.match
            
            # Update match events for affected squads
            for squad_id in affected_squads:
                try:
                    squad = FantasySquad.objects.get(id=squad_id)
                    
                    # Get all fantasy player events for this squad and match
                    squad_events = FantasyPlayerEvent.objects.filter(
                        fantasy_squad=squad,
                        match_event__match=match
                    ).select_related('match_event')
                    
                    # Calculate totals with Decimal precision
                    base_decimal = sum(Decimal(str(e.match_event.total_points_all)) for e in squad_events)
                    boost_decimal = sum(Decimal(str(e.boost_points)) for e in squad_events)
                    total_decimal = base_decimal + boost_decimal

                    # Round to 1 decimal place with consistent rounding
                    base_points = float(base_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    boost_points = float(boost_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    total_points = float(total_decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
                    
                    # Update or create match event
                    match_event, created = FantasyMatchEvent.objects.get_or_create(
                        match=match,
                        fantasy_squad=squad,
                        defaults={
                            'total_base_points': base_points,
                            'total_boost_points': boost_points,
                            'total_points': total_points,
                            'players_count': squad_events.count()
                        }
                    )
                    
                    if not created:
                        match_event.total_base_points = base_points
                        match_event.total_boost_points = boost_points
                        match_event.total_points = total_points
                        match_event.players_count = squad_events.count()
                        match_event.save()
                    
                    # Update match ranks
                    if service:
                        service._update_match_ranks(match)
                        service._update_running_ranks(match)
                    
                    # Calculate new total points for the squad
                    new_total = FantasyPlayerEvent.objects.filter(
                        fantasy_squad=squad
                    ).annotate(
                        event_total=F('match_event__total_points_all') + F('boost_points')
                    ).aggregate(
                        total=Sum('event_total')
                    )['total'] or 0
                    
                    # Update the squad's total points
                    squad.total_points = new_total
                    squad.save(update_fields=['total_points'])
                    
                    if request:
                        from django.contrib import messages
                        messages.info(request, f"Updated squad {squad.name}: total points now {new_total}")
                    
                except Exception as squad_e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error updating squad points: {str(squad_e)}")
                    if request:
                        from django.contrib import messages
                        messages.warning(request, f"Error updating Squad {squad_id}: {str(squad_e)}")
            
            if request and updated_count > 0:
                from django.contrib import messages
                messages.info(request, f"Updated {updated_count} fantasy events and {len(affected_squads)} fantasy squads")
                    
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating fantasy events: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            if request:
                from django.contrib import messages
                messages.warning(request, f"Player event was saved, but could not update fantasy events: {str(e)}")
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Optimize foreign key fields while ensuring existing values remain valid"""
        try:
            # For player and team fields, continue using the optimized queries
            if db_field.name == "player":
                kwargs["queryset"] = Player.objects.filter(is_active=True)
                
            if db_field.name in ["for_team", "vs_team"]:
                kwargs["queryset"] = Team.objects.filter(is_active=True)
                
            # For the match field, do NOT limit the queryset when editing
            # Only limit it for new objects
            if db_field.name == "match":
                # Check if we're editing an existing object
                if 'object_id' in request.resolver_match.kwargs:
                    # We're editing, so don't limit the matches
                    pass  # Use the default queryset
                else:
                    # We're adding a new object, so limit to recent matches
                    kwargs["queryset"] = Match.objects.order_by('-date')[:100]
        except Exception as e:
            logger.error(f"Error in formfield_for_foreignkey: {str(e)}")
            
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('email', 'get_theme', 'is_active', 'date_joined')
    
    def get_theme(self, obj):
        return obj.profile.theme if hasattr(obj, 'profile') else '-'
    get_theme.short_description = 'Theme'

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme')
    list_filter = ('theme',)
    search_fields = ('user__email',)

@admin.register(FantasyLeague)
class FantasyLeagueAdmin(admin.ModelAdmin):
    actions = ['run_snake_draft']
    list_display = ('name', 'season', 'admin', 'draft_completed', 'stats_last_updated')
    list_filter = ('season', 'draft_completed')
    search_fields = ('name', 'admin__username')
    raw_id_fields = ('admin',)

    @admin.action(description="Run snake draft")
    def run_snake_draft(self, request, queryset):
        from .admin_views import run_draft_process

        if not queryset:
            messages.error(request, "Please select a league to run the snake draft.")
            return

        for league in queryset:
            try:
                results = run_draft_process(league.id, dry_run=False, force_new_snake_order=True)
                messages.success(
                    request,
                    f"Snake draft completed for {league.name}: "
                    f"{results['squads']} squads, {results['total_players_drafted']} total players drafted.",
                )
            except Exception as exc:
                messages.error(request, f"Error running snake draft for {league.name}: {exc}")

    def draft_status(self, obj):
        pre_season = "Completed" if obj.draft_completed else "Not Started"
        mid_season = "Completed" if getattr(obj, 'mid_season_draft_completed', False) else "Not Started"
        
        return format_html(
            'Pre-Season: <span style="color: {};">{}</span><br>'
            'Mid-Season: <span style="color: {};">{}</span>',
            'green' if obj.draft_completed else 'blue', pre_season,
            'green' if getattr(obj, 'mid_season_draft_completed', False) else 'blue', mid_season
        )
    draft_status.short_description = 'Draft Status'
    
    def draft_actions(self, obj):
        """Custom buttons for draft actions"""
        actions = []
        
        # Pre-season draft actions
        if not obj.draft_completed:
            run_url = reverse('admin:run_fantasy_draft', args=[obj.pk])
            simulate_url = reverse('admin:simulate_fantasy_draft', args=[obj.pk])
            actions.append(
                f'<a class="button" href="{run_url}">Run Pre-Season Draft</a>&nbsp;'
                f'<a class="button" href="{simulate_url}?dry_run=1">Simulate Pre-Season</a>'
            )
        
        # Mid-season draft actions
        mid_season_completed = getattr(obj, 'mid_season_draft_completed', False)
        if not mid_season_completed:
            mid_season_url = reverse('admin:run_mid_season_draft', args=[obj.pk])
            mid_season_sim_url = reverse('admin:simulate_mid_season_draft', args=[obj.pk])
            actions.append(
                f'<a class="button" style="background-color: #4CAF50;" href="{mid_season_url}">Run Mid-Season Draft</a>&nbsp;'
                f'<a class="button" style="background-color: #2196F3;" href="{mid_season_sim_url}?dry_run=1">Simulate Mid-Season</a>'
            )
        
        if not actions:
            return format_html('<span style="color: gray;">Drafts Completed</span>')
        
        return format_html('<br>'.join(actions))
    draft_actions.short_description = 'Draft Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/run-draft/',
                self.admin_site.admin_view(self.run_draft),
                name='run_fantasy_draft',
            ),
            path(
                '<path:object_id>/simulate-draft/',
                self.admin_site.admin_view(self.simulate_draft),
                name='simulate_fantasy_draft',
            ),
            path(
                '<path:object_id>/run-mid-season-draft/',
                self.admin_site.admin_view(self.run_mid_season_draft),
                name='run_mid_season_draft',
            ),
            path(
                '<path:object_id>/simulate-mid-season-draft/',
                self.admin_site.admin_view(self.simulate_mid_season_draft),
                name='simulate_mid_season_draft',
            ),
        ]
        return custom_urls + urls
    
    def run_draft(self, request, object_id):
        """Run the fantasy draft for a league"""
        try:
            league = self.get_object(request, object_id)
            dry_run = request.GET.get('dry_run', '0') == '1'
            
            # Call the draft function from admin_views
            from .admin_views import run_draft_process
            results = run_draft_process(league.id, dry_run)
            
            if dry_run:
                messages.info(request, f"Draft simulation completed for {league.name}. No changes saved.")
            else:
                messages.success(request, f"Draft completed successfully for {league.name}!")
            
            # Add detailed results to the message
            messages.info(request, f"Results: {results['squads']} squads, total players drafted: {results['total_players_drafted']}")
            
            for squad_id, count in results.get('squad_player_counts', {}).items():
                squad = FantasySquad.objects.get(id=squad_id)
                messages.info(request, f"Squad '{squad.name}': {count} players")
            
        except Exception as e:
            messages.error(request, f"Error running draft: {str(e)}")
            import traceback
            print(traceback.format_exc())  # Print traceback for debugging
            
        return redirect('admin:api_fantasyleague_changelist')
        
    def simulate_draft(self, request, object_id):
        """Simulate the fantasy draft without saving changes"""
        try:
            league = self.get_object(request, object_id)
            
            # Call the draft function with dry_run=True
            from .admin_views import run_draft_process
            results = run_draft_process(league.id, dry_run=True)
            
            # Run the draft simulation to see actual player assignments
            draft_simulation = self._simulate_draft_assignments(league)
            
            # Render a detailed results page
            context = {
                'title': f'Draft Simulation for {league.name}',
                'league': league,
                'results': results,
                'squad_assignments': draft_simulation,
                'opts': self.model._meta,
            }
            
            return render(request, 'admin/fantasy_draft_simulation.html', context)
            
        except Exception as e:
            messages.error(request, f"Error simulating draft: {str(e)}")
            return redirect('admin:api_fantasyleague_changelist')
            
    def _simulate_draft_assignments(self, league):
        """Run a draft simulation and return detailed assignments"""
        from .admin_views import ensure_draft_orders, generate_draft_order, run_complete_draft
        
        # Get all squads in the league
        squads = FantasySquad.objects.filter(league=league)
        
        # Ensure all squads have a draft order
        ensure_draft_orders(league, squads)
        
        # Use existing or generate new snake draft order
        snake_order = league.snake_draft_order or generate_draft_order(squads)
        
        # Run the draft - now using the complete draft function that assigns all players
        draft_results = run_complete_draft(
            league=league,
            squads=squads
        )
        
        # Format the results with player details for display
        formatted_results = []
        for squad_id, player_ids in draft_results.items():
            squad = FantasySquad.objects.get(id=squad_id)
            players = []
            
            for player_id in player_ids:
                try:
                    player = Player.objects.get(id=player_id)
                    players.append({
                        'id': player.id,
                        'name': player.name,
                        'role': player.get_role_display(),
                        'team': player.current_team.team.name if player.current_team else 'Unknown'
                    })
                except Player.DoesNotExist:
                    players.append({
                        'id': player_id,
                        'name': f'Unknown Player (ID: {player_id})',
                        'role': 'Unknown',
                        'team': 'Unknown'
                    })
            
            formatted_results.append({
                'squad': {
                    'id': squad.id,
                    'name': squad.name,
                    'user': squad.user.username
                },
                'players': players
            })
        
        return formatted_results
    
    def run_mid_season_draft(self, request, object_id):
        """Run the mid-season fantasy draft for a league"""
        try:
            league = self.get_object(request, object_id)
            dry_run = request.GET.get('dry_run', '0') == '1'
            verbose = request.GET.get('verbose', '0') == '1'
            
            # Call the draft function from admin_views
            from .admin_views import run_mid_season_draft_process
            results = run_mid_season_draft_process(league.id, dry_run, verbose)
            
            if dry_run:
                messages.info(request, f"Mid-season draft simulation completed for {league.name}. No changes saved.")
            else:
                messages.success(request, f"Mid-season draft completed successfully for {league.name}!")
            
            # Add detailed results to the message
            messages.info(request, f"Results: {results['squads']} squads")
            
            for squad_id, details in results.get('squad_results', {}).items():
                squad = FantasySquad.objects.get(id=squad_id)
                messages.info(request, f"Squad '{squad.name}': {details['retained']} retained + {details['drafted']} drafted = {details['total']} total")
            
        except Exception as e:
            messages.error(request, f"Error running mid-season draft: {str(e)}")
            import traceback
            print(traceback.format_exc())  # Print traceback for debugging
            
        return redirect('admin:api_fantasyleague_changelist')

    def simulate_mid_season_draft(self, request, object_id):
        """Simulate the mid-season fantasy draft without saving changes"""
        try:
            league = self.get_object(request, object_id)
            
            # Call the draft function with dry_run=True
            from .admin_views import run_mid_season_draft_process
            results = run_mid_season_draft_process(league.id, dry_run=True, verbose=True)
            
            # Render a detailed results page
            context = {
                'title': f'Mid-Season Draft Simulation for {league.name}',
                'league': league,
                'results': results,
                'squad_results': results.get('squad_results', {}),
                'opts': self.model._meta,
                'is_mid_season': True
            }
            
            return render(request, 'admin/fantasy_draft_simulation.html', context)
            
        except Exception as e:
            messages.error(request, f"Error simulating mid-season draft: {str(e)}")
            return redirect('admin:api_fantasyleague_changelist')
        
    def update_stats(self, request, queryset):
        from .services.stats_service import update_fantasy_stats
        updated = 0
        for league in queryset:
            try:
                stats, created = FantasyStats.objects.get_or_create(league=league)
                update_fantasy_stats(league.id)
                updated += 1
            except Exception as e:
                self.message_user(
                    request, 
                    f"Error updating stats for {league.name}: {str(e)}", 
                    level=messages.ERROR
                )
        
        self.message_user(
            request, 
            f"Successfully updated stats for {updated} leagues.",
            level=messages.SUCCESS
        )
    update_stats.short_description = "Update fantasy stats"

    # And add this to your list of actions
    actions = ['run_snake_draft', 'update_stats']  # Add to your existing actions list

    # Add this to display the last update time
    def stats_last_updated(self, obj):
        try:
            return obj.stats.last_updated
        except FantasyStats.DoesNotExist:
            return "Not calculated"
    stats_last_updated.short_description = "Stats Last Updated"

@admin.register(FantasySquad)
class FantasySquadAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'league', 'total_points', 'color')
    list_filter = ('league',)
    search_fields = ('name', 'user__username', 'league__name')
    raw_id_fields = ('user', 'league')

@admin.register(FantasyDraft)
class FantasyDraftAdmin(admin.ModelAdmin):
    list_display = ('league', 'squad', 'type', 'role')
    list_filter = ('league', 'type', 'role')
    search_fields = ('league__name', 'squad__name')

@admin.register(FantasyBoostRole)
class FantasyBoostRoleAdmin(admin.ModelAdmin):
    list_display = ('label', 'get_roles', 'get_batting_multipliers', 'get_bowling_multipliers')
    list_filter = ('role',)
    fieldsets = (
        ('Basic Info', {
            'fields': ('label', 'role')
        }),
        ('Batting Multipliers', {
            'fields': (
                'multiplier_runs',
                'multiplier_fours',
                'multiplier_sixes',
                'multiplier_sr',
                'multiplier_bat_milestones'
            ),
            'classes': ('wide',)
        }),
        ('Bowling Multipliers', {
            'fields': (
                'multiplier_wickets',
                'multiplier_maidens',
                'multiplier_economy',
                'multiplier_bowl_milestones'
            ),
            'classes': ('wide',)
        }),
        ('Fielding Multipliers', {
            'fields': (
                'multiplier_catches',
                'multiplier_stumpings',
                'multiplier_run_outs'
            ),
            'classes': ('wide',)
        }),
        ('Other Multipliers', {
            'fields': (
                'multiplier_potm',
                'multiplier_playing'
            ),
            'classes': ('wide',)
        }),
    )
    search_fields = ('label',)

    def get_roles(self, obj):
        return ", ".join(obj.role)
    get_roles.short_description = 'Roles'

    def get_batting_multipliers(self, obj):
        return f"Runs: {obj.multiplier_runs}x, SR: {obj.multiplier_sr}x"
    get_batting_multipliers.short_description = 'Batting'

    def get_bowling_multipliers(self, obj):
        return f"Wickets: {obj.multiplier_wickets}x, Econ: {obj.multiplier_economy}x"
    get_bowling_multipliers.short_description = 'Bowling'

@admin.register(FantasyPlayerEvent)
class FantasyPlayerEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_squad', 'get_player', 'get_match', 'get_boost', 'boost_points')
    list_filter = ('fantasy_squad__league',)
    search_fields = ('fantasy_squad__name', 'match_event__player__name')
    
    def get_queryset(self, request):
        # Add safer query with error handling
        qs = super().get_queryset(request)
        try:
            return qs.select_related(
                'fantasy_squad',
                'match_event__player',
                'match_event__match',
                'boost'
            )
        except Exception as e:
            # Log the error but return a basic queryset to prevent admin crash
            logger.error(f"Error in FantasyPlayerEventAdmin queryset: {str(e)}")
            return qs
    
    def get_squad(self, obj):
        try:
            return obj.fantasy_squad.name if obj.fantasy_squad else None
        except:
            return "Error loading squad"
    get_squad.short_description = 'Squad'
    
    def get_player(self, obj):
        try:
            return obj.match_event.player.name if obj.match_event and obj.match_event.player else None
        except:
            return "Error loading player"
    get_player.short_description = 'Player'
    
    def get_match(self, obj):
        try:
            match = obj.match_event.match if obj.match_event else None
            if match:
                return f"Match {match.match_number}"
            return None
        except:
            return "Error loading match"
    get_match.short_description = 'Match'
    
    def get_boost(self, obj):
        try:
            return obj.boost.label if obj.boost else None
        except:
            return "Error loading boost"
    get_boost.short_description = 'Boost'

@admin.register(FantasyTrade)
class FantasyTradeAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'trade_teams', 
        'player_summary', 
        'status', 
        'created_at', 
        'updated_at',
        'trade_actions'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['initiator__name', 'receiver__name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = [
        (None, {
            'fields': ['initiator', 'receiver', 'status']
        }),
        ('Trade Details', {
            'fields': ['players_given', 'players_received']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    def trade_teams(self, obj):
        """Display initiator and receiver teams with links"""
        initiator_url = reverse('admin:api_fantasysquad_change', args=[obj.initiator.id])
        receiver_url = reverse('admin:api_fantasysquad_change', args=[obj.receiver.id])
        
        return format_html(
            '<strong>{}</strong> → <strong>{}</strong>',
            format_html('<a href="{}">{}</a>', initiator_url, obj.initiator.name),
            format_html('<a href="{}">{}</a>', receiver_url, obj.receiver.name)
        )
    trade_teams.short_description = 'Trade Teams'
    
    def player_summary(self, obj):
        """Display a summary of players involved in the trade"""
        try:
            # Get player names
            initiator_players = []
            for player_id in obj.players_given:
                try:
                    player = Player.objects.get(id=player_id)
                    initiator_players.append(player.name)
                except Player.DoesNotExist:
                    initiator_players.append(f"Unknown ({player_id})")
                    
            receiver_players = []
            for player_id in obj.players_received:
                try:
                    player = Player.objects.get(id=player_id)
                    receiver_players.append(player.name)
                except Player.DoesNotExist:
                    receiver_players.append(f"Unknown ({player_id})")
            
            # Format as initiator's players → receiver's players
            return format_html(
                '<div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">{} → {}</div>',
                ", ".join(initiator_players) or "None",
                ", ".join(receiver_players) or "None"
            )
        except Exception as e:
            return f"Error: {str(e)}"
    player_summary.short_description = 'Players Traded'
    
    def trade_actions(self, obj):
        """Custom buttons for trade actions"""
        if obj.status == 'Pending':
            accept_url = reverse('admin:accept_trade', args=[obj.pk])
            reject_url = reverse('admin:reject_trade', args=[obj.pk])
            
            return format_html(
                '<a class="button" href="{}">Accept</a>&nbsp;'
                '<a class="button" style="background: #d9534f;" href="{}">Reject</a>',
                accept_url, reject_url
            )
        elif obj.status == 'Accepted':
            process_url = reverse('admin:process_trade', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}">Process Now</a>',
                process_url
            )
        return "-"
    trade_actions.short_description = 'Actions'
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/accept/',
                self.admin_site.admin_view(self.accept_trade),
                name='accept_trade',
            ),
            path(
                '<path:object_id>/reject/',
                self.admin_site.admin_view(self.reject_trade),
                name='reject_trade',
            ),
            path(
                '<path:object_id>/process/',
                self.admin_site.admin_view(self.process_trade),
                name='process_trade',
            ),
        ]
        return custom_urls + urls
    
    def accept_trade(self, request, object_id):
        from django.shortcuts import redirect
        from django.contrib import messages
        
        trade = self.get_object(request, object_id)
        trade.status = 'Accepted'
        trade.updated_at = timezone.now()
        trade.save()
        
        messages.success(request, f"Trade #{trade.id} has been accepted")
        return redirect('admin:api_fantasytrade_changelist')
    
    def reject_trade(self, request, object_id):
        from django.shortcuts import redirect
        from django.contrib import messages
        
        trade = self.get_object(request, object_id)
        trade.status = 'Rejected'
        trade.updated_at = timezone.now()
        trade.save()
        
        messages.success(request, f"Trade #{trade.id} has been rejected")
        return redirect('admin:api_fantasytrade_changelist')
    
    def process_trade(self, request, object_id):
        from django.shortcuts import redirect
        from django.contrib import messages
        
        trade = self.get_object(request, object_id)
        
        # Only process if status is Accepted
        if trade.status != 'Accepted':
            messages.error(request, f"Cannot process trade #{trade.id} with status {trade.status}")
            return redirect('admin:api_fantasytrade_changelist')
        
        # Process the trade by swapping players
        try:
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
            
            # Save changes
            initiator.save()
            receiver.save()
            
            # Update core squads if needed
            self._update_core_squad_after_trade(initiator, trade.players_given, trade.players_received)
            self._update_core_squad_after_trade(receiver, trade.players_received, trade.players_given)
            
            # Mark trade as closed
            trade.status = 'Closed'
            trade.updated_at = timezone.now()
            trade.save()
            
            messages.success(request, f"Trade #{trade.id} has been processed successfully")
        except Exception as e:
            messages.error(request, f"Error processing trade #{trade.id}: {str(e)}")
        
        return redirect('admin:api_fantasytrade_changelist')
    
    def _update_core_squad_after_trade(self, squad, players_removed, players_added):
        """Update core squad roles when players are traded"""
        if not hasattr(squad, 'current_core_squad') or not squad.current_core_squad:
            return
            
        core_squad = squad.current_core_squad
        
        # Find any core roles assigned to traded players
        for i, assignment in enumerate(core_squad):
            if assignment.get('player_id') in players_removed:
                # Check if we received a player that can take this role
                for new_player_id in players_added:
                    try:
                        player = Player.objects.get(id=new_player_id)
                        role_id = assignment.get('boost_id')
                        
                        from .models import FantasyBoostRole
                        role = FantasyBoostRole.objects.get(id=role_id)
                        
                        # If player role matches the boost role requirements
                        if player.role in role.role:
                            # Assign the new player to this role
                            core_squad[i]['player_id'] = new_player_id
                            break
                    except Exception:
                        # If any error occurs during reassignment, just skip
                        continue
                        
        squad.current_core_squad = core_squad
        squad.save()
    
    class Media:
        css = {
            'all': ('admin/css/vendor/buttons.css',)
        }

@admin.register(FantasyMatchEvent)
class FantasyMatchEventAdmin(admin.ModelAdmin):
    list_display = ('match', 'fantasy_squad', 'total_points', 'match_rank', 'running_rank')
    list_filter = ('match__season', 'fantasy_squad__league')
    search_fields = ('fantasy_squad__name', 'match__match_number')
    ordering = ('-match__date', 'match_rank')
    
    def get_queryset(self, request):
        # Optimize queryset with select_related to avoid N+1 query issues
        return super().get_queryset(request).select_related(
            'match', 'fantasy_squad', 'fantasy_squad__league', 'match__season'
        )
    
    fieldsets = (
        ('Match Info', {
            'fields': ('match', 'fantasy_squad')
        }),
        ('Points Breakdown', {
            'fields': ('total_base_points', 'total_boost_points', 'total_points')
        }),
        ('Rankings', {
            'fields': ('match_rank', 'running_rank', 'running_total_points')
        }),
        ('Other Stats', {
            'fields': ('players_count',)
        })
    )
    
    # Don't use readonly_fields that might not exist
    def get_readonly_fields(self, request, obj=None):
        if obj:  # This is an edit
            return ('match', 'fantasy_squad')
        return ()

@admin.register(FantasyStats)
class FantasyStatsAdmin(admin.ModelAdmin):
    list_display = ('league', 'last_updated')
    search_fields = ('league__name',)
    readonly_fields = ('last_updated', 'match_details', 'player_details')
    fieldsets = (
        (None, {
            'fields': ('league', 'last_updated')
        }),
        ('Pre-calculated Data', {
            'fields': ('match_details', 'player_details'),
            'classes': ('collapse',)
        }),
    )
