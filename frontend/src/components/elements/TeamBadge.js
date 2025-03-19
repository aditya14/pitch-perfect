import React, { useMemo } from 'react';
import { getTextColorForBackground } from '../../utils/colorUtils';

const TeamBadge = ({ team, className = '', useShortName = false }) => {
  console.log('Team', team);
  const backgroundColor = `#${team.primary_color || '000000'}`;
  const textColor = useMemo(() => 
    getTextColorForBackground(backgroundColor), 
    [backgroundColor]
  );

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 mr-1 rounded-md text-sm font-medium ${className}`}
      style={{
        backgroundColor,
        color: textColor
      }}
    >
      {useShortName ? team.short_name : team.name}
    </span>
  );
};

export default TeamBadge;