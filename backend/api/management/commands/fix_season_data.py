# backend/api/management/commands/fix_season_data.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Imports data with special handling for Season 0'

    def handle(self, *args, **options):
        # First, ensure Season 0 exists
        self.ensure_season_zero()
        
        # Then import matches and events
        matches_file = self.find_file('ipl_matches.json')
        events_file = self.find_file('ipl_player_events.json')
        
        if matches_file:
            self.import_matches(matches_file)
        
        if events_file:
            self.import_events(events_file)
    
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
    
    def ensure_season_zero(self):
        """Create Season 0 if it doesn't exist"""
        self.stdout.write("Checking if Season 0 exists...")
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM api_season WHERE id = 0")
            if not cursor.fetchone():
                self.stdout.write(self.style.WARNING("Season 0 does not exist. Creating it..."))
                
                # Find a season file to get the details
                season_file = self.find_file('seasons.json')
                if season_file:
                    with open(season_file, 'r', encoding='utf-8') as f:
                        seasons = json.load(f)
                        
                    season_zero = None
                    for season in seasons:
                        if season.get('id') == 0:
                            season_zero = season
                            break
                    
                    if season_zero:
                        now = timezone.now().isoformat()
                        
                        # Create Season 0 record
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                INSERT INTO api_season (
                                    id, created_at, updated_at, year, name, 
                                    start_date, end_date, status
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """, [
                                0,  # id
                                now,  # created_at
                                now,  # updated_at
                                season_zero.get('year', 2008),  # year
                                season_zero.get('name', 'IPL 2008'),  # name
                                season_zero.get('start_date', '2008-04-18'),  # start_date
                                season_zero.get('end_date', '2008-06-01'),  # end_date
                                season_zero.get('status', 'COMPLETED')  # status
                            ])
                        
                        self.stdout.write(self.style.SUCCESS("Created Season 0"))
                    else:
                        self.stdout.write(self.style.ERROR("Could not find Season 0 data in seasons.json"))
                else:
                    # Create with default values
                    now = timezone.now().isoformat()
                    
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO api_season (
                                id, created_at, updated_at, year, name, 
                                start_date, end_date, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, [
                            0,  # id
                            now,  # created_at
                            now,  # updated_at
                            2008,  # year
                            'IPL 2008',  # name
                            '2008-04-18',  # start_date
                            '2008-06-01',  # end_date
                            'COMPLETED'  # status
                        ])
                    
                    self.stdout.write(self.style.SUCCESS("Created Season 0 with default values"))
            else:
                self.stdout.write(self.style.SUCCESS("Season 0 already exists"))
    
    def import_matches(self, filepath):
        """Import matches preserving season_id and handling unique constraints"""
        self.stdout.write(f"Importing matches from {filepath}")
        
        try:
            # Get existing columns
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'api_iplmatch'
                """)
                columns = [row[0] for row in cursor.fetchall()]
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplmatch")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Read data file
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches to import")
            
            # Current timestamp
            now = timezone.now().isoformat()
            
            # Process records
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    record_id = int(item.get('id'))
                    
                    # Check for unique constraint violations before inserting
                    season_id = item.get('season_id')
                    match_number = item.get('match_number')
                    
                    if season_id is not None and match_number is not None:
                        # Check if this combination exists
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                SELECT 1 FROM api_iplmatch 
                                WHERE season_id = %s AND match_number = %s
                            """, [season_id, match_number])
                            
                            if cursor.fetchone():
                                # Skip this record with a warning
                                self.stdout.write(self.style.WARNING(
                                    f"Skipping match {record_id} - conflict with existing (season_id, match_number)=({season_id}, {match_number})"
                                ))
                                errors += 1
                                continue
                    
                    # Add timestamps if needed
                    if 'created_at' in columns and 'created_at' not in item:
                        item['created_at'] = now
                    
                    if 'updated_at' in columns and 'updated_at' not in item:
                        item['updated_at'] = now
                    
                    # Build filtered columns and values
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
                    
                    sql = f"INSERT INTO api_iplmatch ({cols_str}) VALUES ({placeholders})"
                    
                    # Execute
                    with connection.cursor() as cursor:
                        cursor.execute(sql, values)
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} matches...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing match {record_id}: {str(e)}"))
                    errors += 1
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    def import_events(self, filepath):
        """Import player events with proper vs_team_id handling"""
        self.stdout.write(f"Importing player events from {filepath}")
        
        try:
            # Get existing columns
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'api_iplplayerevent'
                """)
                columns = [row[0] for row in cursor.fetchall()]
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplplayerevent")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Read data file
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing player events to import")
            
            # Current timestamp
            now = timezone.now().isoformat()
            
            # Get match data for vs_team_id
            match_teams = {}
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, team_1_id, team_2_id FROM api_iplmatch")
                for row in cursor.fetchall():
                    match_teams[row[0]] = (row[1], row[2])
            
            # Process in batches
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
                        
                        # Add timestamps if needed
                        if 'created_at' in columns and 'created_at' not in item:
                            item['created_at'] = now
                        
                        if 'updated_at' in columns and 'updated_at' not in item:
                            item['updated_at'] = now
                        
                        # Handle vs_team_id if needed
                        if 'vs_team_id' in columns and item.get('vs_team_id') is None:
                            match_id = item.get('match_id')
                            for_team_id = item.get('for_team_id')
                            
                            if match_id in match_teams and for_team_id:
                                team_1_id, team_2_id = match_teams[match_id]
                                
                                if for_team_id == team_1_id:
                                    item['vs_team_id'] = team_2_id
                                elif for_team_id == team_2_id:
                                    item['vs_team_id'] = team_1_id
                                else:
                                    # Default to team 1 if not playing
                                    item['vs_team_id'] = 1
                        
                        # Build filtered columns and values
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
                        
                        # Execute
                        with connection.cursor() as cursor:
                            cursor.execute(sql, values)
                        
                        imported += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing event {record_id}: {str(e)}"))
                        errors += 1
                
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch {i//batch_size + 1} complete: {imported} imported, {errors} errors")
            
            self.stdout.write(self.style.SUCCESS(f"Imported {total_imported} player events ({total_errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))