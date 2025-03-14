# backend/api/management/commands/fix_null_values.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix NULL values in player event records'

    def handle(self, *args, **options):
        self.fix_null_bowl_balls()
        self.fix_null_bowl_runs()
        
    def fix_null_bowl_balls(self):
        """Replace NULL bowl_balls with 0"""
        self.stdout.write("Fixing NULL bowl_balls values...")
        
        # Count records with NULL bowl_balls
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM api_iplplayerevent WHERE bowl_balls IS NULL")
            count = cursor.fetchone()[0]
            
        if count > 0:
            self.stdout.write(f"Found {count} records with NULL bowl_balls")
            
            # Update the records
            with connection.cursor() as cursor:
                cursor.execute("UPDATE api_iplplayerevent SET bowl_balls = 0 WHERE bowl_balls IS NULL")
                
            self.stdout.write(self.style.SUCCESS(f"Updated {count} records"))
        else:
            self.stdout.write("No records with NULL bowl_balls found")
    
    def fix_null_bowl_runs(self):
        """Replace NULL bowl_runs with 0"""
        self.stdout.write("Fixing NULL bowl_runs values...")
        
        # Count records with NULL bowl_runs
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM api_iplplayerevent WHERE bowl_runs IS NULL")
            count = cursor.fetchone()[0]
            
        if count > 0:
            self.stdout.write(f"Found {count} records with NULL bowl_runs")
            
            # Update the records
            with connection.cursor() as cursor:
                cursor.execute("UPDATE api_iplplayerevent SET bowl_runs = 0 WHERE bowl_runs IS NULL")
                
            self.stdout.write(self.style.SUCCESS(f"Updated {count} records"))
        else:
            self.stdout.write("No records with NULL bowl_runs found")