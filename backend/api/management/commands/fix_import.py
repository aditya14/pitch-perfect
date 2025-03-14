# backend/api/management/commands/fix_import.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Imports data with special handling for not-null constraints'

    def handle(self, *args, **options):
        # Find data files
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
    
    def import_matches(self, filepath):
        """Import match data with special handling for required fields"""
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
            
            for item in missing_data:
                try:
                    record_id = int(item.get('id'))
                    
                    # Ensure required fields have values
                    season_id = item.get('season_id')
                    if not season_id and 'season' in item:
                        season_id = item['season']
                    
                    # Default to Season ID 1 if not specified
                    if not season_id:
                        self.stdout.write(f"Setting default season_id=1 for match {record_id}")
                        season_id = 1
                    
                    team_1_id = item.get('team_1_id')
                    if not team_1_id and 'team_1' in item:
                        team_1_id = item['team_1']
                    
                    team_2_id = item.get('team_2_id')
                    if not team_2_id and 'team_2' in item:
                        team_2_id = item['team_2']
                    
                    # Insert with required fields
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO api_iplmatch (
                                id, season_id, team_1_id, team_2_id, 
                                date, venue, status, match_number, cricdata_id
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, [
                            record_id,
                            season_id,
                            team_1_id or 1,  # Default to team ID 1 if missing
                            team_2_id or 2,  # Default to team ID 2 if missing
                            item.get('date') or '2024-01-01',  # Default date
                            item.get('venue') or 'Unknown',  # Default venue
                            item.get('status') or 'COMPLETED',  # Default status
                            item.get('match_number') or 1,  # Default match number
                            item.get('cricdata_id') or f'match-{record_id}'  # Default cricdata_id
                        ])
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} matches...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing match {item.get('id')}: {str(e)}"))
                    errors += 1
                    continue
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    def import_events(self, filepath):
        """Import player event data with special handling for required fields"""
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
                        
                        # Ensure required fields have values
                        player_id = item.get('player_id')
                        if not player_id and 'player' in item:
                            player_id = item['player']
                        
                        match_id = item.get('match_id')
                        if not match_id and 'match' in item:
                            match_id = item['match']
                        
                        for_team_id = item.get('for_team_id')
                        if not for_team_id and 'for_team' in item:
                            for_team_id = item['for_team']
                        
                        # Insert with required fields
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                INSERT INTO api_iplplayerevent (
                                    id, player_id, match_id, for_team_id, 
                                    batting_position, bowling_position, bat_runs, 
                                    bat_balls, bat_not_out, total_points_all
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, [
                                record_id,
                                player_id or 1,  # Default to player ID 1 if missing
                                match_id or 1,  # Default to match ID 1 if missing
                                for_team_id or 1,  # Default to team ID 1 if missing
                                item.get('batting_position') or 0,  # Default batting position
                                item.get('bowling_position') or 0,  # Default bowling position
                                item.get('bat_runs') or 0,  # Default bat runs
                                item.get('bat_balls') or 0,  # Default bat balls
                                item.get('bat_not_out', False),  # Default not out
                                item.get('total_points_all') or 0  # Default total points
                            ])
                        
                        imported += 1
                    
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing event {item.get('id')}: {str(e)}"))
                        errors += 1
                        continue
                
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch complete: {imported} imported, {errors} errors")
            
            self.stdout.write(self.style.SUCCESS(f"Imported {total_imported} events ({total_errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))