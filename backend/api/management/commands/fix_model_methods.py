# backend/api/management/commands/fix_model_methods.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix model method issues with NULL values'

    def handle(self, *args, **options):
        # Add a check for None in the _calculate_economy_bonus method
        self.fix_bowl_points_methods()
        
    def fix_bowl_points_methods(self):
        self.stdout.write("Fixing bowl_points calculation methods...")
        
        # Find the model file
        import os
        from django.apps import apps
        
        api_app = apps.get_app_config('api')
        models_file = os.path.join(api_app.path, 'models.py')
        
        if os.path.exists(models_file):
            with open(models_file, 'r') as f:
                content = f.read()
            
            # Look for the problematic line and fix it
            if 'if self.bowl_balls < 10:' in content:
                updated_content = content.replace(
                    'if self.bowl_balls < 10:', 
                    'if self.bowl_balls is None or self.bowl_balls < 10:'
                )
                
                # Save the updated file
                with open(models_file, 'w') as f:
                    f.write(updated_content)
                    
                self.stdout.write(self.style.SUCCESS('Fixed _calculate_economy_bonus method'))
            else:
                self.stdout.write(self.style.WARNING('Could not find the problematic line'))
        else:
            self.stdout.write(self.style.ERROR(f'Models file not found at {models_file}'))