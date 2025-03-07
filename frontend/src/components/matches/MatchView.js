import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpDown, Trophy } from 'lucide-react';
import api from '../../utils/axios';
import TeamBadge from '../elements/TeamBadge';

const MatchOverview = ({ matchData }) => {
  console.log('Match Data:', matchData);
  if (!matchData) return null;

  const getReadableDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getWinDescription = () => {
    if (!matchData.winner) return null;
    const margin = matchData.win_margin;
    const type = matchData.win_type;
    return type === 'WICKETS' ? 
      `${matchData.winner.name} won by ${margin} wicket${margin > 1 ? 's' : ''}` :
      `${matchData.winner.name} won by ${margin} run${margin > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-2">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Match Overview
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Match #{matchData.match_number} • {matchData.stage}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Teams and Score */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex-1 text-center md:text-right">
            <TeamBadge team={matchData.team_1} className="mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {matchData.inns_1_runs}/{matchData.inns_1_wickets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({matchData.inns_1_overs} overs)
            </div>
          </div>
          
          <div className="text-gray-400 dark:text-gray-500 text-lg font-medium px-4">
            vs
          </div>

          <div className="flex-1 text-center md:text-left">
            <TeamBadge team={matchData.team_2} className="mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {matchData.inns_2_runs}/{matchData.inns_2_wickets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({matchData.inns_2_overs} overs)
            </div>
          </div>
        </div>

        {/* Match Details Table */}
        <div className="w-full max-w-3xl">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Date</td>
                <td className="py-3 text-gray-900 dark:text-white">{getReadableDate(matchData.date)}</td>
              </tr>
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Venue</td>
                <td className="py-3 text-gray-900 dark:text-white">{matchData.venue}</td>
              </tr>
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Toss</td>
                <td className="py-3 text-gray-900 dark:text-white">
                  <TeamBadge team={matchData.toss_winner} useShortName={true} className="mr-1" /> chose to {matchData.toss_decision.toLowerCase()}
                </td>
              </tr>
              {matchData.status === 'COMPLETED' && (
                <>
                  <tr className="group">
                    <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Result</td>
                    <td className="py-3 text-gray-900 dark:text-white flex items-center gap-2">
                      <TeamBadge team={matchData.winner} useShortName={true} /> 
                      <span>won by {matchData.win_margin} {matchData.win_type.toLowerCase()}</span>
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </td>
                  </tr>
                  {matchData.player_of_match && (
                    <tr className="group">
                      <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Player of Match</td>
                      <td className="py-3 text-gray-900 dark:text-white">{matchData.player_of_match.name}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MatchView = () => {
  const { matchId, leagueId } = useParams();
  const [playerEvents, setPlayerEvents] = useState([]);
  const [matchOverview, setMatchOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_points_all', direction: 'desc' });

  useEffect(() => {
    fetchMatchData();
    fetchMatchOverview();
  }, [matchId, leagueId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const endpoint = leagueId
        ? `/leagues/${leagueId}/matches/${matchId}/events/`
        : `/matches/${matchId}/events/`;
      const response = await api.get(endpoint);
      setPlayerEvents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch match data');
      console.error('Error fetching match data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchOverview = async () => {
    try {
      const response = await api.get(`/matches/${matchId}/`);
      setMatchOverview(response.data);
    } catch (err) {
      console.error('Error fetching match overview:', err);
    }
  };

  const handleSort = (key) => {
    setSortConfig((currentConfig) => {
      const newDirection = 
        currentConfig.key === key && currentConfig.direction === 'asc'
          ? 'desc'
          : 'asc';

      const sortedEvents = [...playerEvents].sort((a, b) => {
        let aValue = getNestedValue(a, key);
        let bValue = getNestedValue(b, key);

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Compare values
        return newDirection === 'asc'
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      });

      setPlayerEvents(sortedEvents);
      return { key, direction: newDirection };
    });
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const SortableHeader = ({ label, sortKey }) => (
    <div
      onClick={() => handleSort(sortKey)}
      className="cursor-pointer group flex items-center gap-1"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  const getEventData = (event) => {
    if (event.base_stats) {
      return {
        ...event.base_stats,
        fantasy_points: event.total_points,
        squad_name: event.squad_name,
        team_name: event.team_name,
        team_color: event.team_color,
        player_name: event.player_name
      };
    }
    return event;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded">
        {error}
      </div>
    );
  }

  const hasFantasyData = playerEvents.some(event => event.fantasy_points || event.squad_name);

  return (
    <div className="space-y-1 px-2 py-2">
      <MatchOverview matchData={matchOverview} />
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Match Performance
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[calc(100vh-12rem)]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20" />
                <th scope="col" className="sticky left-[68px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" />
                <th scope="col" colSpan="6" className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Batting
                </th>
                <th scope="col" colSpan="6" className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bowling
                </th>
                <th scope="col" colSpan="4" className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fielding
                </th>
                {hasFantasyData && leagueId && (
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fantasy
                  </th>
                )}
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Team" sortKey="team_name" />
                </th>
                <th scope="col" className="sticky left-[68px] z-10 bg-gray-50 dark:bg-gray-700 px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Player" sortKey="player_name" />
                </th>
                {/* Batting subheaders */}
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="R" sortKey="bat_runs" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="B" sortKey="bat_balls" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="4s" sortKey="bat_fours" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="6s" sortKey="bat_sixes" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="SR" sortKey="bat_strike_rate" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Pts" sortKey="batting_points_total" />
                </th>
                {/* Bowling subheaders */}
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="O" sortKey="bowl_balls" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="M" sortKey="bowl_maidens" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="R" sortKey="bowl_runs" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="W" sortKey="bowl_wickets" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Econ" sortKey="bowl_economy" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Pts" sortKey="bowling_points_total" />
                </th>
                {/* Fielding subheaders */}
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Ct" sortKey="field_catch" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="RO" sortKey="run_out_solo" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="St" sortKey="wk_stumping" />
                </th>
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Pts" sortKey="fielding_points_total" />
                </th>
                {hasFantasyData && leagueId && (
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                    <SortableHeader label="Pts" sortKey="fantasy_points" />
                  </th>
                )}
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">
                  <SortableHeader label="Pts" sortKey="total_points_all" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {playerEvents.map((event) => {
                const data = getEventData(event);
                console.log('Event Data:', data);
                return (
                  <tr key={data.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-2 whitespace-nowrap group-hover:bg-gray-50 dark:group-hover:bg-gray-700 w-20">
                      <div className="flex items-center">
                        <div 
                          className="h-4 w-1 mr-1 rounded-sm"
                          style={{ backgroundColor: "#"+data.team_color }}
                        />
                        <span className="text-xs text-gray-900 dark:text-white">
                          {data.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="sticky left-[68px] z-10 bg-white dark:bg-gray-800 px-1 py-2 whitespace-nowrap group-hover:bg-gray-50 dark:group-hover:bg-gray-700">
                      <div className="text-xs text-gray-900 dark:text-white">
                        {data.player_name} {data.player_of_match && '🏅'}
                      </div>
                      {data.squad_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {data.squad_name}
                        </div>
                      )}
                    </td>
                    {/* Batting stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white
                      ${data.bat_runs ? 'font-medium' : 'opacity-30'}
                    `}>
                      {data.bat_runs ? data.bat_runs : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-30'}
                    `}>
                      {data.bat_balls ? data.bat_balls : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bat_fours && 'opacity-30'}
                    `}>
                      {data.bat_fours ? data.bat_fours : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bat_sixes && 'opacity-30'}
                    `}>
                      {data.bat_sixes ? data.bat_sixes : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bat_strike_rate && 'opacity-30'}
                    `}>
                      {data.bat_strike_rate ? data.bat_strike_rate?.toFixed(2) : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {data.batting_points_total}
                    </td>
                    {/* Bowling stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bowl_balls && 'opacity-30'}
                    `}>
                      {data.bowl_balls ? 
                        `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}` 
                        : '-'
                      }
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${(!data.bowl_maidens && !data.bowl_balls) && 'opacity-30'}
                    `}>
                      {data.bowl_maidens ? data.bowl_maidens : data.bowl_balls ? 0 : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-extralight
                      ${!data.bowl_runs && 'opacity-30'}
                    `}>
                      {data.bowl_runs ? data.bowl_runs : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white
                      ${data.bowl_wickets ? 'font-medium' : data.bowl_balls ? '' : 'opacity-30'}
                    `}>
                      {data.bowl_wickets ? data.bowl_wickets : data.bowl_balls ? 0 : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {data.bowl_economy ? data.bowl_economy?.toFixed(2) : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {data.bowling_points_total}
                    </td>
                    {/* Fielding stats */}
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {(data.field_catch || 0) + (data.wk_catch || 0)}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {(data.run_out_solo || 0) + (data.run_out_collab || 0)}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {data.wk_stumping}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                      {data.fielding_points_total}
                    </td>
                    {/* Fantasy and total points */}
                    {hasFantasyData && leagueId && (
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {data.fantasy_points}
                      </td>
                    )}
                    <td className="px-1 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white font-bold">
                      <span className={`
                      ${data.total_points_all >= 60 ? 'text-green-600 dark:text-green-400' :
                        data.total_points_all >= 35 ? 'text-blue-600 dark:text-blue-400' :
                        data.total_points_all < 10 ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'}
                    `}>
                      {data.total_points_all} {data.total_points_all >= 120 && '🔥'}
                    </span>
                    </td>
                  </tr>
                );
              })}
              {playerEvents.length === 0 && (
                <tr>
                  <td 
                    colSpan={hasFantasyData && leagueId ? "16" : "15"} 
                    className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No player data available for this match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchView;