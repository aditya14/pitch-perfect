# Create this file: draft_order_script.py

import os
import django
from django.db.models import Avg, Q

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

# Now import the models after Django setup
from api.models import Season, PlayerSeasonTeam, PlayerMatchEvent

def get_sorted_player_ids(season_id):
    try:
        # Get the season
        season = Season.objects.get(id=season_id)
        print(f"Found season: {season.name}")
        
        # Get all players with team history for this season
        player_histories = PlayerSeasonTeam.objects.filter(season=season)
        print(f"Found {player_histories.count()} player team histories")
        
        # Get player info
        players = []
        player_map = {}  # To keep player name for reference
        
        for history in player_histories:
            player = history.player
            players.append(player)
            player_map[player.id] = player.name
            
        player_ids = [player.id for player in players]
        print(f"Processing {len(player_ids)} players")
        
        # Find relevant seasons (2021-2024)
        relevant_seasons = Season.objects.filter(
            Q(name__icontains='2021') | 
            Q(name__icontains='2022') | 
            Q(name__icontains='2023') | 
            Q(name__icontains='2024')
        )
        print(f"Found {relevant_seasons.count()} relevant seasons for stats")
        
        # Calculate player averages using the stored total_points_all
        player_averages = {}
        player_games = {}
        
        for idx, player_id in enumerate(player_ids):
            if idx % 20 == 0:
                print(f"Processing player {idx}/{len(player_ids)}")
            
            # Get all events for this player 
            events = PlayerMatchEvent.objects.filter(
                player_id=player_id,
                match__season__in=relevant_seasons
            )
            
            if events.exists():
                # Calculate average using the stored total_points_all field
                total_points = sum(event.total_points_all for event in events if event.total_points_all is not None)
                event_count = events.count()
                avg_points = total_points / event_count if event_count > 0 else 0
                
                player_averages[player_id] = avg_points
                player_games[player_id] = event_count
            else:
                player_averages[player_id] = 0
                player_games[player_id] = 0
        
        # Sort players by average
        sorted_player_ids = sorted(
            player_ids,
            key=lambda pid: player_averages.get(pid, 0),
            reverse=True  # Highest first
        )
        
        # Display the sorted IDs for copy-paste
        print("\nSorted player IDs (for copy-paste):")
        print(f"[{', '.join(str(pid) for pid in sorted_player_ids)}]")
        
        # Show top players
        print("\nTop 20 players by average points:")
        for i, pid in enumerate(sorted_player_ids[:20], 1):
            games = player_games[pid]
            print(f"{i}. {player_map[pid]}: {player_averages[pid]:.2f} avg pts ({games} games)")
        
        return sorted_player_ids
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []

if __name__ == "__main__":
    # Get season ID from command line
    import sys
    if len(sys.argv) > 1:
        season_id = int(sys.argv[1])
    else:
        season_id = int(input("Enter season ID: "))
    
    get_sorted_player_ids(season_id)