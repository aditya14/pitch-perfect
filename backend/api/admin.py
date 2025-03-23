from django.contrib import admin, messages
from django.contrib.auth.models import User
from django.db.models import Prefetch, Index
from django.db import models
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.shortcuts import render, redirect
from django.urls import path, reverse
from .models import (Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, IPLMatch, 
                     IPLPlayerEvent, FantasyLeague, FantasySquad, UserProfile, FantasyDraft, FantasyPlayerEvent, FantasyBoostRole, FantasyTrade)

from .forms import CSVUploadForm
import csv
from io import TextIOWrapper
from django.db.models import Q, Avg, F

import logging
_logger = logging.getLogger(__name__)


@admin.action(description="Update default draft order based on current roster and historical performance")
def update_default_draft_order(modeladmin, request, queryset):
    for season in queryset:
        try:
            # Get all players with a valid team history for this season
            player_histories = PlayerTeamHistory.objects.filter(
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
                events = IPLPlayerEvent.objects.filter(
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
class SeasonAdmin(admin.ModelAdmin):
    actions = [update_default_draft_order]
    list_display = ('year', 'name', 'start_date', 'end_date', 'status', 'default_draft_order')
    list_filter = ('status',)
    search_fields = ('name', 'year')

admin.site.register(Season, SeasonAdmin)

@admin.register(IPLTeam)
class IPLTeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'city', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'short_name', 'city')

@admin.register(TeamSeason)
class TeamSeasonAdmin(admin.ModelAdmin):
    list_display = ('team', 'season')
    list_filter = ('season',)
    search_fields = ('team__name',)

# START IPL PLayer Admin Definition
from django.db.models import Count, Sum, F, ExpressionWrapper, IntegerField, Case, When, Value

@admin.register(IPLPlayer)
class IPLPlayerAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'role', 'get_current_team', 'get_match_count', 'get_total_points', 'get_average_points')
    list_filter = (
        'role', 
        'is_active',
        ('playerteamhistory__team', admin.RelatedFieldListFilter),
    )
    search_fields = ('name',)

    def get_current_team(self, obj):
        current_team = obj.playerteamhistory_set.filter(
            season_id=17  # IPL 2025
        ).first()
        return current_team.team.name if current_team else '-'
    get_current_team.short_description = 'Current Team'

    def get_match_count(self, obj):
        return obj.match_count
    get_match_count.short_description = 'Matches'
    get_match_count.admin_order_field = 'match_count'

    def get_total_points(self, obj):
        return obj.total_points or 0
    get_total_points.short_description = 'Total Points'
    get_total_points.admin_order_field = 'total_points'

    def get_average_points(self, obj):
        return obj.avg_points
    get_average_points.short_description = 'Average Points'
    get_average_points.admin_order_field = 'avg_points'

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            match_count=Count('iplplayerevent'),
            total_points=Sum('iplplayerevent__total_points_all'),
            avg_points=Case(
                When(match_count__gt=0, 
                     then=ExpressionWrapper(
                         F('total_points') * 1.0 / F('match_count'),
                         output_field=IntegerField()
                     )),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).prefetch_related('playerteamhistory_set__team')

# END IPL Player Admin Definition


@admin.register(PlayerTeamHistory)
class PlayerTeamHistoryAdmin(admin.ModelAdmin):
    list_display = ('player', 'team', 'season', 'points')
    list_filter = ('team', 'season')
    search_fields = ('player__name', 'team__name')

