from __future__ import annotations

from typing import Dict, List, Optional, Set

from django.db import transaction
from django.db.models import Avg, Q
from django.utils import timezone

from api.models import (
    DraftWindow,
    DraftWindowLeagueRun,
    DraftWindowTeamEligibility,
    FantasyDraft,
    FantasyLeague,
    FantasySquad,
    Player,
    PlayerSeasonTeam,
    SeasonPhase,
    SeasonTeam,
    SquadPhaseBoost,
)

ROLE_DRAFT_CONFIG = (
    (FantasyDraft.Role.BAT, False),
    (FantasyDraft.Role.WK, True),
    (FantasyDraft.Role.ALL, False),
    (FantasyDraft.Role.BOWL, True),
)


def resolve_draft_window(
    league: FantasyLeague,
    *,
    draft_window_id: Optional[int] = None,
    kind: Optional[str] = None,
) -> DraftWindow:
    qs = DraftWindow.objects.filter(season=league.season)
    if draft_window_id:
        window = qs.filter(id=draft_window_id).first()
        if not window:
            raise ValueError("Draft window not found for league season.")
        return window
    if kind:
        windows = qs.filter(kind=kind).order_by("sequence")
        if not windows.exists():
            raise ValueError("Draft window not found for league season.")
        now = timezone.now()
        active = windows.filter(open_at__lte=now, lock_at__gte=now).first()
        if active:
            return active
        upcoming = windows.filter(open_at__gt=now).first()
        if upcoming:
            return upcoming
        return windows.last()
    window = qs.order_by("sequence").first()
    if not window:
        raise ValueError("No draft windows configured for league season.")
    return window


def resolve_retention_phase(draft_window: DraftWindow) -> Optional[SeasonPhase]:
    if not draft_window:
        return None

    if (
        draft_window.retention_mode == DraftWindow.RetentionMode.MANUAL_PHASE
        and draft_window.retention_phase_id
    ):
        return draft_window.retention_phase

    auto_phase = SeasonPhase.objects.filter(
        season=draft_window.season,
        start__gte=draft_window.lock_at,
    ).order_by("start", "phase").first()
    if auto_phase:
        return auto_phase
    return draft_window.retention_phase


def get_retained_player_ids_for_squad(
    squad: FantasySquad,
    draft_window: DraftWindow,
    retention_phase: Optional[SeasonPhase] = None,
) -> List[int]:
    phase = retention_phase or resolve_retention_phase(draft_window)
    if not draft_window or not phase:
        return []
    phase_boost = SquadPhaseBoost.objects.filter(
        fantasy_squad=squad,
        phase=phase,
    ).first()
    if not phase_boost or not phase_boost.assignments:
        return []
    retained = []
    for assignment in phase_boost.assignments:
        player_id = assignment.get("player_id")
        if player_id and player_id not in retained:
            retained.append(player_id)
    return retained


def get_retained_player_map(
    league: FantasyLeague,
    draft_window: DraftWindow,
) -> Dict[int, List[int]]:
    retained = {}
    retention_phase = resolve_retention_phase(draft_window)
    squads = FantasySquad.objects.filter(league=league)
    for squad in squads:
        retained[squad.id] = get_retained_player_ids_for_squad(
            squad,
            draft_window,
            retention_phase=retention_phase,
        )
    return retained


def ensure_team_eligibility_records(draft_window: DraftWindow) -> None:
    season_team_ids = list(
        SeasonTeam.objects.filter(season=draft_window.season).values_list("id", flat=True)
    )
    existing = set(
        DraftWindowTeamEligibility.objects.filter(draft_window=draft_window).values_list(
            "season_team_id", flat=True
        )
    )
    missing = [
        DraftWindowTeamEligibility(draft_window=draft_window, season_team_id=season_team_id, is_remaining=True)
        for season_team_id in season_team_ids
        if season_team_id not in existing
    ]
    if missing:
        DraftWindowTeamEligibility.objects.bulk_create(missing)


