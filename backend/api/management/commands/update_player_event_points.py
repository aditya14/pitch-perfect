from django.db import models
from django.core.management.base import BaseCommand
from api.models import PlayerMatchEvent

class Command(BaseCommand):
    help = 'Updates points fields for all existing IPLPlayerEvents'

    def handle(self, *args, **options):
        events = PlayerMatchEvent.objects.all()
        total_events = events.count()
        
        self.stdout.write(f"Updating points for {total_events} events...")
        
        for i, event in enumerate(events, 1):
            # Calculate all points
            batting = event.bat_points
            bowling = event.bowl_points
            fielding = event.field_points
            other = (50 if event.player_of_match else 0) + 4  # POTM + participation
            total = batting + bowling + fielding + other

            # Use update() to bypass the model's save() method and properties
            PlayerMatchEvent.objects.filter(id=event.id).update(
                batting_points_total=batting,
                bowling_points_total=bowling,
                fielding_points_total=fielding,
                other_points_total=other,
                total_points_all=total
            )
            
            if i % 100 == 0:
                self.stdout.write(f"Processed {i}/{total_events} events...")
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated points for {total_events} events"))