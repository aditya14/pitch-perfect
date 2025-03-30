from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Max, Min, Avg, F, Q, Case, When, Value, FloatField
from django.db.models.functions import Coalesce
from collections import Counter
import statistics

from .models import (
    FantasyLeague,
    FantasySquad,
    FantasyPlayerEvent,
    FantasyMatchEvent,
    IPLMatch,
    IPLPlayerEvent
)

def filter_by_time_frame(queryset, time_frame, match_field='match'):
    """
    Filter queryset based on time frame parameter
    """
    if time_frame == 'last5':
        # Get the 5 most recent matches IDs first, then filter
        recent_match_ids = list(IPLMatch.objects.filter(
            status__in=['COMPLETED', 'LIVE']
        ).order_by('-date').values_list('id', flat=True)[:5])
        
        # Use the IDs to filter instead of the queryset directly
        return queryset.filter(**{f"{match_field}__id__in": recent_match_ids})
    
    elif time_frame == 'last10':
        # Get the 10 most recent matches IDs first, then filter
        recent_match_ids = list(IPLMatch.objects.filter(
            status__in=['COMPLETED', 'LIVE']
        ).order_by('-date').values_list('id', flat=True)[:10])
        
        # Use the IDs to filter instead of the queryset directly
        return queryset.filter(**{f"{match_field}__id__in": recent_match_ids})
    
    elif time_frame == 'phase1':
        return queryset.filter(**{f"{match_field}__phase": 1})
    
    elif time_frame == 'phase2':
        return queryset.filter(**{f"{match_field}__phase": 2})
    
    elif time_frame == 'phase3':
        return queryset.filter(**{f"{match_field}__phase": 3})
    
    # Default: return all (overall)
    return queryset

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_season_mvp(request, league_id):
    """
    Get season MVP data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter player events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        player_events = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        )
        
        if squad_ids:
            player_events = player_events.filter(fantasy_squad__id__in=squad_ids)
        
        # Apply time frame filter
        player_events = filter_by_time_frame(player_events, time_frame, 'match_event__match')
        
        # Aggregate player data
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
        ).order_by('-base' if not include_boost else '-boost')
        
        # Format response data
        response_data = []
        for stat in player_stats:
            player_data = {
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
                'base': float(stat['base']),
                'boost': float(stat['boost']),
                'total': float(stat['base']) + float(stat['boost'])
            }
            response_data.append(player_data)
        
        # Sort by total or base based on include_boost parameter
        if include_boost:
            response_data.sort(key=lambda x: x['total'], reverse=True)
        else:
            response_data.sort(key=lambda x: x['base'], reverse=True)
        
        # Limit to top 10
        return Response(response_data[:10])
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_match_mvp(request, league_id):
    """
    Get match MVP data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter player events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        player_events = FantasyPlayerEvent.objects.filter(
            fantasy_squad__league=league
        )
        
        if squad_ids:
            player_events = player_events.filter(fantasy_squad__id__in=squad_ids)
        
        # Apply time frame filter
        player_events = filter_by_time_frame(player_events, time_frame, 'match_event__match')
        
        # Get top performances in each match
        top_performances = []
        
        # Group by player and match
        match_player_data = {}
        for pe in player_events:
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
                # Update existing entry (although this shouldn't happen with our unique key)
                data = match_player_data[key]
                data['base'] += pe.match_event.total_points_all
                data['boost'] += pe.boost_points
                data['total'] = data['base'] + data['boost']
        
        # Convert to list and sort
        response_data = list(match_player_data.values())
        
        # Sort by total or base based on include_boost parameter
        if include_boost:
            response_data.sort(key=lambda x: x['total'], reverse=True)
        else:
            response_data.sort(key=lambda x: x['base'], reverse=True)
        
        # Add IDs for frontend table
        for i, data in enumerate(response_data):
            data['id'] = i + 1
        
        # Limit to top 10
        return Response(response_data[:10])
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_season_total_actives(request, league_id):
    """
    Get season total actives data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter match events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        
        # Apply time frame filter
        match_events = filter_by_time_frame(match_events, time_frame)
        
        # Aggregate player counts
        squad_active_counts = match_events.values(
            'fantasy_squad__id',
            'fantasy_squad__name',
            'fantasy_squad__color'
        ).annotate(
            count=Sum('players_count')
        ).order_by('-count')
        
        # Format response data
        response_data = []
        for i, stat in enumerate(squad_active_counts):
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
        
        # Limit to top 10
        return Response(response_data[:10])
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_most_players_in_match(request, league_id):
    """
    Get most players active in a match data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter match events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        
        # Apply time frame filter
        match_events = filter_by_time_frame(match_events, time_frame)
        
        # Sort by player count descending
        match_events = match_events.order_by('-players_count')
        
        # Format response data
        response_data = []
        for i, me in enumerate(match_events[:10]):  # Limit to top 10
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
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_most_points_in_match(request, league_id):
    """
    Get most points in a match data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter match events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        match_events = FantasyMatchEvent.objects.filter(
            fantasy_squad__league=league
        )
        
        if squad_ids:
            match_events = match_events.filter(fantasy_squad__id__in=squad_ids)
        
        # Apply time frame filter
        match_events = filter_by_time_frame(match_events, time_frame)
        
        # Sort by points
        if include_boost:
            match_events = match_events.order_by('-total_points')
        else:
            match_events = match_events.order_by('-total_base_points')
        
        # Format response data
        response_data = []
        for i, me in enumerate(match_events[:10]):  # Limit to top 10
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
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_rank_breakdown(request, league_id):
    """
    Get rank breakdown data
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter match events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        
        # Get all squads in the league that are in squad_ids (or all if squad_ids is empty)
        squads = FantasySquad.objects.filter(league=league)
        if squad_ids:
            squads = squads.filter(id__in=squad_ids)
        
        # Prepare response data
        response_data = []
        
        # For each squad, analyze rank data
        for squad in squads:
            match_events = FantasyMatchEvent.objects.filter(fantasy_squad=squad)
            
            # Apply time frame filter
            match_events = filter_by_time_frame(match_events, time_frame)
            
            if not match_events.exists():
                continue
            
            # Get all ranks for this squad - use running_rank (overall rank) instead of match_rank
            ranks = list(match_events.values_list('running_rank', flat=True))
            
            if not ranks:
                continue
            
            # Find highest and lowest ranks
            highest_rank = min(ranks)  # Lower number is better in ranking
            lowest_rank = max(ranks)
            
            # Count games at highest rank
            games_at_highest_rank = ranks.count(highest_rank)
            
            # Calculate median and mode ranks
            median_rank = statistics.median(ranks)
            mode_rank = statistics.mode(ranks) if ranks else None
            
            # Create response data entry
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
        
        # Sort by highest rank (best rank first, then games at highest rank)
        response_data.sort(key=lambda x: (x['highestRank'], -x['gamesAtHighestRank']))
        
        # Limit to top 10
        return Response(response_data[:10])
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_domination(request, league_id):
    """
    Get domination data (highest percentage of squad points vs all squads)
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Filter match events by league and squads
        league = FantasyLeague.objects.get(id=league_id)
        
        # Get all matches for this league based on time_frame
        if time_frame == 'last5':
            # First get match IDs, then create a new queryset
            match_ids = list(IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('-date').values_list('id', flat=True)[:5])
            
            league_matches = IPLMatch.objects.filter(id__in=match_ids)
            
        elif time_frame == 'last10':
            # First get match IDs, then create a new queryset
            match_ids = list(IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('-date').values_list('id', flat=True)[:10])
            
            league_matches = IPLMatch.objects.filter(id__in=match_ids)
            
        elif time_frame == 'phase1':
            league_matches = IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league,
                phase=1
            ).distinct()
            
        elif time_frame == 'phase2':
            league_matches = IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league,
                phase=2
            ).distinct()
            
        elif time_frame == 'phase3':
            league_matches = IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league,
                phase=3
            ).distinct()
            
        else:
            # Default: all matches
            league_matches = IPLMatch.objects.filter(
                fantasymatchevent__fantasy_squad__league=league
            ).distinct()
        
        # Prepare response data
        response_data = []
        
        # For each match, calculate domination percentages
        for match in league_matches:
            # Get all match events for this match in the league
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__league=league
            )
            
            if squad_ids:
                # Only consider these squads for domination
                match_events_filtered = match_events.filter(fantasy_squad__id__in=squad_ids)
            else:
                match_events_filtered = match_events
            
            # Total points across all squads in this match - use base points if not including boost
            if include_boost:
                total_match_points = sum(me.total_points for me in match_events)
            else:
                total_match_points = sum(me.total_base_points for me in match_events)
            
            if total_match_points == 0:
                continue
            
            # Calculate domination percentage for each squad
            for me in match_events_filtered:
                if include_boost:
                    squad_points = me.total_points
                else:
                    squad_points = me.total_base_points
                    
                if squad_points == 0:
                    continue
                
                domination_pct = (squad_points / total_match_points) * 100
                
                # Add to response data if significant (e.g., > 10%)
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
        
        # Sort by percentage descending
        response_data.sort(key=lambda x: x['percentage'], reverse=True)
        
        # Limit to top 10
        return Response(response_data[:10])
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def league_stats_running_total(request, league_id):
    """
    Get running total data for league
    """
    try:
        # Get query parameters
        squads_param = request.query_params.get('squads', '')
        time_frame = request.query_params.get('timeFrame', 'overall')
        include_boost = request.query_params.get('includeBoost', 'true') == 'true'
        
        # Parse squad IDs
        squad_ids = [int(id) for id in squads_param.split(',') if id]
        
        # Get league
        league = FantasyLeague.objects.get(id=league_id)
        
        # Get squads in the league
        squads = FantasySquad.objects.filter(league=league)
        if squad_ids:
            squads = squads.filter(id__in=squad_ids)
            
        # Get matches based on time_frame
        if time_frame == 'last5':
            # First get the match IDs, then create a new queryset
            match_ids = list(IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('-date').values_list('id', flat=True)[:5])
            
            matches = IPLMatch.objects.filter(id__in=match_ids).order_by('date')
            
        elif time_frame == 'last10':
            # First get the match IDs, then create a new queryset
            match_ids = list(IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('-date').values_list('id', flat=True)[:10])
            
            matches = IPLMatch.objects.filter(id__in=match_ids).order_by('date')
            
        elif time_frame == 'phase1':
            matches = IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league,
                phase=1
            ).distinct().order_by('date')
            
        elif time_frame == 'phase2':
            matches = IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league,
                phase=2
            ).distinct().order_by('date')
            
        elif time_frame == 'phase3':
            matches = IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league,
                phase=3
            ).distinct().order_by('date')
            
        else:
            # Default: all matches
            matches = IPLMatch.objects.filter(
                status__in=['COMPLETED', 'LIVE'],
                fantasymatchevent__fantasy_squad__league=league
            ).distinct().order_by('date')
        
        # Create data structure for chart
        chart_data = []
        running_totals = {squad.id: 0 for squad in squads}
        
        # Process each match
        for match in matches:
            # Get match events for this match
            match_events = FantasyMatchEvent.objects.filter(
                match=match,
                fantasy_squad__in=squads
            )
            
            # Create match data point
            data_point = {
                'name': str(match.match_number),
                'match_id': match.id,
                'date': match.date.strftime('%a, %b %d'),
                'match_name': f"{match.team_1.short_name} vs {match.team_2.short_name}",
                'matchData': {}
            }
            
            # Add squad data
            for squad in squads:
                try:
                    match_event = match_events.get(fantasy_squad=squad)
                    
                    # Use total_points or total_base_points based on includeBoost parameter
                    if include_boost:
                        match_points = match_event.total_points
                    else:
                        match_points = match_event.total_base_points
                except FantasyMatchEvent.DoesNotExist:
                    match_points = 0
                
                running_totals[squad.id] += match_points
                
                # Store squad match data
                data_point['matchData'][squad.id] = {
                    'matchPoints': float(match_points),
                    'runningTotal': float(running_totals[squad.id])
                }
                
                # Add running total to data point
                data_point[f'squad_{squad.id}'] = float(running_totals[squad.id])
            
            chart_data.append(data_point)
        
        return Response(chart_data)
    
    except FantasyLeague.DoesNotExist:
        return Response({'error': 'League not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)