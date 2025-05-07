import statistics
from django.db.models import Sum, Count, Q, F
from ..models import (
    FantasyLeague, FantasySquad, 
    FantasyMatchEvent, FantasyPlayerEvent, IPLMatch, FantasyStats
)

def update_fantasy_stats(league_id, match_id=None):
    """
    Update fantasy stats for a league.
    If match_id is provided, only update stats for that match.
    """
    league = FantasyLeague.objects.get(id=league_id)
    stats, created = FantasyStats.objects.get_or_create(league=league)
    
    # Initialize data structure if needed
    if not stats.match_details:
        stats.match_details = {
            "running_total": [],
            "squad_stats": {},
            "domination": []
        }
    
    if not stats.player_details:
        stats.player_details = {
            "season_mvp": [],
            "match_mvp": [],
            "squad_mvps": {}
        }
    
    # If updating for a specific match
    if match_id:
        update_stats_for_match(stats, league_id, match_id)
    else:
        # Full recalculation
        recalculate_all_stats(stats, league_id)
    
    stats.save()
    return stats

def update_stats_for_match(stats, league_id, match_id):
    """Update stats for a specific match"""
    match = IPLMatch.objects.get(id=match_id)
    
    # Update running totals
    match_data = calculate_match_running_totals(league_id, match_id)
    
    # Check if match already exists in running_total
    match_exists = False
    for i, existing_match in enumerate(stats.match_details["running_total"]):
        if existing_match.get("match_id") == match_id:
            # Replace the existing match data
            stats.match_details["running_total"][i] = match_data
            match_exists = True
            break
    
    if not match_exists:
        # Match doesn't exist, append it
        stats.match_details["running_total"].append(match_data)
    
    # Update squad stats
    update_squad_stats(stats, league_id)
    
    # Update MVPs
    update_mvp_stats(stats, league_id)
    
    # Update domination stats
    update_domination_stats(stats, league_id)

def recalculate_all_stats(stats, league_id):
    """Complete recalculation of all stats"""
    # Clear existing data
    stats.match_details = {
        "running_total": [],
        "squad_stats": {},
        "domination": []
    }
    
    stats.player_details = {
        "season_mvp": [],
        "match_mvp": [],
        "squad_mvps": {}
    }
    
    # Get all completed matches for this league
    matches = IPLMatch.objects.filter(
        fantasymatchevent__fantasy_squad__league_id=league_id,
        status__in=['COMPLETED', 'NO_RESULT']
    ).distinct().order_by('date')
    
    # Calculate running totals for all matches
    for match in matches:
        match_data = calculate_match_running_totals(league_id, match.id)
        stats.match_details["running_total"].append(match_data)
    
    # Calculate squad stats
    update_squad_stats(stats, league_id)
    
    # Calculate MVP stats
    update_mvp_stats(stats, league_id)
    
    # Calculate domination stats
    update_domination_stats(stats, league_id)

def calculate_match_running_totals(league_id, match_id):
    """Calculate running totals for a specific match"""
    match = IPLMatch.objects.get(id=match_id)
    match_events = FantasyMatchEvent.objects.filter(
        match_id=match_id,
        fantasy_squad__league_id=league_id
    ).select_related('fantasy_squad')
    
    match_data = {
        "match_id": match.id,
        "match_number": match.match_number,
        "match_name": f"{match.team_1.short_name} vs {match.team_2.short_name}",
        "date": match.date.strftime('%Y-%m-%d'),
        "squads": {}
    }
    
    for me in match_events:
        match_data["squads"][str(me.fantasy_squad.id)] = {
            "match_points": float(me.total_points),
            "base_points": float(me.total_base_points),
            "boost_points": float(me.total_boost_points),
            "running_total": float(me.running_total_points),
            "match_rank": me.match_rank,
            "overall_rank": me.running_rank,
            "players_count": me.players_count
        }
    
    return match_data

