import React from 'react';
import RoleSlot from './RoleSlot';

const RoleSlotGrid = ({
    boostRoles,
    futureAssignments,
    activeSlotId,
    handleSlotClick,
    handleRemoveAssignment,
    getPlayerById,
    isDeadlinePassed,
    squadColor,
    getRoleIcon,
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {boostRoles.map((role) => (
                <RoleSlot
                    key={role.id}
                    role={role}
                    assignedPlayerId={futureAssignments[role.id] || null}
                    isActive={activeSlotId === role.id}
                    onClick={() => handleSlotClick(role.id)}
                    onRemove={() => handleRemoveAssignment(role.id)}
                    getPlayerById={getPlayerById}
                    isDeadlinePassed={isDeadlinePassed}
                    squadColor={squadColor}
                    getRoleIcon={getRoleIcon}
                />
            ))}
        </div>
    );
};

export default RoleSlotGrid;
