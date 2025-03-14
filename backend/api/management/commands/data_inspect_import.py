# backend/api/management/commands/data_inspect_import.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Inspects JSON data format and imports it correctly'

    def handle(self, *args, **options):
        # Ensure Season 0 exists
        self.ensure_season_zero()
        
        # Find and import data files
        matches_file = self.find_file('ipl_matches.json')
        events_file = self.find_file('ipl_player_events.json')
        
        if matches_file:
            # First, inspect the JSON structure of one record
            self.inspect_and_import_matches(matches_file)
        
        if events_file:
            # First, inspect the JSON structure of one record
            self.inspect_and_import_events(events_file)
    
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
                self.stdout.write("Season 0 does not exist. Creating it...")
                
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
                
                self.stdout.write(self.style.SUCCESS("Created Season 0"))
            else:
                self.stdout.write("Season 0 already exists")
    
    def inspect_and_import_matches(self, filepath):
        """Inspect JSON format and import matches correctly"""
        self.stdout.write(f"Importing matches from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                self.stdout.write(self.style.ERROR("No data found in file"))
                return
            
            # Inspect first record
            first_record = data[0]
            self.stdout.write(f"First record structure: {json.dumps(first_record, indent=2)}")
            
            # Get database columns
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'api_iplmatch'
                    ORDER BY ordinal_position
                """)
                db_columns = [row[0] for row in cursor.fetchall()]
            
            self.stdout.write(f"Database columns: {', '.join(db_columns)}")
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplmatch")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches")
            
            # Current timestamp
            now = timezone.now().isoformat()
            
            # Process records
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    record_id = int(item.get('id'))
                    
                    # Create insertable record with proper column mapping
                    db_record = {'id': record_id}
                    
                    # Map fields with special handling for season_id
                    # Default required fields
                    db_record['created_at'] = now
                    db_record['updated_at'] = now
                    
                    # Direct field mappings (customize based on your data structure)
                    if 'season_id' in item and item['season_id'] is not None:
                        db_record['season_id'] = item['season_id']
                    elif 'season' in item and item['season'] is not None:
                        db_record['season_id'] = item['season']
                    else:
                        db_record['season_id'] = 0  # Default to Season 0
                    
                    # Map other fields
                    field_mappings = {
                        'team_1_id': ['team_1_id', 'team_1'],
                        'team_2_id': ['team_2_id', 'team_2'],
                        'toss_winner_id': ['toss_winner_id', 'toss_winner'],
                        'winner_id': ['winner_id', 'winner'],
                        'player_of_match_id': ['player_of_match_id', 'player_of_match'],
                        'date': ['date'],
                        'venue': ['venue'],
                        'match_number': ['match_number'],
                        'status': ['status'],
                        'cricdata_id': ['cricdata_id']
                    }
                    
                    # Apply mappings
                    for db_field, json_fields in field_mappings.items():
                        for json_field in json_fields:
                            if json_field in item and item[json_field] is not None:
                                db_record[db_field] = item[json_field]
                                break
                    
                    # Check for missing required fields
                    required_fields = ['season_id', 'team_1_id', 'team_2_id']
                    missing_required = [f for f in required_fields if f not in db_record]
                    
                    if missing_required:
                        self.stdout.write(self.style.WARNING(
                            f"Match {record_id} missing required fields: {', '.join(missing_required)}"
                        ))
                        
                        # Set defaults for missing required fields
                        if 'season_id' not in db_record:
                            db_record['season_id'] = 0
                        if 'team_1_id' not in db_record:
                            db_record['team_1_id'] = 1
                        if 'team_2_id' not in db_record:
                            db_record['team_2_id'] = 2
                    
                    # Generate SQL
                    columns = list(db_record.keys())
                    cols_str = ', '.join(columns)
                    placeholders = ', '.join(['%s'] * len(columns))
                    values = [db_record[col] for col in columns]
                    
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
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    def inspect_and_import_events(self, filepath):
        """Inspect JSON format and import player events correctly"""
        self.stdout.write(f"Importing player events from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                self.stdout.write(self.style.ERROR("No data found in file"))
                return
            
            # Inspect first record
            first_record = data[0]
            self.stdout.write(f"First event record structure: {json.dumps(first_record, indent=2)}")
            
            # Get database columns
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'api_iplplayerevent'
                    ORDER BY ordinal_position
                """)
                db_columns = [row[0] for row in cursor.fetchall()]
            
            self.stdout.write(f"Database columns: {', '.join(db_columns)}")
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplplayerevent")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing events")
            
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
                        
                        # Create insertable record with proper column mapping
                        db_record = {'id': record_id}
                        
                        # Default required fields
                        db_record['created_at'] = now
                        db_record['updated_at'] = now
                        
                        # Map foreign keys
                        for_team_id = None
                        match_id = None
                        
                        # Handle player_id
                        if 'player_id' in item and item['player_id'] is not None:
                            db_record['player_id'] = item['player_id']
                        elif 'player' in item and item['player'] is not None:
                            db_record['player_id'] = item['player']
                        else:
                            db_record['player_id'] = 1  # Default player
                        
                        # Handle match_id
                        if 'match_id' in item and item['match_id'] is not None:
                            db_record['match_id'] = item['match_id']
                            match_id = item['match_id']
                        elif 'match' in item and item['match'] is not None:
                            db_record['match_id'] = item['match']
                            match_id = item['match']
                        else:
                            db_record['match_id'] = 1  # Default match
                            match_id = 1
                        
                        # Handle for_team_id
                        if 'for_team_id' in item and item['for_team_id'] is not None:
                            db_record['for_team_id'] = item['for_team_id']
                            for_team_id = item['for_team_id']
                        elif 'for_team' in item and item['for_team'] is not None:
                            db_record['for_team_id'] = item['for_team']
                            for_team_id = item['for_team']
                        else:
                            db_record['for_team_id'] = 1  # Default team
                            for_team_id = 1
                        
                        # Handle vs_team_id based on match data
                        if 'vs_team_id' in item and item['vs_team_id'] is not None:
                            db_record['vs_team_id'] = item['vs_team_id']
                        elif 'vs_team' in item and item['vs_team'] is not None:
                            db_record['vs_team_id'] = item['vs_team']
                        elif match_id in match_teams and for_team_id:
                            team_1_id, team_2_id = match_teams[match_id]
                            if for_team_id == team_1_id:
                                db_record['vs_team_id'] = team_2_id
                            else:
                                db_record['vs_team_id'] = team_1_id
                        else:
                            # Default vs_team
                            if for_team_id == 1:
                                db_record['vs_team_id'] = 2
                            else:
                                db_record['vs_team_id'] = 1
                        
                        # Map other fields (customize based on your data structure)
                        field_mappings = {
                            'bat_runs': ['bat_runs'],
                            'bat_balls': ['bat_balls'],
                            'bat_fours': ['bat_fours'],
                            'bat_sixes': ['bat_sixes'],
                            'bat_not_out': ['bat_not_out'],
                            'bowl_balls': ['bowl_balls'],
                            'bowl_runs': ['bowl_runs'],
                            'bowl_wickets': ['bowl_wickets'],
                            'bowl_maidens': ['bowl_maidens'],
                            'bat_strike_rate': ['bat_strike_rate'],
                            'bowl_economy': ['bowl_economy'],
                            'player_of_match': ['player_of_match'],
                            'total_points_all': ['total_points_all'],
                            'batting_points_total': ['batting_points_total'],
                            'bowling_points_total': ['bowling_points_total'],
                            'fielding_points_total': ['fielding_points_total']
                        }
                        
                        # Apply mappings
                        for db_field, json_fields in field_mappings.items():
                            for json_field in json_fields:
                                if json_field in item and item[json_field] is not None:
                                    db_record[db_field] = item[json_field]
                                    break
                        
                        # Generate SQL
                        columns = list(db_record.keys())
                        cols_str = ', '.join(columns)
                        placeholders = ', '.join(['%s'] * len(columns))
                        values = [db_record[col] for col in columns]
                        
                        sql = f"INSERT INTO api_iplplayerevent ({cols_str}) VALUES ({placeholders})"
                        
                        # Execute SQL
                        with connection.cursor() as cursor:
                            cursor.execute(sql, values)
                        
                        imported += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing event {record_id}: {str(e)}"))
                        errors += 1
                
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch {i//batch_size + 1} complete: {imported} imported, {errors} errors")
            
            self.stdout.write(self.style.SUCCESS(f"Imported {total_imported} events ({total_errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))