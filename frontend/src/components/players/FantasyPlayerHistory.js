import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

const SeasonOverview = ({ seasonStats }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runs (SR)</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wickets (Econ)</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catches</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points/Match</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {seasonStats.map((season) => (
            <tr key={season.year} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium">{season.year}</td>
              <td className="px-4 py-2 text-sm">{season.matches}</td>
              <td className="px-4 py-2 text-sm">
                {season.runs} ({season.strike_rate?.toFixed(1) || 0})
              </td>
              <td className="px-4 py-2 text-sm">
                {season.wickets} ({season.economy?.toFixed(1) || 0})
              </td>
              <td className="px-4 py-2 text-sm">{season.catches}</td>
              <td className="px-4 py-2 text-sm font-medium">{season.points_per_match?.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const PerformanceGraphs = ({ matchData }) => {
    // Only show last 20 matches for better visualization
    const recentMatches = matchData.slice(0, 20).reverse();
    
    const formattedData = recentMatches.map(m => ({
      date: new Date(m.match.date).toLocaleDateString(),
      points: m.points,
      runs: m.batting?.runs || 0,
      wickets: m.bowling?.wickets || 0
    }));
  
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium mb-4">Performance Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <Line type="monotone" dataKey="runs" stroke="#8884d8" name="Runs" />
                <Line type="monotone" dataKey="wickets" stroke="#82ca9d" name="Wickets" yAxisId="wickets" />
                <XAxis dataKey="date" />
                <YAxis />
                <YAxis yAxisId="wickets" orientation="right" />
                <Tooltip />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
  
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium mb-4">Points History</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <Line type="monotone" dataKey="points" stroke="#8884d8" name="Points" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };
  
  const MatchHistory = ({ matches, onSeasonSelect, seasons }) => (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Match History</h3>
        <select 
          className="rounded-md border-gray-300 py-1"
          onChange={(e) => onSeasonSelect(e.target.value)}
        >
          <option value="all">All Seasons</option>
          {seasons.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
  
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">For</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">vs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batting</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bowling</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fielding</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.map((match, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm">
                  {new Date(match.match.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-sm">{match.for_team}</td>
                <td className="px-4 py-2 text-sm">{match.opponent}</td>
                <td className="px-4 py-2 text-sm">
                  {match.batting ? 
                    `${match.batting.runs}(${match.batting.balls}) SR: ${match.batting.strike_rate?.toFixed(1)}` : 
                    '-'}
                </td>
                <td className="px-4 py-2 text-sm">
                  {match.bowling ? 
                    `${match.bowling.wickets}/${match.bowling.runs} (${match.bowling.overs})` : 
                    '-'}
                </td>
                <td className="px-4 py-2 text-sm">
                  {match.fielding ? 
                    `${match.fielding.catches}c ${match.fielding.runouts}ro` : 
                    '-'}
                </td>
                <td className="px-4 py-2 text-sm font-medium">{match.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

const FantasyPlayerHistory = ({ player, leagueId }) => {
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("player", player);

  useEffect(() => {
    const fetchHistory = async () => {
        try {
          setIsLoading(true);
          const response = await axios.get(`/players/${player.id}/history/`);
          console.log("response", response);
          setSeasonStats(response.data.seasonStats);
          setMatches(response.data.matches);
          setFilteredMatches(response.data.matches);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to load player history');
        } finally {
          setIsLoading(false);
        }
      };

    fetchHistory();
  }, [player.id]);

  const handleSeasonSelect = (season) => {
    setSelectedSeason(season);
    setFilteredMatches(
      season === 'all' 
        ? matches 
        : matches.filter(m => m.match.season.year.toString() === season)
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        {error}
      </div>
    );
  }

  const seasons = [...new Set(matches.map(m => m.match.season.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <SeasonOverview seasonStats={seasonStats} />
      <PerformanceGraphs matchData={matches} />
      <MatchHistory 
        matches={filteredMatches}
        onSeasonSelect={handleSeasonSelect}
        seasons={seasons}
      />
    </div>
  );
};

export default FantasyPlayerHistory;