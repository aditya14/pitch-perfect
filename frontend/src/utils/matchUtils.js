// Function to get the color class based on points value
export const getPointsColorClass = (points) => {
    if (points >= 60) return 'text-green-600 dark:text-green-400';
    if (points >= 35) return 'text-blue-600 dark:text-blue-400';
    if (points < 10) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };
  
  // Function to transform event data
  export const getEventData = (event) => {
    if (event.base_stats) {
      // This is a fantasy event with base_stats
      const basePoints = event.base_stats.total_points_all || 0;
      const boostPoints = event.boost_points || 0;
      
      return {
        ...event.base_stats,
        base_points: basePoints,
        boost_points: boostPoints,
        fantasy_points: basePoints + boostPoints,  // Total fantasy points = base + boost
        squad_name: event.squad_name,
        squad_id: event.squad_id,
        team_name: event.team_name,
        team_color: event.team_color,
        player_name: event.player_name,
        squad_color: event.squad_color,
        boost_label: event.boost_label,
        player_id: event.player_id,
        match_id: event.match_id,
        id: event.id,
        player_of_match: event.player_of_match
      };
    }
    
    // This is a regular IPL player event
    return {
      ...event,
      base_points: event.total_points_all || 0,
      boost_points: 0,
      fantasy_points: event.total_points_all || 0,
      player_id: event.player_id,
      match_id: event.match_id,
      player_of_match: event.player_of_match
    };
  };