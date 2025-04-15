from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from multiselectfield import MultiSelectField

class SoftDeleteModel(models.Model):
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Season(TimeStampedModel):
    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', _('Upcoming')
        ONGOING = 'ONGOING', _('Ongoing')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    year = models.IntegerField(unique=True)
    name = models.CharField(max_length=100)  # e.g. "TATA IPL 2024"
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING
    )
    default_draft_order = models.JSONField(default=list)

    class Meta:
        ordering = ['-year']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['start_date']),
        ]

    def __str__(self):
        return f"IPL {self.year}"

class IPLTeam(SoftDeleteModel, TimeStampedModel):
    name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=5)  # e.g. "RCB", "CSK"
    home_ground = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    primary_color = models.CharField(max_length=7)  # hex color
    secondary_color = models.CharField(max_length=7)  # hex color
    logo = models.ImageField(upload_to='ipl_teams/', null=True, blank=True)
    other_names = models.JSONField(default=list)  # historical names

    # M2M relationship with seasons through an intermediate table
    seasons = models.ManyToManyField(
        Season,
        through='TeamSeason',
        related_name='teams'
    )

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['short_name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

class TeamSeason(TimeStampedModel):
    team = models.ForeignKey(IPLTeam, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)

    class Meta:
        unique_together = ['team', 'season']

class IPLPlayer(SoftDeleteModel, TimeStampedModel):
    class Role(models.TextChoices):
        BATSMAN = 'BAT', _('Batter')
        BOWLER = 'BOWL', _('Bowler')
        ALL_ROUNDER = 'ALL', _('All-Rounder')
        WICKET_KEEPER = 'WK', _('Wicket Keeper')

    class BattingStyle(models.TextChoices):
        RIGHT = 'RIGHT', _('Right Handed')
        LEFT = 'LEFT', _('Left Handed')

    class BowlingStyle(models.TextChoices):
        FAST = 'FAST', _('Fast')
        MEDIUM_FAST = 'MED_FAST', _('Medium Fast')
        MEDIUM = 'MEDIUM', _('Medium')
        SPIN = 'SPIN', _('Spin')
        NA = 'NA', _('Not Applicable')

    name = models.CharField(max_length=100)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    role = models.CharField(
        max_length=4,
        choices=Role.choices,
        blank=True, null=True
    )
    batting_style = models.CharField(
        max_length=5,
        choices=BattingStyle.choices,
        blank=True, null=True
    )
    bowling_style = models.CharField(
        max_length=10,
        choices=BowlingStyle.choices,
        default=BowlingStyle.NA,
        blank=True, null=True
    )
    img = models.ImageField(upload_to='players/', null=True, blank=True)
    cricdata_id = models.CharField(max_length=60, blank=True, null=True)

    # Current team relationship handled through PlayerTeamHistory
    teams = models.ManyToManyField(
        IPLTeam,
        through='PlayerTeamHistory',
        related_name='players'
    )

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
            models.Index(fields=['nationality']),
        ]

    def __str__(self):
        return self.name

    @property
    def current_team(self):
        return self.playerteamhistory_set.filter(
            season__status__in=[Season.Status.UPCOMING, Season.Status.ONGOING]
        ).first()

