import statistics
import logging
from django.db.models import Sum, Count, Q, F
from ..models import (
    FantasyLeague, FantasySquad, 
    FantasyMatchEvent, FantasyPlayerEvent, IPLMatch, FantasyStats
)

logger = logging.getLogger("api.stats_service")

def calculate_running_total_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    squad_ids = list(squads.values_list('id', flat=True))
    running_totals = {squad_id: 0.0 for squad_id in squad_ids}
    chart_data = []

    for match in matches.order_by('date', 'match_number', 'id'):
        events = FantasyMatchEvent.objects.filter(
            match=match,
            fantasy_squad__league_id=league_id
        )
        matchData = {}
        for squad_id in squad_ids:
            event = next((e for e in events if e.fantasy_squad_id == squad_id), None)
            current_match_points = float(event.total_points or 0) if event else 0.0
            running_totals[squad_id] += current_match_points
            matchData[squad_id] = {
                "matchPoints": current_match_points,
                "runningTotal": running_totals[squad_id],
                "squad": {
                    "id": squad_id,
                    "name": str(squads.get(id=squad_id).name),
                    "color": str(squads.get(id=squad_id).color)
                }
            }
        data_point = {
            "name": str(match.match_number),
            "match_id": match.id,
            "date": match.date.strftime('%a, %b %d') if match.date else "Unknown Date",
            "match_name": f"{match.team_1.short_name if match.team_1 else 'T1'} vs {match.team_2.short_name if match.team_2 else 'T2'}",
            "matchData": matchData
        }
        for squad_id in squad_ids:
            data_point[f"squad_{squad_id}"] = matchData[squad_id]["runningTotal"]
        chart_data.append(data_point)
    return chart_data

def calculate_domination_for_matches(league_id, matches):
    domination_stats = []
    for match in matches:
        match_events = FantasyMatchEvent.objects.filter(
            match=match,
            fantasy_squad__league_id=league_id
        )
        total_match_points = sum(me.total_points for me in match_events)
        if total_match_points == 0:
            continue
        for me in match_events:
            domination_pct = (me.total_points / total_match_points) * 100
            if domination_pct > 20:
                domination_stats.append({
                    "match_id": match.id,
                    "squad_id": me.fantasy_squad_id,
                    "percentage": float(domination_pct)
                })
    domination_stats.sort(key=lambda x: x["percentage"], reverse=True)
    return domination_stats[:25]

def calculate_squad_stats_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    squad_stats = []
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        )
        if not match_events.exists():
            continue
        most_points_match = match_events.order_by('-total_points').first()
        most_actives_match = match_events.order_by('-players_count').first()
        caps_count = match_events.filter(match_rank=1).count()
        ranks = list(match_events.values_list('running_rank', flat=True))
        highest_rank = min(ranks) if ranks else None
        lowest_rank = max(ranks) if ranks else None
        games_at_highest = ranks.count(highest_rank) if ranks else 0
        median_rank = statistics.median(ranks) if ranks else None
        try:
            mode_rank = statistics.mode(ranks) if ranks else None
        except:
            mode_rank = None
        recent_matches = match_events.order_by('-match__date')[:5]
        recent_form = [me.match_rank for me in recent_matches]
        squad_stats.append({
            "squad_id": squad.id,
            "squad_name": squad.name,
            "color": squad.color,
            "most_points_in_match": {
                "value": float(most_points_match.total_points) if most_points_match else 0,
                "match_id": most_points_match.match_id if most_points_match else None
            },
            "total_actives": sum(me.players_count for me in match_events),
            "most_actives_in_match": {
                "value": most_actives_match.players_count if most_actives_match else 0,
                "match_id": most_actives_match.match_id if most_actives_match else None
            },
            "caps": caps_count,
            "rank_stats": {
                "highest": highest_rank,
                "lowest": lowest_rank,
                "median": median_rank,
                "mode": mode_rank,
                "games_at_highest": games_at_highest
            },
            "recent_form": recent_form
        })
    return squad_stats

