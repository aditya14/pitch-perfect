from django.contrib import admin, messages
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.shortcuts import render
from django.urls import path
from .models import Season, IPLTeam, TeamSeason, IPLPlayer, PlayerTeamHistory, IPLMatch, IPLPlayerEvent, FantasyLeague, FantasySquad, UserProfile

from .forms import CSVUploadForm
import csv
from io import TextIOWrapper

import logging
_logger = logging.getLogger(__name__)

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('year', 'name', 'start_date', 'end_date', 'status')
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
    list_display = ('formatted_match', 'match_number', 'season', 'date', 'status')
    list_filter = ('season', 'status', 'team_1', 'team_2')
    search_fields = ('team_1__name', 'team_2__name', 'venue')
    date_hierarchy = 'date'

    def formatted_match(self, obj):
        if obj.stage == "LEAGUE":
            return f"Match {obj.match_number} - {obj.team_1} vs {obj.team_2}"
        else:
            return f"{obj.stage} - {obj.team_1} vs {obj.team_2}"

    # Set the column's label in the admin panel
    formatted_match.short_description = "Match"

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