class PlayerTeamHistory(TimeStampedModel):
    player = models.ForeignKey(IPLPlayer, on_delete=models.CASCADE)
    team = models.ForeignKey(IPLTeam, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    points = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ['player', 'season']
        ordering = ['-season__year']
        indexes = [
            models.Index(fields=['player', 'season']),
        ]

class IPLMatch(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', _('Scheduled')
        LIVE = 'LIVE', _('Live')
        COMPLETED = 'COMPLETED', _('Completed')
        NO_RESULT = 'NO_RESULT', _('No Result')
        ABANDONED = 'ABANDONED', _('Abandoned')

    class Stage(models.TextChoices):
        LEAGUE = 'LEAGUE', _('League')
        QUALIFIER = 'QUALIFIER', _('Qualifier')
        ELIMINATOR = 'ELIMINATOR', _('Eliminator')
        SEMI_FINAL = 'SEMI_FINAL', _('Semi Final')
        THIRD_PLACE = 'THIRD_PLACE', _('Third Place')
        FINAL = 'FINAL', _('Final')

    class TossDecision(models.TextChoices):
        BAT = 'BAT', _('Bat')
        BOWL = 'BOWL', _('Bowl')

    class WinType(models.TextChoices):
        RUNS = 'RUNS', _('Runs')
        WICKETS = 'WICKETS', _('Wickets')
        TIE = 'TIE', _('Tie')
        SUPER_OVER = 'SUPER_OVER', _('Super Over')
        NO_RESULT = 'NO_RESULT', _('No Result')

    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    match_number = models.IntegerField()
    stage = models.CharField(
        max_length=20,
        choices=Stage.choices,
        default=Stage.LEAGUE
    )
    phase = models.IntegerField(default=1)
    team_1 = models.ForeignKey(
        IPLTeam,
        on_delete=models.CASCADE,
        related_name='home_matches',
        null=True, blank=True
    )
    team_2 = models.ForeignKey(
        IPLTeam,
        on_delete=models.CASCADE,
        related_name='away_matches',
        null=True, blank=True
    )
    date = models.DateTimeField()
    venue = models.CharField(max_length=100)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    toss_winner = models.ForeignKey(
        IPLTeam,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='toss_wins'
    )
    toss_decision = models.CharField(
        max_length=4,
        choices=TossDecision.choices,
        null=True,
        blank=True
    )
    winner = models.ForeignKey(
        IPLTeam,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='match_wins'
    )
    win_margin = models.IntegerField(null=True, blank=True)
    win_type = models.CharField(
        max_length=10,
        choices=WinType.choices,
        null=True,
        blank=True
    )

    player_of_match = models.ForeignKey(
        IPLPlayer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='player_of_match'
    )

    inns_1_runs = models.IntegerField(null=True, blank=True)
    inns_1_wickets = models.IntegerField(null=True, blank=True)
    inns_1_overs = models.FloatField(null=True, blank=True)

    inns_2_runs = models.IntegerField(null=True, blank=True)
    inns_2_wickets = models.IntegerField(null=True, blank=True)
    inns_2_overs = models.FloatField(null=True, blank=True)

    cricdata_id = models.CharField(max_length=60, blank=True, null=True)


    class Meta:
        unique_together = ['season', 'match_number']
        ordering = ['season', 'match_number']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        if self.team_1:
            team_1 = self.team_1.short_name
        else:
            team_1 = "TBD"
        
        if self.team_2:
            team_2 = self.team_2.short_name
        else:
            team_2 = "TBD"
        
        return f"{team_1} vs {team_2} - Match {self.match_number}, {self.season}"

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

class IPLPlayerEvent(models.Model):
    # Foreign Key Relationships
    player = models.ForeignKey('IPLPlayer', on_delete=models.CASCADE)
    match = models.ForeignKey('IPLMatch', on_delete=models.CASCADE)
    for_team = models.ForeignKey('IPLTeam', on_delete=models.CASCADE, related_name='home_events')
    vs_team = models.ForeignKey('IPLTeam', on_delete=models.CASCADE, related_name='away_events')
    
    # Batting Stats
    bat_runs = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bat_balls = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bat_fours = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bat_sixes = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bat_not_out = models.BooleanField(default=False, blank=True, null=True)
    bat_innings = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    
    # Bowling Stats
    bowl_balls = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bowl_maidens = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bowl_runs = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bowl_wickets = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    bowl_innings = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    
    # Fielding Stats
    field_catch = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    wk_catch = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    wk_stumping = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    run_out_solo = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    run_out_collab = models.IntegerField(default=0, validators=[MinValueValidator(0)], blank=True, null=True)
    
    # Other
    player_of_match = models.BooleanField(default=False, blank=True, null=True)

    # Point breakdown fields
    batting_points_total = models.IntegerField(default=0)
    bowling_points_total = models.IntegerField(default=0)  
    fielding_points_total = models.IntegerField(default=0)
    other_points_total = models.IntegerField(default=0)
    total_points_all = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        # Calculate point totals only if necessary fields have changed or object is new
        if not self.pk or self._state.adding or self._has_point_fields_changed():
            self.batting_points_total = self.bat_points
            self.bowling_points_total = self.bowl_points  
            self.fielding_points_total = self.field_points
            self.other_points_total = self.other_points
            self.total_points_all = (self.batting_points_total + 
                                    self.bowling_points_total + 
                                    self.fielding_points_total + 
                                    self.other_points_total)
        
        super().save(*args, **kwargs)

    def _has_point_fields_changed(self):
        """Check if any fields affecting point calculations have changed"""
        if not self.pk:
            return True
            
        try:
            old_obj = IPLPlayerEvent.objects.get(pk=self.pk)
            
            # Check batting fields
            if (self.bat_runs != old_obj.bat_runs or
                self.bat_balls != old_obj.bat_balls or
                self.bat_fours != old_obj.bat_fours or
                self.bat_sixes != old_obj.bat_sixes or
                self.bat_not_out != old_obj.bat_not_out):
                return True
                
            # Check bowling fields
            if (self.bowl_balls != old_obj.bowl_balls or
                self.bowl_maidens != old_obj.bowl_maidens or
                self.bowl_runs != old_obj.bowl_runs or
                self.bowl_wickets != old_obj.bowl_wickets):
                return True
                
            # Check fielding fields
            if (self.field_catch != old_obj.field_catch or
                self.wk_catch != old_obj.wk_catch or
                self.wk_stumping != old_obj.wk_stumping or
                self.run_out_solo != old_obj.run_out_solo or
                self.run_out_collab != old_obj.run_out_collab):
                return True
                
            # Check other fields
            if self.player_of_match != old_obj.player_of_match:
                return True
                
            return False
        except IPLPlayerEvent.DoesNotExist:
            return True
    
    # Calculated Fields
    @property
    def bat_strike_rate(self):
        """Calculate batting strike rate"""
        if self.bat_runs is None or self.bat_balls is None or self.bat_balls == 0:
            return None
        from decimal import Decimal, ROUND_HALF_UP
        sr = Decimal(str(self.bat_runs)) / Decimal(str(self.bat_balls)) * Decimal('100')
        return sr.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    
    @property
    def bowl_economy(self):
        """Calculate bowling economy rate"""
        if self.bowl_runs is None or self.bowl_balls is None or self.bowl_balls == 0:
            return None
        from decimal import Decimal, ROUND_HALF_UP
        overs = Decimal(str(self.bowl_balls)) / Decimal('6')
        eco = Decimal(str(self.bowl_runs)) / overs
        return eco.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _calculate_sr_bonus(self):
        """Calculate strike rate bonus/penalty"""
        if self.bat_balls < 10:  # Minimum 10 balls required
            return 0
        
        from decimal import Decimal
        sr = self.bat_strike_rate
        if not isinstance(sr, Decimal):
            sr = Decimal(str(sr))
            
        if sr >= Decimal('200'):
            return 6
        elif sr >= Decimal('175'):
            return 4
        elif sr >= Decimal('150'):
            return 2
        elif sr < Decimal('50'):
            return -6
        elif sr < Decimal('75'):
            return -4
        elif sr < Decimal('100'):
            return -2
        return 0
    
    def _calculate_economy_bonus(self):
        """Calculate economy rate bonus/penalty"""
        if self.bowl_balls < 10:  # Minimum 10 balls required
            return 0
            
        from decimal import Decimal
        economy = self.bowl_economy
        if not isinstance(economy, Decimal):
            economy = Decimal(str(economy))
            
        if economy < Decimal('5'):
            return 6
        elif economy < Decimal('6'):
            return 4
        elif economy < Decimal('7'):
            return 2
        elif economy >= Decimal('12'):
            return -6
        elif economy >= Decimal('11'):
            return -4
        elif economy >= Decimal('10'):
            return -2
        return 0

    @property
    def bat_points(self):
        """Calculate total batting points"""
        if self.bat_runs is None:
            return 0
            
        points = 0
        points += self.bat_runs  # Runs
        points += (self.bat_fours or 0)  # Boundaries
        points += (2 * (self.bat_sixes or 0))  # Six bonus
        points += (8 if self.bat_runs >= 50 else 0)  # 50+ bonus
        points += (16 if self.bat_runs >= 100 else 0)  # 100+ bonus
        points += self._calculate_sr_bonus()  # Strike rate bonus/penalty
        
        # Duck penalty for non-bowlers
        if (self.bat_runs == 0 and not self.bat_not_out and 
            hasattr(self.player, 'role') and self.player.role != 'BOWL'):
            points -= 2
            
        return points
    
    @property
    def bowl_points(self):
        """Calculate total bowling points"""
        if self.bowl_wickets is None and self.bowl_maidens is None:
            return 0
            
        points = 0
        points += ((self.bowl_wickets or 0) * 25)  # Wickets
        points += ((self.bowl_maidens or 0) * 8)  # Maidens
        points += (8 if (self.bowl_wickets or 0) >= 3 else 0)  # 3+ wickets bonus
        points += (16 if (self.bowl_wickets or 0) >= 5 else 0)  # 5+ wickets bonus
        points += self._calculate_economy_bonus()  # Economy bonus/penalty
        return points
    
    @property
    def field_points(self):
        """Calculate total fielding points"""
        if all(v is None for v in [self.wk_stumping, self.field_catch, self.wk_catch, self.run_out_solo, self.run_out_collab]):
            return 0
            
        return (
            ((self.wk_stumping or 0) * 12) +  # Stumpings
            ((self.field_catch or 0) * 8) +  # Catches
            ((self.wk_catch or 0) * 8) +  # Keeper catches
            ((self.run_out_solo or 0) * 8) +  # Solo run outs
            ((self.run_out_collab or 0) * 4)  # Collaborative run outs
        )
    
    @property
    def other_points(self):
        """Calculate other points (POTM + playing)"""
        return (50 if self.player_of_match else 0) + 4  # POTM + participation
    
    @property
    def base_points(self):
        """Calculate total base points"""
        return (
            self.bat_points +
            self.bowl_points +
            self.field_points +
            self.other_points
        )
    
    class Meta:
        indexes = [
            models.Index(fields=['player', 'match']),
            models.Index(fields=['for_team', 'vs_team']),
        ]
        
    def __str__(self):
        return f"{self.player.name} - {self.match}"
    
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    theme = models.CharField(max_length=10, choices=[('light', 'Light'), ('dark', 'Dark')], default='light')
    
    def __str__(self):
        return f"{self.user.email}'s profile"
    

#    Fantasy Models

class FantasyLeague(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='league_logos/', null=True, blank=True)
    color = models.CharField(max_length=7)  # Hex color code
    max_teams = models.IntegerField(default=10)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_leagues')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, blank=True, null=True)
    league_code = models.CharField(max_length=6, unique=True, blank=True, null=True)
    draft_completed = models.BooleanField(default=False)
    snake_draft_order = models.JSONField(default=list, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    draft_pool = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['admin']),
            models.Index(fields=['season']),
        ]

    def __str__(self):
        return self.name

class FantasySquad(TimeStampedModel):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='team_logos/', null=True, blank=True)
    color = models.CharField(max_length=7)  # Hex color code
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fantasy_teams')
    league = models.ForeignKey(FantasyLeague, on_delete=models.CASCADE, related_name='teams')
    current_squad = models.JSONField(default=list, blank=True, null=True)
    current_core_squad = models.JSONField(default=list, blank=True, null=True)
    future_core_squad = models.JSONField(default=list, blank=True, null=True)

    total_points = models.DecimalField(max_digits=10, decimal_places=1, default=0)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['league']),
            models.Index(fields=['total_points']),
        ]
        unique_together = [['user', 'league']]  # One team per user per league

    def __str__(self):
        return f"{self.name} ({self.league.name})"
    
