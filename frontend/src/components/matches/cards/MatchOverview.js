import React from 'react';
import { Trophy, Calendar, Clock, Info, Award, MapPin } from 'lucide-react';
import TeamBadge from '../../elements/TeamBadge';

// Helper function to safely convert to lowercase
const safeToLowerCase = (str) => {
  return str && typeof str === 'string' ? str.toLowerCase() : '';
};

// Utility function to convert hex color to rgba with opacity
const hexToRgba = (hex, opacity) => {
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba format
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const MatchOverview = ({ matchData }) => {
  console.log('Match Data:', matchData); // Debugging line to check matchData
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
  
  const getReadableTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
        <div className="flex items-center">
          <Info className="w-4 h-4 mr-2 text-neutral-500 dark:text-neutral-400" />
          <h2 className="text-lg font-caption font-semibold text-neutral-900 dark:text-white">
            Match Overview
          </h2>
        </div>
        <div className="flex items-center space-x-1 text-sm text-neutral-500 dark:text-neutral-400">
          <span>Match #{matchData.match_number}</span>
          <span>•</span>
          <span>{matchData.stage}</span>
        </div>
      </div>

      <div className="p-4">
        {/* Match date and venue info */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-4 text-sm">
          <div className="flex items-center mb-2 sm:mb-0 text-neutral-600 dark:text-neutral-300">
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>{getReadableDate(matchData.date)}</span>
            <span className="mx-1.5">•</span>
            <Clock className="w-4 h-4 mr-1.5" />
            <span>{getReadableTime(matchData.date)}</span>
          </div>
          <div className="flex items-center text-neutral-600 dark:text-neutral-300">
            <MapPin className="w-4 h-4 mr-1.5" />
            <span className="truncate max-w-xs">{matchData.venue}</span>
          </div>
        </div>
        
        {/* Teams and Score */}
        <div className="mb-6 overflow-hidden rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
          {/* First innings */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="h-4 w-4 mr-3 rounded-sm"
                style={{ 
                  backgroundColor: `#${battingFirstTeam.primary_color}`,
                  boxShadow: matchData.winner && battingFirstTeam.id === matchData.winner.id 
                    ? `1px 1px 5px ${hexToRgba(battingFirstTeam.primary_color, 0.9)}` 
                    : 'none',
                  opacity: matchData.winner 
                    ? (battingFirstTeam.id === matchData.winner.id ? 1 : 0.4) 
                    : 1
                }}
              />
              <div>
                <div className="flex items-center">
                  <span className={`text-md ${battingFirstTeam.id === matchData.winner?.id ? 'font-bold' : 'font-medium'} text-neutral-900 dark:text-white`}>
                    {battingFirstTeam.name}
                  </span>
                  {matchData.winner && battingFirstTeam.id === matchData.winner.id && (
                    <Trophy className="h-4 w-4 text-yellow-500 ml-1" />
                  )}
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">1st Innings</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                {matchData.inns_1_runs}/{matchData.inns_1_wickets}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                ({matchData.inns_1_overs} overs)
              </div>
            </div>
          </div>
          
          {/* Border */}
          <div className="border-t border-neutral-200 dark:border-neutral-800"></div>
          
          {/* Second innings */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="h-4 w-4 mr-3 rounded-sm"
                style={{ 
                  backgroundColor: `#${battingSecondTeam.primary_color}`,
                  boxShadow: matchData.winner && battingSecondTeam.id === matchData.winner.id 
                    ? `1px 1px 5px ${hexToRgba(battingSecondTeam.primary_color, 0.9)}` 
                    : 'none',
                  opacity: matchData.winner 
                    ? (battingSecondTeam.id === matchData.winner.id ? 1 : 0.4) 
                    : 1
                }}
              />
              <div>
                <div className="flex items-center">
                  <span className={`text-md ${battingSecondTeam.id === matchData.winner?.id ? 'font-bold' : 'font-medium'} text-neutral-900 dark:text-white`}>
                    {battingSecondTeam.name}
                  </span>
                  {matchData.winner && battingSecondTeam.id === matchData.winner.id && (
                    <Trophy className="h-4 w-4 text-yellow-500 ml-1" />
                  )}
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">2nd Innings</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                {matchData.inns_2_runs}/{matchData.inns_2_wickets}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                ({matchData.inns_2_overs} overs)
              </div>
            </div>
          </div>
        </div>

        {/* Match Result and Details - Table Format */}
        <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <tbody>
              {/* Toss info */}
              <tr>
                <td className="py-1.5 w-28 font-medium text-neutral-500 dark:text-neutral-400 align-top">
                  Toss
                </td>
                <td className="py-1.5 text-neutral-900 dark:text-white">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <div 
                        className="h-2 w-2 mr-1.5 rounded-sm"
                        style={{ backgroundColor: `#${matchData.toss_winner.primary_color}` }}
                      />
                      <span className="font-medium">{matchData.toss_winner.short_name}</span>
                    </div>
                    <span className="ml-1">chose to {safeToLowerCase(matchData.toss_decision)}</span>
                  </div>
                </td>
              </tr>
              
              {/* Result */}
              {matchData.status === 'COMPLETED' && (
                <tr>
                  <td className="py-1.5 w-28 font-medium text-neutral-500 dark:text-neutral-400 align-top">
                    Result
                  </td>
                  <td className="py-1.5 text-neutral-900 dark:text-white">
                    {matchData.winner ? (
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <div 
                            className="h-2 w-2 mr-1.5 rounded-sm"
                            style={{ backgroundColor: `#${matchData.winner.primary_color}` }}
                          />
                          <span className="font-bold">{matchData.winner.short_name}</span>
                        </div>
                        
                        {matchData.win_type === 'RUNS' && (
                          <span className="ml-1">won by {matchData.win_margin} {matchData.win_margin === 1 ? 'run' : 'runs'}</span>
                        )}
                        {matchData.win_type === 'WICKETS' && (
                          <span className="ml-1">won by {matchData.win_margin} {matchData.win_margin === 1 ? 'wicket' : 'wickets'}</span>
                        )}
                        {matchData.win_type === 'TIE' && (
                          <span className="ml-1">match tied</span>
                        )}
                        {matchData.win_type === 'SUPER_OVER' && (
                          <span className="ml-1">won via Super Over</span>
                        )}
                        {matchData.win_type === 'NO_RESULT' && (
                          <span className="ml-1">no result</span>
                        )}
                        
                        <Trophy className="h-4 w-4 text-yellow-500 ml-2" />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {matchData.status === 'NO_RESULT' ? 'No Result' : matchData.status === 'ABANDONED' ? 'Match Abandoned' : 'Result Pending'}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {/* Also, to handle match statuses other than COMPLETED: */}
              {(matchData.status === 'NO_RESULT' || matchData.status === 'ABANDONED') && (
                <tr>
                  <td className="py-1.5 w-28 font-medium text-neutral-500 dark:text-neutral-400 align-top">
                    Status
                  </td>
                  <td className="py-1.5 text-neutral-900 dark:text-white">
                    <div className="flex items-center">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {matchData.status === 'NO_RESULT' ? 'No Result' : 'Match Abandoned'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Player of Match */}
              {matchData.player_of_match && (
                <tr>
                  <td className="py-1.5 w-28 font-medium text-neutral-500 dark:text-neutral-400 align-top">
                    Player of Match
                  </td>
                  <td className="py-1.5 text-neutral-900 dark:text-white">
                    <div className="flex items-center">
                      <span>{matchData.player_of_match.name}</span>
                      <Award className="h-4 w-4 text-yellow-500 ml-2" />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
  );
}

export default MatchOverview;