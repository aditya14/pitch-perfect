import React from 'react';

const LeagueTable = ({ league }) => {
  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          League Standings
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Squad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
            {league.squads?.sort((a, b) => b.total_points - a.total_points)
              .map((squad, index) => (
              <tr key={squad.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className="h-4 w-1 mr-1 rounded-sm"
                      style={{ backgroundColor: squad.color }}
                    />
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {squad.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                  {squad.total_points}
                </td>
              </tr>
            ))}
            {(!league.squads || league.squads.length === 0) && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
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

export default LeagueTable;