def calculate_season_mvp_for_matches(league_id, matches):
    player_events = FantasyPlayerEvent.objects.filter(
        fantasy_squad__league_id=league_id,
        match_event__match__in=matches
    ).select_related('match_event__player', 'fantasy_squad')
    player_totals = {}
    for pe in player_events:
        player_id = pe.match_event.player_id
        squad_id = pe.fantasy_squad_id
        key = (squad_id, player_id)
        if key not in player_totals:
            player_totals[key] = {
                "squad_id": squad_id,
                "player_id": player_id,
                "player_name": pe.match_event.player.name,
                "matches": set(),
                "base": 0,
                "boost": 0,
                "total": 0
            }
        player_totals[key]["matches"].add(pe.match_event.match_id)
        player_totals[key]["base"] += pe.match_event.total_points_all
        player_totals[key]["boost"] += pe.boost_points
        player_totals[key]["total"] += (pe.match_event.total_points_all + pe.boost_points)
    season_mvp = []
    for key, data in player_totals.items():
        season_mvp.append({
            "player_id": data["player_id"],
            "player_name": data["player_name"],
            "squad_id": data["squad_id"],
            "matches": len(data["matches"]),
            "base": float(data["base"]),
            "boost": float(data["boost"]),
            "total": float(data["total"])
        })
    season_mvp.sort(key=lambda x: x["total"], reverse=True)
    return season_mvp[:25]

def calculate_match_mvp_for_matches(league_id, matches):
    player_events = FantasyPlayerEvent.objects.filter(
        fantasy_squad__league_id=league_id,
        match_event__match__in=matches
    ).select_related('match_event__player', 'fantasy_squad')
    match_mvps = []
    for match in matches:
        match_player_events = player_events.filter(match_event__match=match)
        match_player_data = {}
        for pe in match_player_events:
            key = (pe.match_event.player_id, pe.fantasy_squad_id)
            if key not in match_player_data:
                match_player_data[key] = {
                    "player_id": pe.match_event.player_id,
                    "player_name": pe.match_event.player.name,
                    "squad_id": pe.fantasy_squad_id,
                    "match_id": match.id,
                    "base": 0,
                    "boost": 0,
                    "total": 0
                }
            match_player_data[key]["base"] += pe.match_event.total_points_all
            match_player_data[key]["boost"] += pe.boost_points
            match_player_data[key]["total"] += (pe.match_event.total_points_all + pe.boost_points)
        top_performers = sorted(
            match_player_data.values(),
            key=lambda x: x["total"],
            reverse=True
        )[:5]
        match_mvps.extend(top_performers)
    match_mvps.sort(key=lambda x: x["total"], reverse=True)
    return match_mvps[:25]

def calculate_squad_mvps_for_matches(league_id, matches):
    player_events = FantasyPlayerEvent.objects.filter(
        fantasy_squad__league_id=league_id,
        match_event__match__in=matches
    ).select_related('match_event__player', 'fantasy_squad')
    squad_mvps = {}
    for pe in player_events:
        squad_id = str(pe.fantasy_squad_id)
        points = pe.match_event.total_points_all + pe.boost_points
        if squad_id not in squad_mvps or points > squad_mvps[squad_id]["points"]:
            squad_mvps[squad_id] = {
                "player_id": pe.match_event.player_id,
                "player_name": pe.match_event.player.name,
                "points": float(points)
            }
    return squad_mvps

def calculate_season_total_actives_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    squad_ids = list(squads.values_list('id', flat=True))
    actives = []
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        )
        total_actives = sum(me.players_count for me in match_events)
        actives.append({
            "squad": {
                "id": squad.id,
                "name": squad.name,
                "color": squad.color
            },
            "count": total_actives
        })
    actives.sort(key=lambda x: x["count"], reverse=True)
    return actives

