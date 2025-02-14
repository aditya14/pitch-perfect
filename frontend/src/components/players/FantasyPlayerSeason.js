import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SeasonOverviewTable = ({ seasonStats }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Squad
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Matches
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Base Points
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Boost Points
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Points
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Average
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {seasonStats.map((stat, index) => (
          <tr key={index} className={index === seasonStats.length - 1 ? "font-semibold" : ""}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.squad}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.matches}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.basePoints}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.boostPoints}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.totalPoints}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.average.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MatchCard = ({ match }) => (
  <div className="bg-white rounded-lg shadow-md p-4 min-w-[350px] max-w-[400px]">
    <div className="font-semibold text-lg mb-3 text-blue-700">
      v {match.opponent} ({match.date})
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left font-medium text-gray-500">Performance</th>
          <th className="text-right font-medium text-gray-500">Points</th>
        </tr>
      </thead>
      <tbody>
        {match.batting && (
          <tr>
            <td className="py-1">Batting: {match.batting.score}({match.batting.balls}) {match.batting.fours}x4 {match.batting.sixes}x6, SR: {match.batting.strikeRate}</td>
            <td className="text-right">{match.batting.points}</td>
          </tr>
        )}
        {match.bowling && (
          <tr>
            <td className="py-1">Bowling: {match.bowling.overs}-{match.bowling.maidens}-{match.bowling.runs}-{match.bowling.wickets}, Econ. {match.bowling.economy}</td>
            <td className="text-right">{match.bowling.points}</td>
          </tr>
        )}
        {match.fielding && (
          <tr>
            <td className="py-1">Fielding: {match.fielding.catches} ct, {match.fielding.runouts} r/o</td>
            <td className="text-right">{match.fielding.points}</td>
          </tr>
        )}
        <tr className="border-t">
          <td className="py-1">Base Points</td>
          <td className="text-right">{match.basePoints}</td>
        </tr>
        <tr>
          <td className="py-1">Boost</td>
          <td className="text-right">{match.boostPoints}</td>
        </tr>
        <tr className="font-semibold">
          <td className="py-1">Total</td>
          <td className="text-right">{match.totalPoints}</td>
        </tr>
        <tr className="text-gray-500 text-sm">
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
            startIndex === 0 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'
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
            startIndex >= maxStartIndex ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

const FantasyPlayerSeason = ({ player }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Season Overview</h3>
        <SeasonOverviewTable seasonStats={player.seasonStats} />
      </div>
      
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Match History</h3>
        <MatchCarousel matches={player.matches} />
      </div>
    </div>
  );
};

export default FantasyPlayerSeason;