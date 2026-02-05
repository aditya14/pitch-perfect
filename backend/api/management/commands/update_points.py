from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from api.models import Match
from api.services.cricket_data_service import CricketDataService

class Command(BaseCommand):
    help = 'Update fantasy points from live cricket matches'

    def add_arguments(self, parser):
        parser.add_argument(
            '--match-id',
            type=str,
            help='Specific match cricdata_id to update (optional)'
        )
        
        parser.add_argument(
            '--all-live',
            action='store_true',
            help='Update all live matches'
        )

    def handle(self, *args, **options):
        service = CricketDataService()
        
        if options['match_id']:
            # Update specific match
            match_id = options['match_id']
            self.stdout.write(self.style.SUCCESS(f'Updating match {match_id}...'))
            
            result = service.update_match_points(match_id)
            
            if 'error' in result:
                self.stdout.write(self.style.ERROR(f"Error: {result['error']}"))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f"Updated {result['player_events_updated']} player events and "
                    f"{result['fantasy_events_updated']} fantasy events"
                ))
                
        elif options['all_live']:
            # Update all live matches
            self.stdout.write(self.style.SUCCESS('Updating all live matches...'))
            
            live_matches = Match.objects.filter(status='LIVE')
            if not live_matches:
                self.stdout.write(self.style.WARNING('No live matches found'))
                return
                
            results = service.update_all_live_matches()
            
            total_player_events = sum(r.get('player_events_updated', 0) for r in results if 'error' not in r)
            total_fantasy_events = sum(r.get('fantasy_events_updated', 0) for r in results if 'error' not in r)
            
            self.stdout.write(self.style.SUCCESS(
                f"Updated {len(results)} matches, {total_player_events} player events, "
                f"and {total_fantasy_events} fantasy events"
            ))
            
        else:
            self.stdout.write(self.style.WARNING(
                'No action specified. Use --match-id or --all-live'
            ))