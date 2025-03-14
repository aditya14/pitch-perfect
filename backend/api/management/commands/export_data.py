# backend/api/management/commands/export_data.py
import json
import os
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from api.models import (
    Season, IPLTeam, IPLPlayer, 
    FantasyBoostRole, IPLMatch, IPLPlayerEvent, 
    PlayerTeamHistory, TeamSeason
)  # Add your other models here

class CustomJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        # Skip non-serializable fields
        from django.db.models.fields.files import FieldFile
        if isinstance(obj, FieldFile):
            return None
        return super().default(obj)

class Command(BaseCommand):
    help = 'Exports data model by model in a format suitable for PostgreSQL'

    def handle(self, *args, **options):
        # Create export directory if it doesn't exist
        if not os.path.exists('exports'):
            os.makedirs('exports')
        
        # Export data for each model
        self.export_model(Season, 'exports/seasons.json')
        self.export_model(IPLTeam, 'exports/teams.json')
        self.export_model(IPLPlayer, 'exports/players.json')
        self.export_model(FantasyBoostRole, 'exports/fantasy_boost_roles.json')
        self.export_model(TeamSeason, 'exports/team_seasons.json')
        self.export_model(PlayerTeamHistory, 'exports/player_team_history.json')
        self.export_model(IPLMatch, 'exports/ipl_matches.json')
        self.export_model(IPLPlayerEvent, 'exports/ipl_player_events.json')
        
        # Add other models as needed
        
        self.stdout.write(self.style.SUCCESS('Export complete. Files saved in the exports directory.'))
    
    def export_model(self, model, filename):
        self.stdout.write(f'Exporting {model.__name__}...')
        
        data = []
        for obj in model.objects.all():
            # Convert model instance to dictionary
            item = {}
            for field in obj._meta.fields:
                field_name = field.name
                field_value = getattr(obj, field_name)
                
                # Skip file fields (images)
                from django.db.models.fields.files import FieldFile
                if isinstance(field_value, FieldFile):
                    continue
                
                # Handle special field types if needed
                item[field_name] = field_value
            
            data.append(item)
        
        # Save to file with proper encoding
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, cls=CustomJSONEncoder, ensure_ascii=False, indent=2)
        
        self.stdout.write(f'Exported {len(data)} {model.__name__} records to {filename}')