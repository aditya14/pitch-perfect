# Create file: backend/api/management/commands/optimize_player_events.py

from django.core.management.base import BaseCommand
from api.models import IPLPlayerEvent, IPLMatch
from django.db import connection
from django.db.models import Sum, Count, F
import time

class Command(BaseCommand):
    help = 'Optimizes IPLPlayerEvent table by cleaning up and updating statistics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Only analyze issues without making changes',
        )

    def handle(self, *args, **options):
        analyze_only = options.get('analyze', False)
        
        start_time = time.time()
        self.stdout.write("Starting IPLPlayerEvent optimization...")
        
        # 1. Identify and fix NULL values in critical columns
        null_points = IPLPlayerEvent.objects.filter(total_points_all__isnull=True).count()
        self.stdout.write(f"Found {null_points} events with NULL total_points_all")
        
        if not analyze_only and null_points > 0:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE api_iplplayerevent 
                    SET 
                        batting_points_total = COALESCE(batting_points_total, 0),
                        bowling_points_total = COALESCE(bowling_points_total, 0),
                        fielding_points_total = COALESCE(fielding_points_total, 0),
                        other_points_total = COALESCE(other_points_total, 0),
                        total_points_all = COALESCE(batting_points_total, 0) + 
                                          COALESCE(bowling_points_total, 0) + 
                                          COALESCE(fielding_points_total, 0) + 
                                          COALESCE(other_points_total, 0)
                    WHERE total_points_all IS NULL;
                """)
                self.stdout.write(f"Fixed {cursor.rowcount} events with NULL point values")
        
        # 2. Force ANALYZE on the table to update statistics
        if not analyze_only:
            with connection.cursor() as cursor:
                cursor.execute("ANALYZE api_iplplayerevent;")
                self.stdout.write("Updated database statistics for improved query planning")
                
        # 3. Run VACUUM ANALYZE to reclaim space and update stats
        if not analyze_only:
            with connection.cursor() as cursor:
                cursor.execute("VACUUM ANALYZE api_iplplayerevent;")
                self.stdout.write("Vacuumed the table to reclaim space")
        
        elapsed_time = time.time() - start_time
        self.stdout.write(f"Completed in {elapsed_time:.2f} seconds")