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

def _get_phase_key(time_frame):
    if time_frame and time_frame.isdigit():
        return str(int(time_frame))
    return "overall"

def _get_squad_info(squad_id, league):
    try:
        squad = FantasySquad.objects.get(id=squad_id, league=league)
        return {
            "id": squad.id,
            "name": squad.name,
            "color": squad.color
        }
    except FantasySquad.DoesNotExist:
        return {"id": squad_id, "name": "Unknown", "color": "#808080"}

def _get_match_info(match_id):
    try:
        match = IPLMatch.objects.get(id=match_id)
        return {
            "id": match.id,
            "number": match.match_number,
            "name": f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
        }
    except IPLMatch.DoesNotExist:
        return {"id": match_id, "number": None, "name": "Unknown Match"}

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_running_total(request, league_id):
    """
    Get running total data for league (from FantasyStats, by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        running_total_data = stats.match_details.get("running_total", {}).get(phase_key, [])

        # Optionally filter squads
        if squad_ids:
            for data_point in running_total_data:
                # Remove squads not in squad_ids from matchData and squad_* keys
                data_point["matchData"] = {k: v for k, v in data_point["matchData"].items() if k in squad_ids}
                for key in list(data_point.keys()):
                    if key.startswith("squad_"):
                        squad_id = int(key.split("_")[1])
                        if squad_id not in squad_ids:
                            del data_point[key]

        return Response(running_total_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_running_total: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_domination(request, league_id):
    """
    Get domination data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        domination_data = stats.match_details.get("domination", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        domination_data = [
            {
                "squad": _get_squad_info(item["squad_id"], league),
                "match": _get_match_info(item["match_id"]),
                "percentage": item["percentage"]
            }
            for item in domination_data if not squad_ids or item.get("squad_id") in squad_ids
        ][:8]  # Limit to top 8
        return Response(domination_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_domination: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_match_mvp(request, league_id):
    """
    Get match MVP data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        mvp_data = stats.player_details.get("match_mvp", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        mvp_data = [
            {
                "player_id": item["player_id"],
                "player_name": item["player_name"],
                "squad": _get_squad_info(item["squad_id"], league),
                "match": _get_match_info(item["match_id"]),
                "base": item["base"],
                "boost": item["boost"],
                "total": item["total"]
            }
            for item in mvp_data if not squad_ids or item.get("squad_id") in squad_ids
        ][:8]  # Limit to top 8
        return Response(mvp_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_match_mvp: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_season_mvp(request, league_id):
    """
    Get season MVP data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        mvp_data = stats.player_details.get("season_mvp", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        mvp_data = [
            {
                "player_id": item["player_id"],
                "player_name": item["player_name"],
                "squad": _get_squad_info(item["squad_id"], league),
                "base": item["base"],
                "boost": item["boost"],
                "total": item["total"],
                "match_count": item.get("matches", 0)  # Add this line
            }
            for item in mvp_data if not squad_ids or item.get("squad_id") in squad_ids
        ][:8]  # Limit to top 8
        return Response(mvp_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_season_mvp: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_most_points_in_match(request, league_id):
    """
    Get most points in a match data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        most_points_data = stats.match_details.get("most_points_in_match", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        most_points_data = [
            {
                "squad": _get_squad_info(item["squad_id"], league),
                "match": _get_match_info(item["match_id"]),
                "base": item["base"],
                "boost": item["boost"],
                "total": item["total"]
            }
            for item in most_points_data if not squad_ids or item.get("squad_id") in squad_ids
        ][:8]  # Limit to top 8
        print(f"Most points data: {most_points_data}")  # Debugging line
        return Response(most_points_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_most_points_in_match: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_most_players_in_match(request, league_id):
    """
    Get most players active in a match data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        most_active_data = stats.match_details.get("most_players_in_match", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        most_active_data = [
            {
                "squad": _get_squad_info(item["squad_id"], league),
                "match": _get_match_info(item["match_id"]),
                "count": item["count"]
            }
            for item in most_active_data if not squad_ids or item.get("squad_id") in squad_ids
        ][:8]  # Limit to top 8
        return Response(most_active_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_most_players_in_match: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_rank_breakdown(request, league_id):
    """
    Get rank breakdown data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        # FIXED: Access squad_stats inside match_details
        squad_stats_data = stats.match_details.get("squad_stats", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        rank_breakdown_data = []
        
        for squad_data in squad_stats_data:
            if not squad_ids or squad_data.get("squad_id") in squad_ids:
                rank_stats = squad_data.get("rank_stats", {})
                if rank_stats:
                    rank_breakdown_data.append({
                        "squad": _get_squad_info(squad_data["squad_id"], league),
                        "highestRank": rank_stats.get("highest"),
                        "gamesAtHighestRank": rank_stats.get("games_at_highest"),
                        "lowestRank": rank_stats.get("lowest"), 
                        "medianRank": rank_stats.get("median"),
                        "modeRank": rank_stats.get("mode")
                    })

        return Response(rank_breakdown_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_rank_breakdown: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 5)  # Cache for 5 minutes only
def league_table_stats(request, league_id):
    """
    Get live league table stats - calculates everything on-the-fly
    No more dependency on cached FantasyStats!
    """
    try:
        from django.db.models import Sum, Count, Q, F, Prefetch
        
        # Get the league and verify it exists
        league = FantasyLeague.objects.get(id=league_id)
        
        # Get all squads with aggregated match event data in a single query
        squads = FantasySquad.objects.filter(league=league).annotate(
            # Aggregate match event data
            caps_count=Count('match_events', filter=Q(match_events__match_rank=1)),
            total_actives_sum=Sum('match_events__players_count'),
            total_base_points_sum=Sum('match_events__total_base_points'),
            total_boost_points_sum=Sum('match_events__total_boost_points'),
        ).prefetch_related(
            # Prefetch recent match events for recent form calculation
            Prefetch(
                'match_events',
                queryset=FantasyMatchEvent.objects.select_related('match').order_by('-match__date', '-match__match_number')[:5],
                to_attr='recent_match_events'
            )
        )
        
        # Get MVP data for all squads in one optimized query
        mvp_data = {}
        player_totals = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        ).values(
            'fantasy_squad_id',
            'match_event__player_id', 
            'match_event__player__name'
        ).annotate(
            total_points=Sum(F('match_event__total_points_all') + F('boost_points'))
        )
        
        # Group MVP data by squad and find the best player for each
        squad_players = {}
        for pt in player_totals:
            squad_id = pt['fantasy_squad_id']
            if squad_id not in squad_players:
                squad_players[squad_id] = []
            squad_players[squad_id].append({
                'player_id': pt['match_event__player_id'],
                'player_name': pt['match_event__player__name'],
                'total_points': float(pt['total_points'] or 0)
            })
        
        # Find MVP for each squad (player with highest total points)
        for squad_id, players in squad_players.items():
            mvp_data[squad_id] = max(players, key=lambda x: x['total_points'])
        
        table_data = []
        
        for squad in squads:
            # Calculate recent form from prefetched data
            recent_form = []
            for match_event in reversed(squad.recent_match_events):  # Reverse for chronological order
                recent_form.append({
                    "match_number": match_event.match.match_number,
                    "match_rank": match_event.match_rank,
                    "date": match_event.match.date.isoformat() if match_event.match.date else None
                })
            
            # Get MVP for this squad
            mvp = None
            if squad.id in mvp_data:
                mvp_info = mvp_data[squad.id]
                mvp = {
                    "player_id": mvp_info['player_id'],
                    "player_name": mvp_info['player_name'],
                    "points": mvp_info['total_points']
                }
            
            table_data.append({
                "id": squad.id,
                "name": squad.name,
                "color": squad.color,
                "total_points": float(squad.total_points or 0),
                "base_points": float(squad.total_base_points_sum or 0),
                "boost_points": float(squad.total_boost_points_sum or 0),
                "caps": squad.caps_count or 0,
                "total_actives": squad.total_actives_sum or 0,
                "mvp": mvp,
                "recent_form": recent_form,
                "rank_change": 0  # Set to 0 for now - could be enhanced with historical comparison
            })
        
        # Sort by total points (descending)
        table_data.sort(key=lambda x: x["total_points"], reverse=True)
        
        return Response(table_data)
        
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in live league_table_stats: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_season_total_actives(request, league_id):
    """
    Get season total actives data from FantasyStats (by phase if requested)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        phase_key = _get_phase_key(time_frame)
        squad_ids = [int(id) for id in squads_param.split(',') if id]

        stats = FantasyStats.objects.get(league_id=league_id)
        # FIXED: Access squad_stats inside match_details
        squad_stats_data = stats.match_details.get("squad_stats", {}).get(phase_key, [])
        league = FantasyLeague.objects.get(id=league_id)

        # Transform to nested structure for frontend
        actives_data = []
        
        for squad_data in squad_stats_data:
            if not squad_ids or squad_data.get("squad_id") in squad_ids:
                actives_data.append({
                    "squad": _get_squad_info(squad_data["squad_id"], league),
                    "count": squad_data.get("total_actives", 0)
                })

        print(f"DEBUG: Returning {len(actives_data)} actives_data entries")
        return Response(actives_data)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_season_total_actives: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)