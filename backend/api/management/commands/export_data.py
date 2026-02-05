# backend/api/management/commands/export_data.py
import json
import os
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from api.models import (
    Season, Team, Player, 
    FantasyBoostRole, Match, PlayerMatchEvent, 
    PlayerSeasonTeam, SeasonTeam
)

class CustomJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        # Handle file fields
        from django.db.models.fields.files import FieldFile
        if isinstance(obj, FieldFile):
            return None
        
        # Handle model instances by using their ID
        from django.db.models import Model
        if isinstance(obj, Model):
            return obj.pk
            
        return super().default(obj)

class Command(BaseCommand):
    help = 'Exports data model by model in a format suitable for PostgreSQL'

    def handle(self, *args, **options):
        # Create export directory if it doesn't exist
        if not os.path.exists('exports'):
            os.makedirs('exports')
        
        # Export data for each model
        self.export_model(Season, 'exports/seasons.json')
        self.export_model(Team, 'exports/teams.json')
        self.export_model(Player, 'exports/players.json')
        self.export_model(FantasyBoostRole, 'exports/fantasy_boost_roles.json')
        self.export_model(SeasonTeam, 'exports/team_seasons.json')
        self.export_model(PlayerSeasonTeam, 'exports/player_team_history.json')
        self.export_model(Match, 'exports/ipl_matches.json')
        self.export_model(PlayerMatchEvent, 'exports/ipl_player_events.json')
        
        self.stdout.write(self.style.SUCCESS('Export complete. Files saved in the exports directory.'))
    
    def export_model(self, model, filename):
        self.stdout.write(f'Exporting {model.__name__}...')
        
        data = []
        for obj in model.objects.all():
            # Convert model instance to dictionary
            item = {}
            for field in obj._meta.fields:
                try:
                    field_name = field.name
                    field_value = getattr(obj, field_name)
                    
                    # Skip None values for foreign keys
                    if field_value is None:
                        item[field_name] = None
                        continue
                    
                    # Skip file fields (images)
                    from django.db.models.fields.files import FieldFile
                    if isinstance(field_value, FieldFile):
                        continue
                    
                    # For foreign keys, just store the ID
                    from django.db.models import Model
                    if isinstance(field_value, Model):
                        field_value = field_value.pk
                    
                    # Add to export data
                    item[field_name] = field_value
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Error processing field {field_name} for {model.__name__} {obj.pk}: {str(e)}'))
                    # Skip this field but continue with others
                    continue
            
            # Only add the item if we have data
            if item:
                data.append(item)
        
        # Save to file with proper encoding
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, cls=CustomJSONEncoder, ensure_ascii=False, indent=2)
        
        self.stdout.write(f'Exported {len(data)} {model.__name__} records to {filename}')