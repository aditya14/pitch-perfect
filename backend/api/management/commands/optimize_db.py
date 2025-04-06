# Create file: backend/api/management/commands/optimize_db.py

from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Basic database optimization without subqueries'

    def handle(self, *args, **options):
        self.stdout.write("Running basic database optimization...")
        
        with connection.cursor() as cursor:
            # Update database statistics for better query planning
            cursor.execute("ANALYZE api_iplplayerevent;")
            cursor.execute("ANALYZE api_iplmatch;")
            cursor.execute("ANALYZE api_fantasyplayerevent;")
            
            # Vacuum to reclaim space
            cursor.execute("VACUUM ANALYZE api_iplplayerevent;")
            
            self.stdout.write(self.style.SUCCESS("Database statistics updated"))
                
        self.stdout.write(self.style.SUCCESS("Optimization complete"))