def get_remaining_team_ids(draft_window: DraftWindow) -> List[int]:
    ensure_team_eligibility_records(draft_window)
    team_ids = list(
        DraftWindowTeamEligibility.objects.filter(
            draft_window=draft_window,
            is_remaining=True,
        ).values_list("season_team__team_id", flat=True)
    )
    if team_ids:
        return sorted(set(team_ids))
    return list(
        SeasonTeam.objects.filter(season=draft_window.season).values_list("team_id", flat=True)
    )


def compile_draft_window_pool(draft_window: DraftWindow) -> List[int]:
    remaining_team_ids = get_remaining_team_ids(draft_window)
    player_ids = list(
        PlayerSeasonTeam.objects.filter(
            season=draft_window.season,
            team_id__in=remaining_team_ids,
        ).values_list("player_id", flat=True).distinct()
    )
    draft_window.draft_pool = player_ids
    draft_window.pool_compiled_at = timezone.now()
    draft_window.save(update_fields=["draft_pool", "pool_compiled_at"])
    return player_ids


def build_draft_pool(
    league: FantasyLeague,
    draft_window: DraftWindow,
) -> List[int]:
    if league.season_id != draft_window.season_id:
        raise ValueError("Draft window does not belong to the league season.")

    base_pool = draft_window.draft_pool or compile_draft_window_pool(draft_window)
    retained_map = get_retained_player_map(league, draft_window)
    retained_ids: Set[int] = set()
    for player_ids in retained_map.values():
        retained_ids.update(player_ids)

    return [player_id for player_id in base_pool if player_id not in retained_ids]


def has_draft_window_run(league: FantasyLeague, draft_window: DraftWindow) -> bool:
    return DraftWindowLeagueRun.objects.filter(
        league=league,
        draft_window=draft_window,
        dry_run=False,
    ).exists()


def _normalize_order(order: List[int], eligible_ids: Set[int]) -> List[int]:
    normalized = []
    seen = set()
    for raw_id in order or []:
        try:
            player_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if player_id in eligible_ids and player_id not in seen:
            normalized.append(player_id)
            seen.add(player_id)
    return normalized


def _default_order_for_players(league: FantasyLeague, player_ids: List[int]) -> List[int]:
    ranked_players = Player.objects.filter(id__in=player_ids).annotate(
        avg_points=Avg(
            "playermatchevent__total_points_all",
            filter=Q(playermatchevent__match__season=league.season),
        )
    ).order_by("-avg_points", "name")
    ranked_ids = list(ranked_players.values_list("id", flat=True))
    ranked_set = set(ranked_ids)
    ranked_ids.extend([player_id for player_id in player_ids if player_id not in ranked_set])
    return ranked_ids


