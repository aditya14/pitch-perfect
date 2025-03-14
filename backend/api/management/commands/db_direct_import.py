# backend/api/management/commands/db_direct_import.py
import json
import os
import datetime
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Imports data directly into the database by inspecting schema first'

    def handle(self, *args, **options):
        # First, inspect database schema
        match_columns = self.get_columns('api_iplmatch')
        event_columns = self.get_columns('api_iplplayerevent')
        
        self.stdout.write(f"IPLMatch columns: {', '.join(match_columns)}")
        self.stdout.write(f"IPLPlayerEvent columns: {', '.join(event_columns)}")
        
        # Find data files
        matches_file = self.find_file('ipl_matches.json')
        events_file = self.find_file('ipl_player_events.json')
        
        if matches_file and match_columns:
            self.import_matches(matches_file, match_columns)
        else:
            self.stdout.write(self.style.ERROR("Could not import matches"))
        
        if events_file and event_columns:
            self.import_events(events_file, event_columns)
        else:
            self.stdout.write(self.style.ERROR("Could not import events"))
    
    def get_columns(self, table_name):
        """Get column names and information for a table"""
        columns = []
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, [table_name])
            columns = [row[0] for row in cursor.fetchall()]
        return columns
    
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
    
    def import_matches(self, filepath, columns):
        """Import match data directly into the database"""
        self.stdout.write(f"Importing matches from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} matches from file")
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplmatch")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches to import")
            
            # Process records one by one
            imported = 0
            errors = 0
            
            # Current timestamp for created_at/updated_at
            now = timezone.now().isoformat()
            
            for item in missing_data:
                try:
                    record_id = int(item.get('id'))
                    
                    # Prepare insert query with dynamic columns
                    filtered_columns = []
                    values = []
                    
                    # Add standard values for required columns
                    if 'created_at' in columns and 'created_at' not in item:
                        item['created_at'] = now
                    
                    if 'updated_at' in columns and 'updated_at' not in item:
                        item['updated_at'] = now
                    
                    # Ensure required foreign keys have values
                    if 'season_id' in columns and not item.get('season_id'):
                        item['season_id'] = 1  # Default to season ID 1
                        self.stdout.write(f"Setting default season_id=1 for match {record_id}")
                    
                    if 'team_1_id' in columns and not item.get('team_1_id'):
                        item['team_1_id'] = 1  # Default to team ID 1
                    
                    if 'team_2_id' in columns and not item.get('team_2_id'):
                        item['team_2_id'] = 2  # Default to team ID 2
                    
                    # Build filtered column list and values
                    for col in columns:
                        if col in item and item[col] is not None:
                            filtered_columns.append(col)
                            values.append(item[col])
                        elif col == 'id':
                            filtered_columns.append(col)
                            values.append(record_id)
                    
                    # Generate SQL
                    cols_str = ', '.join(filtered_columns)
                    placeholders = ', '.join(['%s'] * len(filtered_columns))
                    
                    sql = f"INSERT INTO api_iplmatch ({cols_str}) VALUES ({placeholders})"
                    
                    # Execute SQL
                    with connection.cursor() as cursor:
                        cursor.execute(sql, values)
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} matches...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing match {record_id}: {str(e)}"))
                    errors += 1
                    continue
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    def import_events(self, filepath, columns):
        """Import player event data directly into the database"""
        self.stdout.write(f"Importing player events from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} events from file")
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplplayerevent")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing events to import")
            
            # Current timestamp for created_at/updated_at
            now = timezone.now().isoformat()
            
            # Process records in batches
            batch_size = 500
            total_imported = 0
            total_errors = 0
            
            for i in range(0, len(missing_data), batch_size):
                batch = missing_data[i:i+batch_size]
                self.stdout.write(f"Processing batch {i//batch_size + 1} of {(len(missing_data) + batch_size - 1)//batch_size}")
                
                imported = 0
                errors = 0
                
                for item in batch:
                    try:
                        record_id = int(item.get('id'))
                        
                        # Add standard values for required columns
                        if 'created_at' in columns and 'created_at' not in item:
                            item['created_at'] = now
                        
                        if 'updated_at' in columns and 'updated_at' not in item:
                            item['updated_at'] = now
                        
                        # Ensure required foreign keys have values
                        if 'player_id' in columns and not item.get('player_id'):
                            item['player_id'] = 1  # Default to player ID 1
                        
                        if 'match_id' in columns and not item.get('match_id'):
                            item['match_id'] = 1  # Default to match ID 1
                        
                        if 'for_team_id' in columns and not item.get('for_team_id'):
                            item['for_team_id'] = 1  # Default to team ID 1
                        
                        # Build filtered column list and values
                        filtered_columns = []
                        values = []
                        
                        for col in columns:
                            if col in item and item[col] is not None:
                                filtered_columns.append(col)
                                values.append(item[col])
                            elif col == 'id':
                                filtered_columns.append(col)
                                values.append(record_id)
                        
                        # Generate SQL
                        cols_str = ', '.join(filtered_columns)
                        placeholders = ', '.join(['%s'] * len(filtered_columns))
                        
                        sql = f"INSERT INTO api_iplplayerevent ({cols_str}) VALUES ({placeholders})"
                        
                        # Execute SQL
                        with connection.cursor() as cursor:
                            cursor.execute(sql, values)
                        
                        imported += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing event {record_id}: {str(e)}"))
                        errors += 1
                        continue
                
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch {i//batch_size + 1} complete: {imported} imported, {errors} errors")
            
            self.stdout.write(self.style.SUCCESS(f"Imported {total_imported} events ({total_errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))