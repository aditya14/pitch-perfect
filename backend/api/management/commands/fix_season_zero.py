# backend/api/management/commands/fix_season_zero.py
from django.core.management.base import BaseCommand
from api.models import Season
from django.utils import timezone

class Command(BaseCommand):
    help = 'Creates the missing Season with ID 0 if it does not exist'

    def handle(self, *args, **options):
        # Check if Season with ID 0 exists
        if not Season.objects.filter(id=0).exists():
            self.stdout.write("Season with ID 0 does not exist. Creating it now...")
            
            try:
                # Create the Season with ID 0
                # Replace these values with your actual Season data
                season = Season(
                    id=0,
                    year=2008,
                    name="IPL 2008",
                    start_date=timezone.make_aware(timezone.datetime(2008, 4, 18)),
                    end_date=timezone.make_aware(timezone.datetime(2008, 6, 1)),
                    status="COMPLETED" ,
                    default_draft_order=[""],
                )
                
                # Force insert with ID 0
                season.save(force_insert=True)
                
                self.stdout.write(self.style.SUCCESS("Successfully created Season with ID 0"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to create Season with ID 0: {str(e)}"))
        else:
            self.stdout.write(self.style.SUCCESS("Season with ID 0 already exists"))