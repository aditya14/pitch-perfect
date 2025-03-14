# backend/api/management/commands/raw_data_import.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from api.models import IPLMatch, IPLPlayerEvent, Season, IPLTeam, IPLPlayer

class Command(BaseCommand):
    help = 'Imports data using raw SQL for better control'

    def handle(self, *args, **options):
        # Find data files
        matches_file = self.find_file('ipl_matches.json')
        events_file = self.find_file('ipl_player_events.json')
        
        if not matches_file or not events_file:
            self.stdout.write(self.style.ERROR("Could not find required data files"))
            return
        
        # First import matches
        self.import_matches(matches_file)
        
        # Then import player events
        self.import_player_events(events_file)
    
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
    def import_matches(self, filepath):
        """Import IPLMatch records using direct SQL"""
        self.stdout.write(f"Importing matches from {filepath}")
        
        # Print Season data to verify it exists
        seasons = list(Season.objects.all().values('id', 'year'))
        self.stdout.write(f"Available Seasons: {seasons}")
        
        # Count existing matches
        existing_count = IPLMatch.objects.count()
        self.stdout.write(f"Found {existing_count} existing IPLMatch records")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} matches from file")
            
            # Get existing IDs
            existing_ids = set(IPLMatch.objects.values_list('id', flat=True))
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches to import")
            
            # Import using direct model creation
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    # Get record ID
                    record_id = int(item.get('id'))
                    
                    # Prepare SQL query with placeholders
                    sql = """
                        INSERT INTO api_iplmatch (
                            id, created_at, updated_at, date, match_number, venue, 
                            status, toss_choice, match_title, cricdata_id, is_active, 
                            season_id, team_1_id, team_2_id, toss_winner_id, winner_id, player_of_match_id
                        ) VALUES (
                            %s, NOW(), NOW(), %s, %s, %s, 
                            %s, %s, %s, %s, %s, 
                            %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (id) DO NOTHING;
                    """
                    
                    # Prepare values
                    values = [
                        record_id,
                        item.get('date') or None,
                        item.get('match_number') or None,
                        item.get('venue') or None,
                        item.get('status') or 'SCHEDULED',
                        item.get('toss_choice') or None,
                        item.get('match_title') or None,
                        item.get('cricdata_id') or None,
                        item.get('is_active', True),
                        item.get('season_id') or None,
                        item.get('team_1_id') or None,
                        item.get('team_2_id') or None,
                        item.get('toss_winner_id') or None,
                        item.get('winner_id') or None,
                        item.get('player_of_match_id') or None
                    ]
                    
                    # Execute SQL
                    with connection.cursor() as cursor:
                        cursor.execute(sql, values)
                    
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} matches...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing match {item.get('id')}: {str(e)}"))
                    errors += 1
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    @transaction.atomic
    def import_player_events(self, filepath):
        """Import IPLPlayerEvent records using direct SQL"""
        self.stdout.write(f"Importing player events from {filepath}")
        
        # Count existing events
        existing_count = IPLPlayerEvent.objects.count()
        self.stdout.write(f"Found {existing_count} existing IPLPlayerEvent records")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} player events from file")
            
            # Get existing IDs
            existing_ids = set(IPLPlayerEvent.objects.values_list('id', flat=True))
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing player events to import")
            
            # Process in batches to avoid memory issues
            batch_size = 500
            total_imported = 0
            total_errors = 0
            
            for i in range(0, len(missing_data), batch_size):
                batch = missing_data[i:i+batch_size]
                self.stdout.write(f"Processing batch {i//batch_size + 1} of {(len(missing_data) + batch_size - 1)//batch_size} ({len(batch)} records)")
                
                imported = 0
                errors = 0
                
                for item in batch:
                    try:
                        # Get record ID
                        record_id = int(item.get('id'))
                        
                        # Prepare SQL query
                        sql = """
                            INSERT INTO api_iplplayerevent (
                                id, created_at, updated_at, batting_position, bowling_position, 
                                bat_not_out, player_of_match, bat_runs, bat_balls, bat_fours, 
                                bat_sixes, bowl_balls, bowl_runs, bowl_wickets, bowl_maidens, 
                                bat_strike_rate, bowl_economy, wk_catch, wk_stumping, field_catch, 
                                run_out_solo, run_out_collab, batting_points_total, bowling_points_total, 
                                fielding_points_total, total_points_all, player_id, match_id, for_team_id, 
                                vs_team_id
                            ) VALUES (
                                %s, NOW(), NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                            ON CONFLICT (id) DO NOTHING;
                        """
                        
                        # Prepare values
                        values = [
                            record_id,
                            item.get('batting_position'),
                            item.get('bowling_position'),
                            item.get('bat_not_out', False),
                            item.get('player_of_match', False),
                            item.get('bat_runs'),
                            item.get('bat_balls'),
                            item.get('bat_fours'),
                            item.get('bat_sixes'),
                            item.get('bowl_balls'),
                            item.get('bowl_runs'),
                            item.get('bowl_wickets'),
                            item.get('bowl_maidens'),
                            item.get('bat_strike_rate'),
                            item.get('bowl_economy'),
                            item.get('wk_catch'),
                            item.get('wk_stumping'),
                            item.get('field_catch'),
                            item.get('run_out_solo'),
                            item.get('run_out_collab'),
                            item.get('batting_points_total'),
                            item.get('bowling_points_total'),
                            item.get('fielding_points_total'),
                            item.get('total_points_all'),
                            item.get('player_id'),
                            item.get('match_id'),
                            item.get('for_team_id'),
                            item.get('vs_team_id')
                        ]
                        
                        # Execute SQL
                        with connection.cursor() as cursor:
                            cursor.execute(sql, values)
                        
                        imported += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing player event {item.get('id')}: {str(e)}"))
                        errors += 1
                
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch complete: {imported} imported, {errors} errors")
                self.stdout.write(f"Total progress: {total_imported}/{len(missing_data)} ({total_errors} errors)")
            
            self.stdout.write(self.style.SUCCESS(
                f"Import complete: {total_imported} player events imported ({total_errors} errors)"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))