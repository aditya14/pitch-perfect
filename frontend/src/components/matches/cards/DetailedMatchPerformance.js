import React, { useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import TeamBadge from '../../elements/TeamBadge';
import BoostInlineElement from '../../elements/BoostInlineElement';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { getPointsColorClass } from '../../../utils/matchUtils';

const DetailedMatchPerformance = ({ 
  processedEvents, 
  handleSort, 
  sortConfig, 
  hasFantasyData, 
  leagueId, 
  activeSquadId,
  isMobile
}) => {
  const { openPlayerModal } = usePlayerModal();
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRowExpand = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const SortableHeader = ({ label, sortKey }) => (
    <div
      onClick={() => handleSort(sortKey)}
      className="cursor-pointer group flex items-center text-left"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  return (
    <div className="overflow-x-auto max-h-[calc(100vh-12rem)]">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
          {/* Main header groups - Desktop view */}
          {!isMobile && (
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                Team
              </th>
              <th scope="col" className="sticky left-[84px] z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                Player/Squad
              </th>
              
              {hasFantasyData && leagueId ? (
                <th scope="col" colSpan="3" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                  Points
                </th>
              ) : (
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                  Points
                </th>
              )}
              
              <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                Batting
              </th>
              <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                Bowling
              </th>
              <th scope="col" colSpan="4" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                Fielding
              </th>
            </tr>
          )}
          
          {/* Mobile view simplified header - smaller with less space */}
          {isMobile && (
            <tr>
              <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                <SortableHeader label="Team" sortKey="team_name" />
              </th>
              <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                <SortableHeader label="Player" sortKey="squad_name" />
              </th>
              {hasFantasyData && leagueId ? (
                <>
                  <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                    <SortableHeader label="Base" sortKey="base_points" />
                  </th>
                  <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                    <SortableHeader label="Bst" sortKey="boost_points" />
                  </th>
                  <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                    <SortableHeader label="Tot" sortKey="fantasy_points" />
                  </th>
                </>
              ) : (
                <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <SortableHeader label="Total" sortKey="total_points_all" />
                </th>
              )}
              <th scope="col" className="w-8"></th>
            </tr>
          )}
          
          {/* Sub-headers - Desktop view */}
          {!isMobile && (
            <tr className="bg-gray-50 dark:bg-gray-700">
              {/* Team column */}
              <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-20">
                <SortableHeader label="Team" sortKey="team_name" />
              </th>
              
              {/* Player/Squad column */}
              <th scope="col" className="sticky left-[84px] z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-32">
                <div className="flex flex-col">
                  <SortableHeader label="Player" sortKey="player_name" />
                  <SortableHeader label="Squad" sortKey="squad_name" />
                </div>
              </th>
              
              {/* Points columns - different based on fantasy/non-fantasy */}
              {hasFantasyData && leagueId ? (
                <>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16 border-l dark:border-gray-600">
                    <SortableHeader label="Base" sortKey="base_points" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16">
                    <SortableHeader label="Boost" sortKey="boost_points" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider font-bold w-16">
                    <SortableHeader label="Total" sortKey="fantasy_points" />
                  </th>
                </>
              ) : (
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16 border-l dark:border-gray-600">
                  <SortableHeader label="Total" sortKey="total_points_all" />
                </th>
              )}
              
              {/* Batting subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                <SortableHeader label="R" sortKey="bat_runs" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="B" sortKey="bat_balls" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="4s" sortKey="bat_fours" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="6s" sortKey="bat_sixes" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="SR" sortKey="bat_strike_rate" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="batting_points_total" />
              </th>
              
              {/* Bowling subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                <SortableHeader label="O" sortKey="bowl_balls" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="M" sortKey="bowl_maidens" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="R" sortKey="bowl_runs" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="W" sortKey="bowl_wickets" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="Econ" sortKey="bowl_economy" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="bowling_points_total" />
              </th>
              
              {/* Fielding subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                <SortableHeader label="Ct" sortKey="field_catch" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="RO" sortKey="run_out_solo" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="St" sortKey="wk_stumping" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="fielding_points_total" />
              </th>
            </tr>
          )}
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {processedEvents.length === 0 ? (
            <tr>
              <td 
                colSpan={isMobile ? (hasFantasyData && leagueId ? 6 : 4) : (hasFantasyData && leagueId ? 20 : 18)} 
                className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                No player data available for this match
              </td>
            </tr>
          ) : (
            processedEvents.map((data, index) => {
              const isActiveSquadPlayer = activeSquadId && data.squad_id === activeSquadId;
              const rowId = `row-${data.id || data.player_id || index}`;
              const isExpanded = expandedRows[rowId] || false;
              
              // Desktop view - full row
              if (!isMobile) {
                return (
                  <tr 
                    key={rowId} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                  >
                    {/* Team info */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-medium"
                        style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      {data.team_name}
                    </td>
                    
                    {/* Player/Squad info */}
                    <td className="sticky left-[84px] z-10 bg-white dark:bg-gray-800 px-2 py-2 whitespace-nowrap"
                        style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      <div 
                        className="text-xs text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => openPlayerModal(data.player_id, leagueId)}
                      >
                        {data.player_name} {data.player_of_match && '🏅'}
                      </div>
                      {data.squad_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <div 
                            className="h-3 w-1 mr-1 rounded-sm"
                            style={{ backgroundColor: data.squad_color }}
                          />
                          <span>{data.squad_name}</span>
                          
                          {data.boost_label && (
                            <span className="ml-1">
                              <BoostInlineElement
                                boostName={data.boost_label} 
                                color={data.squad_color} 
                                showLabel={false} 
                                size="S" 
                              />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {/* Points columns - different based on fantasy/non-fantasy */}
                    {hasFantasyData && leagueId ? (
                      <>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600">
                          <span className={getPointsColorClass(data.base_points)}>
                            {data.base_points}
                          </span>
                        </td>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                          {data.boost_points > 0 ? data.boost_points : '-'}
                        </td>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left font-bold text-gray-900 dark:text-white">
                          {data.fantasy_points}
                        </td>
                      </>
                    ) : (
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left border-l dark:border-gray-600">
                        <span className={`font-bold ${getPointsColorClass(data.total_points_all)}`}>
                          {data.total_points_all}
                        </span>
                      </td>
                    )}
                    
                    {/* Batting stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600
                      ${data.bat_runs ? 'font-medium' : 'opacity-30'}
                    `}>
                      {data.bat_runs ? data.bat_runs : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-30'}
                    `}>
                      {data.bat_balls ? data.bat_balls : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${!data.bat_fours && 'opacity-30'}
                    `}>
                      {data.bat_fours ? data.bat_fours : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${!data.bat_sixes && 'opacity-30'}
                    `}>
                      {data.bat_sixes ? data.bat_sixes : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${!data.bat_strike_rate && 'opacity-30'}
                    `}>
                      {data.bat_strike_rate ? data.bat_strike_rate?.toFixed(2) : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {data.batting_points_total || '-'}
                    </td>
                    
                    {/* Bowling stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight border-l dark:border-gray-600
                      ${!data.bowl_balls && 'opacity-30'}
                    `}>
                      {data.bowl_balls ? 
                        `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}` 
                        : '-'
                      }
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${(!data.bowl_maidens && !data.bowl_balls) && 'opacity-30'}
                    `}>
                      {data.bowl_maidens ? data.bowl_maidens : data.bowl_balls ? 0 : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                      ${!data.bowl_runs && 'opacity-30'}
                    `}>
                      {data.bowl_runs ? data.bowl_runs : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white
                      ${data.bowl_wickets ? 'font-medium' : data.bowl_balls ? '' : 'opacity-30'}
                    `}>
                      {data.bowl_wickets ? data.bowl_wickets : data.bowl_balls ? 0 : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {data.bowl_economy ? data.bowl_economy?.toFixed(2) : '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {data.bowling_points_total || '-'}
                    </td>
                    
                    {/* Fielding stats */}
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600">
                      {(data.field_catch || 0) + (data.wk_catch || 0) || '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {(data.run_out_solo || 0) + (data.run_out_collab || 0) || '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {data.wk_stumping || '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                      {data.fielding_points_total || '-'}
                    </td>
                  </tr>
                );
              }
              
              // Mobile view - collapsed/expanded rows
              return (
                <React.Fragment key={rowId}>
                  {/* Main row - always visible */}
                  <tr 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                  >
                    <td className="px-1 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                      {data.team_name}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap">
                      <div 
                        className="text-xs text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => openPlayerModal(data.player_id, leagueId)}
                      >
                        {data.player_name} {data.player_of_match && '🏅'}
                      </div>
                      {data.squad_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <div 
                              className="w-1 h-3 mr-1 rounded-sm"
                              style={{ backgroundColor: data.squad_color }}
                            />
                            <span>{data.squad_name}</span>
                          </div>
                          {data.boost_label && (
                            <div className="mt-1">
                              <BoostInlineElement
                                boostName={data.boost_label} 
                                color={data.squad_color} 
                                showLabel={true} 
                                size="S" 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {/* Points columns - different based on fantasy/non-fantasy */}
                    {hasFantasyData && leagueId ? (
                      <>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                          <span className={getPointsColorClass(data.base_points)}>
                            {data.base_points}
                          </span>
                        </td>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                          {data.boost_points > 0 ? data.boost_points : '-'}
                        </td>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left font-bold">
                          {data.fantasy_points}
                        </td>
                      </>
                    ) : (
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                        <span className={`font-bold ${getPointsColorClass(data.total_points_all)}`}>
                          {data.total_points_all}
                        </span>
                      </td>
                    )}
                    
                    {/* Smaller expand/collapse button */}
                    <td className="px-0 py-2 text-center">
                      <button 
                        onClick={() => toggleRowExpand(rowId)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                      >
                        {isExpanded ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded details - only visible when expanded */}
                  {isExpanded && (
                    <tr 
                      className="bg-gray-50 dark:bg-gray-700" 
                      style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}22` } : {}}
                    >
                      <td colSpan={hasFantasyData && leagueId ? 6 : 4} className="px-4 py-2">
                        <div className="grid grid-cols-1 gap-2">
                          {/* Batting stats */}
                          {data.bat_runs > 0 && (
                            <div className="border-b border-gray-200 dark:border-gray-600 pb-2">
                              <div className="flex justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">BATTING</span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.batting_points_total} pts</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <div className="text-sm text-gray-800 dark:text-gray-200">
                                  <span className="font-medium">{data.bat_runs}({data.bat_balls})</span> 
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    {data.bat_fours > 0 && `${data.bat_fours}×4`}{data.bat_fours > 0 && data.bat_sixes > 0 && ', '}
                                    {data.bat_sixes > 0 && `${data.bat_sixes}×6`}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  SR: {data.bat_strike_rate?.toFixed(2) || '-'}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Bowling stats */}
                          {data.bowl_balls > 0 && (
                            <div className="border-b border-gray-200 dark:border-gray-600 pb-2">
                              <div className="flex justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">BOWLING</span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.bowling_points_total} pts</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {data.bowl_wickets}/{data.bowl_runs} ({Math.floor(data.bowl_balls / 6)}.
                                  {data.bowl_balls % 6})
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Econ: {data.bowl_economy?.toFixed(2) || '-'}
                                  {data.bowl_maidens > 0 && `, ${data.bowl_maidens} maiden${data.bowl_maidens > 1 ? 's' : ''}`}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Fielding stats */}
                          {((data.field_catch > 0) || (data.wk_catch > 0) || (data.run_out_solo > 0) || 
                            (data.run_out_collab > 0) || (data.wk_stumping > 0)) && (
                            <div>
                              <div className="flex justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">FIELDING</span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.fielding_points_total} pts</span>
                              </div>
                              <div className="text-sm mt-1 text-gray-800 dark:text-gray-200">
                                {data.field_catch > 0 && <span className="mr-2">{data.field_catch} catch{data.field_catch !== 1 && 'es'}</span>}
                                {data.wk_catch > 0 && <span className="mr-2">{data.wk_catch} wk catch{data.wk_catch !== 1 && 'es'}</span>}
                                {data.wk_stumping > 0 && <span className="mr-2">{data.wk_stumping} stumping{data.wk_stumping !== 1 && 's'}</span>}
                                {data.run_out_solo > 0 && <span className="mr-2">{data.run_out_solo} run out{data.run_out_solo !== 1 && 's'}</span>}
                                {data.run_out_collab > 0 && <span>{data.run_out_collab} assist{data.run_out_collab !== 1 && 's'}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DetailedMatchPerformance;