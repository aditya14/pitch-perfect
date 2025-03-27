from django.core.management.base import BaseCommand
from api.models import IPLPlayerEvent, FantasyPlayerEvent, FantasySquad, FantasyBoostRole
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

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        
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
        
        if not options['skip_squads']:
            self.stdout.write('Recalculating FantasySquad total points...')
            self.recalculate_fantasy_squad_points()
        else:
            self.stdout.write('Skipping FantasySquad recalculation')
        
        self.stdout.write(self.style.SUCCESS('Points recalculation completed successfully'))
    
    def recalculate_ipl_player_events(self, batch_size):
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
                        # Safely calculate strike rate
                        if event.bat_balls and event.bat_balls > 0 and event.bat_runs is not None:
                            bat_sr = (event.bat_runs / event.bat_balls) * 100
                        else:
                            bat_sr = None
                            
                        # Safely calculate economy
                        if event.bowl_balls and event.bowl_balls > 0 and event.bowl_runs is not None:
                            overs = event.bowl_balls / 6
                            bowl_eco = event.bowl_runs / overs
                        else:
                            bowl_eco = None
                            
                        # Calculate SR bonus
                        sr_bonus = 0
                        if bat_sr is not None and event.bat_balls >= 6:
                            if bat_sr >= 200:
                                sr_bonus = 6
                            elif bat_sr >= 175:
                                sr_bonus = 4
                            elif bat_sr >= 150:
                                sr_bonus = 2
                            elif bat_sr <= 50:
                                sr_bonus = -6
                            elif bat_sr <= 75:
                                sr_bonus = -4
                            elif bat_sr <= 100:
                                sr_bonus = -2
                                
                        # Calculate economy bonus
                        eco_bonus = 0
                        if bowl_eco is not None and event.bowl_balls >= 10:
                            if bowl_eco <= 5:
                                eco_bonus = 6
                            elif bowl_eco <= 6:
                                eco_bonus = 4
                            elif bowl_eco <= 7:
                                eco_bonus = 2
                            elif bowl_eco >= 12:
                                eco_bonus = -6
                            elif bowl_eco >= 11:
                                eco_bonus = -4
                            elif bowl_eco >= 10:
                                eco_bonus = -2
                                
                        # Calculate batting points
                        bat_points = 0
                        if event.bat_runs is not None:
                            bat_points += event.bat_runs  # Runs
                            bat_points += (event.bat_fours or 0)  # Boundaries
                            bat_points += (2 * (event.bat_sixes or 0))  # Six bonus
                            bat_points += (8 if event.bat_runs >= 50 else 0)  # 50+ bonus
                            bat_points += (16 if event.bat_runs >= 100 else 0)  # 100+ bonus
                            bat_points += sr_bonus  # Strike rate bonus/penalty
                            
                            # Duck penalty for non-bowlers
                            if (event.bat_runs == 0 and not event.bat_not_out and 
                                hasattr(event.player, 'role') and event.player.role != 'BOWL'):
                                bat_points -= 2
                                
                        # Calculate bowling points
                        bowl_points = 0
                        if event.bowl_wickets is not None or event.bowl_maidens is not None:
                            bowl_points += ((event.bowl_wickets or 0) * 25)  # Wickets
                            bowl_points += ((event.bowl_maidens or 0) * 8)  # Maidens
                            bowl_points += (8 if (event.bowl_wickets or 0) >= 4 else 0)  # 4+ wickets bonus
                            bowl_points += (16 if (event.bowl_wickets or 0) >= 5 else 0)  # 5+ wickets bonus
                            bowl_points += eco_bonus  # Economy bonus/penalty
                        
                        # Calculate fielding points
                        field_points = 0
                        if any(v is not None for v in [event.wk_stumping, event.field_catch, event.wk_catch, event.run_out_solo, event.run_out_collab]):
                            field_points = (
                                ((event.wk_stumping or 0) * 12) +  # Stumpings
                                ((event.field_catch or 0) * 8) +  # Catches
                                ((event.wk_catch or 0) * 8) +  # Keeper catches
                                ((event.run_out_solo or 0) * 8) +  # Solo run outs
                                ((event.run_out_collab or 0) * 4)  # Collaborative run outs
                            )
                        
                        # Calculate other points
                        other_points = (50 if event.player_of_match else 0) + 4  # POTM + participation
                        
                        # Calculate total points
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
                                
                                # SR bonus calculation
                                sr_bonus = 0
                                if ipl_event.bat_balls and ipl_event.bat_balls >= 6:
                                    sr = (ipl_event.bat_runs / ipl_event.bat_balls) * 100
                                    if sr >= 200:
                                        sr_bonus = 6
                                    elif sr >= 175:
                                        sr_bonus = 4
                                    elif sr >= 150:
                                        sr_bonus = 2
                                    elif sr <= 50:
                                        sr_bonus = -6
                                    elif sr <= 75:
                                        sr_bonus = -4
                                    elif sr <= 100:
                                        sr_bonus = -2
                                
                                bat_boost += (boost.multiplier_sr - 1.0) * sr_bonus
                                
                                # Milestones
                                bat_milestones = 0
                                if ipl_event.bat_runs >= 50:
                                    bat_milestones += 8
                                if ipl_event.bat_runs >= 100:
                                    bat_milestones += 16
                                
                                bat_boost += (boost.multiplier_bat_milestones - 1.0) * bat_milestones
                            
                            # Bowling boosts
                            bowl_boost = 0
                            if ipl_event.bowl_wickets is not None or ipl_event.bowl_maidens is not None:
                                bowl_boost += (boost.multiplier_wickets - 1.0) * 25 * (ipl_event.bowl_wickets or 0)
                                bowl_boost += (boost.multiplier_maidens - 1.0) * 8 * (ipl_event.bowl_maidens or 0)
                                
                                # Economy bonus calculation
                                eco_bonus = 0
                                if ipl_event.bowl_balls and ipl_event.bowl_balls >= 10 and ipl_event.bowl_runs is not None:
                                    overs = ipl_event.bowl_balls / 6
                                    eco = ipl_event.bowl_runs / overs
                                    if eco <= 5:
                                        eco_bonus = 6
                                    elif eco <= 6:
                                        eco_bonus = 4
                                    elif eco <= 7:
                                        eco_bonus = 2
                                    elif eco >= 12:
                                        eco_bonus = -6
                                    elif eco >= 11:
                                        eco_bonus = -4
                                    elif eco >= 10:
                                        eco_bonus = -2
                                
                                bowl_boost += (boost.multiplier_economy - 1.0) * eco_bonus
                                
                                # Milestones
                                bowl_milestones = 0
                                if (ipl_event.bowl_wickets or 0) >= 4:
                                    bowl_milestones += 8
                                if (ipl_event.bowl_wickets or 0) >= 5:
                                    bowl_milestones += 16
                                
                                bowl_boost += (boost.multiplier_bowl_milestones - 1.0) * bowl_milestones
                            
                            # Fielding boosts
                            field_boost = 0
                            # Catches
                            catches = (ipl_event.field_catch or 0) + (ipl_event.wk_catch or 0)
                            field_boost += (boost.multiplier_catches - 1.0) * 8 * catches
                            # Stumpings
                            field_boost += (boost.multiplier_stumpings - 1.0) * 12 * (ipl_event.wk_stumping or 0)
                            # Run outs
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
    
    def recalculate_fantasy_squad_points(self):
        # Recalculate total points for all fantasy squads
        squads = FantasySquad.objects.all()
        count = 0
        total = squads.count()
        
        if total == 0:
            self.stdout.write('No FantasySquad records to process')
            return
        
        with transaction.atomic():
            for squad in squads:
                try:
                    # Calculate total points from all fantasy player events
                    events = FantasyPlayerEvent.objects.filter(fantasy_squad=squad)
                    total_points = 0
                    
                    for event in events:
                        event_points = event.match_event.total_points_all + event.boost_points
                        total_points += event_points
                    
                    squad.total_points = total_points
                    squad.save(update_fields=['total_points'])
                    count += 1
                    
                    if count % 10 == 0:
                        self.stdout.write(f'Processed {count} of {total} FantasySquads')
                except Exception as e:
                    self.stderr.write(f"Error processing FantasySquad {squad.id}: {str(e)}")
        
        self.stdout.write(f'Successfully updated points for all {count} FantasySquads')
