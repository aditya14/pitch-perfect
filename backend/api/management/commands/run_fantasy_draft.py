# This command runs the fantasy league draft
# Usage: python manage.py run_fantasy_draft --league_id=<league_id>

import random
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.models import FantasyLeague, FantasySquad, FantasyDraft, Season, IPLPlayer
from django.utils import timezone
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run the fantasy draft for a specific league'

    def add_arguments(self, parser):
        parser.add_argument('--league_id', type=int, required=True, help='ID of the fantasy league')
        parser.add_argument('--dry_run', action='store_true', help='Run without saving changes')
        parser.add_argument('--verbose', action='store_true', help='Show detailed draft picks')

    def handle(self, *args, **options):
        league_id = options['league_id']
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        try:
            league = FantasyLeague.objects.get(id=league_id)
        except FantasyLeague.DoesNotExist:
            raise CommandError(f'Fantasy League with ID {league_id} does not exist')
        
        self.stdout.write(self.style.NOTICE(f'Starting draft for league: {league.name}'))
        
        # Check if the draft is already completed
        if league.draft_completed:
            if dry_run:
                self.stdout.write(self.style.WARNING('Draft already completed, proceeding anyway due to --dry_run flag'))
            else:
                raise CommandError('Draft already completed for this league')
        
        # Get all squads in the league
        squads = FantasySquad.objects.filter(league=league)
        squad_count = squads.count()
        
        if squad_count == 0:
            raise CommandError('No squads in this league')
        
        self.stdout.write(f'Found {squad_count} squads in the league')
        
        # Ensure all squads have a draft order object
        self.ensure_draft_orders(league, squads)
        
        # Generate snake draft order if it doesn't exist
        if not league.snake_draft_order:
            league.snake_draft_order = self.generate_draft_order(squads)
            if not dry_run:
                league.save()
            self.stdout.write(f'Generated snake draft order: {league.snake_draft_order}')
        else:
            self.stdout.write(f'Using existing snake draft order: {league.snake_draft_order}')
        
        # Calculate how many players each squad needs
        eligible_players = IPLPlayer.objects.filter(
            playerteamhistory__season=league.season
        ).distinct()
        
        total_players = eligible_players.count()
        
        # Calculate players per squad (rounded down) to ensure we don't exceed available players
        players_per_squad = min(total_players // squad_count, 23)  # 23 is a reasonable default
        
        self.stdout.write(f'Total eligible players: {total_players}')
        self.stdout.write(f'Players per squad: {players_per_squad}')
        
        # Run the draft
        draft_results = self.run_draft(
            league=league,
            squads=squads,
            players_per_squad=players_per_squad,
            verbose=verbose
        )
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run completed, no changes saved'))
        else:
            # Save the draft results
            self.save_draft_results(draft_results)
            
            # Mark the draft as completed
            league.draft_completed = True
            league.save()
            
            self.stdout.write(self.style.SUCCESS('Draft completed successfully!'))
    
    def ensure_draft_orders(self, league: FantasyLeague, squads: List[FantasySquad]) -> None:
        """Ensure all squads have a draft order object."""
        for squad in squads:
            draft_order = FantasyDraft.objects.filter(league=league, squad=squad, type='Pre-Season').first()
            
            if not draft_order:
                self.stdout.write(f'Creating draft order for {squad.name}')
                
                # Use default order from season
                default_order = list(league.season.default_draft_order)
                
                # Create the draft order object
                FantasyDraft.objects.create(
                    league=league,
                    squad=squad,
                    type='Pre-Season',
                    order=default_order
                )
    
    def generate_draft_order(self, squads: List[FantasySquad]) -> List[int]:
        """Generate a random draft order using squad IDs."""
        squad_ids = list(squads.values_list('id', flat=True))
        random.shuffle(squad_ids)
        return squad_ids
    
    def run_draft(
        self, 
        league: FantasyLeague, 
        squads: List[FantasySquad],
        verbose: bool = False
    ) -> Dict[int, List[int]]:
        """Run the snake draft for the league and assign ALL players."""
        # Get all draft orders
        draft_orders = {}
        for squad in squads:
            draft_obj = FantasyDraft.objects.get(league=league, squad=squad, type='Pre-Season')
            draft_orders[squad.id] = list(draft_obj.order)
        
        # Convert snake_draft_order to a list if it's not already
        snake_order = list(league.snake_draft_order)
        
        # Track which players have been drafted
        drafted_players = set()
        
        # Store the results of the draft
        results = {squad.id: [] for squad in squads}
        
        # Get all eligible players
        all_player_ids = set()
        for squad_id, order in draft_orders.items():
            all_player_ids.update(order)
        
        # Continue drafting until all players have been assigned
        round_num = 0
        total_players = len(all_player_ids)
        
        self.stdout.write(f'Starting draft with {total_players} players to assign')
        
        while len(drafted_players) < total_players:
            # In even rounds, go forward
            if round_num % 2 == 0:
                round_order = snake_order
            # In odd rounds, go backward (snake draft)
            else:
                round_order = list(reversed(snake_order))
            
            self.stdout.write(f'Round {round_num + 1}:')
            
            # Each squad picks a player in this round
            for squad_id in round_order:
                # Find the highest ranked available player for this squad
                available_player = None
                for player_id in draft_orders[squad_id]:
                    if player_id not in drafted_players:
                        available_player = player_id
                        break
                
                # If no available player is found for this squad, continue to the next squad
                if available_player is None:
                    self.stdout.write(self.style.WARNING(f'  Squad {squad_id} has no available players to draft!'))
                    continue
                
                # Add the player to the squad's results
                results[squad_id].append(available_player)
                # Mark the player as drafted
                drafted_players.add(available_player)
                
                # Log the pick if verbose
                if verbose:
                    player = IPLPlayer.objects.get(id=available_player)
                    squad = FantasySquad.objects.get(id=squad_id)
                    self.stdout.write(f'  {squad.name} drafted {player.name}')
                
                # If all players have been drafted, we're done
                if len(drafted_players) >= total_players:
                    break
            
            round_num += 1
        
        # Print results summary
        for squad_id, players in results.items():
            squad = FantasySquad.objects.get(id=squad_id)
            self.stdout.write(f'{squad.name}: {len(players)} players')
        
        return results
    
    @transaction.atomic
    def save_draft_results(self, results: Dict[int, List[int]]) -> None:
        """Save the draft results to the database."""
        for squad_id, player_ids in results.items():
            squad = FantasySquad.objects.get(id=squad_id)
            squad.current_squad = player_ids
            squad.save()
            
            self.stdout.write(f'Assigned {len(player_ids)} players to {squad.name}')
