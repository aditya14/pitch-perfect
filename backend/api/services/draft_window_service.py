from __future__ import annotations

from typing import Dict, List, Optional

from api.models import DraftWindow, FantasyLeague, FantasySquad, SquadPhaseBoost


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
        window = qs.filter(kind=kind).order_by("sequence").first()
        if not window:
            raise ValueError("Draft window not found for league season.")
        return window
    window = qs.order_by("sequence").first()
    if not window:
        raise ValueError("No draft windows configured for league season.")
    return window


def get_retained_player_ids_for_squad(
    squad: FantasySquad,
    draft_window: DraftWindow,
) -> List[int]:
    if not draft_window or not draft_window.retention_phase:
        return []
    phase_boost = SquadPhaseBoost.objects.filter(
        fantasy_squad=squad,
        phase=draft_window.retention_phase,
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
    squads = FantasySquad.objects.filter(league=league)
    for squad in squads:
        retained[squad.id] = get_retained_player_ids_for_squad(squad, draft_window)
    return retained


def build_draft_pool(
    league: FantasyLeague,
    draft_window: DraftWindow,
) -> List[int]:
    retained_map = get_retained_player_map(league, draft_window)
    draft_pool = []
    squads = FantasySquad.objects.filter(league=league)
    for squad in squads:
        retained = set(retained_map.get(squad.id, []))
        for player_id in squad.current_squad or []:
            if player_id not in retained:
                draft_pool.append(player_id)
    return list(set(draft_pool))
