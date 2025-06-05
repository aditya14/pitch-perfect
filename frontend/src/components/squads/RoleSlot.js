import React from 'react';
import { getTextColorForBackground } from '../../utils/colorUtils'; // Assuming exists

const RoleSlot = ({
    role,
    assignedPlayerId,
    isActive,
    onClick,
    onRemove,
    getPlayerById,
    isDeadlinePassed,
    squadColor,
    getRoleIcon,
}) => {
    const player = assignedPlayerId ? getPlayerById(assignedPlayerId) : null;
    const textColor = getTextColorForBackground(squadColor);
    const RoleIcon = getRoleIcon(role.icon || role.name); // Use icon name or role name

    const handleClick = () => {
        if (!isDeadlinePassed) {
            onClick();
        }
    };

    const handleRemoveClick = (e) => {
        e.stopPropagation(); // Prevent triggering onClick
        if (!isDeadlinePassed) {
            onRemove();
        }
    };

    // Format eligibility nicely
    const eligibilityText = role.allowed_player_types?.join(', ') || 'Any';

    return (
        <div
            className={`border rounded-lg p-3 flex flex-col justify-between transition-all duration-150 ease-in-out h-36 md:h-40
                ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400' : 'border-gray-300 dark:border-gray-600'}
                ${!isDeadlinePassed ? 'cursor-pointer hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500' : 'cursor-not-allowed opacity-75'}
                bg-white dark:bg-gray-800`}
            onClick={handleClick}
            data-tooltip-id="role-tooltip"
            data-tooltip-content={`Eligible: ${eligibilityText}`}
            data-tooltip-place="top"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                     {RoleIcon && <RoleIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{role.name}</span>
                </div>
                {player && !isDeadlinePassed && (
                    <button
                        onClick={handleRemoveClick}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                        aria-label={`Remove ${player.name}`}
                        title={`Remove ${player.name}`}
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="text-center mt-2 flex-grow flex flex-col items-center justify-center">
                {player ? (
                    <div className="text-xs text-center">
                        <p className="font-medium text-gray-900 dark:text-white truncate w-full">{player.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{player.role} - {player.team_short}</p>
                    </div>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                        {isDeadlinePassed ? 'Unassigned' : '+ Assign Player'}
                    </span>
                )}
            </div>

            {/* Optional: Add eligibility hint if needed, tooltip might be enough */}
            {/* <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">Eligible: {eligibilityText}</p> */}
        </div>
    );
};

export default RoleSlot;
