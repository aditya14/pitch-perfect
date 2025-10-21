import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import BoostInlineElement from '../../elements/BoostInlineElement';
import { usePlayerModal } from '../../../context/PlayerModalContext';
import { getPointsColorClass } from '../../../utils/matchUtils';

// Tooltip component for header info
const HeaderTooltip = ({ children, tooltip }) => (
  <span className="relative inline-flex group">
    {children}
    {tooltip && (
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 z-30 hidden group-hover:block px-2 py-1 rounded bg-neutral-900 text-white text-xs shadow-lg whitespace-nowrap min-w-max"
        style={{ top: '100%' }}
      >
        {tooltip}
      </span>
    )}
  </span>
);

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

  const SortableHeader = ({ label, sortKey, tooltip }) => (
    <HeaderTooltip tooltip={tooltip}>
      <div
        onClick={() => handleSort(sortKey)}
        className="cursor-pointer group flex items-center text-left"
      >
        <span>{label}</span>
        <ArrowUpDown className="h-4 w-4 ml-1 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </HeaderTooltip>
  );

  // Function to render strike rate chevrons with tooltip
  const renderSRChevrons = (sr, ballsFaced) => {
    if (!sr || ballsFaced < 10) return null;

    if (sr >= 200) {
      return (
        <HeaderTooltip tooltip="6 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (sr >= 175) {
      return (
        <HeaderTooltip tooltip="4 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (sr >= 150) {
      return (
        <HeaderTooltip tooltip="2 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    } else if (sr < 50) {
      return (
        <HeaderTooltip tooltip="-6 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
            <ChevronDown className="h-2 w-2 -mt-1" />
            <ChevronDown className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (sr < 75) {
      return (
        <HeaderTooltip tooltip="-4 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
            <ChevronDown className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (sr < 100) {
      return (
        <HeaderTooltip tooltip="-2 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    }

    return null;
  };

  // Function to render economy chevrons with tooltip
  const renderEconomyChevrons = (economy, ballsBowled) => {
    if (!economy || ballsBowled < 10) return null;

    if (economy < 5) {
      return (
        <HeaderTooltip tooltip="6 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (economy < 6) {
      return (
        <HeaderTooltip tooltip="4 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (economy < 7) {
      return (
        <HeaderTooltip tooltip="2 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    } else if (economy >= 12) {
      return (
        <HeaderTooltip tooltip="-6 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
            <ChevronDown className="h-2 w-2 -mt-1" />
            <ChevronDown className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (economy >= 11) {
      return (
        <HeaderTooltip tooltip="-4 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
            <ChevronDown className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (economy >= 10) {
      return (
        <HeaderTooltip tooltip="-2 pts">
          <span className="inline-flex flex-col text-red-500 ml-1">
            <ChevronDown className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    }

    return null;
  };

  // Function to render chevrons for runs (batting) with tooltip
  const renderRunsChevrons = (runs) => {
    if (!runs) return null;
    if (runs >= 100) {
      return (
        <HeaderTooltip tooltip="24 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (runs >= 50) {
      return (
        <HeaderTooltip tooltip="8 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    }
    return null;
  };

  // Function to render chevrons for wickets (bowling) with tooltip
  const renderWicketsChevrons = (wickets) => {
    if (!wickets) return null;
    if (wickets >= 5) {
      return (
        <HeaderTooltip tooltip="24 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
            <ChevronUp className="h-2 w-2 -mt-1" />
          </span>
        </HeaderTooltip>
      );
    } else if (wickets >= 3) {
      return (
        <HeaderTooltip tooltip="8 pts">
          <span className="inline-flex flex-col text-green-500 ml-1">
            <ChevronUp className="h-2 w-2" />
          </span>
        </HeaderTooltip>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Scroll indicator for mobile */}
      <div className="md:hidden mb-2 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1">
          <span className="mr-2">Scroll horizontally for more data</span>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[calc(100vh-12rem)] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent lg-glass-tertiary rounded-lg">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="lg-glass-tertiary sticky top-0 z-20">
            {/* Main header groups */}
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider w-20">
                Team
              </th>
              <th scope="col" className="sticky left-[60px] z-10 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider w-32">
                Player/Squad
              </th>
              
              {hasFantasyData && leagueId ? (
                <th scope="col" colSpan="3" className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider border-l dark:border-neutral-600">
                  Points
                </th>
              ) : (
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider border-l dark:border-neutral-600">
                  Points
                </th>
              )}
              
              <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider border-l dark:border-neutral-600">
                Batting
              </th>
              <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider border-l dark:border-neutral-600">
                Bowling
              </th>
              <th scope="col" colSpan="4" className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider border-l dark:border-neutral-600">
                Fielding
              </th>
            </tr>
            
            {/* Sub-headers */}
            <tr className="bg-neutral-50 dark:bg-neutral-950">
              {/* Team column */}
              <th scope="col" className="sticky left-0 z-10 bg-neutral-50 dark:bg-black px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-20">
                <SortableHeader label="Team" sortKey="team_name" />
              </th>
              
              {/* Player/Squad column */}
              <th scope="col" className="sticky left-[60px] z-10 bg-neutral-50 dark:bg-black px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-32">
                <div className="flex flex-col">
                  <SortableHeader label="Player" sortKey="player_name" />
                  <SortableHeader label="Squad" sortKey="squad_name" />
                </div>
              </th>
              
              {/* Points columns - different based on fantasy/non-fantasy */}
              {hasFantasyData && leagueId ? (
                <>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider font-bold w-16 border-l dark:border-neutral-600">
                    <SortableHeader label="Total" sortKey="fantasy_points" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-16">
                    <SortableHeader label="Base" sortKey="base_points" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-16">
                    <SortableHeader label="Boost" sortKey="boost_points" />
                  </th>
                </>
              ) : (
                <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider font-bold w-16 border-l dark:border-neutral-600">
                  <SortableHeader label="Total" sortKey="total_points_all" />
                </th>
              )}
              
              {/* Batting subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12 border-l dark:border-neutral-600">
                <SortableHeader label="R" sortKey="bat_runs" tooltip="1 pt per run" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="B" sortKey="bat_balls" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="4s" sortKey="bat_fours" tooltip="1 pt per four" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="6s" sortKey="bat_sixes" tooltip="2 pts per six" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="SR" sortKey="bat_strike_rate" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="batting_points_total" />
              </th>
              
              {/* Bowling subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12 border-l dark:border-neutral-600">
                <SortableHeader label="O" sortKey="bowl_balls" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="M" sortKey="bowl_maidens" tooltip="8 pts per maiden" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="R" sortKey="bowl_runs" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="W" sortKey="bowl_wickets" tooltip="25 pts per wicket" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="Econ" sortKey="bowl_economy" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="bowling_points_total" />
              </th>
              
              {/* Fielding subheaders */}
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12 border-l dark:border-neutral-600">
                <SortableHeader label="Ct" sortKey="field_catch" tooltip="8 pts per catch" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="RO" sortKey="run_out_solo" tooltip="8 pts per run out" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="St" sortKey="wk_stumping" tooltip="12 pts per stumping" />
              </th>
              <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 tracking-wider w-12">
                <SortableHeader label="Pts" sortKey="fielding_points_total" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-900">
            {processedEvents.length === 0 ? (
              <tr>
                <td 
                  colSpan={hasFantasyData && leagueId ? 20 : 18} 
                  className="px-3 py-2 text-center text-xs text-neutral-500 dark:text-neutral-400"
                >
                  No player data available for this match
                </td>
              </tr>
            ) : (
              processedEvents.map((data, index) => {
                const isActiveSquadPlayer = activeSquadId && data.squad_id === activeSquadId;
                const rowId = `row-${data.id || data.player_id || index}`;
                
                return (
                  <tr 
                    key={rowId} 
                    className="hover:bg-neutral-50 dark:hover:bg-black"
                    style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                  >
                    {/* Team info */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-black px-2 py-2 whitespace-nowrap text-xs text-neutral-900 dark:text-white font-medium"
                        style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      {data.team_name}
                    </td>
                    
                    {/* Player/Squad info */}
                    <td className="sticky left-[60px] z-10 bg-white dark:bg-black px-2 py-2 whitespace-nowrap"
                        style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      <div 
                        className="text-xs text-neutral-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                        onClick={() => openPlayerModal(data.player_id, leagueId)}
                      >
                        {data.player_name} {data.player_of_match && '🏅'}
                      </div>
                      {data.squad_name && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
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
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left font-bold text-neutral-900 dark:text-white font-number border-l dark:border-neutral-600">
                          {data.fantasy_points}
                        </td>
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white">
                          <span className={getPointsColorClass(data.base_points)}>
                            {data.base_points}
                          </span>
                        </td>
                        <td className={`px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white ${data.boost_label ? 'font-medium' : 'opacity-10'}`}> 
                          {data.boost_label ? data.boost_points : '-'}
                        </td>
                      </>
                    ) : (
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left border-l dark:border-neutral-600 font-number font-bold">
                        <span className={getPointsColorClass(data.total_points_all)}>
                          {data.total_points_all}
                        </span>
                      </td>
                    )}
                    
                    {/* Batting stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white border-l dark:border-neutral-600
                      ${data.bat_balls ? 'font-medium' : 'opacity-10'}
                    `}>
                      <div className="flex items-center">
                        {data.bat_balls ? `${data.bat_runs}${data.bat_not_out ? '*' : ''}` : '-'}
                        {renderRunsChevrons(data.bat_runs)}
                      </div>
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-10'}
                    `}>
                      {data.bat_balls ? data.bat_balls : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-10'}
                    `}>
                      {(data.bat_balls && data.bat_balls > 0) ? data.bat_fours : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-10'}
                    `}>
                      {(data.bat_balls && data.bat_balls > 0) ? data.bat_sixes : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bat_balls && 'opacity-10'}
                    `}>
                      <div className="flex items-center">
                        {(data.bat_balls > 0) ? data.bat_strike_rate?.toFixed(2) : '-'}
                        {renderSRChevrons(data.bat_strike_rate, data.bat_balls)}
                      </div>
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white">
                      {data.bat_balls ? data.batting_points_total : '-'}
                    </td>
                    
                    {/* Bowling stats */}
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight border-l dark:border-neutral-600
                      ${!data.bowl_balls && 'opacity-10'}
                    `}>
                      {data.bowl_balls ? 
                        `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}` 
                        : '-'
                      }
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bowl_balls && 'opacity-10'}
                    `}>
                      {data.bowl_balls ? data.bowl_maidens : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white font-extralight
                      ${!data.bowl_runs && 'opacity-10'}
                    `}>
                      {data.bowl_runs ? data.bowl_runs : '-'}
                    </td>
                    <td className={`
                      px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white
                      ${data.bowl_wickets ? 'font-medium' : data.bowl_balls ? '' : 'opacity-10'}
                    `}>
                      <div className="flex items-center">
                        {data.bowl_wickets ? data.bowl_wickets : data.bowl_balls ? 0 : '-'}
                        {renderWicketsChevrons(data.bowl_wickets)}
                      </div>
                    </td>
                    <td className={`px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white ${!data.bowl_balls && 'opacity-10'}`}>
                      <div className="flex items-center">
                        {data.bowl_economy ? data.bowl_economy?.toFixed(2) : '-'}
                        {renderEconomyChevrons(data.bowl_economy, data.bowl_balls)}
                      </div>
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white">
                      {data.bowling_points_total || '-'}
                    </td>
                    
                    {/* Fielding stats */}
                    <td className={`px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white border-l dark:border-neutral-600 ${(!data.field_catch && !data.wk_catch) && 'opacity-10'}`}>
                      {(data.field_catch || 0) + (data.wk_catch || 0) || '-'}
                    </td>
                    <td className={`px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white ${(!data.run_out_solo && !data.run_out_collab) && 'opacity-10'}`}>
                      {(data.run_out_solo || 0) + (data.run_out_collab || 0) || '-'}
                    </td>
                    <td className={`px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white ${!data.wk_stumping && 'opacity-10'}`}>
                      {data.wk_stumping || '-'}
                    </td>
                    <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-neutral-900 dark:text-white">
                      {data.fielding_points_total || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DetailedMatchPerformance;