import React from 'react';
import StatsContainer from '../stats/StatsContainer';

const LeagueStats = ({ league }) => {
  return (
    <div className="pt-6 md:pt-0">
      <StatsContainer league={league} />
    </div>
  );
};

export default LeagueStats;
