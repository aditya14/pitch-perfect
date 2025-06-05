import React from 'react';
import { X } from 'lucide-react';
import { getRoleIcon } from '../../../utils/roleUtils';

/**
 * Component that represents a single boost role slot in the grid
 */
const RoleSlot = ({
  role,
  assignedPlayerId,
  isActive,
  onClick,
  onRemove,
  getPlayerById,
  isDeadlinePassed,
  squadColor
}) => {
  const player = assignedPlayerId ? getPlayerById(assignedPlayerId) : null;

  return (
    <div
      onClick={() => !isDeadlinePassed && onClick(role.id)}
      className={`
        rounded-lg border cursor-pointer transition-all p-4
        ${isActive
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700'}
        ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-8 w-8 flex items-center justify-center bg-white dark:bg-neutral-900 rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
            {getRoleIcon(role.name, 18, squadColor)}
          </div>
          <h3 className="font-medium text-neutral-900 dark:text-white">{role.name}</h3>
        </div>

        {assignedPlayerId && !isDeadlinePassed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(role.id);
            }}
            className="text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400"
            aria-label="Remove assignment"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
        {role.allowed_player_types.join(', ')}
      </div>

      {player ? (
        <div className="mt-2 truncate">
          <div className="font-medium text-neutral-900 dark:text-white truncate">
            {player.name}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {player.role} • {player.current_team?.name || 'No team'}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-center h-9 border border-dashed border-neutral-300 dark:border-neutral-600 rounded text-neutral-400 dark:text-neutral-500 text-sm bg-neutral-50 dark:bg-neutral-900/30">
          {isDeadlinePassed ? "Unassigned" : "Assign Player"}
        </div>
      )}
    </div>
  );
};

export default RoleSlot;