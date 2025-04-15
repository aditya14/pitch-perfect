# api/management/commands/execute_mid_season_draft.py
from django.core.management.base import BaseCommand
from api.models import FantasyLeague, FantasySquad, FantasyDraft, IPLPlayer
from django.db.models import Q

class Command(BaseCommand):
    help = 'Executes the mid-season draft based on standings'

    def add_arguments(self, parser):
        parser.add_argument('league_id', type=int, help='ID of the league to run the draft for')

    def handle(self, *args, **options):
        league_id = options['league_id']
        
        try:
            league = FantasyLeague.objects.get(id=league_id)
            self.stdout.write(f"Executing mid-season draft for league: {league.name}")
            
            self.execute_draft(league)
        except FantasyLeague.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"League with ID {league_id} not found"))
    
    def execute_draft(self, league):
        # Get squads in order of their standings (lowest to highest for snake draft)
        squads = FantasySquad.objects.filter(league=league).order_by('total_points')
        self.stdout.write(f"Found {squads.count()} squads")
        
        # Create snake draft order
        draft_rounds = []
        squad_ids = [squad.id for squad in squads]
        
        # Calculate how many rounds we need
        avg_players_needed = len(league.draft_pool) // squads.count()
        num_rounds = max(1, avg_players_needed)
        
        self.stdout.write(f"Draft pool has {len(league.draft_pool)} players")
        self.stdout.write(f"Each squad needs ~{avg_players_needed} players")
        self.stdout.write(f"Creating {num_rounds} draft rounds")
        
        # Create snake draft rounds
        for round_num in range(num_rounds):
            if round_num % 2 == 0:
                # Even rounds: worst to best
                draft_rounds.append(squad_ids.copy())
            else:
                # Odd rounds: best to worst
                draft_rounds.append(list(reversed(squad_ids.copy())))
        
        # Flatten the draft order
        flat_draft_order = []
        for round_list in draft_rounds:
            flat_draft_order.extend(round_list)
        
        # Get draft preferences for all users
        squad_preferences = {}
        for squad in squads:
            draft = FantasyDraft.objects.filter(
                league=league,
                squad=squad,
                type='Mid-Season'
            ).first()
            
            if draft and draft.order:
                # Use draft preferences
                squad_preferences[squad.id] = draft.order
            else:
                # Create a default order based on points
                from django.db.models import Avg, Count
                
                default_order = list(IPLPlayer.objects.filter(
                    id__in=league.draft_pool
                ).annotate(
                    avg_points=Avg('iplplayerevent__total_points_all')
                ).order_by('-avg_points').values_list('id', flat=True))
                
                squad_preferences[squad.id] = default_order
        
        # Track available players and assignments
        available_players = set(league.draft_pool)
        squad_assignments = {squad.id: [] for squad in squads}
        
        # Execute the draft
        self.stdout.write(f"Executing draft with {len(flat_draft_order)} picks")
        
        for pick_num, squad_id in enumerate(flat_draft_order):
            if not available_players:
                self.stdout.write("No more players available - draft complete")
                break
                
            # Get the squad's preferences
            preferences = squad_preferences[squad_id]
            
            # Find the highest preferred available player
            selected_player = None
            for player_id in preferences:
                if player_id in available_players:
                    selected_player = player_id
                    break
            
            if selected_player:
                # Add to squad's assignments
                squad_assignments[squad_id].append(selected_player)
                # Remove from available pool
                available_players.remove(selected_player)
                
                squad = FantasySquad.objects.get(id=squad_id)
                player = IPLPlayer.objects.get(id=selected_player)
                self.stdout.write(f"Pick {pick_num+1}: {squad.name} selects {player.name}")
            else:
                self.stdout.write(f"Error: No available players in preferences for squad {squad_id}")
        
        # Update squad rosters
        self.stdout.write("Updating squad rosters...")
        
        for squad in squads:
            # Get core squad players (retained)
            retained_players = []
            if squad.current_core_squad:
                retained_players = [boost['player_id'] for boost in squad.current_core_squad if 'player_id' in boost]
            
            # Add drafted players
            drafted_players = squad_assignments.get(squad.id, [])
            
            # Update squad roster
            new_squad = retained_players + drafted_players
            squad.current_squad = new_squad
            squad.save()
            
            self.stdout.write(f"Updated {squad.name}: {len(retained_players)} retained + {len(drafted_players)} drafted = {len(new_squad)} total")
        
        # Mark draft as completed
        league.mid_season_draft_completed = True
        league.save()
        
        self.stdout.write(self.style.SUCCESS("Mid-season draft completed successfully!"))