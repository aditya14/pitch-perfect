from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F, Sum
from api.models import (
    IPLPlayerEvent, FantasyPlayerEvent, FantasyMatchEvent, FantasySquad, 
    IPLMatch, FantasyLeague
)
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix and align all fantasy points for a league or the entire system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--league',
            type=int,
            help='Recalculate points for a specific league ID'
        )
        parser.add_argument(
            '--match',
            type=int,
            help='Recalculate points for a specific match ID'
        )
        parser.add_argument(
            '--player',
            type=int,
            help='Recalculate points for a specific IPLPlayer ID'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )

    def handle(self, *args, **options):
        league_id = options.get('league')
        match_id = options.get('match')
        player_id = options.get('player')
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))
        
        # Start a transaction for all updates
        with transaction.atomic():
            # Only commit changes if not a dry run
            if dry_run:
                # Use a savepoint that we'll roll back at the end
                savepoint = transaction.savepoint()
            
            # Get the IPL events to process based on filters
            query = IPLPlayerEvent.objects.all()
            
            if match_id:
                query = query.filter(match_id=match_id)
                self.stdout.write(f"Processing only match ID: {match_id}")
            
            if player_id:
                query = query.filter(player_id=player_id)
                self.stdout.write(f"Processing only player ID: {player_id}")
            
            if league_id:
                # Get all squads in the league
                league = FantasyLeague.objects.get(id=league_id)
                self.stdout.write(f"Processing only league '{league.name}' (ID: {league_id})")
                
                # Find player IDs in these squads
                squads = FantasySquad.objects.filter(league_id=league_id)
                squad_players = set()
                
                for squad in squads:
                    if squad.current_squad:
                        squad_players.update(squad.current_squad)
                
                # Filter IPL events to only those with players in the league
                query = query.filter(player_id__in=squad_players)
            
            ipl_events = list(query)
            total_events = len(ipl_events)
            self.stdout.write(f"Processing {total_events} IPLPlayerEvents")
            
            if total_events == 0:
                self.stdout.write("No events to process.")
                if dry_run:
                    transaction.savepoint_rollback(savepoint)
                return
            
            # Track statistics for reporting
            updated_ipl_events = 0
            updated_fantasy_events = 0
            updated_match_events = 0
            updated_squads = 0
            affected_matches = set()
            affected_squads = set()
            
            # 1. First, recalculate all IPLPlayerEvents
            for event in ipl_events:
                old_total = event.total_points_all
                
                # Recalculate all point components
                # Batting points
                bat_points = 0
                if event.bat_runs is not None:
                    bat_points += (event.bat_runs or 0)  # Runs
                    bat_points += (event.bat_fours or 0)  # Boundaries
                    bat_points += (2 * (event.bat_sixes or 0))  # Six bonus
                    
                    # Milestones
                    if event.bat_runs >= 50:
                        bat_points += 8  # 50+ bonus
                    if event.bat_runs >= 100:
                        bat_points += 16  # 100+ bonus
                    
                    # Strike rate bonus/penalty
                    if event.bat_balls and event.bat_balls >= 10:
                        sr = (event.bat_runs / event.bat_balls) * 100
                        if sr >= 200:
                            bat_points += 6
                        elif sr >= 175:
                            bat_points += 4
                        elif sr >= 150:
                            bat_points += 2
                        elif sr < 50:
                            bat_points -= 6
                        elif sr < 75:
                            bat_points -= 4
                        elif sr < 100:
                            bat_points -= 2
                    
                    # Duck penalty for non-bowlers
                    if (event.bat_runs == 0 and not event.bat_not_out and 
                        hasattr(event.player, 'role') and event.player.role != 'BOWL'):
                        bat_points -= 2
                
                # Bowling points
                bowl_points = 0
                if event.bowl_wickets is not None or event.bowl_maidens is not None:
                    bowl_points += ((event.bowl_wickets or 0) * 25)  # Wickets
                    bowl_points += ((event.bowl_maidens or 0) * 8)  # Maidens
                    
                    # Milestones - FIXED to use 3+ wickets
                    if (event.bowl_wickets or 0) >= 3:
                        bowl_points += 8  # 3+ wickets bonus
                    if (event.bowl_wickets or 0) >= 5:
                        bowl_points += 16  # 5+ wickets bonus
                    
                    # Economy bonus/penalty
                    if event.bowl_balls and event.bowl_balls >= 10 and event.bowl_runs is not None:
                        overs = event.bowl_balls / 6
                        eco = event.bowl_runs / overs
                        if eco <= 5:
                            bowl_points += 6
                        elif eco <= 6:
                            bowl_points += 4
                        elif eco <= 7:
                            bowl_points += 2
                        elif eco >= 12:
                            bowl_points -= 6
                        elif eco >= 11:
                            bowl_points -= 4
                        elif eco >= 10:
                            bowl_points -= 2
                
                # Fielding points
                field_points = 0
                if any(v is not None for v in [event.wk_stumping, event.field_catch, event.wk_catch, event.run_out_solo, event.run_out_collab]):
                    field_points = (
                        ((event.wk_stumping or 0) * 12) +  # Stumpings
                        ((event.field_catch or 0) * 8) +  # Catches
                        ((event.wk_catch or 0) * 8) +  # Keeper catches
                        ((event.run_out_solo or 0) * 8) +  # Solo run outs
                        ((event.run_out_collab or 0) * 4)  # Collaborative run outs
                    )
                
                # Other points (POTM + participation)
                other_points = (50 if event.player_of_match else 0) + 4
                
                # Calculate total points
                new_total = bat_points + bowl_points + field_points + other_points
                
                # Check if any values need to be updated
                needs_update = (
                    bat_points != event.batting_points_total or
                    bowl_points != event.bowling_points_total or
                    field_points != event.fielding_points_total or
                    other_points != event.other_points_total or
                    new_total != event.total_points_all
                )
                
                # Update if needed
                if needs_update:
                    event.batting_points_total = bat_points
                    event.bowling_points_total = bowl_points
                    event.fielding_points_total = field_points
                    event.other_points_total = other_points
                    event.total_points_all = new_total
                    
                    if not dry_run:
                        event.save(update_fields=[
                            'batting_points_total', 'bowling_points_total',
                            'fielding_points_total', 'other_points_total',
                            'total_points_all'
                        ])
                    
                    updated_ipl_events += 1
                    affected_matches.add(event.match_id)
                    
                    self.stdout.write(f"  Updated IPL event {event.id}: "
                                     f"total points {old_total} -> {new_total}")
            
            # 2. Now recalculate all related FantasyPlayerEvents
            fantasy_events = FantasyPlayerEvent.objects.filter(
                match_event__in=[e.id for e in ipl_events]
            ).select_related('match_event', 'boost')
            
            for fantasy_event in fantasy_events:
                ipl_event = fantasy_event.match_event
                boost = fantasy_event.boost
                old_boost = fantasy_event.boost_points
                
                # Skip if no boost assigned
                if not boost:
                    fantasy_event.boost_points = 0
                    if old_boost != 0:
                        if not dry_run:
                            fantasy_event.save(update_fields=['boost_points'])
                        updated_fantasy_events += 1
                        affected_squads.add(fantasy_event.fantasy_squad_id)
                    continue
                
                # Calculate boost points
                # For uniform multipliers (Captain, Vice Captain)
                is_uniform = all(
                    getattr(boost, f'multiplier_{attr}') == boost.multiplier_runs
                    for attr in [
                        'fours', 'sixes', 'sr', 'bat_milestones', 'wickets',
                        'maidens', 'economy', 'bowl_milestones', 'catches',
                        'stumpings', 'run_outs', 'potm', 'playing'
                    ]
                )
                
                if is_uniform:
                    # Simple calculation for uniform multipliers
                    new_boost = (boost.multiplier_runs - 1.0) * ipl_event.total_points_all
                else:
                    # Detailed calculation for specialized roles
                    # Batting boosts
                    batting_runs = ipl_event.bat_runs or 0
                    batting_fours = ipl_event.bat_fours or 0
                    batting_sixes = (ipl_event.bat_sixes or 0) * 2  # Note the 2x for sixes
                    
                    # Batting milestones
                    batting_milestones = 0
                    if (ipl_event.bat_runs or 0) >= 50:
                        batting_milestones += 8
                    if (ipl_event.bat_runs or 0) >= 100:
                        batting_milestones += 16
                    
                    # Strike rate bonus/penalty
                    sr_points = 0
                    if (ipl_event.bat_balls or 0) >= 10:
                        sr = (ipl_event.bat_runs / ipl_event.bat_balls) * 100
                        if sr >= 200:
                            sr_points += 6
                        elif sr >= 175:
                            sr_points += 4
                        elif sr >= 150:
                            sr_points += 2
                        elif sr < 50:
                            sr_points -= 6
                        elif sr < 75:
                            sr_points -= 4
                        elif sr < 100:
                            sr_points -= 2
                    
                    # Separate boost calculations
                    runs_boost = batting_runs * (boost.multiplier_runs - 1.0)
                    fours_boost = batting_fours * (boost.multiplier_fours - 1.0)
                    sixes_boost = batting_sixes * (boost.multiplier_sixes - 1.0)
                    milestone_boost = batting_milestones * (boost.multiplier_bat_milestones - 1.0)
                    sr_boost = sr_points * (boost.multiplier_sr - 1.0)
                    
                    bat_boost = runs_boost + fours_boost + sixes_boost + milestone_boost + sr_boost
                    
                    # Bowling boosts
                    bowling_wickets = (ipl_event.bowl_wickets or 0) * 25
                    bowling_maidens = (ipl_event.bowl_maidens or 0) * 8
                    
                    # Bowling milestones
                    bowling_milestones = 0
                    if (ipl_event.bowl_wickets or 0) >= 3:
                        bowling_milestones += 8
                    if (ipl_event.bowl_wickets or 0) >= 5:
                        bowling_milestones += 16
                    
                    # Economy bonus/penalty
                    economy_points = 0
                    if (ipl_event.bowl_balls or 0) >= 10:
                        eco = ipl_event.bowl_economy
                        if eco <= 5:
                            economy_points += 6
                        elif eco <= 6:
                            economy_points += 4
                        elif eco <= 7:
                            economy_points += 2
                        elif eco >= 12:
                            economy_points -= 6
                        elif eco >= 11:
                            economy_points -= 4
                        elif eco >= 10:
                            economy_points -= 2
                    
                    # Bowling boost components
                    wickets_boost = bowling_wickets * (boost.multiplier_wickets - 1.0)
                    maidens_boost = bowling_maidens * (boost.multiplier_maidens - 1.0)
                    bowl_milestone_boost = bowling_milestones * (boost.multiplier_bowl_milestones - 1.0)
                    economy_boost = economy_points * (boost.multiplier_economy - 1.0)
                    
                    bowl_boost = wickets_boost + maidens_boost + bowl_milestone_boost + economy_boost
                    
                    # Fielding boosts
                    stumpings = (ipl_event.wk_stumping or 0) * 12
                    catches = ((ipl_event.field_catch or 0) + (ipl_event.wk_catch or 0)) * 8
                    run_outs = ((ipl_event.run_out_solo or 0) * 8) + ((ipl_event.run_out_collab or 0) * 4)
                    
                    stumping_boost = stumpings * (boost.multiplier_stumpings - 1.0)
                    catch_boost = catches * (boost.multiplier_catches - 1.0)
                    run_out_boost = run_outs * (boost.multiplier_run_outs - 1.0)
                    
                    field_boost = stumping_boost + catch_boost + run_out_boost
                    
                    # Other boosts
                    potm_points = 50 if ipl_event.player_of_match else 0
                    playing_points = 4
                    
                    potm_boost = potm_points * (boost.multiplier_potm - 1.0)
                    playing_boost = playing_points * (boost.multiplier_playing - 1.0)
                    
                    other_boost = potm_boost + playing_boost
                    
                    # Total boost
                    new_boost = bat_boost + bowl_boost + field_boost + other_boost
                
                # Update if changed
                if round(new_boost, 2) != round(fantasy_event.boost_points, 2):
                    fantasy_event.boost_points = new_boost
                    
                    if not dry_run:
                        fantasy_event.save(update_fields=['boost_points'])
                    
                    updated_fantasy_events += 1
                    affected_squads.add(fantasy_event.fantasy_squad_id)
                    
                    self.stdout.write(f"  Updated fantasy event {fantasy_event.id}: "
                                     f"boost points {old_boost} -> {new_boost}")
            
            # 3. Update all related FantasyMatchEvents
            for match_id in affected_matches:
                match = IPLMatch.objects.get(id=match_id)
                
                # Find all squads with players in this match
                match_squad_ids = FantasyPlayerEvent.objects.filter(
                    match_event__match_id=match_id
                ).values_list('fantasy_squad_id', flat=True).distinct()
                
                # If we're filtering by league, only consider squads in that league
                if league_id:
                    match_squad_ids = FantasySquad.objects.filter(
                        id__in=match_squad_ids,
                        league_id=league_id
                    ).values_list('id', flat=True)
                
                # Update match events for each squad
                for squad_id in match_squad_ids:
                    squad_events = FantasyPlayerEvent.objects.filter(
                        fantasy_squad_id=squad_id,
                        match_event__match_id=match_id
                    ).select_related('match_event')
                    
                    # Calculate totals
                    base_points = sum(e.match_event.total_points_all for e in squad_events)
                    boost_points = sum(e.boost_points for e in squad_events)
                    total_points = base_points + boost_points
                    
                    # Get or create match event
                    match_event, created = FantasyMatchEvent.objects.get_or_create(
                        match_id=match_id,
                        fantasy_squad_id=squad_id,
                        defaults={
                            'total_base_points': base_points,
                            'total_boost_points': boost_points,
                            'total_points': total_points,
                            'players_count': squad_events.count()
                        }
                    )
                    
                    # Update if existing
                    if not created:
                        old_total = match_event.total_points
                        changed = (
                            match_event.total_base_points != base_points or
                            match_event.total_boost_points != boost_points or
                            match_event.total_points != total_points or
                            match_event.players_count != squad_events.count()
                        )
                        
                        if changed:
                            match_event.total_base_points = base_points
                            match_event.total_boost_points = boost_points
                            match_event.total_points = total_points
                            match_event.players_count = squad_events.count()
                            
                            if not dry_run:
                                match_event.save()
                            
                            updated_match_events += 1
                            affected_squads.add(squad_id)
                            
                            self.stdout.write(f"  Updated match event for match {match_id}, squad {squad_id}: "
                                             f"total points {old_total} -> {total_points}")
                
                # Update match rankings
                if not dry_run and updated_match_events > 0:
                    self._update_match_ranks(match, league_id)
                    self._update_running_ranks(match, league_id)
            
            # 4. Update all FantasySquad totals
            for squad_id in affected_squads:
                squad = FantasySquad.objects.get(id=squad_id)
                old_total = squad.total_points
                
                # Calculate new total
                events_query = FantasyPlayerEvent.objects.filter(fantasy_squad=squad)
                
                # If we're processing a specific match, only include events from that match
                if match_id:
                    events_query = events_query.filter(match_event__match_id=match_id)
                
                # Calculate total points
                total = events_query.annotate(
                    event_total=F('match_event__total_points_all') + F('boost_points')
                ).aggregate(Sum('event_total'))['event_total__sum'] or 0
                
                # Add points from other matches if we're only processing one match
                if match_id:
                    other_points = FantasyPlayerEvent.objects.filter(
                        fantasy_squad=squad
                    ).exclude(
                        match_event__match_id=match_id
                    ).annotate(
                        event_total=F('match_event__total_points_all') + F('boost_points')
                    ).aggregate(Sum('event_total'))['event_total__sum'] or 0
                    
                    total += other_points
                
                # Update if changed
                if total != old_total:
                    squad.total_points = total
                    
                    if not dry_run:
                        squad.save(update_fields=['total_points'])
                    
                    updated_squads += 1
                    
                    self.stdout.write(f"  Updated squad {squad.name} (ID: {squad_id}): "
                                     f"total points {old_total} -> {total}")
            
            # If dry run, roll back all changes
            if dry_run:
                transaction.savepoint_rollback(savepoint)
                self.stdout.write(self.style.WARNING("DRY RUN - All changes have been rolled back"))
            
            # Summary
            self.stdout.write(self.style.SUCCESS(
                f"{'Would update' if dry_run else 'Updated'} the following:\n"
                f"- {updated_ipl_events} of {total_events} IPL events\n"
                f"- {updated_fantasy_events} fantasy events\n"
                f"- {updated_match_events} match events\n"
                f"- {updated_squads} fantasy squads\n"
                f"- {len(affected_matches)} matches affected"
            ))
    
    def _update_match_ranks(self, match, league_id=None):
        """Update match ranks for all fantasy teams in this match."""
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        # If league_id provided, only update ranks for that league
        if league_id:
            match_events = match_events.filter(fantasy_squad__league_id=league_id)
        
        # Get unique leagues
        from django.db.models import Count
        leagues = FantasySquad.objects.filter(
            id__in=match_events.values_list('fantasy_squad_id', flat=True)
        ).values('league_id').annotate(count=Count('id')).values_list('league_id', flat=True)
        
        # Update ranks for each league
        for league_id in leagues:
            # Get events for this league and match, ordered by points
            events = match_events.filter(
                fantasy_squad__league_id=league_id
            ).order_by('-total_points')
            
            # Assign ranks
            for i, event in enumerate(events, 1):
                event.match_rank = i
                event.save(update_fields=['match_rank'])
    
    def _update_running_ranks(self, match, league_id=None):
        """Update running ranks and totals for all squads in this match."""
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        # If league_id provided, only update ranks for that league
        if league_id:
            match_events = match_events.filter(fantasy_squad__league_id=league_id)
        
        # Get unique leagues
        leagues = FantasySquad.objects.filter(
            id__in=match_events.values_list('fantasy_squad_id', flat=True)
        ).values_list('league_id', flat=True).distinct()
        
        # Process each league
        for league_id in leagues:
            # Get all squads in this league
            squads = FantasySquad.objects.filter(league_id=league_id)
            
            # Get all matches up to this one
            prev_matches = IPLMatch.objects.filter(
                season=match.season,
                date__lte=match.date
            ).order_by('date')
            
            # Track running totals
            running_totals = {squad.id: 0 for squad in squads}
            
            # Calculate running totals
            for m in prev_matches:
                events = FantasyMatchEvent.objects.filter(
                    match=m,
                    fantasy_squad__league_id=league_id
                )
                
                for event in events:
                    running_totals[event.fantasy_squad_id] = running_totals.get(event.fantasy_squad_id, 0) + event.total_points
            
            # Sort by total points
            sorted_squads = sorted(
                running_totals.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Assign ranks
            for rank, (squad_id, total) in enumerate(sorted_squads, 1):
                event = match_events.filter(fantasy_squad_id=squad_id).first()
                if event:
                    event.running_rank = rank
                    event.running_total_points = total
                    event.save(update_fields=['running_rank', 'running_total_points'])