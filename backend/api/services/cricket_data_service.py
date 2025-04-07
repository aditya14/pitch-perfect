import requests
import logging
from typing import Dict, List, Optional, Union, Tuple
from decimal import Decimal
from django.conf import settings
from django.db import transaction, models
from django.utils import timezone

from api.models import (
    IPLMatch, IPLPlayer, IPLTeam, IPLPlayerEvent, FantasySquad, FantasyPlayerEvent, FantasyBoostRole, FantasyMatchEvent, FantasyLeague
)

logger = logging.getLogger(__name__)

class CricketDataService:
    """
    Service to fetch cricket match data from CricketData API and update database.
    """
    
    def __init__(self, api_key=None):
        self.api_key = api_key or settings.CRICDATA_API_KEY
        self.base_url = "https://api.cricapi.com/v1"
        
    def fetch_match_scorecard(self, match_id: str) -> Dict:
        """
        Fetch scorecard data for a specific match from the CricketData API.
        
        Args:
            match_id: The CricketData API match ID
            
        Returns:
            Dict containing the match scorecard data
        """
        url = f"{self.base_url}/match_scorecard"
        params = {"apikey": self.api_key, "id": match_id}
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()  # Raise exception for non-200 status codes
            
            data = response.json()
            print("Full Response: ", data)
            if data.get("status") != "success":
                error_msg = data.get("message", "Unknown API error")
                logger.error(f"API Error for match {match_id}: {error_msg}")
                return None
                
            return data
        except requests.RequestException as e:
            logger.error(f"Failed to fetch match {match_id}: {str(e)}")
            return None
    
    @transaction.atomic
    def update_match_points(self, match_id: str) -> Dict:
        """
        Main method to update all fantasy points for a match.
        Runs in a database transaction for consistency.
        
        Args:
            match_id: The CricketData API match ID
            
        Returns:
            Dict with summary of updates
        """
        print("Starting update_match_points for match ", match_id)
        logger.info(f"Starting update_match_points for match {match_id}")

        # Reset sequence to prevent ID conflicts
        self._reset_player_event_sequence()
        
        # Get the IPL match by cricdata_id
        try:
            print(f"Finding match with cricdata_id: {match_id}")
            match = IPLMatch.objects.get(cricdata_id=match_id)
            print(f"Found match: {match.id} - {match.team_1.short_name} vs {match.team_2.short_name}")
        except IPLMatch.DoesNotExist:
            logger.error(f"No match found with cricdata_id: {match_id}")
            return {"error": f"Match not found: {match_id}"}
        except Exception as e:
            logger.error(f"Error finding match {match_id}: {str(e)}")
            return {"error": f"Error finding match: {str(e)}"}
        
        # Fetch data from API
        match_data = self.fetch_match_scorecard(match_id)
        if not match_data:
            logger.error(f"Failed to fetch match data for {match_id}")
            return {"error": "Failed to fetch match data"}
        
        try:
            # Update match details
            print(f"Updating match details for {match_id}")
            self._update_match_details(match, match_data)
            
            # Process player performances
            print(f"Processing player performances for {match_id}")
            updated_events = self._process_player_performances(match, match_data)
            logger.info(f"Updated {len(updated_events)} player events")
            
            # Update fantasy player events for all fantasy squads
            logger.info(f"Updating fantasy events for {match_id}")
            fantasy_events = self._update_fantasy_events(match, updated_events)
            logger.info(f"Updated {len(fantasy_events)} fantasy events")
            
            # Update fantasy match events (new)
            logger.info(f"Updating fantasy match events for {match_id}")
            match_events = self._update_fantasy_match_events(match, fantasy_events)
            logger.info(f"Updated {len(match_events)} fantasy match events")
            
            # Update total points for each fantasy squad
            logger.info(f"Updating fantasy squad totals for {match_id}")
            updated_squads = self._update_fantasy_squad_totals(match.season)
            logger.info(f"Updated {len(updated_squads)} fantasy squads")
            
            return {
                "match": match.id,
                "player_events_updated": len(updated_events),
                "fantasy_events_updated": len(fantasy_events),
                "fantasy_match_events_updated": len(match_events),
                "fantasy_squads_updated": len(updated_squads)
            }
        except Exception as e:
            logger.error(f"Error updating match {match_id}: {str(e)}")
            # Include traceback for detailed error information
            import traceback
            logger.error(traceback.format_exc())
            return {"error": f"Error updating match: {str(e)}"}
    
    def update_all_live_matches(self) -> List[Dict]:
        """
        Update all matches currently marked as LIVE in the database.
        
        Returns:
            List of update results for each match
        """
        live_matches = IPLMatch.objects.filter(status='LIVE')
        results = []
        
        for match in live_matches:
            if match.cricdata_id:
                print("Updating match points for ", match.team_1.short_name, " vs ", match.team_2.short_name)
                result = self.update_match_points(match.cricdata_id)
                results.append(result)
        
        return results
    
    def _update_match_details(self, match: IPLMatch, match_data: Dict) -> None:
        """
        Update basic match details from API data.
        
        Args:
            match: The IPLMatch object to update
            match_data: The API response data
        """
        data = match_data.get("data", {})
        
        # Update toss information if needed
        if data.get("tossWinner") and not match.toss_winner:
            toss_winner_name = data.get("tossWinner")
            toss_winner = self._find_team_by_name(toss_winner_name)
            if toss_winner:
                match.toss_winner = toss_winner
                
        if data.get("tossChoice") and not match.toss_decision:
            toss_choice = data.get("tossChoice", "").upper()
            if toss_choice in [IPLMatch.TossDecision.BAT, IPLMatch.TossDecision.BOWL]:
                match.toss_decision = toss_choice
                
        # Update innings details
        scores = data.get("score", [])
        if len(scores) > 0:
            # First innings
            inns_1 = scores[0]
            match.inns_1_runs = inns_1.get("r")
            match.inns_1_wickets = inns_1.get("w")
            match.inns_1_overs = float(inns_1.get("o", 0))
            
            # Second innings (if available)
            if len(scores) > 1:
                inns_2 = scores[1]
                match.inns_2_runs = inns_2.get("r")
                match.inns_2_wickets = inns_2.get("w")
                match.inns_2_overs = float(inns_2.get("o", 0))
        
        # Update match winner if match is complete
        if data.get("matchWinner") and data.get("status") and "won" in data.get("status", "").lower():
            winner_name = data.get("matchWinner")
            winner = self._find_team_by_name(winner_name)
            if winner:
                match.winner = winner
                match.status = IPLMatch.Status.COMPLETED
        
        match.save()

        print("Match updated successfully as ", match.inns_1_runs, "/", match.inns_1_wickets, " in ", match.inns_1_overs, " overs, and ", match.inns_2_runs, "/", match.inns_2_wickets, " in ", match.inns_2_overs, " overs.")
    
    def sync_player_data(self, player_data: Dict, update_if_exists=False) -> Optional[IPLPlayer]:
        """
        Sync player data from API to local database.
        Only updates existing players, never creates new ones.
        
        Args:
            player_data: Player data from API
            update_if_exists: Whether to update existing players
            
        Returns:
            IPLPlayer object or None if player not found
        """
        cricdata_id = player_data.get('id')
        name = player_data.get('name')
        
        if not cricdata_id or not name:
            print("Skipping player sync, missing ID or name", cricdata_id, name)
            return None
        
        # Try to find existing player
        player = self._find_player_by_cricdata_id(cricdata_id, name)
        
        if player:
            if update_if_exists:
                # Update player data
                if not player.cricdata_id:
                    player.cricdata_id = cricdata_id
                    player.save()
            return player
        
        # Player not found - return None instead of creating a new one
        logger.warning(f"Player not found and not creating: {name} ({cricdata_id})")
        return None

    def _process_player_performances(self, match: IPLMatch, match_data: Dict) -> List[IPLPlayerEvent]:
        """
        Process player performances from scorecard data and update/create IPLPlayerEvent objects.
        
        Args:
            match: The IPLMatch object
            match_data: The API response data
            
        Returns:
            List of updated IPLPlayerEvent objects
        """
        data = match_data.get("data", {})
        scorecard = data.get("scorecard", [])
        
        updated_events = []
        player_events = {}  # Track player events by cricdata_id
        
        # Process batting, bowling, and fielding performances
        for inning in scorecard:
            inning_name = inning.get("inning", "")
            batting_team = self._extract_team_name(inning_name)
            bowling_team = match.team_1 if batting_team == match.team_2 else match.team_2
            
            # Process batting performances
            for batting in inning.get("batting", []):
                batsman = batting.get("batsman", {})
                cricdata_id = batsman.get("id")
                player_name = batsman.get("name")
                
                # Use the new sync method
                player = self.sync_player_data({
                    'id': cricdata_id,
                    'name': player_name
                })
                
                if not player:
                    logger.warning(f"Skipping batting entry for {player_name}, player not found and could not be created")
                    continue
                
                # Create or update player event
                event = self._get_or_create_player_event(match, player, batting_team, bowling_team)
                
                # Update batting stats
                event.bat_runs = batting.get("r", 0)
                event.bat_balls = batting.get("b", 0)
                event.bat_fours = batting.get("4s", 0)
                event.bat_sixes = batting.get("6s", 0)
                event.bat_not_out = batting.get("dismissal-text") in ["not out", "batting"]
                event.bat_innings = 1
                
                event.save()
                player_events[cricdata_id] = event
                updated_events.append(event)
                print("Batting stats updated for ", player.name, " as ", event.bat_runs, " runs in ", event.bat_balls, " balls.")
            
            # Process bowling performances
            for bowling in inning.get("bowling", []):
                bowler = bowling.get("bowler", {})
                cricdata_id = bowler.get("id")
                player_name = bowler.get("name")
                
                player = self._find_player_by_cricdata_id(cricdata_id, player_name)
                if not player:
                    continue
                
                # Create or update player event
                event = self._get_or_create_player_event(match, player, bowling_team, batting_team)
                
                # Update bowling stats
                # Convert overs to balls (e.g., 4.3 overs = (4*6 + 3) = 27 balls)
                overs_str = str(bowling.get("o", "0"))
                if "." in overs_str:
                    full_overs, partial = overs_str.split(".")
                    balls = (int(full_overs) * 6) + int(partial)
                else:
                    balls = int(float(overs_str)) * 6
                
                event.bowl_balls = balls
                event.bowl_maidens = bowling.get("m", 0)
                event.bowl_runs = bowling.get("r", 0)
                event.bowl_wickets = bowling.get("w", 0)
                event.bowl_innings = 1
                
                event.save()
                player_events[cricdata_id] = event
                updated_events.append(event)
                print("Bowling stats updated for ", player.name, " as ", event.bowl_wickets, " wickets for ", event.bowl_runs, " runs in ", event.bowl_balls, " balls.")
            
            # Process fielding performances
            for catching in inning.get("catching", []):
                catcher = catching.get("catcher", {})
                if not catcher:
                    continue
                    
                cricdata_id = catcher.get("id")
                player_name = catcher.get("name")
                
                player = self._find_player_by_cricdata_id(cricdata_id, player_name)
                if not player:
                    continue
                
                # Create or update player event
                event = self._get_or_create_player_event(match, player, bowling_team, batting_team)
                
                # Update fielding stats
                event.field_catch = catching.get("catch", 0)
                event.wk_catch = catching.get("cb", 0)  # caught behind
                event.wk_stumping = catching.get("stumped", 0)
                event.run_out_solo = catching.get("runout", 0)
                
                event.save()
                player_events[cricdata_id] = event
                updated_events.append(event)
                print("Fielding stats updated for ", player.name, " as ", event.field_catch, " catches, ", event.wk_catch, " wicket-keeping catches, ", event.wk_stumping, " stumpings, and ", event.run_out_solo, " solo run-outs.")
        
        # Check if Player of the Match is defined
        if data.get("playerOfMatch"):
            potm_name = data.get("playerOfMatch")
            potm = self._find_player_by_name(potm_name)
            if potm and potm.cricdata_id in player_events:
                event = player_events[potm.cricdata_id]
                event.player_of_match = True
                event.save()
                match.player_of_match = potm
                match.save()
        
        # Remove duplicates
        return list({e.id: e for e in updated_events}.values())
    
    def _update_fantasy_events(self, match: IPLMatch, player_events: List[IPLPlayerEvent]) -> List[FantasyPlayerEvent]:
        """
        Update FantasyPlayerEvents for all squads that have the players who participated in the match.
        
        Args:
            match: The IPLMatch object
            player_events: List of updated IPLPlayerEvent objects
            
        Returns:
            List of updated FantasyPlayerEvent objects
        """
        updated_events = []
        
        # Get all fantasy squads for this season
        squads = FantasySquad.objects.filter(league__season=match.season)
        
        for event in player_events:
            player = event.player
            
            # Find all squads that have this player in their current_squad
            for squad in squads:
                current_squad = squad.current_squad or []
                
                # Check if player is in this squad
                if player.id not in current_squad:
                    continue
                
                # Determine if the player has a boost role in the core squad
                boost_id = None
                core_squad = squad.current_core_squad or []
                
                for core_player in core_squad:
                    if core_player.get("player_id") == player.id:
                        boost_id = core_player.get("boost_id")
                        break
                
                # If no boost found, leave boost as None
                if not boost_id:
                    boost = None
                    boost_points = 0
                else:
                    boost = FantasyBoostRole.objects.get(id=boost_id)
                    # Calculate boost points based on role
                    boost_points = self._calculate_boost_points(event, boost)
                
                # Create or update fantasy player event
                fantasy_event, created = FantasyPlayerEvent.objects.get_or_create(
                    match_event=event,
                    fantasy_squad=squad,
                    defaults={"boost": boost, "boost_points": boost_points}
                )
                
                # Update the fantasy event
                if not created:
                    fantasy_event.boost = boost
                    fantasy_event.boost_points = boost_points
                    fantasy_event.save()
                
                updated_events.append(fantasy_event)
        
        return updated_events
    
    def _update_fantasy_squad_totals(self, season) -> List[FantasySquad]:
        """
        Update total points for all fantasy squads in the season.
        Ensures that total_points is exactly the sum of base_points and boost_points 
        from all FantasyMatchEvent objects.
        
        Args:
            season: The Season object
            
        Returns:
            List of updated FantasySquad objects
        """
        updated_squads = []
        
        # Get all fantasy squads for this season
        squads = FantasySquad.objects.filter(league__season=season)
        
        for squad in squads:
            # Calculate points based on FantasyMatchEvent totals (which have already been calculated)
            # This ensures total_points is correctly the sum of base + boost points
            match_events_totals = FantasyMatchEvent.objects.filter(
                fantasy_squad=squad,
                match__season=season
            ).aggregate(
                total_base=models.Sum('total_base_points'),
                total_boost=models.Sum('total_boost_points')
            )
            
            base_points = match_events_totals.get('total_base') or 0
            boost_points = match_events_totals.get('total_boost') or 0
            
            # Ensure total is exactly the sum of base and boost
            squad_total = base_points + boost_points
            
            # Update the squad total only if it's different
            if abs(float(squad.total_points) - squad_total) > 0.01:  # Small epsilon for float comparison
                logger.info(f"Updating {squad.name} points from {squad.total_points} to {squad_total}")
                squad.total_points = squad_total
                squad.save()
                
            updated_squads.append(squad)
        
        return updated_squads
    
    def _calculate_boost_points(self, event: IPLPlayerEvent, boost: FantasyBoostRole) -> float:
        """
        Calculate boost points based on player's performance and assigned role.
        
        Args:
            event: The IPLPlayerEvent with player's performance
            boost: The FantasyBoostRole object with multipliers
            
        Returns:
            Calculated boost points
        """
        # If no boost role is assigned, return 0 boost points
        if boost is None:
            return 0
        # Check if this is a uniform multiplier (Captain or Vice Captain)
        is_uniform_multiplier = (
            boost.multiplier_runs == boost.multiplier_fours == 
            boost.multiplier_sixes == boost.multiplier_sr == 
            boost.multiplier_bat_milestones == boost.multiplier_wickets == 
            boost.multiplier_maidens == boost.multiplier_economy == 
            boost.multiplier_bowl_milestones == boost.multiplier_catches == 
            boost.multiplier_stumpings == boost.multiplier_run_outs == 
            boost.multiplier_potm == boost.multiplier_playing
        )
        
        # For uniform multipliers (like Captain 2x or Vice-Captain 1.5x), use a simpler calculation
        if is_uniform_multiplier:
            # The boost is (multiplier - 1) * base_points
            return (boost.multiplier_runs - 1.0) * event.total_points_all
            
        # Otherwise, do the detailed calculation for specialized roles
        base_points = event.total_points_all
        total_boost_points = 0
        
        # Apply role-specific multipliers to different stat categories
        
        # Batting points
        batting_base = 0
        batting_runs = event.bat_runs or 0  # Just runs, not including boundaries
        batting_fours = (event.bat_fours or 0)  # Boundaries (4s)
        batting_sixes = (event.bat_sixes or 0)  # Boundaries (6s)
        
        batting_base = batting_runs + batting_fours + (2 * batting_sixes)
        
        # Batting milestones
        batting_milestones = 0
        if (event.bat_runs or 0) >= 100:
            batting_milestones += 16  # Century
        elif (event.bat_runs or 0) >= 50:
            batting_milestones += 8  # Half-century
            
        # Strike rate bonus/penalty
        sr_points = 0
        if (event.bat_balls or 0) >= 10:
            sr = event.bat_strike_rate
            if sr >= 200:
                sr_points += 6
            elif sr >= 175:
                sr_points += 4
            elif sr >= 150:
                sr_points += 2
            elif sr < 100:
                sr_points -= 2
            elif sr < 75:
                sr_points -= 4
            elif sr < 50:
                sr_points -= 6
        
        # Calculate batting boost     
        # Separately calculate boost for each component
        runs_boost = batting_runs * (boost.multiplier_runs - 1.0)
        fours_boost = batting_fours * (boost.multiplier_fours - 1.0)
        sixes_boost = (2 * batting_sixes) * (boost.multiplier_sixes - 1.0)
        milestone_boost = batting_milestones * (boost.multiplier_bat_milestones - 1.0)
        sr_boost = sr_points * (boost.multiplier_sr - 1.0)
        
        total_boost_points += (runs_boost + fours_boost + sixes_boost + milestone_boost + sr_boost)
        
        # Bowling points
        bowling_wickets = (event.bowl_wickets or 0) * 25  # Wickets
        bowling_maidens = (event.bowl_maidens or 0) * 8   # Maidens
        
        # Bowling milestones
        bowling_milestones = 0
        if (event.bowl_wickets or 0) >= 5:
            bowling_milestones += 16  # 5-wicket haul
        elif (event.bowl_wickets or 0) >= 3:
            bowling_milestones += 8  # 3-wicket haul
            
        # Economy bonus/penalty
        economy_points = 0
        if (event.bowl_balls or 0) >= 10:
            economy = event.bowl_economy
            if economy <= 5:
                economy_points += 6
            elif economy <= 6:
                economy_points += 4
            elif economy <= 7:
                economy_points += 2
            elif economy >= 12:
                economy_points -= 6
            elif economy >= 11:
                economy_points -= 4
            elif economy >= 10:
                economy_points -= 2
        
        # Calculate bowling boost        
        wickets_boost = bowling_wickets * (boost.multiplier_wickets - 1.0)
        maidens_boost = bowling_maidens * (boost.multiplier_maidens - 1.0)
        bowl_milestone_boost = bowling_milestones * (boost.multiplier_bowl_milestones - 1.0)
        economy_boost = economy_points * (boost.multiplier_economy - 1.0)
        
        total_boost_points += (wickets_boost + maidens_boost + bowl_milestone_boost + economy_boost)
        
        # Fielding points
        stumpings = (event.wk_stumping or 0) * 12  # Stumpings
        catches = ((event.field_catch or 0) + (event.wk_catch or 0)) * 8  # All catches
        run_outs = ((event.run_out_solo or 0) * 8) + ((event.run_out_collab or 0) * 4)  # Run outs
        
        fielding_base = stumpings + catches + run_outs
        
        # Calculate fielding boost
        stumping_boost = stumpings * (boost.multiplier_stumpings - 1.0)
        catch_boost = catches * (boost.multiplier_catches - 1.0)
        run_out_boost = run_outs * (boost.multiplier_run_outs - 1.0)
        
        total_boost_points += (stumping_boost + catch_boost + run_out_boost)
        
        # Other points
        potm_points = 50 if event.player_of_match else 0  # POTM
        playing_points = 4  # Everyone gets 4 points for playing
        
        # Calculate other boost
        potm_boost = potm_points * (boost.multiplier_potm - 1.0)
        playing_boost = playing_points * (boost.multiplier_playing - 1.0)
        
        total_boost_points += (potm_boost + playing_boost)
        
        return total_boost_points
    
    def _get_or_create_player_event(self, match: IPLMatch, player: IPLPlayer, 
                                for_team: IPLTeam, vs_team: IPLTeam) -> IPLPlayerEvent:
        """
        Get or create an IPLPlayerEvent for a player in a match.
        
        Args:
            match: The IPLMatch object
            player: The IPLPlayer object
            for_team: The team the player is playing for
            vs_team: The opponent team
            
        Returns:
            IPLPlayerEvent object
        """
        try:
            # First try to get an existing event
            event = IPLPlayerEvent.objects.get(
                player=player,
                match=match
            )
            
            # If found, update the teams if needed
            if event.for_team != for_team or event.vs_team != vs_team:
                event.for_team = for_team
                event.vs_team = vs_team
                event.save()
            
            return event
            
        except IPLPlayerEvent.DoesNotExist:
            # Create a new event with "force_insert=False" to avoid ID conflicts
            event = IPLPlayerEvent(
                player=player,
                match=match,
                for_team=for_team,
                vs_team=vs_team,
                # Initialize with zeros
                bat_runs=0,
                bat_balls=0,
                bat_fours=0,
                bat_sixes=0,
                bat_not_out=True,
                bat_innings=0,
                bowl_balls=0,
                bowl_maidens=0,
                bowl_runs=0,
                bowl_wickets=0,
                bowl_innings=0,
                field_catch=0,
                wk_catch=0,
                wk_stumping=0,
                run_out_solo=0,
                run_out_collab=0,
                player_of_match=False
            )
            
            # Use save with force_insert=False to let DB handle ID assignment
            event.save(force_insert=False)
            return event
        
    def _reset_player_event_sequence(self):
        """
        Reset the auto-increment sequence for IPLPlayerEvent to avoid ID conflicts.
        Only needed in production when the sequence is out of sync.
        """
        print("Attempting to reset IPLPlayerEvent sequence")
        try:
            from django.db import connection
            
            with connection.cursor() as cursor:
                try:
                    # PostgreSQL-specific command
                    cursor.execute("""
                        SELECT setval(pg_get_serial_sequence('api_iplplayerevent', 'id'), 
                                (SELECT MAX(id) FROM api_iplplayerevent));
                    """)
                    print("IPLPlayerEvent sequence reset successfully")
                except Exception as e:
                    print(f"PostgreSQL sequence reset failed: {str(e)}")
                    print("Trying generic approach...")
                    
                    # For other databases, we can at least check the max ID
                    cursor.execute("SELECT MAX(id) FROM api_iplplayerevent")
                    max_id = cursor.fetchone()[0]
                    print(f"Current max ID in IPLPlayerEvent table: {max_id}")
        except Exception as e:
            print(f"Error in _reset_player_event_sequence: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    def _find_player_by_cricdata_id(self, cricdata_id: str, name: str) -> Optional[IPLPlayer]:
        """
        Find an IPL player by cricdata_id, with a fallback to name-based matching.
        
        Args:
            cricdata_id: The player's ID in CricketData API
            name: The player's name in CricketData API
            
        Returns:
            IPLPlayer object or None if not found
        """
        logger.debug(f"Looking for player with cricdata_id={cricdata_id}, name={name}")
        
        # Try by cricdata_id first
        if cricdata_id:
            player = IPLPlayer.objects.filter(cricdata_id=cricdata_id).first()
            if player:
                logger.debug(f"Found player by cricdata_id: {player.name}")
                return player
        
        # Fallback to name matching
        if name:
            # Try exact match
            player = IPLPlayer.objects.filter(name__iexact=name).first()
            if player:
                logger.debug(f"Found player by exact name: {player.name}")
                # Update cricdata_id if it's missing
                if cricdata_id and not player.cricdata_id:
                    logger.info(f"Updating cricdata_id for player {player.name}")
                    player.cricdata_id = cricdata_id
                    player.save()
                return player
            
            # Try checking if name is in our other_names field
            players = IPLPlayer.objects.all()
            for p in players:
                if hasattr(p, 'other_names') and p.other_names:
                    for alt_name in p.other_names:
                        if name.lower() == alt_name.lower():
                            logger.debug(f"Found player by other name: {p.name}")
                            # Update cricdata_id if it's missing
                            if cricdata_id and not p.cricdata_id:
                                logger.info(f"Updating cricdata_id for player {p.name}")
                                p.cricdata_id = cricdata_id
                                p.save()
                            return p
        
        # No match found
        logger.warning(f"Could not find player match for cricdata_id={cricdata_id}, name={name}")
        return None
    
    def _find_player_by_name(self, name: str) -> Optional[IPLPlayer]:
        """
        Find an IPL player by name.
        
        Args:
            name: The player's name
            
        Returns:
            IPLPlayer object or None if not found
        """
        return IPLPlayer.objects.filter(name__iexact=name).first()
    
    def _find_team_by_name(self, name: str) -> Optional[IPLTeam]:
        """
        Find an IPL team by name with flexible matching.
        
        Args:
            name: The team name to match
            
        Returns:
            IPLTeam object or None if not found
        """
        # Try exact match first
        team = IPLTeam.objects.filter(name__iexact=name).first()
        if team:
            return team
        
        # Try short_name
        team = IPLTeam.objects.filter(short_name__iexact=name).first()
        if team:
            return team
        
        # Try matching against other_names
        teams = IPLTeam.objects.all()
        for t in teams:
            if hasattr(t, 'other_names') and t.other_names:
                for alt_name in t.other_names:
                    if name.lower() == alt_name.lower():
                        return t
        
        # No match found
        logger.warning(f"Could not find team match for name={name}")
        return None
    
    def _extract_team_name(self, inning_name: str) -> Optional[IPLTeam]:
        """
        Extract team from inning name (e.g., "Australia Inning 1").
        
        Args:
            inning_name: The inning name from API
            
        Returns:
            IPLTeam object or None if not found
        """
        if not inning_name:
            return None
            
        # Extract team name from inning string
        parts = inning_name.split(' Inning')
        if parts:
            team_name = parts[0].strip()
            return self._find_team_by_name(team_name)
        
        return None
    

    def _update_fantasy_match_events(self, match, fantasy_player_events):
        """
        Create or update FantasyMatchEvent records for all squads in this match.
        Uses existing FantasyPlayerEvent records with their pre-calculated boost points.
        
        Args:
            match: The IPLMatch object
            fantasy_player_events: List of FantasyPlayerEvent objects for this match
        
        Returns:
            List of updated FantasyMatchEvent objects
        """
        print(f"Updating fantasy match events for {match}")
        
        # Group events by fantasy squad
        squad_events = {}
        for event in fantasy_player_events:
            squad_id = event.fantasy_squad_id
            if squad_id not in squad_events:
                squad_events[squad_id] = []
            squad_events[squad_id].append(event)
        
        match_events = []
        
        # Get all squads that should have a match event (from all leagues for this season)
        all_squads = FantasySquad.objects.filter(league__season=match.season)
        
        # Create FantasyMatchEvent for all squads, even those without active players
        for squad in all_squads:
            # Get or create a FantasyMatchEvent for this squad and match
            try:
                match_event = FantasyMatchEvent.objects.get(
                    match=match,
                    fantasy_squad=squad
                )
            except FantasyMatchEvent.DoesNotExist:
                match_event = FantasyMatchEvent(
                    match=match,
                    fantasy_squad=squad
                )
                match_event.save()
            
            # Calculate totals
            events = squad_events.get(squad.id, [])
            base_points = sum(event.match_event.total_points_all for event in events)
            boost_points = sum(event.boost_points for event in events)
            total_points = base_points + boost_points
            
            # Update the event
            match_event.total_base_points = base_points
            match_event.total_boost_points = boost_points
            match_event.total_points = total_points
            match_event.players_count = len(events)
            match_event.save()
            
            match_events.append(match_event)
        
        # Calculate match ranks within each league
        self._update_match_ranks(match)
        
        # Calculate running ranks
        self._update_running_ranks(match)
        
        return match_events

    def _update_match_ranks(self, match):
        """
        Update match_rank for all FantasyMatchEvents in this match.
        Events are ranked by total_points in descending order within each league.
        
        Args:
            match: The IPLMatch object
        """
        print(f"Updating match ranks for {match}")
        
        # Get all fantasy match events for this match
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        # Get the unique leagues represented in this match
        league_ids = set(
            FantasySquad.objects.filter(
                id__in=match_events.values_list('fantasy_squad_id', flat=True)
            ).values_list('league_id', flat=True)
        )
        
        # Process rankings for each league separately
        for league_id in league_ids:
            # Get events for this match and league, ordered by total points
            league_events = match_events.filter(
                fantasy_squad__league_id=league_id
            ).order_by('-total_points')
            
            # Assign ranks within this league
            for i, event in enumerate(league_events):
                event.match_rank = i + 1
                event.save()

    def _update_running_ranks(self, match):
        """
        Calculate and update running ranks for all squads in this match's league.
        The running rank is the squad's position in the league as of this match.
        
        Args:
            match: The IPLMatch object
        """
        print(f"Updating running ranks for {match}")
        
        # Get all FantasyMatchEvents for this match
        match_events = FantasyMatchEvent.objects.filter(match=match)
        
        if not match_events.exists():
            return
        
        # Get the unique leagues represented in this match
        league_ids = set(
            FantasySquad.objects.filter(
                id__in=match_events.values_list('fantasy_squad_id', flat=True)
            ).values_list('league_id', flat=True)
        )
        
        # Process each league separately
        for league_id in league_ids:
            # Get all squads in this league
            squads = FantasySquad.objects.filter(league_id=league_id)
            
            # Get all matches up to and including the current match for this league's season
            league = FantasyLeague.objects.get(id=league_id)
            season = league.season
            all_season_matches = IPLMatch.objects.filter(
                season=season,
                date__lte=match.date
            ).order_by('date')
            
            # Dictionary to track running totals for each squad
            running_totals = {squad.id: 0 for squad in squads}
            
            # For each match up to the current one, update running totals
            for m in all_season_matches:
                # Get all FantasyMatchEvents for this match
                events = FantasyMatchEvent.objects.filter(
                    match=m,
                    fantasy_squad__league_id=league_id
                )
                
                # Update running totals
                for event in events:
                    squad_id = event.fantasy_squad_id
                    if squad_id in running_totals:
                        running_totals[squad_id] += event.total_points
                
                # If this is the current match, update running_ranks
                if m.id == match.id:
                    # Sort squads by total points
                    sorted_squads = sorted(
                        running_totals.items(),
                        key=lambda x: x[1],
                        reverse=True  # Descending order
                    )
                    
                    # Update running ranks for each squad
                    for rank, (squad_id, total) in enumerate(sorted_squads, 1):
                        # Find the corresponding FantasyMatchEvent
                        event = match_events.filter(fantasy_squad_id=squad_id).first()
                        if event:
                            event.running_rank = rank
                            event.running_total_points = total
                            event.save()