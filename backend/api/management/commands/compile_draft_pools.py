# api/management/commands/compile_draft_pools.py
from django.core.management.base import BaseCommand
from api.models import FantasyLeague, FantasySquad, IPLPlayer

class Command(BaseCommand):
    help = 'Compiles draft pools for mid-season draft by identifying players not in core squads'

    def handle(self, *args, **options):
        leagues = FantasyLeague.objects.filter(season__status='ONGOING')
        self.stdout.write(f"Found {leagues.count()} active leagues")
        
        for league in leagues:
            self.compile_draft_pool(league)
    
    def compile_draft_pool(self, league):
        squads = FantasySquad.objects.filter(league=league)
        
        # Get all player IDs in the league's current rosters
        all_rostered_players = set()
        all_core_players = set()
        
        for squad in squads:
            # Add all current squad players to the rostered set
            if squad.current_squad:
                all_rostered_players.update(squad.current_squad)
            
            # Add all core squad players to the retained set
            if squad.current_core_squad:
                for boost in squad.current_core_squad:
                    if 'player_id' in boost:
                        all_core_players.add(boost['player_id'])
        
        # Players in the draft pool are those who are rostered but not in any core squad
        draft_pool = list(all_rostered_players - all_core_players)
        
        # Save the draft pool to the league
        league.draft_pool = draft_pool
        league.save()
        
        self.stdout.write(f"League {league.name}: {len(draft_pool)} players in draft pool")
        return draft_pool