from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from functools import wraps

from .models import (
    FantasyLeague,
    FantasySquad,
    FantasyMatchEvent,
    IPLMatch,
    FantasyStats,
    FantasyPlayerEvent  # <-- add this import
)

def cache_page_with_bypass(timeout):
    """
    Decorator: Cache unless request has X-Bypass-Cache header set to '1'
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if request.headers.get('X-Bypass-Cache') == '1':
                return view_func(request, *args, **kwargs)
            return cache_page(timeout)(view_func)(request, *args, **kwargs)
        return _wrapped_view
    return decorator

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)  # Cache for 10 minutes
def league_stats_season_mvp(request, league_id):
    """
    Get season MVP data (Running MVP) for the league and time frame.
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]

        # If time_frame is set, recalculate from FantasyPlayerEvent for that phase only
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
            from collections import defaultdict
            player_totals = {}
            events = FantasyMatchEvent.objects.filter(
                match_id__in=match_ids,
                fantasy_squad__league_id=league_id
            )
            # Map: (squad_id, player_id) -> stats
            for event in events:
                # Get all FantasyPlayerEvents for this match and squad
                player_events = FantasyPlayerEvent.objects.filter(
                    fantasy_squad=event.fantasy_squad,
                    match_event__match=event.match
                ).select_related('match_event__player')
                for pe in player_events:
                    key = (pe.fantasy_squad_id, pe.match_event.player_id)
                    if squad_ids and pe.fantasy_squad_id not in squad_ids:
                        continue
                    if key not in player_totals:
                        player_totals[key] = {
                            "squad_id": pe.fantasy_squad_id,
                            "player_id": pe.match_event.player_id,
                            "player_name": pe.match_event.player.name,
                            "matches": set(),
                            "base": 0,
                            "boost": 0,
                            "total": 0
                        }
                    player_totals[key]["matches"].add(event.match_id)
                    player_totals[key]["base"] += pe.match_event.total_points_all
                    player_totals[key]["boost"] += pe.boost_points
                    player_totals[key]["total"] += pe.match_event.total_points_all + pe.boost_points
            # Format and sort
            mvp_data = []
            for data in player_totals.values():
                mvp_data.append({
                    "player_id": data["player_id"],
                    "player_name": data["player_name"],
                    "squad_id": data["squad_id"],
                    "matches": len(data["matches"]),
                    "base": float(data["base"]),
                    "boost": float(data["boost"]),
                    "total": float(data["total"])
                })
            mvp_data.sort(key=lambda x: x["total"] if include_boost else x["base"], reverse=True)
        else:
            # Use precomputed stats for overall
            stats = FantasyStats.objects.get(league_id=league_id)
            mvp_data = stats.player_details.get("season_mvp", [])
            if squad_ids:
                mvp_data = [p for p in mvp_data if p.get("squad_id") in squad_ids]
            mvp_data.sort(key=lambda x: x["total"] if include_boost else x["base"], reverse=True)

        # Format data for frontend
        formatted_data = []
        for i, item in enumerate(mvp_data[:limit]):
            player = {
                "id": item.get("player_id"),
                "name": item.get("player_name", "Unknown Player")
            }
            squad_id = item.get("squad_id")
            try:
                squad = FantasySquad.objects.get(id=squad_id)
                squad_data = {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                }
            except Exception:
                squad_data = {
                    "id": squad_id,
                    "name": "Unknown Squad",
                    "color": "#808080"
                }
            formatted_item = {
                "id": i + 1,
                "player": player,
                "matches": item.get("matches", 0),
                "squad": squad_data,
                "base": float(item.get("base", 0)),
                "boost": float(item.get("boost", 0)),
                "total": float(item.get("total", 0))
            }
            formatted_data.append(formatted_item)
        return Response(formatted_data)

    except Exception as e:
        import traceback
        print(f"Error in league_stats_season_mvp: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_match_mvp(request, league_id):
    """
    Get match MVP data for the league and time frame.
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]

        # If time_frame is set, recalculate from FantasyPlayerEvent for that phase only
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
            from collections import defaultdict
            match_mvp_list = []
            # For each match, find top player(s)
            for match_id in match_ids:
                events = FantasyMatchEvent.objects.filter(
                    match_id=match_id,
                    fantasy_squad__league_id=league_id
                )
                player_points = []
                for event in events:
                    player_events = FantasyPlayerEvent.objects.filter(
                        fantasy_squad=event.fantasy_squad,
                        match_event__match=event.match
                    ).select_related('match_event__player')
                    for pe in player_events:
                        if squad_ids and pe.fantasy_squad_id not in squad_ids:
                            continue
                        total = pe.match_event.total_points_all + pe.boost_points
                        base = pe.match_event.total_points_all
                        boost = pe.boost_points
                        player_points.append({
                            "player_id": pe.match_event.player_id,
                            "player_name": pe.match_event.player.name,
                            "squad_id": pe.fantasy_squad_id,
                            "match_id": match_id,
                            "base": float(base),
                            "boost": float(boost),
                            "total": float(total)
                        })
                # Find top performer(s) for this match
                if player_points:
                    top = max(player_points, key=lambda x: x["total"] if include_boost else x["base"])
                    match_mvp_list.append(top)
            # Sort and limit
            match_mvp_list.sort(key=lambda x: x["total"] if include_boost else x["base"], reverse=True)
            mvp_data = match_mvp_list[:limit]
        else:
            # Use precomputed stats for overall
            stats = FantasyStats.objects.get(league_id=league_id)
            mvp_data = stats.player_details.get("match_mvp", [])
            if squad_ids:
                mvp_data = [p for p in mvp_data if p.get("squad_id") in squad_ids]
            mvp_data.sort(key=lambda x: x["total"] if include_boost else x["base"], reverse=True)
            mvp_data = mvp_data[:limit]

        # Format data for frontend
        formatted_data = []
        for i, item in enumerate(mvp_data):
            player = {
                "id": item.get("player_id"),
                "name": item.get("player_name", "Unknown Player")
            }
            squad_id = item.get("squad_id")
            try:
                squad = FantasySquad.objects.get(id=squad_id)
                squad_data = {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                }
            except Exception:
                squad_data = {
                    "id": squad_id,
                    "name": "Unknown Squad",
                    "color": "#808080"
                }
            match_id = item.get("match_id")
            try:
                match = IPLMatch.objects.get(id=match_id)
                match_data = {
                    "id": match.id,
                    "number": match.match_number,
                    "name": f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
                }
            except Exception:
                match_data = {
                    "id": match_id,
                    "number": 0,
                    "name": "Unknown Match"
                }
            formatted_item = {
                "id": i + 1,
                "player": player,
                "squad": squad_data,
                "match": match_data,
                "base": float(item.get("base", 0)),
                "boost": float(item.get("boost", 0)),
                "total": float(item.get("total", 0))
            }
            formatted_data.append(formatted_item)
        return Response(formatted_data)

    except Exception as e:
        import traceback
        print(f"Error in league_stats_match_mvp: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_domination(request, league_id):
    """
    Get domination data from FantasyStats
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]

        # If time_frame is set, recalculate from FantasyMatchEvent for that phase only
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
            domination_data = []
            for match_id in match_ids:
                events = FantasyMatchEvent.objects.filter(
                    match_id=match_id,
                    fantasy_squad__league_id=league_id
                )
                # Find squad with highest points in this match
                top_squad = None
                top_points = -1
                total_points = 0
                for event in events:
                    if squad_ids and event.fantasy_squad_id not in squad_ids:
                        continue
                    points = float(event.total_points or 0)
                    total_points += points
                    if points > top_points:
                        top_points = points
                        top_squad = event.fantasy_squad_id
                if top_squad is not None and top_points > 0 and total_points > 0:
                    domination_data.append({
                        "squad_id": top_squad,
                        "match_id": match_id,
                        "percentage": round(100.0 * top_points / total_points, 1)
                    })
            domination_data.sort(key=lambda x: x["percentage"], reverse=True)
            domination_data = domination_data[:limit]
        else:
            stats = FantasyStats.objects.get(league_id=league_id)
            domination_data = stats.match_details.get("domination", [])
            if squad_ids:
                domination_data = [d for d in domination_data if d.get("squad_id") in squad_ids]
            domination_data.sort(key=lambda x: x.get("percentage", 0), reverse=True)
            domination_data = domination_data[:limit]

        # Format data for frontend
        formatted_data = []
        for i, entry in enumerate(domination_data):
            squad_id = entry.get("squad_id")
            try:
                squad = FantasySquad.objects.get(id=squad_id)
                squad_data = {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                }
            except Exception:
                squad_data = {
                    "id": squad_id,
                    "name": "Unknown Squad",
                    "color": "#808080"
                }
            match_id = entry.get("match_id")
            try:
                match = IPLMatch.objects.get(id=match_id)
                match_data = {
                    "id": match.id,
                    "number": match.match_number,
                    "name": f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
                }
            except Exception:
                match_data = {
                    "id": match_id,
                    "number": 0,
                    "name": "Unknown Match"
                }
            formatted_item = {
                "id": i + 1,
                "squad": squad_data,
                "match": match_data,
                "percentage": float(entry.get("percentage", 0))
            }
            formatted_data.append(formatted_item)
        return Response(formatted_data)

    except Exception as e:
        import traceback
        print(f"Error in league_stats_domination: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_running_total(request, league_id):
    """
    Get running total data for league
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        print("Time frame:", time_frame)

        squad_ids = [int(id) for id in squads_param.split(',') if id]

        # Get all matches for this league and time frame
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            matches = IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).order_by('date', 'match_number', 'id')
        else:
            matches = IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league_id=league_id,
                status='COMPLETED'
            ).distinct().order_by('date', 'match_number', 'id')

        # Get all squads in this league
        all_squads_qs = FantasySquad.objects.filter(league_id=league_id)
        if squad_ids:
            all_squads_qs = all_squads_qs.filter(id__in=squad_ids)
        
        squad_info_map = {
            s.id: {
                "id": s.id,
                "name": str(s.name) if s.name is not None else "Unknown Squad",
                "color": str(s.color) if s.color is not None else "#808080"  # Default color
            } for s in all_squads_qs
        }
        squad_id_list = list(squad_info_map.keys())

        # For each match, build the running total from scratch for this time frame
        from collections import defaultdict
        running_totals = {squad_id: 0.0 for squad_id in squad_id_list} # Initialize with float 0.0
        chart_data = []

        for match in matches:
            # Get all FantasyMatchEvents for this match and league
            events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__league_id=league_id
            )
            # Optionally filter squads
            if squad_ids:
                events = events.filter(fantasy_squad_id__in=squad_ids)

            matchData = {}
            for squad_id in squad_id_list:
                event = next((e for e in events if e.fantasy_squad_id == squad_id), None)
                
                current_match_points = 0.0
                if event:
                    points_source = event.total_points if include_boost else event.total_base_points
                    current_match_points = float(points_source or 0.0)
                
                running_totals[squad_id] += current_match_points
                matchData[squad_id] = {
                    "matchPoints": current_match_points,
                    "runningTotal": running_totals[squad_id],
                    "squad": squad_info_map[squad_id]
                }

            # Build chart data point with robust None handling
            team1_name = "T1"
            if match.team_1 and hasattr(match.team_1, 'short_name') and match.team_1.short_name:
                team1_name = str(match.team_1.short_name)
            
            team2_name = "T2"
            if match.team_2 and hasattr(match.team_2, 'short_name') and match.team_2.short_name:
                team2_name = str(match.team_2.short_name)

            data_point = {
                "name": str(match.match_number) if match.match_number is not None else "N/A",
                "match_id": match.id, # Assuming match.id is always an int and serializable
                "date": match.date.strftime('%a, %b %d') if match.date else "Unknown Date",
                "match_name": f"{team1_name} vs {team2_name}",
                "matchData": matchData
            }
            # Always include all squads, even if they have 0
            for squad_id in squad_id_list:
                data_point[f"squad_{squad_id}"] = matchData[squad_id]["runningTotal"]
            chart_data.append(data_point)

        return Response(chart_data)

    except Exception as e:
        import traceback
        error_message = f"Error in league_stats_running_total: {str(e)}"
        print(error_message)
        print(traceback.format_exc())
        # Consider returning the traceback in the JSON response for easier debugging on frontend/Postman
        return Response({'error': error_message, 'traceback': traceback.format_exc()}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_season_total_actives(request, league_id):
    """
    Get season total actives data from FantasyStats
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Instead of using precomputed stats, recalculate from FantasyMatchEvent for the time frame
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
        else:
            match_ids = set(IPLMatch.objects.filter(
                league_id=league_id,
                status='COMPLETED'
            ).values_list('id', flat=True))
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match_id__in=match_ids
        )
        from collections import defaultdict
        squad_total_actives = defaultdict(int)
        for event in match_events:
            squad_total_actives[event.fantasy_squad_id] += int(event.players_count or 0)
        response_data = []
        for squad in squads:
            response_data.append({
                "id": squad.id,
                "squad": {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                },
                "count": squad_total_actives[squad.id]
            })
        response_data.sort(key=lambda x: x['count'], reverse=True)
        return Response(response_data[:limit])

    except Exception as e:
        import traceback
        print(f"Error in league_stats_season_total_actives: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_most_players_in_match(request, league_id):
    """
    Get most players active in a match data from FantasyStats
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Instead of using precomputed stats, recalculate from FantasyMatchEvent for the time frame
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
        else:
            match_ids = set(IPLMatch.objects.filter(
                league_id=league_id,
                status='COMPLETED'
            ).values_list('id', flat=True))
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match_id__in=match_ids
        )
        # For each squad, find the match with the highest players_count
        from collections import defaultdict
        squad_match_counts = defaultdict(list)
        for event in match_events:
            squad_match_counts[event.fantasy_squad_id].append((event.match_id, int(event.players_count or 0)))
        most_active_data = []
        for squad in squads:
            squad_id = squad.id
            if not squad_match_counts[squad_id]:
                continue
            # Find the match with the max players_count
            match_id, count = max(squad_match_counts[squad_id], key=lambda x: x[1])
            try:
                match = IPLMatch.objects.get(id=match_id)
                match_data = {
                    "id": match.id,
                    "number": match.match_number,
                    "name": f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
                }
            except Exception:
                match_data = {
                    "id": match_id,
                    "number": 0,
                    "name": "Unknown Match"
                }
            most_active_data.append({
                "squad": {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                },
                "count": count,
                "match": match_data
            })
        most_active_data.sort(key=lambda x: x['count'], reverse=True)
        for i, item in enumerate(most_active_data[:limit]):
            item['id'] = i + 1
        return Response(most_active_data[:limit])

    except Exception as e:
        import traceback
        print(f"Error in league_stats_most_players_in_match: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_most_points_in_match(request, league_id):
    """
    Get most points in a match data from FantasyStats
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Instead of using precomputed stats, recalculate from FantasyMatchEvent for the time frame
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
        else:
            match_ids = set(IPLMatch.objects.filter(
                league_id=league_id,
                status='COMPLETED'
            ).values_list('id', flat=True))
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match_id__in=match_ids
        )
        # For each squad, find the match with the highest points
        from collections import defaultdict
        squad_match_points = defaultdict(list)
        for event in match_events:
            if include_boost:
                points = float(event.total_points or 0)
            else:
                points = float(event.total_base_points or 0)
            squad_match_points[event.fantasy_squad_id].append((event.match_id, points, float(event.total_base_points or 0), float(event.total_boost_points or 0)))
        most_points_data = []
        for squad in squads:
            squad_id = squad.id
            if not squad_match_points[squad_id]:
                continue
            # Find the match with the max points
            match_id, total, base, boost = max(squad_match_points[squad_id], key=lambda x: x[1])
            try:
                match = IPLMatch.objects.get(id=match_id)
                match_data = {
                    "id": match.id,
                    "number": match.match_number,
                    "name": f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
                }
            except Exception:
                match_data = {
                    "id": match_id,
                    "number": 0,
                    "name": "Unknown Match"
                }
            most_points_data.append({
                "squad": {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                },
                "match": match_data,
                "base": base,
                "boost": boost,
                "total": total
            })
        if include_boost:
            most_points_data.sort(key=lambda x: x['total'], reverse=True)
        else:
            most_points_data.sort(key=lambda x: x['base'], reverse=True)
        for i, item in enumerate(most_points_data[:limit]):
            item['id'] = i + 1
        return Response(most_points_data[:limit])

    except Exception as e:
        import traceback
        print(f"Error in league_stats_most_points_in_match: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_rank_breakdown(request, league_id):
    """
    Get rank breakdown data from FantasyStats
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Instead of using precomputed stats, recalculate from FantasyMatchEvent for the time frame
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
        else:
            match_ids = set(IPLMatch.objects.filter(
                league_id=league_id,
                status='COMPLETED'
            ).values_list('id', flat=True))
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match_id__in=match_ids
        )
        from collections import defaultdict, Counter
        squad_ranks = defaultdict(list)
        for event in match_events:
            if hasattr(event, 'match_rank') and event.match_rank is not None:
                squad_ranks[event.fantasy_squad_id].append(event.match_rank)
        response_data = []
        for squad in squads:
            ranks = squad_ranks[squad.id]
            if not ranks:
                continue
            highest = min(ranks)
            lowest = max(ranks)
            median = sorted(ranks)[len(ranks)//2]
            mode = Counter(ranks).most_common(1)[0][0]
            games_at_highest = ranks.count(highest)
            response_data.append({
                "id": squad.id,
                "squad": {
                    "id": squad.id,
                    "name": squad.name,
                    "color": squad.color
                },
                "highestRank": highest,
                "gamesAtHighestRank": games_at_highest,
                "lowestRank": lowest,
                "medianRank": median,
                "modeRank": mode
            })
        response_data.sort(key=lambda x: (x.get('highestRank', float('inf')), -x.get('gamesAtHighestRank', 0)))
        return Response(response_data[:limit])

    except Exception as e:
        import traceback
        print(f"Error in league_stats_rank_breakdown: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_table_stats(request, league_id):
    """
    Get consolidated stats for the league table from FantasyStats
    """
    try:
        time_frame = request.query_params.get('timeFrame', 'overall')
        # Get all squads in this league
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(
            league=league
        ).select_related('user').values(
            'id', 'name', 'color'
        )

        # Get relevant matches for the time frame
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = set(IPLMatch.objects.filter(
                phase=phase_num,
                status='COMPLETED'
            ).values_list('id', flat=True))
        else:
            match_ids = set(IPLMatch.objects.filter(
                league_id=league_id,
                status='COMPLETED'
            ).values_list('id', flat=True))

        # Get all FantasyMatchEvents for these matches
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match_id__in=match_ids
        )

        # Build squad stats from scratch for this time frame
        squad_dict = {}
        for squad in squads:
            squad_dict[squad['id']] = {
                'id': squad['id'],
                'name': squad['name'] or "Unknown Squad",
                'color': squad['color'] or "#808080",
                'total_points': 0,
                'base_points': 0,
                'boost_points': 0,
                'total_actives': 0,
                'caps': 0,
                'mvp': None,
                'rank_change': 0,
                'recent_form': []
            }

        # Aggregate stats for each squad
        from collections import defaultdict
        squad_points = defaultdict(float)
        squad_base_points = defaultdict(float)
        squad_boost_points = defaultdict(float)
        squad_total_actives = defaultdict(int)
        squad_caps = defaultdict(int)
        squad_recent_form = defaultdict(list)

        # For MVP, use the precomputed squad_mvps but filter by time frame if possible
        stats = FantasyStats.objects.get(league_id=league_id)
        squad_mvps = stats.player_details.get("squad_mvps", {})

        # Aggregate per match event
        for event in match_events:
            squad_id = event.fantasy_squad_id
            if squad_id not in squad_dict:
                continue
            squad_points[squad_id] += float(event.total_points or 0)
            squad_base_points[squad_id] += float(event.total_base_points or 0)
            squad_boost_points[squad_id] += float(event.total_boost_points or 0)
            squad_total_actives[squad_id] += int(event.players_count or 0)
            squad_caps[squad_id] += int(event.caps or 0)
            # For recent form, collect (match_number, match_rank)
            if hasattr(event, 'match') and event.match:
                squad_recent_form[squad_id].append({
                    'match_number': event.match.match_number,
                    'match_rank': getattr(event, 'match_rank', None),
                    'date': event.match.date
                })

        # Assign aggregated stats to squad_dict
        for squad_id in squad_dict:
            squad_dict[squad_id]['total_points'] = squad_points[squad_id]
            squad_dict[squad_id]['base_points'] = squad_base_points[squad_id]
            squad_dict[squad_id]['boost_points'] = squad_boost_points[squad_id]
            squad_dict[squad_id]['total_actives'] = squad_total_actives[squad_id]
            squad_dict[squad_id]['caps'] = squad_caps[squad_id]
            # Sort recent form by match date descending, take up to 5
            form = sorted(squad_recent_form[squad_id], key=lambda x: x['date'], reverse=True)[:5]
            squad_dict[squad_id]['recent_form'] = form

            # Calculate rank change if possible
            if len(form) >= 2 and all(x.get('match_rank') is not None for x in form[:2]):
                newest = form[0]['match_rank']
                previous = form[1]['match_rank']
                squad_dict[squad_id]['rank_change'] = previous - newest

        # Set MVP data (filtered by time frame if possible)
        for squad_id_str, mvp_data in squad_mvps.items():
            if not squad_id_str.isdigit():
                continue
            squad_id = int(squad_id_str)
            if squad_id not in squad_dict:
                continue
            # If time_frame is set, only include MVP if their match is in match_ids
            if time_frame and time_frame.isdigit():
                mvp_match_id = mvp_data.get("match_id")
                if mvp_match_id and mvp_match_id not in match_ids:
                    continue
            player_id = mvp_data.get("player_id")
            player_name = mvp_data.get("player_name", "Unknown Player")
            points = mvp_data.get("points", 0)
            squad_dict[squad_id]['mvp'] = {
                'player_id': player_id,
                'player_name': player_name,
                'points': float(points)
            }

        # Format data for response
        response_data = list(squad_dict.values())
        response_data.sort(key=lambda x: x['total_points'], reverse=True)
        return Response(response_data)

    except Exception as e:
        import traceback
        print(f"Error in league_table_stats: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)