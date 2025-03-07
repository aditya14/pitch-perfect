from django.contrib import admin, messages
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.shortcuts import render
from django.urls import path, reverse
from .models import (Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, IPLMatch, 
                     IPLPlayerEvent, FantasyLeague, FantasySquad, UserProfile, FantasyDraft, FantasyPlayerEvent, FantasyBoostRole, FantasyTrade)

from .forms import CSVUploadForm
import csv
from io import TextIOWrapper
from django.db.models import Q

import logging
_logger = logging.getLogger(__name__)

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('year', 'name', 'start_date', 'end_date', 'status', 'default_draft_order')
    list_filter = ('status',)
    search_fields = ('name', 'year')

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
    list_display = ('name', 'role', 'get_current_team', 'get_match_count', 'get_total_points', 'get_average_points')
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
            'fields': ('season', 'match_number', 'stage', 'date', 'venue', 'status')
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

                # Recalculate points for affected events
                affected_events = IPLPlayerEvent.objects.filter(
                    Q(match=obj, player=obj.player_of_match) |
                    (Q(match=obj, player=old_potm) if old_potm else Q())
                )
                for event in affected_events:
                    event.save()

class IPLPlayerEventAdmin(admin.ModelAdmin):
    list_display = [
        'match',
        'player',
        'for_team',
        'vs_team',
        'bat_runs',
        'get_strike_rate',
        'bowl_wickets',
        'get_economy',
        'player_of_match',
        'get_base_points'
    ]
    
    # Add sorting capabilities
    ordering = ('-match__date', 'player__name')
    
    def get_strike_rate(self, obj):
        return obj.bat_strike_rate if obj.bat_strike_rate is not None else '-'
    get_strike_rate.short_description = 'Strike Rate'

    def get_economy(self, obj):
        return obj.bowl_economy if obj.bowl_economy is not None else '-'
    get_economy.short_description = 'Economy'
    
    def get_base_points(self, obj):
        return obj.base_points
    get_base_points.short_description = 'Points'
    
    list_filter = [
        ('match__season', admin.RelatedFieldListFilter),  # Filter by season
        ('for_team', admin.RelatedFieldListFilter),       # Filter by team played for
        ('vs_team', admin.RelatedFieldListFilter),        # Filter by team played against
        'player__role',                                   # Filter by player role
        'player_of_match',                                # Filter by POTM
        ('match__date', admin.DateFieldListFilter),       # Filter by date
    ]
    
    search_fields = [
        'player__name',
        'match__match_number',
        'for_team__name',
        'vs_team__name',
        'match__season__year',
    ]

    date_hierarchy = 'match__date'

    def get_queryset(self, request):
        """Optimize queries by prefetching related fields"""
        queryset = super().get_queryset(request)
        return queryset.select_related(
            'player',
            'match',
            'match__season',
            'for_team',
            'vs_team'
        )
    
    readonly_fields = [
        'bat_strike_rate',
        'bowl_economy',
    ]
    
    fieldsets = (
        ('Match Information', {
            'fields': ('player', 'match', 'for_team', 'vs_team')
        }),
        ('Batting', {
            'fields': (
                'bat_runs',
                'bat_balls',
                'bat_fours',
                'bat_sixes',
                'bat_not_out',
                'bat_innings',
                'bat_strike_rate'
            )
        }),
        ('Bowling', {
            'fields': (
                'bowl_balls',
                'bowl_maidens',
                'bowl_runs',
                'bowl_wickets',
                'bowl_innings',
                'bowl_economy'
            )
        }),
        ('Fielding', {
            'fields': (
                'field_catch',
                'wk_catch',
                'wk_stumping',
                'run_out_solo',
                'run_out_collab'
            )
        }),
        ('Other', {
            'fields': ('player_of_match',)
        })
    )
    
    def get_strike_rate(self, obj):
        return obj.bat_strike_rate if obj.bat_strike_rate is not None else '-'
    get_strike_rate.short_description = 'Strike Rate'

    def get_economy(self, obj):
        return obj.bowl_economy if obj.bowl_economy is not None else '-'
    get_economy.short_description = 'Economy'
    
    list_filter = [
        'for_team',
        'vs_team',
        'player__role'
    ]
    
    search_fields = [
        'player__name',
        'match__name',
        'for_team__name',
        'vs_team__name'
    ]
    
    readonly_fields = [
        'bat_strike_rate',
        'bowl_economy',
        'get_base_points'
    ]
    
    fieldsets = (
        ('Match Information', {
            'fields': ('player', 'match', 'for_team', 'vs_team')
        }),
        ('Batting', {
            'fields': (
                'bat_runs',
                'bat_balls',
                'bat_fours',
                'bat_sixes',
                'bat_not_out',
                'bat_innings',
                'bat_strike_rate'
            )
        }),
        ('Bowling', {
            'fields': (
                'bowl_balls',
                'bowl_maidens',
                'bowl_runs',
                'bowl_wickets',
                'bowl_innings',
                'bowl_economy'
            )
        }),
        ('Fielding', {
            'fields': (
                'field_catch',
                'wk_catch',
                'wk_stumping',
                'run_out_solo',
                'run_out_collab'
            )
        }),
        ('Other', {
            'fields': ('player_of_match',)
        }),
        ('Points', {
            'fields': ('get_base_points',)
        })
    )
    
    def get_total_points(self, obj):
        return obj.base_points
    get_total_points.short_description = 'Total Points'
    
    def get_base_points(self, obj):
        return f"""
        Batting: {obj.bat_points}
        Bowling: {obj.bowl_points}
        Fielding: {obj.field_points}
        Other: {obj.other_points}
        Total: {obj.base_points}
        """
    get_base_points.short_description = 'Point Breakdown'

    def get_urls(self):
            urls = super().get_urls()
            custom_urls = [
                path('upload-csv/', self.admin_site.admin_view(self.upload_csv), name='upload_csv'),
            ]
            return custom_urls + urls

    def upload_csv(self, request):
        from api.models import IPLPlayer, IPLMatch, IPLTeam
        import logging
        from decimal import Decimal
        from io import TextIOWrapper
        import csv
        from django.db import connection
        
        if request.method == 'POST':
            form = CSVUploadForm(request.POST, request.FILES)
            if form.is_valid():
                csv_file = form.cleaned_data['csv_file']
                try:
                    data = TextIOWrapper(csv_file.file, encoding='utf-8')
                    reader = csv.DictReader(data)
                    
                    # Temporarily disable the foreign key check
                    with connection.cursor() as cursor:
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
                    
                    for row_number, row in enumerate(reader, start=1):
                        logging.info(f"Processing row {row_number}: {row}")
                        
                        try:
                            # Get match
                            match_id = int(row['match_id'])
                            match = IPLMatch.objects.get(id=match_id)
                            
                            # Get player
                            player_id = int(row['player'])
                            player = IPLPlayer.objects.get(id=player_id)
                            
                            # Get teams - directly from database to bypass Django's checks
                            for_team_id = int(row['for_team_id'])
                            vs_team_id = int(row['vs_team_id'])
                            for_team = IPLTeam.objects.get(id=for_team_id)
                            vs_team = IPLTeam.objects.get(id=vs_team_id)
                            
                            def parse_number(value):
                                if value in (None, '', 'NULL'):
                                    return None
                                try:
                                    return int(float(value))
                                except (ValueError, TypeError):
                                    return None
                                    
                            def parse_boolean(value):
                                if value in (None, '', 'NULL'):
                                    return False
                                return bool(int(value))
                            
                            event_data = {
                                "match": match,
                                "player": player,
                                "for_team": for_team,
                                "vs_team": vs_team,
                                "bat_runs": parse_number(row.get('bat_runs')),
                                "bat_balls": parse_number(row.get('bat_balls')),
                                "bat_fours": parse_number(row.get('fours')),
                                "bat_sixes": parse_number(row.get('sixes')),
                                "bat_not_out": parse_boolean(row.get('not_out')),
                                "bat_innings": parse_number(row.get('bat_inngs')),
                                "bowl_balls": parse_number(row.get('bowl_balls')),
                                "bowl_maidens": parse_number(row.get('maidens')),
                                "bowl_runs": parse_number(row.get('bowl_runs')),
                                "bowl_wickets": parse_number(row.get('wickets')),
                                "bowl_innings": parse_number(row.get('bowl_inngs')),
                                "field_catch": parse_number(row.get('field_catch')),
                                "wk_catch": parse_number(row.get('wk_catch')),
                                "wk_stumping": parse_number(row.get('stumpings')),
                                "run_out_solo": parse_number(row.get('run_out_solo')),
                                "run_out_collab": parse_number(row.get('run_out_collab'))
                            }
                            
                            # Create new event using raw SQL if for_team_id is 0
                            if for_team_id == 0 or vs_team_id == 0:
                                with connection.cursor() as cursor:
                                    cursor.execute(
                                        """
                                        INSERT INTO api_iplplayerevent 
                                        (match_id, player_id, for_team_id, vs_team_id, 
                                        bat_runs, bat_balls, bat_fours, bat_sixes, bat_not_out, bat_innings,
                                        bowl_balls, bowl_maidens, bowl_runs, bowl_wickets, bowl_innings,
                                        field_catch, wk_catch, wk_stumping, run_out_solo, run_out_collab)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                        """,
                                        [
                                            match.id, player.id, for_team_id, vs_team_id,
                                            event_data['bat_runs'], event_data['bat_balls'], 
                                            event_data['bat_fours'], event_data['bat_sixes'],
                                            event_data['bat_not_out'], event_data['bat_innings'],
                                            event_data['bowl_balls'], event_data['bowl_maidens'],
                                            event_data['bowl_runs'], event_data['bowl_wickets'],
                                            event_data['bowl_innings'], event_data['field_catch'],
                                            event_data['wk_catch'], event_data['wk_stumping'],
                                            event_data['run_out_solo'], event_data['run_out_collab']
                                        ]
                                    )
                            else:
                                # Use Django ORM for non-zero team IDs
                                IPLPlayerEvent.objects.create(**event_data)
                            
                        except Exception as e:
                            logging.error(f"Error on row {row_number}:")
                            logging.error(f"Row data: {row}")
                            logging.error(f"Error: {str(e)}")
                            raise Exception(f"Error on row {row_number}: {str(e)}")
                    
                    # Re-enable foreign key checks
                    with connection.cursor() as cursor:
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')

                    messages.success(request, "CSV file processed successfully!")
                    
                except Exception as e:
                    # Re-enable foreign key checks even if there's an error
                    with connection.cursor() as cursor:
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
                    messages.error(request, str(e))
                    
            else:
                messages.error(request, "Invalid form submission.")
                
        else:
            form = CSVUploadForm()
            
        return render(request, 'admin/upload_csv.html', {'form': form})

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
    list_display = ('name', 'admin', 'max_teams', 'season',)
    list_filter = ('season',)
    search_fields = ('name', 'admin__username')
    raw_id_fields = ('admin',)

@admin.register(FantasySquad)
class FantasySquadAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'league', 'total_points')
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
    list_display = ('fantasy_squad', 'get_player', 'get_match', 'boost', 'total_points')
    list_filter = ('fantasy_squad', 'boost', 'match_event__match')
    search_fields = (
        'fantasy_squad__name', 
        'match_event__player__name',
        'match_event__match__match_number'
    )
    raw_id_fields = ('match_event', 'fantasy_squad', 'boost')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'fantasy_squad',
            'match_event',
            'match_event__player',
            'match_event__match',
            'boost'
        )

    def get_player(self, obj):
        return obj.match_event.player.name
    get_player.short_description = 'Player'
    get_player.admin_order_field = 'match_event__player__name'

    def get_match(self, obj):
        match = obj.match_event.match
        return f"Match {match.match_number}: {match.team_1.short_name} vs {match.team_2.short_name}"
    get_match.short_description = 'Match'
    get_match.admin_order_field = 'match_event__match__match_number'

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