# api/management/commands/execute_mid_season_draft.py
from django.core.management.base import BaseCommand
from api.models import DraftWindow, FantasyLeague, FantasySquad, FantasyDraft, Player
from django.db.models import Q, Avg
from django.utils import timezone
from api.services.draft_window_service import (
    resolve_draft_window,
    build_draft_pool,
    get_retained_player_map,
)

class Command(BaseCommand):
    help = 'Executes the mid-season draft based on standings'

    def add_arguments(self, parser):
        parser.add_argument('league_id', type=int, help='ID of the league to run the draft for')
        parser.add_argument('--dry_run', action='store_true', help='Run without saving changes')
        parser.add_argument('--verbose', action='store_true', help='Show detailed draft picks')

    def handle(self, *args, **options):
        league_id = options['league_id']
        dry_run = options.get('dry_run', False)
        verbose = options.get('verbose', False)
        
        try:
            league = FantasyLeague.objects.get(id=league_id)
            self.stdout.write(f"Executing mid-season draft for league: {league.name}")
            
            self.execute_draft(league, dry_run, verbose)
        except FantasyLeague.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"League with ID {league_id} not found"))
    
    def execute_draft(self, league, dry_run=False, verbose=False):
        # Get squads in order of their standings (highest to lowest for snake draft)
        # Note: We're reversing the order compared to what was in the original code
        squads = FantasySquad.objects.filter(league=league).order_by('-total_points')
        self.stdout.write(f"Found {squads.count()} squads")
        draft_window = resolve_draft_window(league, kind=DraftWindow.Kind.MID_SEASON)
        
        # Create snake draft order
        draft_rounds = []
        squad_ids = [squad.id for squad in squads]
        
        # Get the draft pool
        draft_pool = draft_window.draft_pool or build_draft_pool(league, draft_window)
        if not draft_pool:
            self.stdout.write(self.style.ERROR("Draft pool is empty for this draft window"))
            return
        if not draft_window.draft_pool:
            draft_window.draft_pool = draft_pool
            draft_window.save(update_fields=['draft_pool'])
        
        # Get retained players for each squad
        retained_players = get_retained_player_map(league, draft_window)
        total_retained = sum(len(v) for v in retained_players.values())
        if verbose:
            for squad in squads:
                retained_ids = retained_players.get(squad.id, [])
                self.stdout.write(f"Squad {squad.name} is retaining {len(retained_ids)} players")
        
        available_players = set(draft_pool)
        self.stdout.write(f"Draft pool has {len(available_players)} players")
        
        # Calculate how many rounds we need
        remaining_players = len(available_players)
        num_squads = squads.count()
        avg_players_needed = remaining_players // num_squads
        num_rounds = max(1, avg_players_needed)
        
        self.stdout.write(f"Each squad needs ~{avg_players_needed} players")
        self.stdout.write(f"Creating {num_rounds} draft rounds")
        
        # Create snake draft rounds
        for round_num in range(num_rounds):
            if round_num % 2 == 0:
                # Even rounds: best to worst (first round is even: 0)
                draft_rounds.append(squad_ids.copy())
            else:
                # Odd rounds: worst to best
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
                draft_window=draft_window
            ).first()
            
            if draft and draft.order:
                # Get the squad's retained players
                retained_ids = retained_players.get(squad.id, [])
                
                # Extract draft preferences excluding retained players
                # We know retained players are the first 8 player IDs in the order
                preferences = [player_id for player_id in draft.order if player_id not in retained_ids]
                squad_preferences[squad.id] = preferences
                
                if verbose:
                    self.stdout.write(f"Squad {squad.name} has {len(preferences)} players in their preference list")
            else:
                # Create a default order based on points
                default_order = list(Player.objects.filter(
                    id__in=draft_pool
                ).exclude(
                    id__in=retained_players.get(squad.id, [])
                ).annotate(
                    avg_points=Avg('playermatchevent__total_points_all')
                ).order_by('-avg_points').values_list('id', flat=True))
                
                squad_preferences[squad.id] = default_order
                
                if verbose:
                    self.stdout.write(f"Created default preferences for {squad.name} with {len(default_order)} players")
        
        # Track assignments beyond retained players
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
                
                if verbose:
                    squad = FantasySquad.objects.get(id=squad_id)
                    player = Player.objects.get(id=selected_player)
                    self.stdout.write(f"Pick {pick_num+1}: {squad.name} selects {player.name}")
            else:
                if verbose:
                    squad = FantasySquad.objects.get(id=squad_id)
                    self.stdout.write(f"Pick {pick_num+1}: {squad.name} has no available players in preferences")
        
        # Update squad rosters
        if not dry_run:
            self.stdout.write("Updating squad rosters...")
            
            for squad in squads:
                # Get retained players
                retained_ids = retained_players.get(squad.id, [])
                
                # Add drafted players
                drafted_players = squad_assignments.get(squad.id, [])
                
                # Update squad roster
                new_squad = retained_ids + drafted_players
                squad.current_squad = new_squad
                squad.save()
                
                self.stdout.write(f"Updated {squad.name}: {len(retained_ids)} retained + {len(drafted_players)} drafted = {len(new_squad)} total")
            
            # Mark draft as completed
            league.mid_season_draft_completed = True
            league.save()
            
            self.stdout.write(self.style.SUCCESS("Mid-season draft completed successfully!"))
        else:
            self.stdout.write(self.style.WARNING("Dry run completed - no changes saved"))
