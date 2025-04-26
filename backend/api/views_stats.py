from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Max, Min, Avg, F, Q, Case, When, Value, FloatField
from django.db.models.functions import Coalesce
from collections import Counter
import statistics
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from functools import wraps

from .models import (
    FantasyLeague,
    FantasySquad,
    FantasyPlayerEvent,
    FantasyMatchEvent,
    IPLMatch,
    IPLPlayerEvent
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

def filter_by_time_frame(queryset, time_frame, match_field='match'):
    """
    Filter queryset based on time frame parameter (phase as number string)
    Only includes matches with status='COMPLETED' or 'NO_RESULT'
    """
    queryset = queryset.filter(Q(**{f"{match_field}__status": 'COMPLETED'}) | Q(**{f"{match_field}__status": 'NO_RESULT'}))
    if time_frame and time_frame.isdigit():
        return queryset.filter(**{f"{match_field}__phase": int(time_frame)})
    # Default: no filtering (all data)
    return queryset

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)  # Cache for 10 minutes, allow bypass
def league_stats_season_mvp(request, league_id):
    """
    Get season MVP data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        player_events = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        )
        if squad_ids:
            player_events = player_events.filter(fantasy_squad__id__in=squad_ids)
        player_events = filter_by_time_frame(player_events, time_frame, 'match_event__match')

        player_stats = player_events.values(
            'match_event__player__id',
            'match_event__player__name',
            'fantasy_squad__id',
            'fantasy_squad__name',
            'fantasy_squad__color'
        ).annotate(
            matches=Count('match_event__match', distinct=True),
            base=Sum('match_event__total_points_all'),
            boost=Sum('boost_points')
        )

        response_data = []
        for stat in player_stats:
            base = float(stat['base'] or 0)
            boost = float(stat['boost'] or 0)
            total = base + boost
            response_data.append({
                'id': len(response_data) + 1,
                'player': {
                    'id': stat['match_event__player__id'],
                    'name': stat['match_event__player__name']
                },
                'matches': stat['matches'],
                'squad': {
                    'id': stat['fantasy_squad__id'],
                    'name': stat['fantasy_squad__name'],
                    'color': stat['fantasy_squad__color']
                },
                'base': base,
                'boost': boost,
                'total': total
            })

        if include_boost:
            response_data.sort(key=lambda x: x['total'], reverse=True)
        else:
            response_data.sort(key=lambda x: x['base'], reverse=True)

        return Response(response_data[:limit])

    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
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
    Get match MVP data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        player_events = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        )
        if squad_ids:
            player_events = player_events.filter(fantasy_squad__id__in=squad_ids)
        player_events = filter_by_time_frame(player_events, time_frame, 'match_event__match')

        match_player_data = {}
        for pe in player_events.select_related('match_event__player', 'match_event__match', 'fantasy_squad'):
            key = (pe.match_event.match.id, pe.match_event.player.id, pe.fantasy_squad.id)
            if key not in match_player_data:
                match_player_data[key] = {
                    'player': {
                        'id': pe.match_event.player.id,
                        'name': pe.match_event.player.name
                    },
                    'match': {
                        'id': pe.match_event.match.id,
                        'number': pe.match_event.match.match_number,
                        'name': f"{pe.match_event.match.team_1.short_name} vs {pe.match_event.match.team_2.short_name} - Match {pe.match_event.match.match_number}"
                    },
                    'squad': {
                        'id': pe.fantasy_squad.id,
                        'name': pe.fantasy_squad.name,
                        'color': pe.fantasy_squad.color
                    },
                    'base': pe.match_event.total_points_all,
                    'boost': pe.boost_points,
                    'total': pe.match_event.total_points_all + pe.boost_points
                }
            else:
                data = match_player_data[key]
                data['base'] += pe.match_event.total_points_all
                data['boost'] += pe.boost_points
                data['total'] = data['base'] + data['boost']

        response_data = list(match_player_data.values())
        if include_boost:
            response_data.sort(key=lambda x: x['total'], reverse=True)
        else:
            response_data.sort(key=lambda x: x['base'], reverse=True)
        for i, data in enumerate(response_data):
            data['id'] = i + 1
        return Response(response_data[:limit])

    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_match_mvp: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_season_total_actives(request, league_id):
    """
    Get season total actives data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        match_events = filter_by_time_frame(match_events, time_frame)

        squad_active_counts = match_events.values(
            'fantasy_squad__id',
            'fantasy_squad__name',
            'fantasy_squad__color'
        ).annotate(
            count=Sum('players_count')
        ).order_by('-count')

        response_data = []
        for i, stat in enumerate(squad_active_counts[:limit]):
            squad_data = {
                'id': i + 1,
                'squad': {
                    'id': stat['fantasy_squad__id'],
                    'name': stat['fantasy_squad__name'],
                    'color': stat['fantasy_squad__color']
                },
                'count': stat['count']
            }
            response_data.append(squad_data)

        return Response(response_data)
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
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
    Get most players active in a match data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        match_events = filter_by_time_frame(match_events, time_frame)
        match_events = match_events.order_by('-players_count')

        response_data = []
        for i, me in enumerate(match_events[:limit]):
            match_data = {
                'id': i + 1,
                'squad': {
                    'id': me.fantasy_squad.id,
                    'name': me.fantasy_squad.name,
                    'color': me.fantasy_squad.color
                },
                'count': me.players_count,
                'match': {
                    'id': me.match.id,
                    'number': me.match.match_number,
                    'name': f"{me.match.team_1.short_name} vs {me.match.team_2.short_name} - Match {me.match.match_number}"
                }
            }
            response_data.append(match_data)

        return Response(response_data)
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
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
    Get most points in a match data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        match_events = filter_by_time_frame(match_events, time_frame)

        # Sort by points
        if include_boost:
            match_events = match_events.order_by('-total_points')
        else:
            match_events = match_events.order_by('-total_base_points')

        response_data = []
        for i, me in enumerate(match_events[:limit]):
            match_data = {
                'id': i + 1,
                'squad': {
                    'id': me.fantasy_squad.id,
                    'name': me.fantasy_squad.name,
                    'color': me.fantasy_squad.color
                },
                'match': {
                    'id': me.match.id,
                    'number': me.match.match_number,
                    'name': f"{me.match.team_1.short_name} vs {me.match.team_2.short_name} - Match {me.match.match_number}"
                },
                'base': float(me.total_base_points),
                'boost': float(me.total_boost_points),
                'total': float(me.total_points)
            }
            response_data.append(match_data)

        return Response(response_data)
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
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
    Get rank breakdown data
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if squad_ids:
            squads = squads.filter(id__in=squad_ids)

        response_data = []
        for squad in squads:
            match_events = FantasyMatchEvent.objects.filter(fantasy_squad=squad)
            match_events = filter_by_time_frame(match_events, time_frame)
            if not match_events.exists():
                continue
            ranks = list(match_events.values_list('running_rank', flat=True))
            if not ranks:
                continue
            highest_rank = min(ranks)
            lowest_rank = max(ranks)
            games_at_highest_rank = ranks.count(highest_rank)
            median_rank = statistics.median(ranks)
            try:
                mode_rank = statistics.mode(ranks)
            except Exception:
                mode_rank = None
            squad_data = {
                'id': squad.id,
                'squad': {
                    'id': squad.id,
                    'name': squad.name,
                    'color': squad.color
                },
                'highestRank': highest_rank,
                'gamesAtHighestRank': games_at_highest_rank,
                'lowestRank': lowest_rank,
                'medianRank': median_rank,
                'modeRank': mode_rank
            }
            response_data.append(squad_data)
        response_data.sort(key=lambda x: (x['highestRank'], -x['gamesAtHighestRank']))
        return Response(response_data[:limit])
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_rank_breakdown: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_stats_domination(request, league_id):
    """
    Get domination data (highest percentage of squad points vs all squads)
    """
    try:
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)

        # Phase filtering by number
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            match_ids = list(IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league,
                phase=phase_num,
                status='COMPLETED'
            ).distinct().values_list('id', flat=True))
        else:
            match_ids = list(IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league,
                status='COMPLETED'
            ).distinct().values_list('id', flat=True))

        response_data = []
        for match_id in match_ids:
            match = IPLMatch.objects.get(id=match_id)
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__league=league
            )
            if squad_ids:
                match_events_filtered = match_events.filter(fantasy_squad__id__in=squad_ids)
            else:
                match_events_filtered = match_events
            if include_boost:
                total_match_points = sum(me.total_points for me in match_events)
            else:
                total_match_points = sum(me.total_base_points for me in match_events)
            if total_match_points == 0:
                continue
            for me in match_events_filtered:
                squad_points = me.total_points if include_boost else me.total_base_points
                if squad_points == 0:
                    continue
                domination_pct = (squad_points / total_match_points) * 100
                if domination_pct > 10:
                    entry = {
                        'id': len(response_data) + 1,
                        'squad': {
                            'id': me.fantasy_squad.id,
                            'name': me.fantasy_squad.name,
                            'color': me.fantasy_squad.color
                        },
                        'match': {
                            'id': match.id,
                            'number': match.match_number,
                            'name': f"{match.team_1.short_name} vs {match.team_2.short_name} - Match {match.match_number}"
                        },
                        'percentage': float(domination_pct)
                    }
                    response_data.append(entry)
        response_data.sort(key=lambda x: x['percentage'], reverse=True)
        return Response(response_data[:limit])
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
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

        squad_ids = [int(id) for id in squads_param.split(',') if id]
        league = FantasyLeague.objects.only('id').get(id=league_id)
        squads = FantasySquad.objects.filter(league=league)
        if squad_ids:
            squads = squads.filter(id__in=squad_ids)

        # Only phase-based filtering
        if time_frame and time_frame.isdigit():
            phase_num = int(time_frame)
            matches = IPLMatch.objects.filter(
                status='COMPLETED',
                fantasymatchevent__fantasy_squad__league=league,
                phase=phase_num
            ).distinct().order_by('date')
        else:
            matches = IPLMatch.objects.filter(
                status='COMPLETED',
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('date')

        chart_data = []
        running_totals = {squad.id: 0 for squad in squads}

        for match in matches:
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__in=squads
            )
            data_point = {
                'name': str(match.match_number),
                'match_id': match.id,
                'date': match.date.strftime('%a, %b %d'),
                'match_name': f"{match.team_1.short_name} vs {match.team_2.short_name}",
                'matchData': {}
            }
            for squad in squads:
                try:
                    match_event = match_events.get(fantasy_squad=squad)
                    match_points = match_event.total_points if include_boost else match_event.total_base_points
                except FantasyMatchEvent.DoesNotExist:
                    match_points = 0
                running_totals[squad.id] += match_points
                data_point['matchData'][squad.id] = {
                    'matchPoints': float(match_points),
                    'runningTotal': float(running_totals[squad.id])
                }
                data_point[f'squad_{squad.id}'] = float(running_totals[squad.id])
            chart_data.append(data_point)

        return Response(chart_data)
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in league_stats_running_total: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page_with_bypass(60 * 10)
def league_table_stats(request, league_id):
    """
    Get consolidated stats for the league table in a single optimized query
    Includes:
    - Basic squad info
    - Points (total, base, boost)
    - Rank changes
    - Total active players
    - Caps (times being #1 in matches)
    - MVP for each squad
    - Recent form (last 5 matches)
    """
    try:
        league = FantasyLeague.objects.get(id=league_id)
        squads = FantasySquad.objects.filter(
            league=league
        ).select_related('user').values(
            'id', 'name', 'color', 'total_points'
        )

        squad_dict = {}
        for squad in squads:
            squad_dict[squad['id']] = {
                'id': squad['id'],
                'name': squad['name'],
                'color': squad['color'],
                'total_points': float(squad['total_points']) if squad['total_points'] else 0,
                'base_points': 0,
                'boost_points': 0,
                'total_actives': 0,
                'caps': 0,
                'mvp': None,
                'rank_change': 0,
                'recent_form': []
            }

        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        ).values(
            'fantasy_squad_id'
        ).annotate(
            base_points=Sum('total_base_points'),
            boost_points=Sum('total_boost_points'),
            total_actives=Sum('players_count')
        )

        for me in match_events:
            squad_id = me['fantasy_squad_id']
            if squad_id in squad_dict:
                squad_dict[squad_id]['base_points'] = float(me['base_points'] or 0)
                squad_dict[squad_id]['boost_points'] = float(me['boost_points'] or 0)
                squad_dict[squad_id]['total_actives'] = me['total_actives'] or 0

        player_events = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        ).select_related(
            'match_event__player',
            'fantasy_squad'
        )

        player_totals = {}
        for pe in player_events:
            player_id = pe.match_event.player_id
            squad_id = pe.fantasy_squad_id
            key = (squad_id, player_id)
            if key not in player_totals:
                player_totals[key] = {
                    'squad_id': squad_id,
                    'player_id': player_id,
                    'player_name': pe.match_event.player.name,
                    'base_points': 0,
                    'boost_points': 0,
                    'total_points': 0
                }
            player_totals[key]['base_points'] += pe.match_event.total_points_all
            player_totals[key]['boost_points'] += pe.boost_points
            player_totals[key]['total_points'] += pe.match_event.total_points_all + pe.boost_points

        squad_mvps = {}
        for key, data in player_totals.items():
            squad_id = key[0]
            if squad_id not in squad_mvps or data['total_points'] > squad_mvps[squad_id]['total_points']:
                squad_mvps[squad_id] = data

        for squad_id, mvp_data in squad_mvps.items():
            if squad_id in squad_dict:
                squad_dict[squad_id]['mvp'] = {
                    'player_id': mvp_data['player_id'],
                    'player_name': mvp_data['player_name'],
                    'points': mvp_data['total_points']
                }

        match_ids = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league,
            match__status__in=['COMPLETED', 'NO_RESULT']
        ).values_list('match_id', flat=True).distinct()

        caps_count = {}
        for match_id in match_ids:
            top_squad = FantasyMatchEvent.objects.filter(
                match_id=match_id,
                fantasy_squad__league=league
            ).order_by('-total_points').values_list('fantasy_squad_id', flat=True).first()
            if top_squad:
                caps_count[top_squad] = caps_count.get(top_squad, 0) + 1

        for squad_id, count in caps_count.items():
            if squad_id in squad_dict:
                squad_dict[squad_id]['caps'] = count

        recent_matches = IPLMatch.objects.filter(
            fantasymatchevent__fantasy_squad__league=league,
            status__in=['COMPLETED', 'NO_RESULT']
        ).distinct().order_by('-date')[:2]

        if len(recent_matches) >= 2:
            last_match, previous_match = recent_matches[0], recent_matches[1]
            last_match_events = FantasyMatchEvent.objects.filter(
                match=last_match,
                fantasy_squad__league=league
            ).select_related('fantasy_squad')
            previous_match_events = FantasyMatchEvent.objects.filter(
                match=previous_match,
                fantasy_squad__league=league
            ).select_related('fantasy_squad')
            last_ranks = {me.fantasy_squad_id: me.running_rank for me in last_match_events if me.running_rank}
            previous_ranks = {me.fantasy_squad_id: me.running_rank for me in previous_match_events if me.running_rank}
            for squad_id in squad_dict:
                if squad_id in last_ranks and squad_id in previous_ranks:
                    squad_dict[squad_id]['rank_change'] = previous_ranks[squad_id] - last_ranks[squad_id]

        recent_matches = IPLMatch.objects.filter(
            fantasymatchevent__fantasy_squad__league=league,
            status__in=['COMPLETED', 'NO_RESULT']
        ).distinct().order_by('-date')[:5]

        for match in recent_matches:
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__league=league
            ).select_related('fantasy_squad')
            for me in match_events:
                squad_id = me.fantasy_squad_id
                if squad_id in squad_dict:
                    squad_dict[squad_id]['recent_form'].append({
                        'match_id': match.id,
                        'match_number': match.match_number,
                        'date': match.date,
                        'match_rank': me.match_rank
                    })

        for squad_id in squad_dict:
            squad_dict[squad_id]['recent_form'] = sorted(
                squad_dict[squad_id]['recent_form'],
                key=lambda x: x['date'],
                reverse=True
            )

        response_data = list(squad_dict.values())
        response_data.sort(key=lambda x: x['total_points'], reverse=True)
        return Response(response_data)
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in league_table_stats: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=500)
