import React from 'react';
import { getRoleIcon } from '../../../utils/roleUtils';

/**
 * Component representing a single player in the selection panel
 */
const PlayerListItem = ({
  player,
  onClick,
  isAssignedToOtherRole,
  assignedRoleName,
  isEligible,
  squadColor
}) => {
  return (
    <div
      onClick={() => isEligible && onClick(player.id)}
      className={`
        rounded-lg p-3 cursor-pointer border transition-all
        ${isAssignedToOtherRole
          ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900'
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700'}
        ${!isEligible ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-neutral-900 dark:text-white">
            {player.name}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {player.role} • {player.current_team?.name || 'No team'}
          </div>
          {isAssignedToOtherRole && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
              <span>Assigned as {assignedRoleName}</span>
            </div>
          )}
        </div>

        {/* If player is assigned to another role, show that role's icon */}
        {isAssignedToOtherRole && (
          <div className="h-6 w-6 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
            {getRoleIcon(assignedRoleName, 16, squadColor)}
          </div>
        )}
        
        {/* Display player's average points - this would need to be passed as prop if available */}
        {player.avg_points !== undefined && (
          <div className="text-right">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Avg Points</div>
            <div className="font-medium text-neutral-900 dark:text-white">
              {typeof player.avg_points === 'number' 
                ? player.avg_points.toFixed(1) 
                : player.avg_points}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerListItem;