from django.contrib.admin.views.decorators import staff_member_required
from django.core.management import call_command
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect
from django.shortcuts import redirect, render
from django.contrib import messages
import json
import random
from .models import FantasyLeague, FantasySquad, FantasyDraft, Player, DraftWindow
from api.services.draft_window_service import (
    resolve_draft_window,
    build_draft_pool,
    get_retained_player_map,
)
import logging
from django.db import transaction
from django.db.models import Avg, Count, Q

logger = logging.getLogger(__name__)

ROLE_DRAFT_CONFIG = (
    (FantasyDraft.Role.BAT, False),
    (FantasyDraft.Role.WK, True),
    (FantasyDraft.Role.ALL, False),
    (FantasyDraft.Role.BOWL, True),
)


def build_role_default_order(league, role):
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


def normalize_role_order(existing_order, eligible_player_set, default_order):
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

@staff_member_required
@require_POST
@csrf_protect
def run_fantasy_draft(request):
    """
    Admin view to initiate the draft for a fantasy league
    """
    try:
        data = json.loads(request.body)
        league_id = data.get('league_id')
        dry_run = data.get('dry_run', False)
        
        if not league_id:
            return JsonResponse({'error': 'league_id is required'}, status=400)
            
        # Run the draft
        draft_results = run_draft_process(league_id, dry_run)
        
        return JsonResponse({
            'success': True,
            'message': 'Draft completed successfully',
            'results': draft_results
        })
        
    except Exception as e:
        logger.exception(f"Error running fantasy draft: {str(e)}")
        return JsonResponse({
            'error': str(e)
        }, status=500)

def run_draft_process(league_id, dry_run=False, force_new_snake_order=False):
    """
    Core function to run the draft process - assigns ALL players
    """
    # Get the league
    league = FantasyLeague.objects.get(id=league_id)
    
    # Check if the draft is already completed
    if league.draft_completed and not dry_run:
        raise ValueError('Draft already completed for this league')
    
    # Get all squads in the league
    squads = FantasySquad.objects.filter(league=league)
    squad_count = squads.count()
    
    if squad_count == 0:
        raise ValueError('No squads in this league')
    
    # Ensure all squads have a draft order object
    ensure_draft_orders(league, squads)
    
    # Generate a fresh snake draft order when requested, otherwise reuse if present.
    if force_new_snake_order or not league.snake_draft_order:
        league.snake_draft_order = generate_draft_order(squads)
        if not dry_run:
            league.save()
    
    total_players = Player.objects.filter(
        playerseasonteam__season=league.season
    ).distinct().count()
    
    # Run the draft - assign all available players
    draft_results = run_complete_draft(
        league=league,
        squads=squads
    )
    
    # Count how many players each squad got
    squad_player_counts = {squad_id: len(players) for squad_id, players in draft_results.items()}
    
    if not dry_run:
        # Save the draft results
        save_draft_results(draft_results)
        
        # Mark the draft as completed
        league.draft_completed = True
        league.save()
    
    return {
        'league': league.name,
        'squads': squad_count,
        'squad_player_counts': squad_player_counts,
        'total_players_drafted': sum(squad_player_counts.values()),
        'total_available_players': total_players,
        'draft_completed': not dry_run
    }

def run_complete_draft(league, squads):
    """Run role-based snake drafts for the league and assign all players."""
    squad_ids = list(squads.values_list('id', flat=True))
    squad_id_set = set(squad_ids)
    base_snake_order = [sid for sid in (league.snake_draft_order or []) if sid in squad_id_set]
    base_snake_order.extend([sid for sid in squad_ids if sid not in base_snake_order])

    results = {squad.id: [] for squad in squads}

    for role, reverse_base_order in ROLE_DRAFT_CONFIG:
        default_order, eligible_role_players = build_role_default_order(league, role)
        if not eligible_role_players:
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

            normalized_order = normalize_role_order(
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

        while len(drafted_role_players) < len(eligible_role_players):
            round_order = role_base_order if round_num % 2 == 0 else list(reversed(role_base_order))
            picked_in_round = False

            for squad_id in round_order:
                available_player = next(
                    (
                        player_id
                        for player_id in role_draft_orders.get(squad_id, [])
                        if player_id in eligible_role_players and player_id not in drafted_role_players
                    ),
                    None,
                )
                if available_player is None:
                    continue

                results[squad_id].append(available_player)
                drafted_role_players.add(available_player)
                picked_in_round = True

                if len(drafted_role_players) >= len(eligible_role_players):
                    break

            if not picked_in_round:
                break

            round_num += 1

    return results

def ensure_draft_orders(league, squads):
    """Ensure all squads have role-specific pre-season draft order objects."""
    for role, _ in ROLE_DRAFT_CONFIG:
        default_order, eligible_role_players = build_role_default_order(league, role)
        for squad in squads:
            draft_order = FantasyDraft.objects.filter(
                league=league,
                squad=squad,
                type='Pre-Season',
                role=role,
            ).order_by('-id').first()

            if not draft_order:
                FantasyDraft.objects.create(
                    league=league,
                    squad=squad,
                    type='Pre-Season',
                    role=role,
                    order=default_order,
                )
                continue

            normalized_order = normalize_role_order(
                draft_order.order,
                eligible_role_players,
                default_order,
            )
            if normalized_order != draft_order.order:
                draft_order.order = normalized_order
                draft_order.save(update_fields=['order'])

def generate_draft_order(squads):
    """Generate a random draft order using squad IDs."""
    squad_ids = list(squads.values_list('id', flat=True))
    random.shuffle(squad_ids)
    return squad_ids

def run_draft(self, request, object_id):
    """Run the fantasy draft for a league"""
    try:
        league = self.get_object(request, object_id)
        dry_run = request.GET.get('dry_run', '0') == '1'
        
        # Call the draft function from admin_views
        from .admin_views import run_draft_process
        results = run_draft_process(league.id, dry_run)
        
        if dry_run:
            messages.info(request, f"Draft simulation completed for {league.name}. No changes saved.")
        else:
            messages.success(request, f"Draft completed successfully for {league.name}!")
        
        # Add detailed results to the message
        messages.info(request, f"Results: {results['squads']} squads, total players drafted: {results['total_players_drafted']}")
        
        for squad_id, count in results.get('squad_player_counts', {}).items():
            squad = FantasySquad.objects.get(id=squad_id)
            messages.info(request, f"Squad '{squad.name}': {count} players")
        
    except Exception as e:
        messages.error(request, f"Error running draft: {str(e)}")
        import traceback
        print(traceback.format_exc())  # Print traceback for debugging
        
    return redirect('admin:api_fantasyleague_changelist')

@transaction.atomic
def save_draft_results(results):
    """Save the draft results to the database."""
    for squad_id, player_ids in results.items():
        squad = FantasySquad.objects.get(id=squad_id)
        squad.current_squad = player_ids
        squad.save()

@staff_member_required
def compile_mid_season_draft_pools_view(request):
    """Admin view to compile draft pools for mid-season draft"""
    from . import views  # Import views module
    
    if request.method == 'POST':
        try:
            # Forward to the actual function in views.py
            response = views.compile_mid_season_draft_pools(request)
            
            # Process response data for admin interface
            if response.status_code == 200:
                data = response.data
                messages.success(request, f"Successfully compiled draft pools for {data.get('leagues_updated', 0)} leagues")
                
                # Add details for each league
                for league_detail in data.get('details', []):
                    messages.info(
                        request, 
                        f"League: {league_detail.get('league_name')} - Draft pool size: {league_detail.get('draft_pool_size')}"
                    )
            else:
                messages.error(request, f"Error: {response.data.get('error', 'Unknown error')}")
        except Exception as e:
            messages.error(request, f"Error compiling draft pools: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    # Get all leagues for display
    leagues = FantasyLeague.objects.filter(season__status='ONGOING')
    
    # Render the admin form
    return render(request, 'admin/compile_mid_season_draft_pools.html', {
        'leagues': leagues,
        'title': 'Compile Mid-Season Draft Pools',
    })

@staff_member_required
def run_mid_season_draft(request):
    """Admin view to run mid-season fantasy draft for a specific league"""
    # Get all leagues
    leagues = FantasyLeague.objects.all()
    
    if request.method == 'POST':
        league_id = request.POST.get('league_id')
        dry_run = request.POST.get('dry_run', '0') == '1'
        verbose = request.POST.get('verbose', '0') == '1'
        
        if league_id:
            try:
                # Run the mid-season draft using our updated function
                results = run_mid_season_draft_process(league_id, dry_run, verbose)
                
                if dry_run:
                    messages.info(request, f"Mid-season draft simulation completed for league {league_id}. No changes saved.")
                else:
                    messages.success(request, f"Mid-season draft executed successfully for league {league_id}")
                
                # Add detailed results to messages
                league = FantasyLeague.objects.get(id=league_id)
                messages.info(request, f"Results for {league.name}: {results['squads']} squads")
                
                for squad_id, details in results.get('squad_results', {}).items():
                    squad = FantasySquad.objects.get(id=squad_id)
                    messages.info(request, f"Squad '{squad.name}': {details['retained']} retained + {details['drafted']} drafted = {details['total']} total")
                
            except Exception as e:
                messages.error(request, f"Error executing mid-season draft: {str(e)}")
                import traceback
                print(traceback.format_exc())
        else:
            messages.error(request, "Please select a league")
    
    # Render the admin form
    return render(request, 'admin/run_mid_season_draft.html', {
        'leagues': leagues,
        'title': 'Run Mid-Season Fantasy Draft',
    })

def run_mid_season_draft_process(league_id, dry_run=False, verbose=False):
    """
    Core function to run the mid-season draft process
    """
    # Get the league
    league = FantasyLeague.objects.get(id=league_id)
    draft_window = resolve_draft_window(league, kind=DraftWindow.Kind.MID_SEASON)
    
    # Check if mid-season draft already completed
    if getattr(league, 'mid_season_draft_completed', False) and not dry_run:
        raise ValueError('Mid-season draft already completed for this league')
    
    # Get squads in order of their standings (highest to lowest for first round)
    squads = FantasySquad.objects.filter(league=league).order_by('-total_points')
    squad_count = squads.count()
    
    if squad_count == 0:
        raise ValueError('No squads in this league')
    
    if verbose:
        print(f"Found {squad_count} squads")
    
    draft_pool = draft_window.draft_pool or build_draft_pool(league, draft_window)
    if not draft_pool:
        raise ValueError('Draft pool is empty for this draft window')
    if not draft_window.draft_pool:
        draft_window.draft_pool = draft_pool
        draft_window.save(update_fields=['draft_pool'])
    
    # Get retained players for each squad
    retained_players = get_retained_player_map(league, draft_window)
    
    # Create snake draft order
    draft_rounds = []
    squad_ids = [squad.id for squad in squads]
    
    # Calculate how many rounds we need
    available_players = set(draft_pool)
    avg_players_needed = len(available_players) // squad_count
    num_rounds = max(1, avg_players_needed)
    
    if verbose:
        print(f"Draft pool has {len(available_players)} players")
        print(f"Each squad needs ~{avg_players_needed} players")
        print(f"Creating {num_rounds} draft rounds")
    
    # Create snake draft rounds - first round is best to worst (even round: 0)
    for round_num in range(num_rounds):
        if round_num % 2 == 0:  # Even rounds - best to worst
            draft_rounds.append(squad_ids.copy())
        else:  # Odd rounds - worst to best
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
            # Extract draft preferences excluding retained players
            squad_retained = retained_players.get(squad.id, [])
            preferences = [pid for pid in draft.order if pid not in squad_retained]
            squad_preferences[squad.id] = preferences
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
    
    # Track assignments
    squad_assignments = {squad.id: [] for squad in squads}
    
    # Execute the draft
    if verbose:
        print(f"Executing draft with {len(flat_draft_order)} picks")
    
    for pick_num, squad_id in enumerate(flat_draft_order):
        if not available_players:
            if verbose:
                print("No more players available - draft complete")
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
                print(f"Pick {pick_num+1}: {squad.name} selects {player.name}")
        else:
            if verbose:
                squad = FantasySquad.objects.get(id=squad_id)
                print(f"Pick {pick_num+1}: {squad.name} has no available players in preferences")
    
    # Update squad rosters
    squad_results = {}
    if not dry_run:
        if verbose:
            print("Updating squad rosters...")
        
        for squad in squads:
            # Get retained players
            retained_ids = retained_players.get(squad.id, [])
            
            # Add drafted players
            drafted_players = squad_assignments.get(squad.id, [])
            
            # Update squad roster
            new_squad = retained_ids + drafted_players
            squad.current_squad = new_squad
            squad.save()
            
            squad_results[squad.id] = {
                'retained': len(retained_ids),
                'drafted': len(drafted_players),
                'total': len(new_squad)
            }
            
            if verbose:
                print(f"Updated {squad.name}: {len(retained_ids)} retained + {len(drafted_players)} drafted = {len(new_squad)} total")
        
        # Mark draft as completed
        league.mid_season_draft_completed = True
        league.save()
    
    return {
        'league': league.name,
        'squads': squad_count,
        'squad_results': squad_results,
        'draft_completed': not dry_run
    }
