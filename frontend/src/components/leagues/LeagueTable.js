import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../utils/axios';
import CapIcon from '../elements/icons/CapIcon';

const LeagueTable = ({ league }) => {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({
    key: 'total_points',
    direction: 'desc'
  });
  const [squadStats, setSquadStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch consolidated stats from the table endpoint
  useEffect(() => {
    if (league?.id) {
      fetchLeagueTableStats();
    }
  }, [league?.id]);
  
  const fetchLeagueTableStats = async () => {
    setIsLoading(true);
    try {
      // Use the consolidated endpoint
      const response = await api.get(`/leagues/${league.id}/stats/table`);
      setSquadStats(response.data);
    } catch (err) {
      console.error('Failed to fetch league table stats:', err);
      
      // Fallback: use the league squads data with default values
      const fallbackStats = league.squads?.map(squad => ({
        id: squad.id,
        name: squad.name,
        color: squad.color,
        total_points: squad.total_points || 0,
        base_points: 0,
        boost_points: 0,
        rank_change: 0,
        recent_form: []
      })) || [];
      
      setSquadStats(fallbackStats);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the sorted squad data
  const sortedSquads = useMemo(() => {
    if (!squadStats || squadStats.length === 0) return [];
    
    return [...squadStats].sort((a, b) => {
      let aValue, bValue;
      
      // Handle special cases for stats
      if (sortConfig.key === 'total_actives') {
        aValue = a.total_actives || 0;
        bValue = b.total_actives || 0;
      } else if (sortConfig.key === 'caps') {
        aValue = a.caps || 0;
        bValue = b.caps || 0;
      } else if (sortConfig.key === 'base_points') {
        aValue = a.base_points || 0;
        bValue = b.base_points || 0;
      } else if (sortConfig.key === 'boost_points') {
        aValue = a.boost_points || (a.total_points - a.base_points) || 0;
        bValue = b.boost_points || (b.total_points - b.base_points) || 0;
      } else {
        aValue = a[sortConfig.key] || 0;
        bValue = b[sortConfig.key] || 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [squadStats, sortConfig]);

  // Calculate true ranks based on total points regardless of current sort
  const trueRanks = useMemo(() => {
    if (!squadStats || squadStats.length === 0) return {};
    
    // Create a map of squad ID to rank based on total points
    const ranks = {};
    const sortedByPoints = [...squadStats].sort((a, b) => b.total_points - a.total_points);
    
    sortedByPoints.forEach((squad, index) => {
      ranks[squad.id] = index + 1;
    });
    
    return ranks;
  }, [squadStats]);

  // Handle column sorting
  const requestSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'desc' };
    });
  };

  // Get sort direction icon
  const getSortDirectionIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return null;
    }
    
    return (
      <span className="ml-1 inline-block">
        {sortConfig.direction === 'asc' ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        )}
      </span>
    );
  };
  
  // Handle squad click
  const handleSquadClick = (squadId) => {
    navigate(`/squads/${squadId}`);
  };

  // Render rank change indicator with Lucide chevron icons
  const renderRankChange = (change) => {
    if (!change || change === 0) {
      return null;
    }
    
    if (change > 0) {
      return (
        <span className="ml-1 text-emerald-500 flex items-center">
          <ChevronUp size={12} className="stroke-2" />
          <span className="font-semibold" style={{fontSize:'0.6rem'}}>{change}</span>
        </span>
      );
    }
    
    return (
      <span className="ml-1 text-rose-500 flex items-center">
        <ChevronDown size={12} className="stroke-2" />
        <span className="font-semibold" style={{fontSize:'0.6rem'}}>{Math.abs(change)}</span>
      </span>
    );
  };

  // Render recent form indicators
  const renderRecentForm = (formData) => {
    if (!formData || formData.length === 0) {
      return <span className="text-neutral-400">-</span>;
    }
    
    // Sort by most recent last (if not already sorted)
    const sortedFormData = [...formData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return (
      <div className="flex items-center space-x-1">
        {sortedFormData.slice(0, 5).map((match, index) => {
          // Color coding based on rank
          let bgColor = 'bg-neutral-300 dark:bg-neutral-700'; // Default color

          if (match.match_rank == 1) {
            bgColor = 'bg-emerald-500'; // 1st - green
          } else if (match.match_rank <= 3) {
            bgColor = 'bg-blue-500'; // Top 3 - blue
          } else if (match.match_rank <=6) {
            bgColor = 'bg-amber-500'; // Middle - yellow
          } else {
            bgColor = 'bg-red-500'; // Bottom - red
          }
          
          return (
            <div 
              key={index}
              className={`w-5 h-5 ${bgColor} rounded-md flex items-center justify-center text-xs text-white font-semibold`}
              title={`Match ${match.match_number}: Rank ${match.match_rank}`}
            >
              {match.match_rank}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          League Standings
        </h2>
      </div>
      <div className="overflow-x-auto relative">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-700 sticky top-0 z-10">
            <tr>
              {/* Rank Column - sticky on small screens */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider whitespace-nowrap sticky left-0 z-20 bg-neutral-50 dark:bg-neutral-700"
              >
                <div className="flex items-center">
                  <span>Rank</span>
                </div>
              </th>
              
              {/* Squad Column - sticky on small screens */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider sticky left-14 sm:left-16 z-20 bg-neutral-50 dark:bg-neutral-700"
              >
                <div className="flex items-center">
                  <span>Squad</span>
                </div>
              </th>
              
              {/* Points Columns - Grouped with subtle borders */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider cursor-pointer whitespace-nowrap border-l border-l-neutral-300 dark:border-l-neutral-600"
                onClick={() => requestSort('total_points')}
              >
                <div className="flex items-center">
                  <span>Total</span>
                  {getSortDirectionIcon('total_points')}
                </div>
              </th>
              
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                onClick={() => requestSort('base_points')}
              >
                <div className="flex items-center">
                  <span>Base</span>
                  {getSortDirectionIcon('base_points')}
                </div>
              </th>
              
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider cursor-pointer whitespace-nowrap border-r border-r-neutral-300 dark:border-r-neutral-600"
                onClick={() => requestSort('boost_points')}
              >
                <div className="flex items-center">
                  <span>Boost</span>
                  {getSortDirectionIcon('boost_points')}
                </div>
              </th>

              {/* Caps */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('caps')}
              >
                <div className="flex items-center">
                  <span>
                    Caps
                    {/* <CapIcon
                      size={14}
                      strokeWidth={40}
                      color='#6B7280'
                    /> */}
                  </span>
                  {getSortDirectionIcon('caps')}
                </div>
              </th>
              
              {/* Total Actives */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                onClick={() => requestSort('total_actives')}
              >
                <div className="flex items-center">
                  <span>Actives</span>
                  {getSortDirectionIcon('total_actives')}
                </div>
              </th>
              
              {/* MVP */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span>MVP</span>
                </div>
              </th>
              
              {/* Recent Form */}
              <th 
                scope="col" 
                className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span>Recent Match Ranks</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
            {isLoading ? (
              <tr>
                <td colSpan="9" className="px-6 py-4">
                  <div className="flex justify-center items-center space-x-4">
                    <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-500 dark:border-t-neutral-400 rounded-full animate-spin"></div>
                    <span className="text-neutral-500 dark:text-neutral-400">Loading stats...</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSquads.map((squad) => {
                // Calculate boost points if not already present
                const boostPoints = squad.boost_points || (squad.total_points - squad.base_points) || 0;
                
                // Get the true rank based on total points
                const trueRank = trueRanks[squad.id] || 0;
                
                return (
                  <tr 
                    key={squad.id} 
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    // onClick={() => handleSquadClick(squad.id)}
                  >
                    {/* Rank - uses true rank based on total points */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                          {trueRank}
                        </span>
                        {renderRankChange(squad.rank_change)}
                      </div>
                    </td>
                    
                    {/* Squad - sticky on small screens */}
                    <td className="px-2 sm:px-4 py-2 sm:py-2 whitespace-nowrap sticky left-14 sm:left-16 z-10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                      <div className="flex items-center">
                        <div 
                          className="h-4 w-1 mr-1 rounded-sm"
                          style={{ backgroundColor: squad.color }}
                        />
                        <span className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-white">
                          {squad.name}
                        </span>
                      </div>
                    </td>
                    
                    {/* Total Points - with subtle left border for grouping */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap border-l border-l-neutral-300 dark:border-l-neutral-600">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {squad.total_points}
                      </span>
                    </td>
                    
                    {/* Base Points */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-neutral-900 dark:text-white">
                        {squad.base_points || 0}
                      </span>
                    </td>
                    
                    {/* Boost Points - with subtle right border for grouping */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap border-r border-r-neutral-300 dark:border-r-neutral-600">
                      <span className="text-xs sm:text-sm text-neutral-900 dark:text-white">
                        {boostPoints}
                      </span>
                    </td>
                    
                    {/* Caps */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-neutral-900 dark:text-white">
                        {squad.caps || 0}
                      </span>
                    </td>
                    
                    {/* Total Actives */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-neutral-900 dark:text-white">
                        {squad.total_actives || 0}
                      </span>
                    </td>
                    
                    {/* MVP */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm text-neutral-900 dark:text-white">
                          {squad.mvp?.player_name || '-'}
                        </span>
                        {squad.mvp?.points && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {squad.mvp.points} pts
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Recent Form */}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                      {renderRecentForm(squad.recent_form)}
                    </td>
                  </tr>
                );
              })
            )}
            {(!squadStats || squadStats.length === 0) && !isLoading && (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No squads have joined this league yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;
