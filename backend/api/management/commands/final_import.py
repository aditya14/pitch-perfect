# backend/api/management/commands/final_import.py
import json
import os
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Final data import with correct field mapping'

    def handle(self, *args, **options):
        # Ensure Season 0 exists
        self.ensure_season_zero()
        
        # Import data files
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
                self.stdout.write("Season 0 does not exist. Creating it...")
                
                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO api_season (
                            id, year, name, start_date, end_date, status
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """, [
                        0,  # id
                        2008,  # year
                        'IPL 2008',  # name
                        '2008-04-18',  # start_date
                        '2008-06-01',  # end_date
                        'COMPLETED'  # status
                    ])
                
                self.stdout.write(self.style.SUCCESS("Created Season 0"))
            else:
                self.stdout.write("Season 0 already exists")
    
    def import_matches(self, filepath):
        """Import matches with correct field mapping"""
        self.stdout.write(f"Importing matches from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplmatch")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches")
            
            # Process records
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    record_id = int(item.get('id'))
                    
                    # Map JSON to DB fields
                    season_id = item.get('season')
                    team_1_id = item.get('team_1')
                    team_2_id = item.get('team_2')
                    toss_winner_id = item.get('toss_winner')
                    winner_id = item.get('winner')
                    player_of_match_id = item.get('player_of_match')
                    match_number = item.get('match_number')
                    date = item.get('date')
                    venue = item.get('venue')
                    status = item.get('status')
                    stage = item.get('stage', 'LEAGUE')  # Default to LEAGUE if missing
                    toss_decision = item.get('toss_decision')
                    win_margin = item.get('win_margin')
                    win_type = item.get('win_type')
                    inns_1_runs = item.get('inns_1_runs')
                    inns_1_wickets = item.get('inns_1_wickets')
                    inns_1_overs = item.get('inns_1_overs')
                    inns_2_runs = item.get('inns_2_runs')
                    inns_2_wickets = item.get('inns_2_wickets')
                    inns_2_overs = item.get('inns_2_overs')
                    cricdata_id = item.get('cricdata_id')
                    
                    # Execute SQL
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO api_iplmatch (
                                id, match_number, date, venue, status, toss_decision, 
                                win_margin, win_type, team_1_id, team_2_id, toss_winner_id, 
                                winner_id, season_id, inns_1_overs, inns_1_runs, inns_1_wickets, 
                                inns_2_overs, inns_2_runs, inns_2_wickets, player_of_match_id, 
                                stage, cricdata_id
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                                %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """, [
                            record_id, match_number, date, venue, status, toss_decision,
                            win_margin, win_type, team_1_id, team_2_id, toss_winner_id,
                            winner_id, season_id or 0, inns_1_overs, inns_1_runs, inns_1_wickets,
                            inns_2_overs, inns_2_runs, inns_2_wickets, player_of_match_id,
                            stage, cricdata_id
                        ])
                    
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
        """Import player events with correct field mapping"""
        self.stdout.write(f"Importing player events from {filepath}")
        
        try:
            # Read the data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Get existing IDs
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM api_iplplayerevent")
                existing_ids = {row[0] for row in cursor.fetchall()}
            
            # Filter missing records
            missing_data = [item for item in data if int(item.get('id')) not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing events")
            
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
                        
                        # Map JSON to DB fields
                        player_id = item.get('player')
                        match_id = item.get('match')
                        for_team_id = item.get('for_team')
                        vs_team_id = item.get('vs_team')
                        bat_runs = item.get('bat_runs')
                        bat_balls = item.get('bat_balls')
                        bat_fours = item.get('bat_fours')
                        bat_sixes = item.get('bat_sixes')
                        bat_not_out = item.get('bat_not_out')
                        bat_innings = item.get('bat_innings')
                        bowl_balls = item.get('bowl_balls')
                        bowl_maidens = item.get('bowl_maidens')
                        bowl_runs = item.get('bowl_runs')
                        bowl_wickets = item.get('bowl_wickets')
                        bowl_innings = item.get('bowl_innings')
                        field_catch = item.get('field_catch')
                        wk_catch = item.get('wk_catch')
                        wk_stumping = item.get('wk_stumping')
                        run_out_solo = item.get('run_out_solo')
                        run_out_collab = item.get('run_out_collab')
                        player_of_match = item.get('player_of_match')
                        batting_points_total = item.get('batting_points_total')
                        bowling_points_total = item.get('bowling_points_total')
                        fielding_points_total = item.get('fielding_points_total')
                        other_points_total = item.get('other_points_total')
                        total_points_all = item.get('total_points_all')
                        
                        # Execute SQL
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                INSERT INTO api_iplplayerevent (
                                    id, bat_runs, bat_balls, bat_fours, bat_sixes, bat_not_out,
                                    bat_innings, bowl_balls, bowl_maidens, bowl_runs, bowl_wickets,
                                    bowl_innings, field_catch, wk_catch, wk_stumping, run_out_solo,
                                    run_out_collab, player_of_match, for_team_id, match_id, player_id,
                                    vs_team_id, batting_points_total, bowling_points_total,
                                    fielding_points_total, other_points_total, total_points_all
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                                )
                            """, [
                                record_id, bat_runs, bat_balls, bat_fours, bat_sixes, bat_not_out,
                                bat_innings, bowl_balls, bowl_maidens, bowl_runs, bowl_wickets,
                                bowl_innings, field_catch, wk_catch, wk_stumping, run_out_solo,
                                run_out_collab, player_of_match, for_team_id, match_id, player_id,
                                vs_team_id, batting_points_total, bowling_points_total,
                                fielding_points_total, other_points_total, total_points_all
                            ])
                        
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