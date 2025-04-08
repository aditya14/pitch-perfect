from django.core.management.base import BaseCommand
from api.models import IPLPlayerEvent, FantasyPlayerEvent, FantasySquad, FantasyBoostRole, FantasyMatchEvent, IPLMatch
from django.db.models import F, Sum
from django.db import transaction
import logging
import decimal
from decimal import Decimal

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Recalculates points for all player events'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process in each batch'
        )
        parser.add_argument(
            '--skip-ipl',
            action='store_true',
            help='Skip IPLPlayerEvent recalculation'
        )
        parser.add_argument(
            '--skip-fantasy',
            action='store_true',
            help='Skip FantasyPlayerEvent recalculation'
        )
        parser.add_argument(
            '--skip-squads',
            action='store_true',
            help='Skip FantasySquad point totals recalculation'
        )
        parser.add_argument(
            '--sync-only',
            action='store_true',
            help='Only sync total_points with match event totals'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        sync_only = options.get('sync_only', False)
        
        if sync_only:
            self.stdout.write('Syncing FantasySquad total points with match events...')
            self.sync_squad_totals_with_match_events()
            return
            
        if not options['skip_ipl']:
            self.stdout.write('Recalculating IPLPlayerEvent points...')
            self.recalculate_ipl_player_events(batch_size)
        else:
            self.stdout.write('Skipping IPLPlayerEvent recalculation')
        
        if not options['skip_fantasy']:
            self.stdout.write('Recalculating FantasyPlayerEvent points...')
            self.recalculate_fantasy_player_events(batch_size)
        else:
            self.stdout.write('Skipping FantasyPlayerEvent recalculation')
        
        # Always recalculate match events - this was missing before!
        self.stdout.write('Recalculating FantasyMatchEvent points...')
        self.recalculate_fantasy_match_events()
        
        if not options['skip_squads']:
            self.stdout.write('Recalculating FantasySquad total points...')
            self.recalculate_fantasy_squad_points()
        else:
            self.stdout.write('Skipping FantasySquad recalculation')
        
        self.stdout.write(self.style.SUCCESS('Points recalculation completed successfully'))
    
    def recalculate_ipl_player_events(self, batch_size):
        """Recalculates points for all IPLPlayerEvent objects"""
        count = 0
        total = IPLPlayerEvent.objects.count()
        self.stdout.write(f'Found {total} IPLPlayerEvent records to process')
        
        if total == 0:
            self.stdout.write('No IPLPlayerEvent records to process')
            return
        
        # Process in batches to avoid memory issues
        for i in range(0, total, batch_size):
            with transaction.atomic():
                batch = IPLPlayerEvent.objects.all()[i:i+batch_size]
                batch_count = 0
                
                for event in batch:
                    try:
                        # === BATTING POINTS ===
                        bat_points = 0
                        if event.bat_runs is not None:
                            # Runs & boundaries
                            bat_points += event.bat_runs  # Runs
                            bat_points += (event.bat_fours or 0)  # Fours
                            bat_points += (2 * (event.bat_sixes or 0))  # Sixes (2 points each)
                            
                            # Milestones (50+, 100+)
                            if event.bat_runs >= 100:
                                bat_points += 16  # 100+ bonus
                            if event.bat_runs >= 50:
                                bat_points += 8   # 50+ bonus
                            
                            # Strike Rate Bonus/Penalty (min 10 balls)
                            if event.bat_balls and event.bat_balls >= 10:
                                # Manually calculate SR to ensure precision
                                sr = float(event.bat_runs) / float(event.bat_balls) * 100.0
                                
                                # Check using '<' and '>=' for exact boundary conditions
                                if sr >= 200.0:
                                    bat_points += 6
                                elif sr >= 175.0:
                                    bat_points += 4
                                elif sr >= 150.0:
                                    bat_points += 2
                                elif sr < 50.0:
                                    bat_points -= 6
                                elif sr < 75.0:
                                    bat_points -= 4
                                elif sr < 100.0:  # IMPORTANT: SR=100 gets NO penalty
                                    bat_points -= 2
                            
                            # Duck Penalty (0 runs, not not-out, non-bowler)
                            if event.bat_runs == 0 and not event.bat_not_out:
                                # Only check role if player exists and has a role attribute
                                if hasattr(event.player, 'role') and event.player.role != 'BOWL':
                                    bat_points -= 2
                        
                        # === BOWLING POINTS ===
                        bowl_points = 0
                        if event.bowl_wickets is not None or event.bowl_maidens is not None:
                            # Base bowling points
                            bowl_points += ((event.bowl_wickets or 0) * 25)  # Wickets (25 points each)
                            bowl_points += ((event.bowl_maidens or 0) * 8)   # Maidens (8 points each)
                            
                            # Milestone bonuses
                            if (event.bowl_wickets or 0) >= 5:
                                bowl_points += 16  # 5+ wickets bonus
                            if (event.bowl_wickets or 0) >= 3:
                                bowl_points += 8   # 3+ wickets bonus
                            
                            # Economy Bonus/Penalty (min 10 balls)
                            if event.bowl_balls and event.bowl_balls >= 10 and event.bowl_runs is not None:
                                # Manually calculate economy to ensure precision
                                overs = float(event.bowl_balls) / 6.0
                                eco = float(event.bowl_runs) / overs
                                
                                # Check using '<' and '>=' for exact boundary conditions
                                if eco < 5.0:
                                    bowl_points += 6
                                elif eco < 6.0:
                                    bowl_points += 4
                                elif eco < 7.0:  # IMPORTANT: Eco=7.0 gets NO bonus
                                    bowl_points += 2
                                elif eco >= 12.0:
                                    bowl_points -= 6
                                elif eco >= 11.0:
                                    bowl_points -= 4
                                elif eco >= 10.0:
                                    bowl_points -= 2
                        
                        # === FIELDING POINTS ===
                        field_points = 0
                        if any(v is not None for v in [event.wk_stumping, event.field_catch, event.wk_catch, event.run_out_solo, event.run_out_collab]):
                            field_points = (
                                ((event.wk_stumping or 0) * 12) +     # Stumpings (12 pts)
                                ((event.field_catch or 0) * 8) +      # Catches (8 pts)
                                ((event.wk_catch or 0) * 8) +         # Keeper catches (8 pts)
                                ((event.run_out_solo or 0) * 8) +     # Solo run outs (8 pts)
                                ((event.run_out_collab or 0) * 4)     # Collaborative run outs (4 pts)
                            )
                        
                        # === OTHER POINTS ===
                        other_points = 4  # Participation (always 4)
                        if event.player_of_match:
                            other_points += 50  # Player of the match (50 pts)
                        
                        # === TOTAL POINTS ===
                        total_points = bat_points + bowl_points + field_points + other_points
                        
                        # Update the event
                        event.batting_points_total = bat_points
                        event.bowling_points_total = bowl_points
                        event.fielding_points_total = field_points
                        event.other_points_total = other_points
                        event.total_points_all = total_points
                        
                        event.save(update_fields=[
                            'batting_points_total', 'bowling_points_total',
                            'fielding_points_total', 'other_points_total',
                            'total_points_all'
                        ])
                        batch_count += 1
                        
                    except Exception as e:
                        self.stderr.write(f"Error processing IPLPlayerEvent {event.id}: {str(e)}")
                
                count += batch_count
            
            self.stdout.write(f'Processed {min(count, total)} of {total} IPLPlayerEvents')
    
    def recalculate_fantasy_player_events(self, batch_size):
        count = 0
        total = FantasyPlayerEvent.objects.count()
        self.stdout.write(f'Found {total} FantasyPlayerEvent records to process')
        
        if total == 0:
            self.stdout.write('No FantasyPlayerEvent records to process')
            return
        
        # Process in batches
        for i in range(0, total, batch_size):
            with transaction.atomic():
                batch = FantasyPlayerEvent.objects.select_related(
                    'match_event', 'boost'
                )[i:i+batch_size]
                
                batch_count = 0
                for event in batch:
                    try:
                        if not event.boost:
                            event.boost_points = 0
                            event.save(update_fields=['boost_points'])
                            batch_count += 1
                            continue
                        
                        # Recalculate boost points based on role
                        ipl_event = event.match_event
                        boost = event.boost
                        
                        # For Captain (2x) and Vice Captain (1.5x) roles that apply to all points
                        if boost.label in ['Captain', 'Vice Captain']:
                            multiplier = boost.multiplier_runs  # All multipliers are the same for these roles
                            event.boost_points = (multiplier - 1.0) * ipl_event.total_points_all
                        else:
                            # Calculate specific boost points for each category
                            # Batting boosts
                            bat_boost = 0
                            if ipl_event.bat_runs is not None:
                                bat_boost += (boost.multiplier_runs - 1.0) * ipl_event.bat_runs
                                bat_boost += (boost.multiplier_fours - 1.0) * (ipl_event.bat_fours or 0)
                                bat_boost += (boost.multiplier_sixes - 1.0) * 2 * (ipl_event.bat_sixes or 0)
                                
                                # SR bonus calculation - use exact float math
                                sr_bonus = 0
                                if ipl_event.bat_balls and ipl_event.bat_balls >= 10:
                                    sr = float(ipl_event.bat_runs) / float(ipl_event.bat_balls) * 100.0
                                    if sr >= 200.0:
                                        sr_bonus = 6
                                    elif sr >= 175.0:
                                        sr_bonus = 4
                                    elif sr >= 150.0:
                                        sr_bonus = 2
                                    elif sr < 50.0:
                                        sr_bonus = -6
                                    elif sr < 75.0:
                                        sr_bonus = -4
                                    elif sr < 100.0:  # SR=100 gets NO penalty
                                        sr_bonus = -2
                                
                                bat_boost += (boost.multiplier_sr - 1.0) * sr_bonus
                                
                                # Milestones
                                bat_milestones = 0
                                if ipl_event.bat_runs >= 100:
                                    bat_milestones += 16
                                if ipl_event.bat_runs >= 50:
                                    bat_milestones += 8
                                
                                bat_boost += (boost.multiplier_bat_milestones - 1.0) * bat_milestones
                            
                            # Bowling boosts
                            bowl_boost = 0
                            if ipl_event.bowl_wickets is not None or ipl_event.bowl_maidens is not None:
                                bowl_boost += (boost.multiplier_wickets - 1.0) * 25 * (ipl_event.bowl_wickets or 0)
                                bowl_boost += (boost.multiplier_maidens - 1.0) * 8 * (ipl_event.bowl_maidens or 0)
                                
                                # Economy bonus calculation - use exact float math
                                eco_bonus = 0
                                if ipl_event.bowl_balls and ipl_event.bowl_balls >= 10 and ipl_event.bowl_runs is not None:
                                    overs = float(ipl_event.bowl_balls) / 6.0
                                    eco = float(ipl_event.bowl_runs) / overs
                                    if eco < 5.0:
                                        eco_bonus = 6
                                    elif eco < 6.0:
                                        eco_bonus = 4
                                    elif eco < 7.0:  # Eco=7.0 gets NO bonus
                                        eco_bonus = 2
                                    elif eco >= 12.0:
                                        eco_bonus = -6
                                    elif eco >= 11.0:
                                        eco_bonus = -4
                                    elif eco >= 10.0:
                                        eco_bonus = -2
                                
                                bowl_boost += (boost.multiplier_economy - 1.0) * eco_bonus
                                
                                # Milestones
                                bowl_milestones = 0
                                if (ipl_event.bowl_wickets or 0) >= 5:
                                    bowl_milestones += 16
                                if (ipl_event.bowl_wickets or 0) >= 3:
                                    bowl_milestones += 8
                                
                                bowl_boost += (boost.multiplier_bowl_milestones - 1.0) * bowl_milestones
                            
                            # Fielding boosts
                            field_boost = 0
                            catches = (ipl_event.field_catch or 0) + (ipl_event.wk_catch or 0)
                            field_boost += (boost.multiplier_catches - 1.0) * 8 * catches
                            field_boost += (boost.multiplier_stumpings - 1.0) * 12 * (ipl_event.wk_stumping or 0)
                            run_out_points = 8 * (ipl_event.run_out_solo or 0) + 4 * (ipl_event.run_out_collab or 0)
                            field_boost += (boost.multiplier_run_outs - 1.0) * run_out_points
                            
                            # Other boosts (POTM + participation)
                            other_boost = 0
                            potm_boost = (boost.multiplier_potm - 1.0) * (50 if ipl_event.player_of_match else 0)
                            playing_boost = (boost.multiplier_playing - 1.0) * 4  # Participation points
                            other_boost = potm_boost + playing_boost
                            
                            # Total boost points
                            event.boost_points = float(bat_boost + bowl_boost + field_boost + other_boost)
                        
                        event.save(update_fields=['boost_points'])
                        batch_count += 1
                    except Exception as e:
                        self.stderr.write(f"Error processing FantasyPlayerEvent {event.id}: {str(e)}")
                
                count += batch_count
            
            self.stdout.write(f'Processed {min(count, total)} of {total} FantasyPlayerEvents')

    def recalculate_fantasy_match_events(self):
        """
        Recalculate all FantasyMatchEvents based on their FantasyPlayerEvents.
        """
        self.stdout.write('Recalculating FantasyMatchEvent points...')
        
        # Get all matches with fantasy events
        matches = IPLMatch.objects.filter(
            id__in=FantasyPlayerEvent.objects.values('match_event__match').distinct()
        ).order_by('date')
        
        match_count = 0
        updated_count = 0
        
        for match in matches:
            # Get all fantasy squads that participated in this match
            squad_ids = FantasyPlayerEvent.objects.filter(
                match_event__match=match
            ).values('fantasy_squad').distinct()
            
            # For each squad, recalculate match event
            for sq in squad_ids:
                squad_id = sq['fantasy_squad']
                # Get all player events for this squad and match
                player_events = FantasyPlayerEvent.objects.filter(
                    fantasy_squad_id=squad_id,
                    match_event__match=match
                ).select_related('match_event')
                
                # Calculate totals using direct sums
                base_points = sum(float(e.match_event.total_points_all) for e in player_events)
                boost_points = sum(float(e.boost_points) for e in player_events)
                total_points = base_points + boost_points
                
                # Round to 1 decimal place
                base_points = round(base_points, 1)
                boost_points = round(boost_points, 1)
                total_points = round(total_points, 1)
                
                # Update match event
                match_event, created = FantasyMatchEvent.objects.update_or_create(
                    match=match,
                    fantasy_squad_id=squad_id,
                    defaults={
                        'total_base_points': base_points,
                        'total_boost_points': boost_points,
                        'total_points': total_points,
                        'players_count': player_events.count()
                    }
                )
                
                updated_count += 1
                
            match_count += 1
            if match_count % 10 == 0:
                self.stdout.write(f'Processed {match_count} matches')
        
        self.stdout.write(f'Successfully updated {updated_count} match events')
        
        # Update match and running ranks
        self._update_all_ranks()

    def _update_all_ranks(self):
        """Update match and running ranks for all matches"""
        from api.services.cricket_data_service import CricketDataService
        
        service = CricketDataService()
        matches = IPLMatch.objects.filter(
            id__in=FantasyMatchEvent.objects.values('match').distinct()
        ).order_by('date')
        
        for match in matches:
            service._update_match_ranks(match)
            service._update_running_ranks(match)
    
    def recalculate_fantasy_squad_points(self):
        """Calculate FantasySquad totals from FantasyMatchEvents"""
        squads = FantasySquad.objects.all()
        count = 0
        
        for squad in squads:
            # Calculate from match events instead of player events
            match_events_sum = FantasyMatchEvent.objects.filter(
                fantasy_squad=squad
            ).aggregate(
                total=Sum('total_points')
            )['total'] or 0
            
            squad.total_points = match_events_sum
            squad.save(update_fields=['total_points'])
            count += 1
        
        self.stdout.write(f'Successfully updated points for {count} FantasySquads')
        
    def sync_squad_totals_with_match_events(self):
        """
        Fix discrepancies between FantasySquad.total_points and the sum of match events
        """
        # Get all fantasy squads
        squads = FantasySquad.objects.all()
        
        self.stdout.write(f"Checking {squads.count()} fantasy squads for total points discrepancies...")
        
        fixed_count = 0
        for squad in squads:
            try:
                # Calculate the sum of total_points from match events
                match_events_sum = FantasyMatchEvent.objects.filter(
                    fantasy_squad=squad
                ).aggregate(
                    total=Sum('total_points')
                )['total'] or 0
                
                # Round to 1 decimal place to handle floating point precision issues
                match_events_sum = round(float(match_events_sum), 1)
                current_total = round(float(squad.total_points), 1) if squad.total_points else 0
                
                # Check if there's a discrepancy
                if match_events_sum != current_total:
                    self.stdout.write(f"Fixing {squad.name} (ID: {squad.id}):")
                    self.stdout.write(f"  Current total_points: {current_total}")
                    self.stdout.write(f"  Sum of match events: {match_events_sum}")
                    self.stdout.write(f"  Difference: {match_events_sum - current_total}")
                    
                    # Update the squad's total_points
                    squad.total_points = match_events_sum
                    squad.save(update_fields=['total_points'])
                    
                    # Check running total in last match event
                    last_match_event = FantasyMatchEvent.objects.filter(
                        fantasy_squad=squad
                    ).order_by('-match__date').first()
                    
                    if last_match_event and last_match_event.running_total_points != match_events_sum:
                        self.stdout.write(f"  Also fixing running total in last match event: "
                                        f"{last_match_event.running_total_points} -> {match_events_sum}")
                        last_match_event.running_total_points = match_events_sum
                        last_match_event.save(update_fields=['running_total_points'])
                    
                    fixed_count += 1
            except Exception as e:
                self.stderr.write(f"Error checking squad {squad.id}: {str(e)}")
        
        if fixed_count > 0:
            self.stdout.write(self.style.SUCCESS(f"Fixed {fixed_count} squads with total_points discrepancies"))
        else:
            self.stdout.write(self.style.SUCCESS("All squad total points are consistent with match events"))