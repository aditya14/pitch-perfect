import React from 'react';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Import the getRoleIcon function or define it here
import { getRoleIcon } from '../../../utils/roleUtils'; 

const CurrentBoosts = ({ 
  currentCoreSquad, 
  getRoleById, 
  getPlayerById, 
  leagueId, 
  showCurrent, 
  setShowCurrent,
  squadColor 
}) => {
  const { openPlayerModal } = usePlayerModal();
  
  // Don't render anything if squad is empty (draft hasn't completed)
  if (!currentCoreSquad?.length) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <button
        onClick={() => setShowCurrent(!showCurrent)}
        className="w-full flex justify-between items-center mb-4"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Current Week Boosts
        </h2>
        {showCurrent ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {showCurrent && (
        <>
          {currentCoreSquad?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentCoreSquad.map(assignment => {
                const player = getPlayerById(assignment.player_id);
                const role = getRoleById(assignment.boost_id);
                if (!role) return null;

                return (
                  <div key={role.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
                        {getRoleIcon(role.name, 18, squadColor)}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {role.name}
                      </div>
                    </div>
                    {player ? (
                      <div 
                        className="ml-10 text-sm text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:underline"
                        onClick={() => openPlayerModal(player.id, leagueId)}
                      >
                        {player.name}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {player.role} • {player.current_team?.name || 'No team'}
                        </div>
                      </div>
                    ) : (
                      <div className="ml-10 text-sm text-gray-500 italic">
                        No player assigned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No players assigned for current week
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CurrentBoosts;