import React from 'react';
import RoleSlot from './RoleSlot';

/**
 * Grid component that displays all the boost role slots
 */
const RoleSlotGrid = ({
  boostRoles,
  futureAssignments,
  activeSlotId,
  handleSlotClick,
  handleRemoveAssignment,
  getPlayerById,
  isDeadlinePassed,
  squadColor
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {boostRoles.map(role => {
        const assignedPlayerId = futureAssignments[role.id] || null;
        const isActive = activeSlotId === role.id;

        return (
          <RoleSlot
            key={role.id}
            role={role}
            assignedPlayerId={assignedPlayerId}
            isActive={isActive}
            onClick={handleSlotClick}
            onRemove={handleRemoveAssignment}
            getPlayerById={getPlayerById}
            isDeadlinePassed={isDeadlinePassed}
            squadColor={squadColor}
          />
        );
      })}
    </div>
  );
};

export default RoleSlotGrid;