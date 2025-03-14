# backend/api/management/commands/import_matches_events.py
import json
import os
from django.core.management.base import BaseCommand
from api.models import IPLMatch, IPLPlayerEvent, Season, IPLTeam, IPLPlayer

class Command(BaseCommand):
    help = 'Imports only IPLMatch and IPLPlayerEvent records'

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
    
    def import_matches(self, filepath):
        """Import IPLMatch records"""
        self.stdout.write(f"Importing matches from {filepath}")
        
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
            missing_data = [item for item in data if item.get('id') not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing matches to import")
            
            # Import matches
            imported = 0
            errors = 0
            
            for item in missing_data:
                try:
                    # Create a copy of the item to modify
                    match_data = dict(item)
                    
                    # Handle Season
                    if 'season_id' in match_data:
                        season_id = match_data.pop('season_id')
                        if season_id is not None:
                            try:
                                match_data['season'] = Season.objects.get(id=season_id)
                            except Season.DoesNotExist:
                                self.stdout.write(self.style.WARNING(f"Season {season_id} not found"))
                                continue
                    
                    # Handle Team 1
                    if 'team_1_id' in match_data:
                        team_1_id = match_data.pop('team_1_id')
                        if team_1_id is not None:
                            try:
                                match_data['team_1'] = IPLTeam.objects.get(id=team_1_id)
                            except IPLTeam.DoesNotExist:
                                self.stdout.write(self.style.WARNING(f"Team {team_1_id} not found"))
                                continue
                    
                    # Handle Team 2
                    if 'team_2_id' in match_data:
                        team_2_id = match_data.pop('team_2_id')
                        if team_2_id is not None:
                            try:
                                match_data['team_2'] = IPLTeam.objects.get(id=team_2_id)
                            except IPLTeam.DoesNotExist:
                                self.stdout.write(self.style.WARNING(f"Team {team_2_id} not found"))
                                continue
                    
                    # Handle Toss Winner
                    if 'toss_winner_id' in match_data:
                        toss_winner_id = match_data.pop('toss_winner_id')
                        if toss_winner_id is not None:
                            try:
                                match_data['toss_winner'] = IPLTeam.objects.get(id=toss_winner_id)
                            except IPLTeam.DoesNotExist:
                                match_data['toss_winner'] = None
                    
                    # Handle Winner
                    if 'winner_id' in match_data:
                        winner_id = match_data.pop('winner_id')
                        if winner_id is not None:
                            try:
                                match_data['winner'] = IPLTeam.objects.get(id=winner_id)
                            except IPLTeam.DoesNotExist:
                                match_data['winner'] = None
                    
                    # Handle Player of Match
                    if 'player_of_match_id' in match_data:
                        player_of_match_id = match_data.pop('player_of_match_id')
                        if player_of_match_id is not None:
                            try:
                                match_data['player_of_match'] = IPLPlayer.objects.get(id=player_of_match_id)
                            except IPLPlayer.DoesNotExist:
                                match_data['player_of_match'] = None
                    
                    # Create match
                    match = IPLMatch(**match_data)
                    match.save()
                    imported += 1
                    
                    if imported % 10 == 0:
                        self.stdout.write(f"Imported {imported} matches...")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error importing match {item.get('id')}: {str(e)}"))
                    errors += 1
            
            self.stdout.write(self.style.SUCCESS(f"Imported {imported} matches ({errors} errors)"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {filepath}: {str(e)}"))
    
    def import_player_events(self, filepath):
        """Import IPLPlayerEvent records"""
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
            missing_data = [item for item in data if item.get('id') not in existing_ids]
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
                        # Create a copy of the item to modify
                        event_data = dict(item)
                        
                        # Handle Player
                        if 'player_id' in event_data:
                            player_id = event_data.pop('player_id')
                            if player_id is not None:
                                try:
                                    event_data['player'] = IPLPlayer.objects.get(id=player_id)
                                except IPLPlayer.DoesNotExist:
                                    self.stdout.write(self.style.WARNING(f"Player {player_id} not found"))
                                    errors += 1
                                    continue
                        
                        # Handle Match
                        if 'match_id' in event_data:
                            match_id = event_data.pop('match_id')
                            if match_id is not None:
                                try:
                                    event_data['match'] = IPLMatch.objects.get(id=match_id)
                                except IPLMatch.DoesNotExist:
                                    self.stdout.write(self.style.WARNING(f"Match {match_id} not found"))
                                    errors += 1
                                    continue
                        
                        # Handle For Team
                        if 'for_team_id' in event_data:
                            for_team_id = event_data.pop('for_team_id')
                            if for_team_id is not None:
                                try:
                                    event_data['for_team'] = IPLTeam.objects.get(id=for_team_id)
                                except IPLTeam.DoesNotExist:
                                    self.stdout.write(self.style.WARNING(f"Team {for_team_id} not found"))
                                    errors += 1
                                    continue
                        
                        # Handle Vs Team
                        if 'vs_team_id' in event_data:
                            vs_team_id = event_data.pop('vs_team_id')
                            if vs_team_id is not None:
                                try:
                                    event_data['vs_team'] = IPLTeam.objects.get(id=vs_team_id)
                                except IPLTeam.DoesNotExist:
                                    event_data['vs_team'] = None
                        
                        # Create event
                        event = IPLPlayerEvent(**event_data)
                        event.save()
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