@admin.register(IPLMatch)
class IPLMatchAdmin(admin.ModelAdmin):
    list_display = ('formatted_match', 'match_number', 'season', 'date', 'status', 'player_of_match')
    list_filter = ('season', 'status', 'team_1', 'team_2')
    search_fields = ('team_1__name', 'team_2__name', 'venue')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('season', 'match_number', 'stage', 'phase', 'date', 'venue', 'status')
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
        # Track the old player_of_match value before saving
        if change:  # if this is an edit
            old_obj = IPLMatch.objects.get(pk=obj.pk)
            old_potm = old_obj.player_of_match
        else:
            old_potm = None

        # Save the match object first
        super().save_model(request, obj, form, change)

        # Handle player_of_match updates
        if obj.player_of_match != old_potm:
            # If there was a previous POTM, set their event's player_of_match to False
            if old_potm:
                IPLPlayerEvent.objects.filter(
                    match=obj,
                    player=old_potm
                ).update(player_of_match=False)

            # If there's a new POTM, set their event's player_of_match to True
            if obj.player_of_match:
                IPLPlayerEvent.objects.filter(
                    match=obj,
                    player=obj.player_of_match
                ).update(player_of_match=True)

                # Recalculate points for affected IPL events
                affected_events = IPLPlayerEvent.objects.filter(
                    Q(match=obj, player=obj.player_of_match) |
                    (Q(match=obj, player=old_potm) if old_potm else Q())
                )
                for event in affected_events:
                    event.save()  # This recalculates the base points

                # Now also update the related FantasyPlayerEvents for POTM changes
                # Get all fantasy events related to the affected IPL events
                fantasy_events = FantasyPlayerEvent.objects.filter(
                    match_event__in=affected_events
                ).select_related('match_event', 'boost')

                # Recalculate boost points for each fantasy event
                for fantasy_event in fantasy_events:
                    if fantasy_event.boost:
                        # Recalculate boost points based on the updated IPL event
                        ipl_event = fantasy_event.match_event
                        boost = fantasy_event.boost
                        
                        # For Captain (2x) and Vice Captain (1.5x) roles that apply to all points
                        if boost.label in ['Captain', 'Vice Captain']:
                            # The boost is (multiplier - 1) * base_points
                            multiplier = boost.multiplier_runs  # All multipliers are the same for these roles
                            fantasy_event.boost_points = (multiplier - 1.0) * ipl_event.total_points_all
                        # For POTM-specific boosts in other roles
                        elif ipl_event.player_of_match:
                            # Update POTM boost component
                            potm_points = 50  # POTM gets 50 points
                            potm_boost = potm_points * (boost.multiplier_potm - 1.0)
                            # Add/Remove the POTM boost component
                            current_boost = fantasy_event.boost_points
                            if old_potm and ipl_event.player == obj.player_of_match:
                                # Player just became POTM, add the boost
                                fantasy_event.boost_points = current_boost + potm_boost
                            elif not old_potm and ipl_event.player == old_potm:
                                # Player just lost POTM, remove the boost
                                fantasy_event.boost_points = current_boost - potm_boost
                        
                        fantasy_event.save()

                # Update total points for affected fantasy squads
                affected_squads = set(fantasy_events.values_list('fantasy_squad_id', flat=True))
                for squad_id in affected_squads:
                    squad = FantasySquad.objects.get(id=squad_id)
                    # Calculate new total points
                    total_points = sum(
                        FantasyPlayerEvent.objects.filter(fantasy_squad=squad)
                        .annotate(total=F('match_event__total_points_all') + F('boost_points'))
                        .values_list('total', flat=True)
                    )
                    squad.total_points = total_points
                    squad.save()

                messages.success(request, f"Updated Player of the Match from {old_potm} to {obj.player_of_match}. Recalculated fantasy points for {len(fantasy_events)} fantasy events.")

# Add this to your admin.py file

from django.contrib import admin
from django.db import models
from .models import IPLPlayerEvent, IPLPlayer, IPLMatch, IPLTeam  # Import your actual models

