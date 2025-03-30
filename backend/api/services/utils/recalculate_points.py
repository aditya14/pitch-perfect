from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F, Sum
from api.models import IPLPlayerEvent, FantasyPlayerEvent, FantasyMatchEvent, FantasySquad, IPLMatch
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix bowling milestone bug (3+ wickets instead of 4+ wickets) and recalculate points'

    def add_arguments(self, parser):
        parser.add_argument(
            '--match',
            type=int,
            help='Recalculate points for a specific match ID only'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )

    def handle(self, *args, **options):
        match_id = options.get('match')
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write("DRY RUN - No changes will be made")
        
        # Get affected events (those with 3 or 4 wickets)
        query = IPLPlayerEvent.objects.filter(bowl_wickets__in=[3, 4])
        
        # Filter by match if specified
        if match_id:
            query = query.filter(match_id=match_id)
            self.stdout.write(f"Processing only match ID: {match_id}")
        
        affected_events = list(query)
        total_events = len(affected_events)
        self.stdout.write(f"Found {total_events} IPLPlayerEvents affected by the bowling milestone bug")
        
        if total_events == 0:
            self.stdout.write("No events to fix.")
            return
        
        # Begin processing
        with transaction.atomic():
            # Only commit changes if not a dry run
            if dry_run:
                # Use a savepoint that we'll roll back at the end
                savepoint = transaction.savepoint()
            
            # Track affected items for reporting
            updated_ipl_events = 0
            updated_fantasy_events = 0
            updated_match_events = 0
            updated_squads = 0
            affected_matches = set()
            affected_squads = set()
            
            # Fix IPL Player Events
            for event in affected_events:
                old_total = event.total_points_all
                old_bowling = event.bowling_points_total
                
                # Recalculate bowling points with correct milestone logic
                bowling_points = 0
                
                # Base points (wickets and maidens)
                bowling_points += ((event.bowl_wickets or 0) * 25)  # Wickets
                bowling_points += ((event.bowl_maidens or 0) * 8)   # Maidens
                
                # Milestones - FIXED to use 3+ wickets instead of 4+
                if event.bowl_wickets >= 3:
                    bowling_points += 8  # 3+ wickets bonus
                if event.bowl_wickets >= 5:
                    bowling_points += 16  # 5+ wickets bonus
                
                # Economy bonus/penalty
                if event.bowl_balls and event.bowl_balls >= 10 and event.bowl_runs is not None:
                    overs = event.bowl_balls / 6
                    eco = event.bowl_runs / overs
                    if eco <= 5:
                        bowling_points += 6
                    elif eco <= 6:
                        bowling_points += 4
                    elif eco <= 7:
                        bowling_points += 2
                    elif eco >= 12:
                        bowling_points -= 6
                    elif eco >= 11:
                        bowling_points -= 4
                    elif eco >= 10:
                        bowling_points -= 2
                
                # Only update if points changed
                if bowling_points != event.bowling_points_total:
                    # Calculate new total
                    new_total = event.total_points_all - event.bowling_points_total + bowling_points
                    
                    # Update points
                    event.bowling_points_total = bowling_points
                    event.total_points_all = new_total
                    
                    if not dry_run:
                        event.save(update_fields=['bowling_points_total', 'total_points_all'])
                    
                    updated_ipl_events += 1
                    affected_matches.add(event.match_id)
                    
                    self.stdout.write(f"  Updated event {event.id} ({event.player.name if hasattr(event, 'player') else 'Unknown'}): "
                                     f"bowling points {old_bowling} -> {bowling_points}, "
                                     f"total points {old_total} -> {new_total}")
            
            # Now process affected fantasy events
            fantasy_events = FantasyPlayerEvent.objects.filter(
                match_event__in=[e.id for e in affected_events if e.bowling_points_total != (e.bowl_points or 0)]
            )
            
            for fantasy_event in fantasy_events:
                if not fantasy_event.boost:
                    continue  # No boost, no changes needed
                
                old_boost = fantasy_event.boost_points
                ipl_event = fantasy_event.match_event
                boost = fantasy_event.boost
                
                # For Captain (2x) and Vice Captain (1.5x) that apply uniform multipliers
                if boost.multiplier_runs == boost.multiplier_wickets == boost.multiplier_bowl_milestones:
                    # Uniform multiplier (e.g., Captain, Vice Captain)
                    multiplier = boost.multiplier_runs
                    new_boost = (multiplier - 1.0) * ipl_event.total_points_all
                else:
                    # For specialized roles with different multipliers
                    # Just focus on the bowling milestone component that changed
                    # Get the old milestone points
                    old_milestone_points = 0
                    if ipl_event.bowl_wickets >= 4:
                        old_milestone_points += 8
                    if ipl_event.bowl_wickets >= 5:
                        old_milestone_points += 16
                    
                    # Get the new milestone points
                    new_milestone_points = 0
                    if ipl_event.bowl_wickets >= 3:
                        new_milestone_points += 8
                    if ipl_event.bowl_wickets >= 5:
                        new_milestone_points += 16
                    
                    # Calculate difference in boost
                    milestone_boost_diff = (new_milestone_points - old_milestone_points) * (boost.multiplier_bowl_milestones - 1.0)
                    new_boost = fantasy_event.boost_points + milestone_boost_diff
                
                # Update if changed
                if round(new_boost, 2) != round(fantasy_event.boost_points, 2):
                    fantasy_event.boost_points = new_boost
                    
                    if not dry_run:
                        fantasy_event.save(update_fields=['boost_points'])
                    
                    updated_fantasy_events += 1
                    affected_squads.add(fantasy_event.fantasy_squad_id)
                    
                    self.stdout.write(f"  Updated fantasy event {fantasy_event.id}: "
                                     f"boost points {old_boost} -> {new_boost}")
            
            # Update match events for affected matches
            for match_id in affected_matches:
                match = IPLMatch.objects.get(id=match_id)
                squad_ids = FantasyPlayerEvent.objects.filter(
                    match_event__match_id=match_id
                ).values_list('fantasy_squad_id', flat=True).distinct()
                
                # Update each match event
                for squad_id in squad_ids:
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
                        match_event.total_base_points = base_points
                        match_event.total_boost_points = boost_points
                        match_event.total_points = total_points
                        
                        if not dry_run:
                            match_event.save()
                        
                        self.stdout.write(f"  Updated match event for match {match_id}, squad {squad_id}: "
                                         f"total points {old_total} -> {total_points}")
                    
                    updated_match_events += 1
                
                # Update match rankings
                if not dry_run:
                    self._update_match_ranks(match)
                    self._update_running_ranks(match)
            
            # Update squad totals
            for squad_id in affected_squads:
                squad = FantasySquad.objects.get(id=squad_id)
                old_total = squad.total_points
                
                # Calculate new total
                total = FantasyPlayerEvent.objects.filter(fantasy_squad=squad).annotate(
                    total=F('match_event__total_points_all') + F('boost_points')
                ).aggregate(Sum('total'))['total__sum'] or 0
                
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
    
    def _update_match_ranks(self, match):
        """Update match ranks for all fantasy teams in this match."""
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
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
    
    def _update_running_ranks(self, match):
        """Update running ranks and totals for all squads in this match."""
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
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
            
            # If this is the current match, update running ranks
            if match in prev_matches:
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