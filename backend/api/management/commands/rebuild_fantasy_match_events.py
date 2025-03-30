from django.core.management.base import BaseCommand
from django.db.models import Sum, Count
from api.models import IPLMatch, FantasyPlayerEvent, FantasyMatchEvent, FantasySquad

class Command(BaseCommand):
    help = 'Creates FantasyMatchEvents for historical matches without recalculating boosts'

    def handle(self, *args, **options):
        self.stdout.write('Starting creation of FantasyMatchEvents from historical data')
        
        # Get all matches that have FantasyPlayerEvents
        match_ids = FantasyPlayerEvent.objects.values_list(
            'match_event__match', flat=True
        ).distinct()
        
        matches = IPLMatch.objects.filter(id__in=match_ids).order_by('date')
        self.stdout.write(f'Found {matches.count()} matches with fantasy events')
        
        for i, match in enumerate(matches, 1):
            self.stdout.write(f'Processing match {i}/{matches.count()}: {match}')
            
            # Check if we already have FantasyMatchEvents for this match
            existing_count = FantasyMatchEvent.objects.filter(match=match).count()
            if existing_count > 0:
                self.stdout.write(f'  Skipping - {existing_count} events already exist')
                continue
            
            # Get all leagues that had any players in this match
            leagues_with_events = set(FantasySquad.objects.filter(
                id__in=FantasyPlayerEvent.objects.filter(
                    match_event__match=match
                ).values_list('fantasy_squad_id', flat=True)
            ).values_list('league_id', flat=True))
            
            # Get all squads that had players in this match, grouped by squad
            squad_stats = FantasyPlayerEvent.objects.filter(
                match_event__match=match
            ).values(
                'fantasy_squad'
            ).annotate(
                base_points=Sum('match_event__total_points_all'),
                boost_points=Sum('boost_points'),
                players_count=Count('id')
            )
            
            # Convert to a dictionary for easier lookup
            stats_by_squad = {
                stat['fantasy_squad']: {
                    'base_points': stat['base_points'] or 0,
                    'boost_points': stat['boost_points'] or 0,
                    'players_count': stat['players_count']
                } for stat in squad_stats
            }
            
            # Process each league with events
            match_events = []
            for league_id in leagues_with_events:
                # Get ALL squads in this league, not just those with events
                all_squads = FantasySquad.objects.filter(league_id=league_id)
                
                for squad in all_squads:
                    # Get stats for this squad, or use zeros if the squad had no players
                    stats = stats_by_squad.get(squad.id, {
                        'base_points': 0,
                        'boost_points': 0,
                        'players_count': 0
                    })
                    
                    # Create the event
                    match_event = FantasyMatchEvent(
                        match=match,
                        fantasy_squad=squad,
                        total_base_points=stats['base_points'],
                        total_boost_points=stats['boost_points'],
                        total_points=stats['base_points'] + stats['boost_points'],
                        players_count=stats['players_count']
                    )
                    match_event.save()
                    match_events.append(match_event)
            
            self.stdout.write(f'  Created {len(match_events)} match events')
            
            # Calculate match ranks
            self._update_match_ranks(match)
            
            # Calculate running ranks
            self._update_running_ranks(match)
    
    def _update_match_ranks(self, match):
        """Calculate match ranks for each league"""
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        # Group by league
        leagues = set(FantasySquad.objects.filter(
            id__in=match_events.values_list('fantasy_squad_id', flat=True)
        ).values_list('league_id', flat=True))
        
        for league_id in leagues:
            # Get all events for this league
            league_events = match_events.filter(
                fantasy_squad__league_id=league_id
            ).order_by('-total_points')
            
            # Assign ranks
            for i, event in enumerate(league_events, 1):
                event.match_rank = i
                event.save(update_fields=['match_rank'])
    
    def _update_running_ranks(self, match):
        """Calculate running ranks for each league"""
        # This is more complex because we need to calculate totals up to this match
        # for each squad in each league
        
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        # Group by league
        leagues = set(FantasySquad.objects.filter(
            id__in=match_events.values_list('fantasy_squad_id', flat=True)
        ).values_list('league_id', flat=True))
        
        for league_id in leagues:
            # Get all squads in this league
            squads = FantasySquad.objects.filter(league_id=league_id)
            
            # Get all matches up to and including this one
            matches_up_to = IPLMatch.objects.filter(
                season=match.season,
                date__lte=match.date
            ).order_by('date')
            
            # Initialize running totals
            running_totals = {squad.id: 0 for squad in squads}
            
            # Calculate running totals
            for m in matches_up_to:
                events = FantasyMatchEvent.objects.filter(
                    match=m,
                    fantasy_squad__league_id=league_id
                )
                
                for event in events:
                    if event.fantasy_squad_id in running_totals:
                        running_totals[event.fantasy_squad_id] += event.total_points
            
            # Sort squads by total
            sorted_squads = sorted(
                running_totals.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Assign running ranks
            for rank, (squad_id, total) in enumerate(sorted_squads, 1):
                # Find the corresponding event for this match
                event = match_events.filter(fantasy_squad_id=squad_id).first()
                if event:
                    event.running_rank = rank
                    event.running_total_points = total
                    event.save(update_fields=['running_rank', 'running_total_points'])