import React from 'react';
import TeamBadge from '../../elements/TeamBadge';
import { Trophy } from 'lucide-react';

// Helper function to safely convert to lowercase
const safeToLowerCase = (str) => {
  return str && typeof str === 'string' ? str.toLowerCase() : '';
};

const MatchOverview = ({ matchData }) => {
  if (!matchData) return null;

  // Determine which team batted first based on toss winner and toss decision
  const battingFirstTeam = matchData.toss_decision === 'BAT' 
    ? matchData.toss_winner 
    : (matchData.team_1.id === matchData.toss_winner.id ? matchData.team_2 : matchData.team_1);
  
  const battingSecondTeam = (battingFirstTeam.id === matchData.team_1.id)
    ? matchData.team_2 
    : matchData.team_1;

  const getReadableDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
            <TeamBadge team={battingFirstTeam} className="mb-2" />
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
            <TeamBadge team={battingSecondTeam} className="mb-2" />
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
                  <TeamBadge team={matchData.toss_winner ? matchData.toss_winner : ''} useShortName={true} className="mr-1" /> chose to {safeToLowerCase(matchData.toss_decision)}
                </td>
              </tr>
              {matchData.status === 'COMPLETED' && (
                <>
                  <tr className="group">
                    <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Result</td>
                    <td className="py-3 text-gray-900 dark:text-white flex items-center gap-2">
                      <TeamBadge team={matchData.winner ? matchData.winner : ''} useShortName={true} /> 
                      <span>won by {matchData.win_margin} {safeToLowerCase(matchData.win_type)}</span>
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

export default MatchOverview;