class FantasyDraft(models.Model):
    league = models.ForeignKey(FantasyLeague, on_delete=models.CASCADE, related_name='draft_order')
    squad = models.ForeignKey(FantasySquad, on_delete=models.CASCADE, related_name='draft_order')
    type = models.CharField(max_length=10, choices=[('Pre-Season', 'Pre-Season'), ('Mid-Season', 'Mid-Season')])
    order = models.JSONField(default=list)

    class Meta:
        indexes = [
            models.Index(fields=['league']),
            models.Index(fields=['squad']),
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return f"{self.squad.name} - {self.type} Draft Order"
    
class FantasyBoostRole(models.Model):
    multiplier_options = [(1.0, '1x'), (1.5, '1.5x'), (2.0, '2x')]

    label = models.CharField(max_length=20)
    role = MultiSelectField(choices=IPLPlayer.Role.choices, max_length=50)
    multiplier_runs = models.FloatField(choices=multiplier_options)
    multiplier_fours = models.FloatField(choices=multiplier_options)
    multiplier_sixes = models.FloatField(choices=multiplier_options)
    multiplier_sr = models.FloatField(choices=multiplier_options)
    multiplier_bat_milestones = models.FloatField(choices=multiplier_options)
    multiplier_wickets = models.FloatField(choices=multiplier_options)
    multiplier_maidens = models.FloatField(choices=multiplier_options)
    multiplier_economy = models.FloatField(choices=multiplier_options)
    multiplier_bowl_milestones = models.FloatField(choices=multiplier_options)
    multiplier_catches = models.FloatField(choices=multiplier_options)
    multiplier_stumpings = models.FloatField(choices=multiplier_options)
    multiplier_run_outs = models.FloatField(choices=multiplier_options)
    multiplier_potm = models.FloatField(choices=multiplier_options)
    multiplier_playing = models.FloatField(choices=multiplier_options)

    class Meta:
        indexes = [
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return self.label
    
class FantasyPlayerEvent(models.Model):
    match_event = models.ForeignKey(IPLPlayerEvent, on_delete=models.CASCADE)
    fantasy_squad = models.ForeignKey(FantasySquad, on_delete=models.CASCADE, related_name='player_events')
    boost = models.ForeignKey(FantasyBoostRole, on_delete=models.CASCADE, null=True, blank=True)
    boost_points = models.FloatField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['match_event']),
            models.Index(fields=['fantasy_squad']),
            models.Index(fields=['boost_points']),
        ]

    def __str__(self):
        return f"{self.fantasy_squad.name} - {self.match_event.player.name} - {self.match_event.match}"
    
