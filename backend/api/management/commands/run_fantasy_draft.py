# This command runs the fantasy league draft
# Usage: python manage.py run_fantasy_draft --league_id=<league_id>

import random
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.models import FantasyLeague, FantasySquad, FantasyDraft, Season, Player
from django.utils import timezone
from django.db.models import Avg, Count, Q
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

ROLE_DRAFT_CONFIG = (
    (FantasyDraft.Role.BAT, False),
    (FantasyDraft.Role.WK, True),
    (FantasyDraft.Role.ALL, False),
    (FantasyDraft.Role.BOWL, True),
)

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
        eligible_players = Player.objects.filter(
            playerseasonteam__season=league.season
        ).distinct()
        
        total_players = eligible_players.count()

        self.stdout.write(f'Total eligible players: {total_players}')
        
        # Run the draft
        draft_results = self.run_draft(
            league=league,
            squads=squads,
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
    
    def build_role_default_order(self, league: FantasyLeague, role: str):
        role_player_ids = list(
            Player.objects.filter(
                playerseasonteam__season=league.season,
                role=role,
            ).distinct().values_list('id', flat=True)
        )
        role_player_set = set(role_player_ids)

        configured_default = []
        configured_default_set = set()
        default_payload = league.season.default_draft_order if league.season else []
        if isinstance(default_payload, list):
            raw_default_ids = []
            role_matched = False
            for item in default_payload:
                if isinstance(item, dict):
                    item_role = str(item.get('role', '')).upper()
                    if item_role == role:
                        role_matched = True
                        if isinstance(item.get('order'), list):
                            raw_default_ids.extend(item['order'])
                elif not role_matched:
                    # Backward compatible support for legacy flat default order lists.
                    raw_default_ids.append(item)

            for raw_player_id in raw_default_ids:
                try:
                    player_id = int(raw_player_id)
                except (TypeError, ValueError):
                    continue
                if player_id in role_player_set and player_id not in configured_default_set:
                    configured_default.append(player_id)
                    configured_default_set.add(player_id)

        if configured_default:
            default_order = configured_default + [
                player_id for player_id in role_player_ids if player_id not in configured_default_set
            ]
        else:
            ranked_players = Player.objects.filter(
                id__in=role_player_ids,
                role=role,
            ).annotate(
                matches=Count('playermatchevent', filter=Q(playermatchevent__match__season=league.season)),
                avg_points=Avg('playermatchevent__total_points_all', filter=Q(playermatchevent__match__season=league.season)),
            ).order_by('-avg_points', 'name')
            ranked_ids = list(ranked_players.values_list('id', flat=True))
            ranked_set = set(ranked_ids)
            default_order = ranked_ids + [player_id for player_id in role_player_ids if player_id not in ranked_set]

        return default_order, role_player_set

    def normalize_role_order(self, existing_order, eligible_player_set, default_order):
        existing_order = existing_order if isinstance(existing_order, list) else []
        normalized_existing = []
        seen_existing = set()
        for raw_player_id in existing_order:
            try:
                player_id = int(raw_player_id)
            except (TypeError, ValueError):
                continue
            if player_id in eligible_player_set and player_id not in seen_existing:
                normalized_existing.append(player_id)
                seen_existing.add(player_id)

        return normalized_existing + [
            player_id for player_id in default_order if player_id not in seen_existing
        ]

    def ensure_draft_orders(self, league: FantasyLeague, squads: List[FantasySquad]) -> None:
        """Ensure all squads have role-specific pre-season draft orders."""
        for role, _ in ROLE_DRAFT_CONFIG:
            default_order, eligible_role_players = self.build_role_default_order(league, role)
            for squad in squads:
                draft_order = FantasyDraft.objects.filter(
                    league=league,
                    squad=squad,
                    type='Pre-Season',
                    role=role,
                ).order_by('-id').first()

                if not draft_order:
                    self.stdout.write(f'Creating {role} draft order for {squad.name}')
                    FantasyDraft.objects.create(
                        league=league,
                        squad=squad,
                        type='Pre-Season',
                        role=role,
                        order=default_order,
                    )
                    continue

                normalized_order = self.normalize_role_order(
                    draft_order.order,
                    eligible_role_players,
                    default_order,
                )
                if normalized_order != draft_order.order:
                    draft_order.order = normalized_order
                    draft_order.save(update_fields=['order'])
    
    def generate_draft_order(self, squads: List[FantasySquad]) -> List[int]:
        """Generate a random draft order using squad IDs."""
        squad_ids = list(squads.values_list('id', flat=True))
        random.shuffle(squad_ids)
        return squad_ids
    
    def run_draft(
        self,
        league: FantasyLeague,
        squads: List[FantasySquad],
        verbose: bool = False,
    ) -> Dict[int, List[int]]:
        """Run role-based snake drafts and assign all players."""
        squad_ids = list(squads.values_list('id', flat=True))
        squad_id_set = set(squad_ids)
        base_snake_order = [sid for sid in (league.snake_draft_order or []) if sid in squad_id_set]
        base_snake_order.extend([sid for sid in squad_ids if sid not in base_snake_order])

        results = {squad.id: [] for squad in squads}

        for role, reverse_base_order in ROLE_DRAFT_CONFIG:
            default_order, eligible_role_players = self.build_role_default_order(league, role)
            if not eligible_role_players:
                self.stdout.write(f'Skipping role {role}: no eligible players')
                continue

            role_draft_orders = {}
            for squad in squads:
                draft_obj = FantasyDraft.objects.filter(
                    league=league,
                    squad=squad,
                    type='Pre-Season',
                    role=role,
                ).order_by('-id').first()
                if not draft_obj:
                    draft_obj = FantasyDraft.objects.create(
                        league=league,
                        squad=squad,
                        type='Pre-Season',
                        role=role,
                        order=default_order,
                    )

                normalized_order = self.normalize_role_order(
                    draft_obj.order,
                    eligible_role_players,
                    default_order,
                )
                if normalized_order != draft_obj.order:
                    draft_obj.order = normalized_order
                    draft_obj.save(update_fields=['order'])

                role_draft_orders[squad.id] = normalized_order

            drafted_role_players = set()
            round_num = 0
            role_base_order = list(reversed(base_snake_order)) if reverse_base_order else list(base_snake_order)

            self.stdout.write(
                f'Starting {role} draft with {len(eligible_role_players)} players '
                f'({"reversed" if reverse_base_order else "base"} order first)'
            )

            while len(drafted_role_players) < len(eligible_role_players):
                round_order = role_base_order if round_num % 2 == 0 else list(reversed(role_base_order))
                picked_in_round = False

                for squad_id in round_order:
                    available_player = next(
                        (
                            player_id for player_id in role_draft_orders.get(squad_id, [])
                            if player_id in eligible_role_players and player_id not in drafted_role_players
                        ),
                        None,
                    )
                    if available_player is None:
                        continue

                    results[squad_id].append(available_player)
                    drafted_role_players.add(available_player)
                    picked_in_round = True

                    if verbose:
                        player = Player.objects.get(id=available_player)
                        squad = FantasySquad.objects.get(id=squad_id)
                        self.stdout.write(f'  [{role}] {squad.name} drafted {player.name}')

                    if len(drafted_role_players) >= len(eligible_role_players):
                        break

                if not picked_in_round:
                    self.stdout.write(self.style.WARNING(f'No valid picks found for role {role}; ending role draft early'))
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
