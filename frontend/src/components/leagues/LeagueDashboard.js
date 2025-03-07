import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTextColorForBackground } from '../../utils/colorUtils';

const LeagueDashboard = ({ league, currentUserId }) => {
  const navigate = useNavigate();

  const handleSquadClick = (squadId) => {
    navigate(`/squads/${squadId}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Squad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {league.squads?.sort((a, b) => b.total_points - a.total_points)
              .map((squad, index) => (
              <tr 
                key={squad.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSquadClick(squad.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span 
                      className="text-sm font-medium px-2 py-1 rounded-md inline-flex items-center hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ 
                        backgroundColor: squad.color,
                        color: getTextColorForBackground(squad.color)
                      }}
                    >
                      {squad.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {squad.total_points}
                </td>
              </tr>
            ))}
            {(!league.squads || league.squads.length === 0) && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No squads have joined this league yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueDashboard;