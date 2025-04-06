from django.core.management.base import BaseCommand
from django.db import connection
from api.models import IPLMatch

class Command(BaseCommand):
    help = 'Creates specialized indexes for completed and live matches'

    def handle(self, *args, **options):
        self.stdout.write("Creating status-specific indexes...")
        
        # Get completed match IDs
        completed_match_ids = list(IPLMatch.objects.filter(
            status='COMPLETED'
        ).values_list('id', flat=True))
        
        # Get live match IDs
        live_match_ids = list(IPLMatch.objects.filter(
            status='LIVE'
        ).values_list('id', flat=True))
        
        with connection.cursor() as cursor:
            # First, check for existing indexes and drop them if necessary
            cursor.execute("""
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'api_iplplayerevent' 
                AND indexname IN ('idx_iplplayerevent_match_status_points',
                                 'idx_iplplayerevent_player_status_points');
            """)
            
            existing_indexes = [row[0] for row in cursor.fetchall()]
            
            for idx in existing_indexes:
                cursor.execute(f"DROP INDEX {idx};")
                self.stdout.write(f"Dropped existing index: {idx}")
            
            # Create status-based indexes (without functions or subqueries)
            cursor.execute("""
                CREATE INDEX idx_iplplayerevent_match_status_points 
                ON api_iplplayerevent(match_id, total_points_all DESC);
            """)
            
            cursor.execute("""
                CREATE INDEX idx_iplplayerevent_player_status_points 
                ON api_iplplayerevent(player_id, match_id, total_points_all DESC);
            """)
            
            self.stdout.write(self.style.SUCCESS("Created general indexes for match and player queries"))
            
            # Add an index explicitly including the for_team and match columns
            cursor.execute("""
                CREATE INDEX idx_iplplayerevent_for_team_match 
                ON api_iplplayerevent(for_team_id, match_id);
            """)
            
            self.stdout.write(self.style.SUCCESS("Created team-based index"))
                
        self.stdout.write(self.style.SUCCESS("Done creating indexes"))