# backend/api/management/commands/import_player_events.py
import json
import os
from django.core.management.base import BaseCommand
from django.db.models import ForeignKey
from api.models import IPLPlayerEvent, IPLPlayer, IPLMatch, IPLTeam

class Command(BaseCommand):
    help = 'Imports all missing IPLPlayerEvent records'

    def handle(self, *args, **options):
        # Look for JSON files in multiple possible locations
        possible_paths = [
            '.',                 # Current directory
            './exports',         # Exports subdirectory
            '/app',              # Root app directory
            '/app/exports',      # Exports in root app directory
            os.path.dirname(__file__),  # Directory containing this script
            os.path.join(os.path.dirname(__file__), '../../../exports')  # Relative to script
        ]
        
        # Find path with JSON files
        json_path = None
        for path in possible_paths:
            if os.path.exists(path) and any(f.endswith('.json') for f in os.listdir(path)):
                json_path = path
                self.stdout.write(f"Found JSON files in: {path}")
                break
        
        if not json_path:
            self.stdout.write(self.style.ERROR("Could not find JSON files"))
            return
        
        # Define file path
        player_events_path = os.path.join(json_path, 'ipl_player_events.json')
        
        if not os.path.exists(player_events_path):
            self.stdout.write(self.style.ERROR(f"File not found: {player_events_path}"))
            return
        
        # Count existing records
        existing_count = IPLPlayerEvent.objects.count()
        self.stdout.write(f"Found {existing_count} existing IPLPlayerEvent records")
        
        # Import player events
        try:
            with open(player_events_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"Loaded {len(data)} player events from file")
            
            # Get existing IDs
            existing_ids = set(IPLPlayerEvent.objects.values_list('id', flat=True))
            
            # Filter records to only include missing ones
            missing_data = [item for item in data if item.get('id') not in existing_ids]
            self.stdout.write(f"Found {len(missing_data)} missing player events to import")
            
            # Process in batches to avoid memory issues
            batch_size = 1000
            total_imported = 0
            total_errors = 0
            
            for i in range(0, len(missing_data), batch_size):
                batch = missing_data[i:i+batch_size]
                self.stdout.write(f"Processing batch {i//batch_size + 1} ({len(batch)} records)")
                
                imported, errors = self.import_batch(batch)
                total_imported += imported
                total_errors += errors
                
                self.stdout.write(f"Batch complete: {imported} imported, {errors} errors")
            
            self.stdout.write(self.style.SUCCESS(
                f"Import complete: {total_imported} IPLPlayerEvent records imported ({total_errors} errors)"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {player_events_path}: {str(e)}"))
    
    def import_batch(self, batch):
        """Import a batch of player event records"""
        imported = 0
        errors = 0
        
        for item in batch:
            try:
                # Process foreign keys
                if 'player_id' in item and item['player_id'] is not None:
                    try:
                        player = IPLPlayer.objects.get(pk=item['player_id'])
                        item['player'] = player
                    except IPLPlayer.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f"Player with ID {item['player_id']} not found"
                        ))
                        continue
                
                if 'match_id' in item and item['match_id'] is not None:
                    try:
                        match = IPLMatch.objects.get(pk=item['match_id'])
                        item['match'] = match
                    except IPLMatch.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f"Match with ID {item['match_id']} not found"
                        ))
                        continue
                
                if 'for_team_id' in item and item['for_team_id'] is not None:
                    try:
                        for_team = IPLTeam.objects.get(pk=item['for_team_id'])
                        item['for_team'] = for_team
                    except IPLTeam.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f"Team with ID {item['for_team_id']} not found"
                        ))
                        continue
                
                if 'vs_team_id' in item and item['vs_team_id'] is not None:
                    try:
                        vs_team = IPLTeam.objects.get(pk=item['vs_team_id'])
                        item['vs_team'] = vs_team
                    except IPLTeam.DoesNotExist:
                        item['vs_team'] = None
                
                # Remove ID fields since we're using the actual objects
                item.pop('player_id', None)
                item.pop('match_id', None)
                item.pop('for_team_id', None)
                item.pop('vs_team_id', None)
                
                # Create the record
                obj = IPLPlayerEvent(**item)
                obj.save()
                imported += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error importing player event ID {item.get('id')}: {str(e)}"))
                errors += 1
        
        return imported, errors