@transaction.atomic
def execute_draft_window(
    league: FantasyLeague,
    draft_window: DraftWindow,
    *,
    dry_run: bool = False,
    force_rerun: bool = False,
    executed_by=None,
) -> Dict:
    if league.season_id != draft_window.season_id:
        raise ValueError("Draft window does not belong to league season.")

    if has_draft_window_run(league, draft_window) and not (dry_run or force_rerun):
        raise ValueError("This draft window has already been executed for this league.")

    squads = list(FantasySquad.objects.filter(league=league).order_by("-total_points", "id"))
    if not squads:
        raise ValueError("No squads in this league.")

    base_pool = draft_window.draft_pool or compile_draft_window_pool(draft_window)
    if not base_pool:
        raise ValueError("Draft pool is empty for this draft window.")

    effective_pool = build_draft_pool(league, draft_window)
    if not effective_pool:
        raise ValueError("No eligible players remain in the draft pool after retention.")

    retained_map = get_retained_player_map(league, draft_window)
    available_players = set(effective_pool)

    current_squad_ids = {}
    for squad in squads:
        current_squad_ids[squad.id] = list(dict.fromkeys(squad.current_squad or []))

    tracked_player_ids = set(effective_pool)
    for squad in squads:
        tracked_player_ids.update(current_squad_ids[squad.id])
        tracked_player_ids.update(retained_map.get(squad.id, []))

    role_map = {
        player.id: player.role
        for player in Player.objects.filter(id__in=tracked_player_ids).only("id", "role")
    }

    standings_snapshot = [
        {
            "rank": idx + 1,
            "squad_id": squad.id,
            "squad_name": squad.name,
            "total_points": float(squad.total_points or 0),
        }
        for idx, squad in enumerate(squads)
    ]
    standings_order = [item["squad_id"] for item in standings_snapshot]

    role_available = {
        role: {player_id for player_id in available_players if role_map.get(player_id) == role}
        for role, _ in ROLE_DRAFT_CONFIG
    }

    role_default_order = {
        role: _default_order_for_players(league, list(role_available.get(role, set())))
        for role, _ in ROLE_DRAFT_CONFIG
    }
    global_default_order = _default_order_for_players(league, list(available_players))

    drafts = FantasyDraft.objects.filter(
        league=league,
        draft_window=draft_window,
        type="Mid-Season",
        squad_id__in=[squad.id for squad in squads],
    )
    role_draft_map = {}
    legacy_draft_map = {}
    for draft in drafts:
        if draft.role:
            role_draft_map[(draft.squad_id, draft.role)] = draft.order or []
        else:
            legacy_draft_map[draft.squad_id] = draft.order or []

    role_preferences = {}
    global_preferences = {}
    for squad in squads:
        squad_role_preferences = {}
        legacy_order = legacy_draft_map.get(squad.id, [])
        for role, _ in ROLE_DRAFT_CONFIG:
            eligible_ids = role_available.get(role, set())
            if not eligible_ids:
                squad_role_preferences[role] = []
                continue

            raw_order = role_draft_map.get((squad.id, role))
            if raw_order:
                normalized = _normalize_order(raw_order, eligible_ids)
            elif legacy_order:
                normalized = _normalize_order(
                    [pid for pid in legacy_order if role_map.get(pid) == role],
                    eligible_ids,
                )
            else:
                normalized = []

            if normalized:
                missing = [pid for pid in role_default_order[role] if pid not in set(normalized)]
                normalized.extend(missing)
            else:
                normalized = list(role_default_order[role])
            squad_role_preferences[role] = normalized

        role_preferences[squad.id] = squad_role_preferences

        if legacy_order:
            normalized_global = _normalize_order(legacy_order, available_players)
            normalized_global.extend(
                [pid for pid in global_default_order if pid not in set(normalized_global)]
            )
            global_preferences[squad.id] = normalized_global
        else:
            combined = []
            seen_combined = set()
            for role, _ in ROLE_DRAFT_CONFIG:
                for player_id in squad_role_preferences[role]:
                    if player_id not in seen_combined:
                        combined.append(player_id)
                        seen_combined.add(player_id)
            combined.extend([pid for pid in global_default_order if pid not in seen_combined])
            global_preferences[squad.id] = combined

    role_needs = {}
    total_needs = {}
    for squad in squads:
        squad_id = squad.id
        target_ids = current_squad_ids.get(squad_id, [])
        retained_ids = list(dict.fromkeys(retained_map.get(squad_id, [])))
        retained_set = set(retained_ids)

        target_role_counts = {role: 0 for role, _ in ROLE_DRAFT_CONFIG}
        for player_id in target_ids:
            role = role_map.get(player_id)
            if role in target_role_counts:
                target_role_counts[role] += 1

        retained_role_counts = {role: 0 for role, _ in ROLE_DRAFT_CONFIG}
        for player_id in retained_ids:
            role = role_map.get(player_id)
            if role in retained_role_counts:
                retained_role_counts[role] += 1

        squad_role_needs = {}
        for role, _ in ROLE_DRAFT_CONFIG:
            squad_role_needs[role] = max(0, target_role_counts[role] - retained_role_counts[role])
        role_needs[squad_id] = squad_role_needs
        total_needs[squad_id] = max(0, len(target_ids) - len(retained_set))

    squad_assignments = {squad.id: [] for squad in squads}
    snake_order_by_role = {}

    # Role-specific passes with custom first-round direction.
    for role, reverse_first_round in ROLE_DRAFT_CONFIG:
        role_pool = role_available.get(role, set())
        if not role_pool:
            snake_order_by_role[role] = {"first_round": [], "rounds_run": 0}
            continue

        role_base_order = list(reversed(standings_order)) if reverse_first_round else list(standings_order)
        rounds_run = 0

        while role_pool and any(role_needs[squad.id][role] > 0 for squad in squads):
            round_order = role_base_order if rounds_run % 2 == 0 else list(reversed(role_base_order))
            picked_this_round = False

            for squad_id in round_order:
                if role_needs[squad_id][role] <= 0 or total_needs[squad_id] <= 0:
                    continue

                preferred_order = role_preferences.get(squad_id, {}).get(role, [])
                selected = next((pid for pid in preferred_order if pid in role_pool), None)
                if selected is None:
                    selected = next((pid for pid in role_default_order.get(role, []) if pid in role_pool), None)
                if selected is None:
                    continue

                squad_assignments[squad_id].append(selected)
                role_pool.remove(selected)
                available_players.discard(selected)
                role_needs[squad_id][role] -= 1
                total_needs[squad_id] -= 1
                picked_this_round = True

            if not picked_this_round:
                break
            rounds_run += 1

        snake_order_by_role[role] = {
            "first_round": role_base_order,
            "rounds_run": rounds_run,
        }

    # Flex fill if any squads still need players.
    flex_round = 0
    while available_players and any(need > 0 for need in total_needs.values()):
        round_order = standings_order if flex_round % 2 == 0 else list(reversed(standings_order))
        picked_this_round = False
        for squad_id in round_order:
            if total_needs[squad_id] <= 0:
                continue
            preferred_order = global_preferences.get(squad_id, [])
            selected = next((pid for pid in preferred_order if pid in available_players), None)
            if selected is None:
                selected = next((pid for pid in global_default_order if pid in available_players), None)
            if selected is None:
                continue

            squad_assignments[squad_id].append(selected)
            available_players.remove(selected)
            total_needs[squad_id] -= 1
            picked_this_round = True

        if not picked_this_round:
            break
        flex_round += 1

    squad_results = {}
    for squad in squads:
        retained_ids = list(dict.fromkeys(retained_map.get(squad.id, [])))
        drafted_ids = [pid for pid in squad_assignments.get(squad.id, []) if pid not in set(retained_ids)]
        inferred_target = len(current_squad_ids.get(squad.id, []))
        new_squad = retained_ids + drafted_ids

        squad_results[squad.id] = {
            "retained": len(retained_ids),
            "drafted": len(drafted_ids),
            "total": len(new_squad),
            "target": inferred_target,
            "shortfall": max(0, inferred_target - len(new_squad)),
        }

        if not dry_run:
            squad.current_squad = new_squad
            squad.save(update_fields=["current_squad"])

    result_payload = {
        "league": league.name,
        "league_id": league.id,
        "draft_window_id": draft_window.id,
        "squads": len(squads),
        "standings_snapshot": standings_snapshot,
        "snake_order_by_role": snake_order_by_role,
        "squad_results": squad_results,
        "draft_completed": not dry_run,
    }

    if not dry_run:
        run_obj, _ = DraftWindowLeagueRun.objects.get_or_create(
            draft_window=draft_window,
            league=league,
            defaults={
                "executed_by": executed_by,
                "dry_run": False,
                "standings_snapshot": standings_snapshot,
                "snake_order_by_role": snake_order_by_role,
                "result_payload": result_payload,
            },
        )
        if force_rerun:
            run_obj.executed_at = timezone.now()
            run_obj.executed_by = executed_by
            run_obj.dry_run = False
            run_obj.standings_snapshot = standings_snapshot
            run_obj.snake_order_by_role = snake_order_by_role
            run_obj.result_payload = result_payload
            run_obj.save(
                update_fields=[
                    "executed_at",
                    "executed_by",
                    "dry_run",
                    "standings_snapshot",
                    "snake_order_by_role",
                    "result_payload",
                ]
            )

        draft_window.executed_at = timezone.now()
        draft_window.save(update_fields=["executed_at"])

    return result_payload
