# backend/api/management/commands/fix_all_nulls.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix all NULL values in player event records'

    def handle(self, *args, **options):
        # Get columns that might contain NULL
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'api_iplplayerevent'
                AND is_nullable = 'YES'
            """)
            nullable_columns = [row[0] for row in cursor.fetchall()]
        
        self.stdout.write(f"Found {len(nullable_columns)} nullable columns")
        
        # Special handling for certain columns
        numeric_columns = [
            'bat_runs', 'bat_balls', 'bat_fours', 'bat_sixes',
            'bowl_balls', 'bowl_runs', 'bowl_wickets', 'bowl_maidens',
            'field_catch', 'wk_catch', 'wk_stumping',
            'batting_points_total', 'bowling_points_total', 'fielding_points_total', 
            'other_points_total', 'total_points_all'
        ]
        
        boolean_columns = [
            'bat_not_out', 'player_of_match'
        ]
        
        # Fix NULLs
        total_fixed = 0
        
        for column in nullable_columns:
            if column in numeric_columns:
                fixed = self.fix_numeric_nulls(column)
            elif column in boolean_columns:
                fixed = self.fix_boolean_nulls(column)
            else:
                # Skip other columns that might require special handling
                self.stdout.write(f"Skipping column {column}")
                fixed = 0
            
            total_fixed += fixed
        
        self.stdout.write(self.style.SUCCESS(f"Fixed {total_fixed} NULL values in total"))
    
    def fix_numeric_nulls(self, column):
        """Replace NULL numeric values with 0"""
        self.stdout.write(f"Fixing NULL values in {column}...")
        
        # Count records with NULL values
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM api_iplplayerevent WHERE {column} IS NULL")
            count = cursor.fetchone()[0]
        
        if count > 0:
            self.stdout.write(f"Found {count} records with NULL {column}")
            
            # Update the records
            with connection.cursor() as cursor:
                cursor.execute(f"UPDATE api_iplplayerevent SET {column} = 0 WHERE {column} IS NULL")
            
            self.stdout.write(self.style.SUCCESS(f"Updated {count} records"))
            return count
        else:
            self.stdout.write(f"No records with NULL {column} found")
            return 0
    
    def fix_boolean_nulls(self, column):
        """Replace NULL boolean values with FALSE"""
        self.stdout.write(f"Fixing NULL values in {column}...")
        
        # Count records with NULL values
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM api_iplplayerevent WHERE {column} IS NULL")
            count = cursor.fetchone()[0]
        
        if count > 0:
            self.stdout.write(f"Found {count} records with NULL {column}")
            
            # Update the records
            with connection.cursor() as cursor:
                cursor.execute(f"UPDATE api_iplplayerevent SET {column} = FALSE WHERE {column} IS NULL")
            
            self.stdout.write(self.style.SUCCESS(f"Updated {count} records"))
            return count
        else:
            self.stdout.write(f"No records with NULL {column} found")
            return 0