def calculate_most_points_in_match_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    most_points = []
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        ).order_by('-total_points')
        if match_events.exists():
            top_event = match_events.first()
            # Defensive: ensure squad fields are always present and not None
            most_points.append({
                "squad_id": squad.id,
                "squad_name": squad.name or "",
                "color": squad.color or "#808080",
                "match_id": top_event.match_id,
                "match_number": getattr(top_event.match, "match_number", None),
                "match_name": (
                    f"{getattr(getattr(top_event.match, 'team_1', None), 'short_name', 'T1')} vs "
                    f"{getattr(getattr(top_event.match, 'team_2', None), 'short_name', 'T2')}"
                ),
                "base": float(getattr(top_event, "total_base_points", 0) or 0),
                "boost": float(getattr(top_event, "total_boost_points", 0) or 0),
                "total": float(getattr(top_event, "total_points", 0) or 0)
            })
    most_points.sort(key=lambda x: x["total"], reverse=True)
    return most_points[:25]

def calculate_most_players_in_match_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    most_actives = []
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        ).order_by('-players_count')
        if match_events.exists():
            top_event = match_events.first()
            most_actives.append({
                "squad_id": squad.id,
                "squad_name": squad.name or "",
                "color": squad.color or "#808080",
                "match_id": top_event.match_id,
                "match_number": getattr(top_event.match, "match_number", None),
                "match_name": (
                    f"{getattr(getattr(top_event.match, 'team_1', None), 'short_name', 'T1')} vs "
                    f"{getattr(getattr(top_event.match, 'team_2', None), 'short_name', 'T2')}"
                ),
                "count": getattr(top_event, "players_count", 0) or 0
            })
    most_actives.sort(key=lambda x: x["count"], reverse=True)
    return most_actives[:25]

def calculate_rank_breakdown_for_matches(league_id, matches):
    squads = FantasySquad.objects.filter(league_id=league_id)
    breakdown = []
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        )
        ranks = list(match_events.values_list('running_rank', flat=True))
        if not ranks:
            continue
        highest_rank = min(ranks)
        lowest_rank = max(ranks)
        median_rank = statistics.median(ranks)
        try:
            mode_rank = statistics.mode(ranks)
        except:
            mode_rank = None
        breakdown.append({
            "squad_id": squad.id,
            "squad_name": squad.name,
            "color": squad.color,
            "highest": highest_rank,
            "lowest": lowest_rank,
            "median": median_rank,
            "mode": mode_rank
        })
    return breakdown

def calculate_league_table_for_matches(league_id, matches):
    """
    Calculate comprehensive league table data including all fields needed by the frontend
    """
    squads = FantasySquad.objects.filter(league_id=league_id)
    table = []
    
    # Get MVP data for each squad (reusing existing logic)
    squad_mvps = calculate_squad_mvps_for_matches(league_id, matches)
    
    for squad in squads:
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id,
            match__in=matches
        ).order_by('match__date')
        
        # Basic points calculation
        total_points = sum(me.total_points for me in match_events)
        base_points = sum(me.total_base_points for me in match_events)
        boost_points = sum(me.total_boost_points for me in match_events)
        
        # Calculate caps (number of times ranked #1 in a match)
        caps = match_events.filter(match_rank=1).count()
        
        # Calculate total actives (sum of players_count across all matches)
        total_actives = sum(me.players_count for me in match_events)
        
        # Calculate recent form (last 5 match ranks)
        recent_matches = match_events.order_by('-match__date')[:5]
        recent_form = []
        for match_event in recent_matches:
            recent_form.append({
                "match_number": match_event.match.match_number,
                "match_rank": match_event.match_rank,
                "date": match_event.match.date.isoformat() if match_event.match.date else None
            })
        # Reverse to get chronological order (oldest to newest)
        recent_form.reverse()
        
        # Get MVP for this squad
        squad_id_str = str(squad.id)
        mvp_data = squad_mvps.get(squad_id_str, {})
        mvp = None
        if mvp_data:
            mvp = {
                "player_id": mvp_data.get("player_id"),
                "player_name": mvp_data.get("player_name"),
                "points": mvp_data.get("points", 0)
            }
        
        # Calculate rank change (this would need historical data or previous calculations)
        # For now, setting to 0 as we'd need to compare with previous week's standings
        rank_change = 0
        
        table.append({
            "id": squad.id,
            "name": squad.name,
            "color": squad.color,
            "total_points": float(total_points),
            "base_points": float(base_points),
            "boost_points": float(boost_points),
            "caps": caps,
            "total_actives": total_actives,
            "mvp": mvp,
            "recent_form": recent_form,
            "rank_change": rank_change
        })
    
    # Sort by total points (descending)
    table.sort(key=lambda x: x["total_points"], reverse=True)
    return table

