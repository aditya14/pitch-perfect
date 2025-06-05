import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import PlayerListItem from './PlayerListItem';
import { XMarkIcon } from '@heroicons/react/24/solid'; // Using Heroicons

const VIRTUALIZATION_THRESHOLD = 50; // Number of players to trigger virtualization

const PlayerSelectionPanel = ({
    players = [],
    activeSlotId,
    getRoleById,
    handlePlayerAssign,
    handleClose,
    futureAssignments,
    isDeadlinePassed, // Already considers !isOwnSquad
    squadColor,
    canAssignPlayerToRole,
    isPlayerAssignedToOtherRole,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'avgPoints', direction: 'desc' });
    // Add filters if needed, e.g., team, assigned status
    // const [filters, setFilters] = useState({ team: [], assignedStatus: 'all' });

    const activeRole = useMemo(() => getRoleById(activeSlotId), [activeSlotId, getRoleById]);

    // Memoized Filtering and Sorting
    const filteredAndSortedPlayers = useMemo(() => {
        if (!activeRole) return [];

        let processedPlayers = players
            // 1. Filter by Role Eligibility (Mandatory)
            .filter(player => canAssignPlayerToRole(player, activeRole))
            // 2. Filter by Search Term
            .filter(player =>
                player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                player.team_short.toLowerCase().includes(searchTerm.toLowerCase())
            );
            // 3. Apply other filters (e.g., team, assigned status) - Add UI controls if needed
            // Example: .filter(player => filters.team.length === 0 || filters.team.includes(player.team_id))

        // Add assignment status info
        processedPlayers = processedPlayers.map(player => {
            const assignedEntry = Object.entries(futureAssignments).find(([roleId, pId]) => pId === player.id);
            return {
                ...player,
                isAssigned: !!assignedEntry,
                assignedRoleId: assignedEntry ? parseInt(assignedEntry[0]) : null,
            };
        });

        // Sorting
        processedPlayers.sort((a, b) => {
            let valA = a[sortBy.key];
            let valB = b[sortBy.key];

            // Handle potential null/undefined values for sorting keys like stats
            valA = valA ?? (sortBy.direction === 'desc' ? -Infinity : Infinity);
            valB = valB ?? (sortBy.direction === 'desc' ? -Infinity : Infinity);

            // Specific handling for string sorting (e.g., name)
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
                return sortBy.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            // Numeric sorting
            return sortBy.direction === 'desc' ? valB - valA : valA - valB;
        });

        return processedPlayers;
    }, [players, activeRole, searchTerm, sortBy, futureAssignments, canAssignPlayerToRole]);

    const handleSort = (key) => {
        setSortBy(prevSortBy => ({
            key,
            direction: prevSortBy.key === key && prevSortBy.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const renderSortButton = (key, label) => (
        <button
            onClick={() => handleSort(key)}
            className={`px-2 py-1 text-xs rounded ${sortBy.key === key ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
        >
            {label} {sortBy.key === key ? (sortBy.direction === 'desc' ? '↓' : '↑') : ''}
        </button>
    );

    // Virtualized Row Renderer
    const Row = useCallback(({ index, style }) => {
        const player = filteredAndSortedPlayers[index];
        if (!player) return null;

        const assignedRole = player.assignedRoleId ? getRoleById(player.assignedRoleId) : null;

        return (
            <div style={style}>
                <PlayerListItem
                    player={player}
                    onClick={() => handlePlayerAssign(player.id)}
                    isAssignedToOtherRole={player.isAssigned && player.assignedRoleId !== activeSlotId}
                    assignedRoleName={assignedRole?.name}
                    isEligible={true} // Already filtered, but could double-check
                    isDisabled={isDeadlinePassed} // Disable click if deadline passed
                />
            </div>
        );
    }, [filteredAndSortedPlayers, handlePlayerAssign, isDeadlinePassed, activeSlotId, getRoleById]);

    if (!activeRole) return null;

    // Use Modal structure for better focus, especially on mobile
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Assign Player for <span className="text-blue-600 dark:text-blue-400">{activeRole.name}</span>
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label="Close player selection"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 space-y-3 border-b dark:border-gray-700">
                    <input
                        type="text"
                        placeholder="Search player or team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Sort by:</span>
                        {renderSortButton('name', 'Name')}
                        {renderSortButton('avgPoints', 'Avg Pts')}
                        {/* Add more sort options as needed, e.g., last match points */}
                        {/* {renderSortButton('lastMatchPoints', 'Last Pts')} */}
                    </div>
                    {/* Add Filter controls here if implemented */}
                </div>

                {/* Player List */}
                <div className="flex-grow overflow-y-auto">
                    {filteredAndSortedPlayers.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 p-6">No eligible players found matching criteria.</p>
                    )}
                    {filteredAndSortedPlayers.length > 0 && filteredAndSortedPlayers.length < VIRTUALIZATION_THRESHOLD && (
                         <div className="divide-y dark:divide-gray-700">
                            {filteredAndSortedPlayers.map(player => {
                                const assignedRole = player.assignedRoleId ? getRoleById(player.assignedRoleId) : null;
                                return (
                                    <PlayerListItem
                                        key={player.id}
                                        player={player}
                                        onClick={() => handlePlayerAssign(player.id)}
                                        isAssignedToOtherRole={player.isAssigned && player.assignedRoleId !== activeSlotId}
                                        assignedRoleName={assignedRole?.name}
                                        isEligible={true}
                                        isDisabled={isDeadlinePassed}
                                    />
                                );
                            })}
                        </div>
                    )}
                    {filteredAndSortedPlayers.length >= VIRTUALIZATION_THRESHOLD && (
                        <List
                            height={400} // Adjust height as needed, or calculate based on container
                            itemCount={filteredAndSortedPlayers.length}
                            itemSize={65} // Adjust based on PlayerListItem height + padding/border
                            width="100%"
                        >
                            {Row}
                        </List>
                    )}
                </div>
                 {/* Footer Info (Optional) */}
                 <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700">
                    Showing {filteredAndSortedPlayers.length} eligible players for {activeRole.name}.
                </div>
            </div>
        </div>
    );
};

export default PlayerSelectionPanel;
