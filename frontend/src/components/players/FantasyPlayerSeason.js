import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SeasonOverviewTable = ({ seasonStats }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700">
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
        Season Overview
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Squad</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matches</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base Points</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Boost Points</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Points</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {seasonStats.map((stat, index) => (
            <tr 
              key={index} 
              className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                ${index === seasonStats.length - 1 ? "font-semibold" : ""}`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{stat.squad}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{stat.matches}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{stat.basePoints}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{stat.boostPoints}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{stat.totalPoints}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                {stat.average?.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MatchCard = ({ match }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 p-4 min-w-[350px] max-w-[400px]">
    <div className="font-semibold text-lg mb-3 text-blue-700 dark:text-blue-400">
      v {match.opponent} ({match.date})
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left font-medium text-gray-500 dark:text-gray-400">Performance</th>
          <th className="text-right font-medium text-gray-500 dark:text-gray-400">Points</th>
        </tr>
      </thead>
      <tbody className="text-gray-700 dark:text-gray-300">
        {match.batting && (
          <tr>
            <td className="py-1">
              <div className="flex flex-col">
                <span>
                  <span className="font-medium">{match.batting.runs}({match.batting.balls})</span>
                  {match.batting.fours > 0 && 
                    <span className="text-gray-500 dark:text-gray-400 ml-1">{match.batting.fours}×4</span>
                  }
                  {match.batting.sixes > 0 && 
                    <span className="text-gray-500 dark:text-gray-400 ml-1">{match.batting.sixes}×6</span>
                  }
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  SR: {match.batting.strikeRate?.toFixed(1)}
                </span>
              </div>
            </td>
            <td className="text-right">{match.batting.points}</td>
          </tr>
        )}
        {match.bowling && (
          <tr>
            <td className="py-1">
              <div className="flex flex-col">
                <span>
                  <span className="font-medium">{match.bowling.wickets}/{match.bowling.runs}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">({match.bowling.overs})</span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Econ: {match.bowling.economy?.toFixed(1)}
                </span>
              </div>
            </td>
            <td className="text-right">{match.bowling.points}</td>
          </tr>
        )}
        {match.fielding && (
          <tr>
            <td className="py-1">
              {match.fielding.catches > 0 && <span>{match.fielding.catches}c </span>}
              {match.fielding.stumpings > 0 && <span>{match.fielding.stumpings}st </span>}
              {match.fielding.runouts > 0 && <span>{match.fielding.runouts}ro</span>}
            </td>
            <td className="text-right">{match.fielding.points}</td>
          </tr>
        )}
        <tr className="border-t dark:border-gray-700">
          <td className="py-1">Base Points</td>
          <td className="text-right">{match.basePoints}</td>
        </tr>
        <tr>
          <td className="py-1">Boost</td>
          <td className="text-right">{match.boostPoints}</td>
        </tr>
        <tr className="font-semibold">
          <td className="py-1">Total</td>
          <td className="text-right text-blue-600 dark:text-blue-400">{match.totalPoints}</td>
        </tr>
        <tr className="text-gray-500 dark:text-gray-400 text-sm">
          <td colSpan={2} className="pt-2">Squad: {match.squad}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const MatchCarousel = ({ matches }) => {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 3;
  const maxStartIndex = Math.max(0, matches.length - visibleCount);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(maxStartIndex, startIndex + 1));
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          onClick={handlePrevious}
          disabled={startIndex === 0}
          className={`p-2 rounded-full ${
            startIndex === 0 
              ? 'text-gray-300 dark:text-gray-600' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex gap-4 overflow-hidden px-4">
          {matches
            .slice(startIndex, startIndex + visibleCount)
            .map((match, index) => (
              <MatchCard key={index} match={match} />
            ))}
        </div>

        <button
          onClick={handleNext}
          disabled={startIndex >= maxStartIndex}
          className={`p-2 rounded-full ${
            startIndex >= maxStartIndex 
              ? 'text-gray-300 dark:text-gray-600' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

const FantasyPlayerSeason = ({ player, leagueId }) => {
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/leagues/${leagueId}/players/${player.id}/performance/`);
        console.log("response", response.data);
        setSeasonStats(response.data.seasonStats);
        setMatches(response.data.matches);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load player stats');
      } finally {
        setIsLoading(false);
      }
    };

    if (player.id && leagueId) {
      fetchData();
    }
  }, [player.id, leagueId]);

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
      <SeasonOverviewTable seasonStats={seasonStats} />
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Match History</h3>
        <MatchCarousel matches={matches} />
      </div>
    </div>
  );
};

export default FantasyPlayerSeason;