def recalculate_all_stats(stats, league_id):
    logger.info(f"Starting full recalculation of fantasy stats for league {league_id}")
    stats.match_details = {
        "running_total": {},
        "domination": {},
        "squad_stats": {},
        "season_total_actives": {},
        "most_points_in_match": {},
        "most_players_in_match": {},
        "rank_breakdown": {},
        "league_table": {}
    }
    stats.player_details = {
        "season_mvp": {},
        "match_mvp": {},
        "squad_mvps": {}
    }

    matches = IPLMatch.objects.filter(
        fantasymatchevent__fantasy_squad__league_id=league_id,
        status__in=['COMPLETED', 'NO_RESULT']
    ).distinct().order_by('date')

    all_phases = matches.values_list('phase', flat=True).distinct()
    all_phases = [p for p in all_phases if p is not None]
    all_phases = sorted(set(all_phases))

    def get_matches_for_phase(phase=None):
        if phase is None:
            return matches
        return matches.filter(phase=phase)

    for phase in [None] + all_phases:
        key = str(phase) if phase is not None else "overall"
        phase_matches = get_matches_for_phase(phase)
        logger.info(f"Calculating stats for phase '{key}' with {phase_matches.count()} matches")
        stats.match_details["running_total"][key] = calculate_running_total_for_matches(league_id, phase_matches)
        stats.match_details["domination"][key] = calculate_domination_for_matches(league_id, phase_matches)
        stats.match_details["squad_stats"][key] = calculate_squad_stats_for_matches(league_id, phase_matches)
        stats.match_details["season_total_actives"][key] = calculate_season_total_actives_for_matches(league_id, phase_matches)
        stats.match_details["most_points_in_match"][key] = calculate_most_points_in_match_for_matches(league_id, phase_matches)
        stats.match_details["most_players_in_match"][key] = calculate_most_players_in_match_for_matches(league_id, phase_matches)
        stats.match_details["rank_breakdown"][key] = calculate_rank_breakdown_for_matches(league_id, phase_matches)
        stats.match_details["league_table"][key] = calculate_league_table_for_matches(league_id, phase_matches)
        stats.player_details["season_mvp"][key] = calculate_season_mvp_for_matches(league_id, phase_matches)
        stats.player_details["match_mvp"][key] = calculate_match_mvp_for_matches(league_id, phase_matches)
        stats.player_details["squad_mvps"][key] = calculate_squad_mvps_for_matches(league_id, phase_matches)

    stats.save()
    logger.info(f"Finished recalculation and saved stats for league {league_id}")

def update_fantasy_stats(league_id, match_id=None):
    """
    Update fantasy stats for a league.
    If match_id is provided, only update stats for that match.
    """
    logger.info(f"Updating fantasy stats for league {league_id} (match_id={match_id})")
    league = FantasyLeague.objects.get(id=league_id)
    stats, created = FantasyStats.objects.get_or_create(league=league)

    # Initialize data structure if needed
    if not stats.match_details:
        logger.info("Initializing empty match_details")
        stats.match_details = {
            "running_total": {},
            "domination": {},
            "squad_stats": {},
            "season_total_actives": {},
            "most_points_in_match": {},
            "most_players_in_match": {},
            "rank_breakdown": {},
            "league_table": {}
        }

    if not stats.player_details:
        logger.info("Initializing empty player_details")
        stats.player_details = {
            "season_mvp": {},
            "match_mvp": {},
            "squad_mvps": {}
        }

    # Only full recalculation is supported here
    recalculate_all_stats(stats, league_id)
    stats.save()
    logger.info(f"Stats updated for league {league_id}")
    return stats