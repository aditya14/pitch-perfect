# backend/api/management/commands/inspect_and_import.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection, transaction

class Command(BaseCommand):
    help = 'Inspects schema and imports data using appropriate SQL'

    def handle(self, *args, **options):
        # First, inspect the database schema
        match_fields = self.get_table_fields('api_iplmatch')
        event_fields = self.get_table_fields('api_iplplayerevent')
        
        self.stdout.write(f"IPLMatch fields: {match_fields}")
        self.stdout.write(f"IPLPlayerEvent fields: {event_fields}")
        
        # Find data files
        matches_file = self.find_file('ipl_matches.json')
        events_file = self.find_file('ipl_player_events.json')
        
        if matches_file and match_fields:
            self.import_data(matches_file, 'api_iplmatch', match_fields)
        
        if events_file and event_fields:
            self.import_data(events_file, 'api_iplplayerevent', event_fields)
    
    def get_table_fields(self, table_name):
        """Get the field names for a table"""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, [table_name])
            return [row[0] for row in cursor.fetchall()]
    
    def find_file(self, filename):
        """Find a file in various possible locations"""
        possible_paths = [
            '.',                 # Current directory
            './exports',         # Exports subdirectory
            '/app',              # Root app directory
            '/app/exports',      # Exports in root app directory
        ]
        
        for path in possible_paths:
            filepath = os.path.join(path, filename)
            if os.path.exists(filepath):
                self.stdout.write(f"Found {filename} at {filepath}")
                return filepath
        
        self.stdout.write(self.style.ERROR(f"Could not find {filename}"))
        return None
    
    @transaction.atomic
    def import_data(self, filepath, table_name, fields):
        """Import data using dynamic SQL based on actual table fields"""
        self.stdout.write(f"Importing data into {table_name} from {filepath}")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} records from {filepath}")
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT id FROM {table_name}")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing records to import")
            
            # Import using dynamic SQL
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    # Map JSON fields to database fields
                    values = []
                    item_fields = []
                    
                    for field in fields:
                        if field in item:
                            item_fields.append(field)
                            values.append(item[field])
                    
                    if not item_fields:
                        self.stdout.write(self.style.WARNING(f"No matching fields found for record {item.get('id')}"))
                        continue
                    
                    # Prepare SQL query
                    placeholders = ', '.join(['%s'] * len(item_fields))
                    field_list = ', '.join(item_fields)
                    
                    sql = f"INSERT INTO {table_name} ({field_list}) VALUES ({placeholders})"
                    
                    # Execute SQL
                    with connection.cursor() as cursor:
                        cursor.execute(sql, values)
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} records...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing record {item.get('id')}: {str(e)}"))
                    errors += 1
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} records into {table_name} ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))