class IPLPlayerEventAdmin(admin.ModelAdmin):
    # Efficient list display with limited columns
    list_display = ['id', 'player_name', 'match_description', 'team_name', 'total_points_all']
    list_display_links = ['id', 'player_name']
    
    # Optimize with limited search fields
    search_fields = ['player__name', 'match__team_1__name', 'match__team_2__name']
    
    # Add filters to help narrow down records
    list_filter = ['player_of_match', 'match__season__year', 'match__stage']
    
    # Define what fields are readonly to prevent accidental changes
    readonly_fields = [
        'batting_points_total', 'bowling_points_total', 
        'fielding_points_total', 'other_points_total', 
        'total_points_all', 'bat_strike_rate', 'bowl_economy'
    ]
    
    # Custom field sets to organize the edit form
    fieldsets = [
        ('Match Information', {
            'fields': ['player', 'match', 'for_team', 'vs_team']
        }),
        ('Batting', {
            'fields': ['bat_runs', 'bat_balls', 'bat_fours', 'bat_sixes', 'bat_not_out', 'bat_innings', 'bat_strike_rate']
        }),
        ('Bowling', {
            'fields': ['bowl_balls', 'bowl_maidens', 'bowl_runs', 'bowl_wickets', 'bowl_innings', 'bowl_economy']
        }),
        ('Fielding', {
            'fields': ['field_catch', 'wk_catch', 'wk_stumping', 'run_out_solo', 'run_out_collab']
        }),
        ('Other', {
            'fields': ['player_of_match']
        }),
        ('Points (Calculated)', {
            'fields': ['batting_points_total', 'bowling_points_total', 'fielding_points_total', 
                      'other_points_total', 'total_points_all']
        }),
    ]
    
    # Override to efficiently load related objects
    def get_queryset(self, request):
        try:
            qs = super().get_queryset(request)
            # Use select_related for ForeignKey relationships
            return qs.select_related(
                'player', 
                'match', 
                'match__team_1', 
                'match__team_2', 
                'match__season',
                'for_team', 
                'vs_team'
            )
        except Exception as e:
            # Log error but return basic queryset to prevent admin crash
            logger.error(f"Error in IPLPlayerEventAdmin.get_queryset: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return super().get_queryset(request)
    
    # Custom methods to display related info without additional queries
    def player_name(self, obj):
        try:
            return obj.player.name if obj.player else None
        except Exception:
            return "Error loading player"
    player_name.short_description = 'Player'
    player_name.admin_order_field = 'player__name'
    
    def match_description(self, obj):
        try:
            if obj.match:
                team1 = obj.match.team_1.short_name if obj.match.team_1 else 'TBD'
                team2 = obj.match.team_2.short_name if obj.match.team_2 else 'TBD'
                return f"{team1} vs {team2} - Match {obj.match.match_number}"
            return None
        except Exception:
            return "Error loading match"
    match_description.short_description = 'Match'
    match_description.admin_order_field = 'match__match_number'
    
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
            logger.error(f"Error saving IPLPlayerEvent: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            messages.error(request, f"Error saving player event: {str(e)}")
            # Do not re-raise the exception to prevent the admin from crashing
    
    def _update_fantasy_events(self, ipl_event, request):
        """Update related fantasy player events when an IPL event changes"""
        try:
            from .models import FantasyPlayerEvent, FantasySquad
            from django.db.models import F
            
            # Find all related fantasy events
            fantasy_events = FantasyPlayerEvent.objects.filter(match_event=ipl_event)
            updated_count = 0
            
            # Keep track of affected fantasy squads
            affected_squads = set()
            
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
                        # This should call the same method that's used during normal scoring
                        from .services.cricket_data_service import CricketDataService
                        service = CricketDataService()
                        fantasy_event.boost_points = service._calculate_boost_points(ipl_event, boost)
                    
                    fantasy_event.save()
                    affected_squads.add(fantasy_event.fantasy_squad_id)
                    updated_count += 1
            
            # Update total points for affected squads
            for squad_id in affected_squads:
                try:
                    squad = FantasySquad.objects.get(id=squad_id)
                    # Calculate new total points
                    total_points = sum(
                        FantasyPlayerEvent.objects.filter(fantasy_squad=squad)
                        .annotate(total=F('match_event__total_points_all') + F('boost_points'))
                        .values_list('total', flat=True)
                    )
                    squad.total_points = total_points
                    squad.save()
                except Exception as squad_e:
                    logger.error(f"Error updating squad points: {str(squad_e)}")
            
            if updated_count > 0:
                messages.info(request, f"Updated {updated_count} fantasy events and {len(affected_squads)} fantasy squads")
                
        except Exception as e:
            logger.error(f"Error updating fantasy events: {str(e)}")
            messages.warning(request, f"Player event was saved, but could not update fantasy events: {str(e)}")
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Optimize foreign key fields to prevent timeouts with large datasets"""
        try:
            # Optimize player selection
            if db_field.name == "player":
                kwargs["queryset"] = IPLPlayer.objects.filter(is_active=True)
                
            # Optimize match selection to show recent matches first
            if db_field.name == "match":
                kwargs["queryset"] = IPLMatch.objects.order_by('-date')[:100]
                
            # Optimize team selection
            if db_field.name in ["for_team", "vs_team"]:
                kwargs["queryset"] = IPLTeam.objects.filter(is_active=True)
        except Exception as e:
            logger.error(f"Error in formfield_for_foreignkey: {str(e)}")
            
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

# Register with the admin site
admin.site.register(IPLPlayerEvent, IPLPlayerEventAdmin)

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
    list_display = ('name', 'admin', 'max_teams', 'season', 'draft_status', 'draft_actions')
    list_filter = ('season', 'draft_completed')
    search_fields = ('name', 'admin__username')
    raw_id_fields = ('admin',)
    
    def draft_status(self, obj):
        if obj.draft_completed:
            return format_html('<span style="color: green;">Complete</span>')
        else:
            return format_html('<span style="color: blue;">Not Started</span>')
    draft_status.short_description = 'Draft Status'
    
    def draft_actions(self, obj):
        """Custom buttons for draft actions"""
        if obj.draft_completed:
            return format_html('<span style="color: gray;">Draft Completed</span>')
        
        run_url = reverse('admin:run_fantasy_draft', args=[obj.pk])
        simulate_url = reverse('admin:simulate_fantasy_draft', args=[obj.pk])
            
        return format_html(
            '<a class="button" href="{}">Run Draft</a>&nbsp;'
            '<a class="button" href="{}?dry_run=1">Simulate</a>',
            run_url, simulate_url
        )
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
                    player = IPLPlayer.objects.get(id=player_id)
                    players.append({
                        'id': player.id,
                        'name': player.name,
                        'role': player.get_role_display(),
                        'team': player.current_team.team.name if player.current_team else 'Unknown'
                    })
                except IPLPlayer.DoesNotExist:
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

@admin.register(FantasySquad)
class FantasySquadAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'league', 'total_points', 'color')
    list_filter = ('league',)
    search_fields = ('name', 'user__username', 'league__name')
    raw_id_fields = ('user', 'league')

@admin.register(FantasyDraft)
class FantasyDraftAdmin(admin.ModelAdmin):
    list_display = ('league', 'squad', 'type')
    list_filter = ('league', 'type')
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
                    player = IPLPlayer.objects.get(id=player_id)
                    initiator_players.append(player.name)
                except IPLPlayer.DoesNotExist:
                    initiator_players.append(f"Unknown ({player_id})")
                    
            receiver_players = []
            for player_id in obj.players_received:
                try:
                    player = IPLPlayer.objects.get(id=player_id)
                    receiver_players.append(player.name)
                except IPLPlayer.DoesNotExist:
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
                        player = IPLPlayer.objects.get(id=new_player_id)
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