class FantasyTrade(models.Model):
    initiator = models.ForeignKey(FantasySquad, on_delete=models.CASCADE, related_name='initiated_trades')
    receiver = models.ForeignKey(FantasySquad, on_delete=models.CASCADE, related_name='received_trades')
    players_given = models.JSONField(default=list, blank=True, null=True)
    players_received = models.JSONField(default=list, blank=True, null=True)
    status = models.CharField(
        max_length=10, 
        choices=[('Pending', 'Pending'), ('Rejected', 'Rejected'), ('Accepted', 'Accepted'), ('Closed', 'Closed')],
        default='Pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['initiator']),
            models.Index(fields=['receiver']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.initiator.name} -> {self.receiver.name}"
    
class FantasyMatchEvent(models.Model):
    match = models.ForeignKey(IPLMatch, on_delete=models.CASCADE)
    fantasy_squad = models.ForeignKey(FantasySquad, on_delete=models.CASCADE, related_name='match_events')
    total_base_points = models.FloatField(default=0)
    total_boost_points = models.FloatField(default=0)
    total_points = models.FloatField(default=0)
    match_rank = models.IntegerField(null=True, blank=True)  # Rank in this match
    running_rank = models.IntegerField(null=True, blank=True)  # Overall league rank as of this match
    running_total_points = models.FloatField(default=0)  # Cumulative squad points as of this match
    players_count = models.IntegerField(default=0)  # Number of players who participated
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('match', 'fantasy_squad')
        indexes = [
            models.Index(fields=['match', 'total_points']),
            models.Index(fields=['fantasy_squad', 'match']),
            models.Index(fields=['fantasy_squad', 'running_rank']),
            models.Index(fields=['match', 'match_rank']),
        ]