def update_squad_stats(stats, league_id):
    """Update squad statistics"""
    squads = FantasySquad.objects.filter(league_id=league_id)
    
    for squad in squads:
        squad_id = str(squad.id)
        
        # Get all match events for this squad
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad_id=squad.id
        ).select_related('match')
        
        if not match_events.exists():
            continue
        
        # Most points in a match
        most_points_match = match_events.order_by('-total_points').first()
        
        # Most actives in a match
        most_actives_match = match_events.order_by('-players_count').first()
        
        # Caps (times being #1)
        caps_count = match_events.filter(match_rank=1).count()
        
        # Rank statistics
        ranks = list(match_events.values_list('running_rank', flat=True))
        
        if ranks:
            highest_rank = min(ranks)
            lowest_rank = max(ranks)
            games_at_highest = ranks.count(highest_rank)
            median_rank = statistics.median(ranks)
            try:
                mode_rank = statistics.mode(ranks)
            except:
                mode_rank = None
        else:
            highest_rank = None
            lowest_rank = None
            games_at_highest = 0
            median_rank = None
            mode_rank = None
        
        # Recent form (last 5 matches)
        recent_matches = match_events.order_by('-match__date')[:5]
        recent_form = [me.match_rank for me in recent_matches]
        
        # Update squad stats in the JSON
        stats.match_details["squad_stats"][squad_id] = {
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
        }

def update_mvp_stats(stats, league_id):
    """Update MVP statistics"""
    # Season MVPs
    player_events = FantasyPlayerEvent.objects.filter(
        fantasy_squad__league_id=league_id
    ).select_related(
        'match_event__player',
        'fantasy_squad'
    )
    
    # Process player events for MVP calculations
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
    
    # Format season MVPs
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
    
    # Sort by total points
    season_mvp.sort(key=lambda x: x["total"], reverse=True)
    stats.player_details["season_mvp"] = season_mvp[:25]  # Top 25 players
    
    # Find squad MVPs
    squad_mvps = {}
    for key, data in player_totals.items():
        squad_id = str(data["squad_id"])
        if squad_id not in squad_mvps or data["total"] > squad_mvps[squad_id]["points"]:
            squad_mvps[squad_id] = {
                "player_id": data["player_id"],
                "player_name": data["player_name"],
                "points": float(data["total"])
            }
    
    stats.player_details["squad_mvps"] = squad_mvps
    
    # Match MVPs
    match_mvps = []
    matches = IPLMatch.objects.filter(
        fantasymatchevent__fantasy_squad__league_id=league_id,
        status__in=['COMPLETED', 'NO_RESULT']
    ).distinct()
    
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
        
        # Find top performers for this match
        top_performers = sorted(
            match_player_data.values(),
            key=lambda x: x["total"],
            reverse=True
        )[:5]  # Top 5 per match
        
        match_mvps.extend(top_performers)
    
    # Sort all match MVPs by total points
    match_mvps.sort(key=lambda x: x["total"], reverse=True)
    stats.player_details["match_mvp"] = match_mvps[:25]  # Top 25 match performances

def update_domination_stats(stats, league_id):
    """Update domination statistics"""
    matches = IPLMatch.objects.filter(
        fantasymatchevent__fantasy_squad__league_id=league_id,
        status__in=['COMPLETED', 'NO_RESULT']
    ).distinct()
    
    domination_stats = []
    
    for match in matches:
        match_events = FantasyMatchEvent.objects.filter(
            match=match,
            fantasy_squad__league_id=league_id
        ).select_related('fantasy_squad')
        
        total_match_points = sum(me.total_points for me in match_events)
        
        if total_match_points == 0:
            continue
        
        for me in match_events:
            domination_pct = (me.total_points / total_match_points) * 100
            
            if domination_pct > 20:  # Only track significant domination
                domination_stats.append({
                    "match_id": match.id,
                    "squad_id": me.fantasy_squad_id,
                    "percentage": float(domination_pct)
                })
    
    # Sort by percentage
    domination_stats.sort(key=lambda x: x["percentage"], reverse=True)
    stats.match_details["domination"] = domination_stats[:25]  # Top 25 domination performances