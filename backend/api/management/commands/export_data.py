# backend/api/management/commands/export_data.py
import json
import os
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from api.models import Season, IPLTeam, IPLPlayer  # Add your other models here

class Command(BaseCommand):
    help = 'Exports data model by model in a format suitable for PostgreSQL'

    def handle(self, *args, **options):
        # Create export directory if it doesn't exist
        if not os.path.exists('exports'):
            os.makedirs('exports')
        
        # Export Season data
        self.export_model(Season, 'exports/seasons.json')
        
        # Export IPLTeam data
        self.export_model(IPLTeam, 'exports/teams.json')
        
        # Export IPLPlayer data
        self.export_model(IPLPlayer, 'exports/players.json')
        
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
                
                # Handle special field types if needed
                item[field_name] = field_value
            
            data.append(item)
        
        # Save to file with proper encoding
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, cls=DjangoJSONEncoder, ensure_ascii=False, indent=2)
        
        self.stdout.write(f'Exported {len(data)} {model.__name__} records to {filename}')