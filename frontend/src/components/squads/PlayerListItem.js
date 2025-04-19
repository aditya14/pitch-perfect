import React from 'react';

const PlayerListItem = ({
    player,
    onClick,
    isAssignedToOtherRole,
    assignedRoleName,
    isEligible,
    isDisabled, // Combined deadline/ownership check
}) => {
    const handleClick = () => {
        if (!isDisabled && isEligible && !isAssignedToOtherRole) { // Prevent assigning already assigned player directly from list item
            onClick();
        }
    };

    const itemClasses = `
        flex items-center justify-between p-3 transition-colors duration-150 ease-in-out
        ${isDisabled || !isEligible ? 'opacity-50 cursor-not-allowed' : ''}
        ${isAssignedToOtherRole ? 'opacity-70 bg-gray-100 dark:bg-gray-700' : ''}
        ${!isDisabled && isEligible && !isAssignedToOtherRole ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''}
    `;

    return (
        <div className={itemClasses} onClick={handleClick}>
            <div className="flex items-center space-x-3">
                {/* Placeholder for player image/icon if available */}
                {/* <img src={player.imageUrl || '/path/to/default/avatar.png'} alt={player.name} className="w-8 h-8 rounded-full" /> */}
                <div className="flex-grow">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{player.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{player.role} - {player.team_short}</p>
                </div>
            </div>
            <div className="text-right">
                {isAssignedToOtherRole ? (
                     <span className="text-xs text-orange-600 dark:text-orange-400 italic">
                        Assigned as {assignedRoleName || '...'}
                    </span>
                ) : (
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {player.avgPoints?.toFixed(1) ?? 'N/A'} <span className="text-xs font-normal">Avg Pts</span>
                    </p>
                )}
                 {!isEligible && (
                     <p className="text-xs text-red-500">Ineligible</p>
                 )}
            </div>
        </div>
    );
};

export default PlayerListItem;
