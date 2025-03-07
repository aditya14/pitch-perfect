import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';

const SeasonOverview = ({ seasonStats }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700">
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
        Career Overview
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matches</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Runs (SR)</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wickets (Econ)</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catches</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points/Match</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {seasonStats.map((season) => (
            <tr 
              key={season.year} 
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{season.year}</td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{season.matches}</td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{season.runs}</span>
                <span className="text-gray-500 dark:text-gray-400"> ({season.strike_rate?.toFixed(1) || 0})</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{season.wickets}</span>
                <span className="text-gray-500 dark:text-gray-400"> ({season.economy?.toFixed(1) || 0})</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{season.catches}</td>
              <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                <span className={`
                  ${season.points_per_match >= 60 ? 'text-green-600 dark:text-green-400' :
                    season.points_per_match >= 35 ? 'text-blue-600 dark:text-blue-400' :
                    season.points_per_match < 10 ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'}
                `}>
                  {season.points_per_match?.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MatchHistory = ({ matches, currentSeason, onSeasonChange, seasons }) => {
  const seasonMatches = matches.filter(m => m.match.season.year === currentSeason);
  
  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            Match History ({seasonMatches.length} matches)
          </h3>
          <select 
            value={currentSeason}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm py-1"
          >
            {seasons.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">For</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batting</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bowling</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fielding</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {seasonMatches.map((match, index) => (
              console.log(match),
              <tr 
                key={index} 
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  <a
                    href={`/matches/${match.match.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {new Date(match.match.date).toLocaleDateString()}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {match.for_team}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {match.opponent}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {match.batting ? (
                    <div>
                      <span className="font-medium">{match.batting.runs}({match.batting.balls})</span>
                      {match.batting.fours > 0 && 
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{match.batting.fours}×4</span>
                      }
                      {match.batting.sixes > 0 && 
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{match.batting.sixes}×6</span>
                      }
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        SR: {match.batting.strike_rate?.toFixed(1)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {match.bowling ? (
                    <div>
                      <span className="font-medium">
                        {match.bowling.wickets}/{match.bowling.runs}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({match.bowling.overs})
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        Econ: {match.bowling.economy?.toFixed(1)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {match.fielding ? (
                    <div>
                      {match.fielding.catches > 0 && 
                        <span>{match.fielding.catches}c </span>
                      }
                      {match.fielding.stumpings > 0 && 
                        <span>{match.fielding.stumpings}st </span>
                      }
                      {match.fielding.runouts > 0 && 
                        <span>{match.fielding.runouts}ro</span>
                      }
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span className={`
                    ${match.points >= 60 ? 'text-green-600 dark:text-green-400' :
                      match.points >= 35 ? 'text-blue-600 dark:text-blue-400' :
                      match.points < 10 ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'}
                  `}>
                    {match.points} {match.points >= 120 && '🔥'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FantasyPlayerHistory = ({ player }) => {
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/players/${player.id}/history/`);
        console.log('hh', response.data);
        setSeasonStats(response.data.seasonStats);
        setMatches(response.data.matches);
        // Set current season to most recent
        setCurrentSeason(response.data.seasonStats[0]?.year || null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load player history');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchHistory();
  }, [player.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-center py-8">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeasonOverview seasonStats={seasonStats} />
      {currentSeason && (
        <MatchHistory 
          matches={matches}
          currentSeason={currentSeason}
          onSeasonChange={setCurrentSeason}
          seasons={seasonStats.map(s => s.year)}
        />
      )}
    </div>
  );
};

export default FantasyPlayerHistory;