// TradeForm.js - updated with cleaner squad indicators and improved UI
import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import { X, CheckCircle, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

const TradeForm = ({ league, onClose, onTradeCreated }) => {
  // Core Squad role mappings based on your app documentation
  const BOOST_ROLE_NAMES = {
    1: "Captain",
    2: "Vice Captain",
    3: "Slogger",
    4: "Accumulator", 
    5: "Safe Hands",
    6: "Rattler",
    7: "Constrictor",
    8: "Virtuoso"
  };

  // Define role restrictions for each boost role
  const ROLE_RESTRICTIONS = {
    1: ['BAT', 'BOWL', 'ALL', 'WK'], // Captain - Any role
    2: ['BAT', 'BOWL', 'ALL', 'WK'], // Vice Captain - Any role
    3: ['BAT', 'WK'], // Slogger - BAT or WK only
    4: ['BAT', 'WK'], // Accumulator - BAT or WK only
    5: ['WK'],       // Safe Hands - WK only
    6: ['BOWL'],     // Rattler - BOWL only
    7: ['BOWL'],     // Constrictor - BOWL only
    8: ['ALL']       // Virtuoso - ALL only
  };

  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [theirPlayers, setTheirPlayers] = useState([]);
  const [tradePairs, setTradePairs] = useState([]); 
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [coreSquadRoles, setCoreSquadRoles] = useState({});
  const [warningMessage, setWarningMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Get squad color from league props
  const mySquadColor = league?.my_squad?.color || '#6366F1'; // Default to indigo if no color
  const theirSquadColor = selectedSquad?.color || '#9333EA'; // Default to purple if no color

  // Helper function to determine appropriate text color for a background
  const getTextColorForBackground = (backgroundColor) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  useEffect(() => {
    fetchSquads();
  }, []);

  useEffect(() => {
    // Check for role warnings whenever trade pairs change
    checkRoleWarnings();
    // Validate role restrictions
    validateRoleRestrictions();
  }, [tradePairs]);

  const fetchSquads = async () => {
    try {
      if (league && league.squads) {
        // Just filter out user's own squad - all teams in league.teams are already in the correct league
        const otherSquads = league.squads.filter(
          (squad) => squad.id !== league.my_squad.id
        );
        setSquads(otherSquads);
        setLoading(false);
      } else {
        // Fallback case (should rarely happen)
        setSquads([]);
        setLoading(false);
      }
  
      // Fetch current core squad roles
      fetchCoreSquadRoles();
    } catch (error) {
      console.error('Error fetching squads:', error);
      setLoading(false);
      setError('Failed to load teams for trading');
    }
  };

  const fetchCoreSquadRoles = async () => {
    try {
      // Fetch my squad details to get core squad assignments
      const response = await api.get(`/squads/${league.my_squad.id}/`);
      const squad = response.data;
      
      if (squad.current_core_squad) {
        // Create a mapping of player_id to role
        const roleMap = {};
        squad.current_core_squad.forEach(assignment => {
          roleMap[assignment.player_id] = assignment.boost_id;
        });
        setCoreSquadRoles(roleMap);
      }
    } catch (error) {
      console.error('Error fetching core squad roles:', error);
    }
  };

  const getBoostRoleName = (boostId) => {
    return BOOST_ROLE_NAMES[boostId] || `Role #${boostId}`;
  };

  const fetchSquadPlayers = async (squadId) => {
    try {
      const response = await api.get(`/squads/${squadId}/players/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching players for squad ${squadId}:`, error);
      setError(`Failed to load players for squad ${squadId}`);
      return [];
    }
  };

  const handleSquadSelect = async (squad) => {
    setSelectedSquad(squad);
    setTradePairs([]);
    setError(null);
    setWarningMessage(null);
    setValidationErrors({});

    // Fetch both squads' players simultaneously
    const [myPlayersList, theirPlayersList] = await Promise.all([
      fetchSquadPlayers(league.my_squad.id),
      fetchSquadPlayers(squad.id)
    ]);

    setMyPlayers(myPlayersList);
    setTheirPlayers(theirPlayersList);
  };

  const handleAddTradePair = () => {
    setTradePairs([...tradePairs, { myPlayer: null, theirPlayer: null }]);
    setWarningMessage(null);
    setValidationErrors({});
  };

  const handleRemoveTradePair = (index) => {
    const newPairs = [...tradePairs];
    newPairs.splice(index, 1);
    setTradePairs(newPairs);
    
    // Clear validation errors for this pair
    const newValidationErrors = {...validationErrors};
    delete newValidationErrors[index];
    setValidationErrors(newValidationErrors);
    
    setWarningMessage(null);
  };

  const validateRoleRestrictions = () => {
    const newErrors = {};
    
    tradePairs.forEach((pair, index) => {
      const { myPlayer, theirPlayer } = pair;
      
      if (myPlayer && theirPlayer && coreSquadRoles[myPlayer]) {
        const boostId = coreSquadRoles[myPlayer];
        const roleRestrictions = ROLE_RESTRICTIONS[boostId] || [];
        const theirPlayerData = getPlayerById(theirPlayer, 'theirPlayer');
        
        if (!roleRestrictions.includes(theirPlayerData.role)) {
          const myPlayerData = getPlayerById(myPlayer, 'myPlayer');
          newErrors[index] = {
            message: `${theirPlayerData.name} cannot be assigned as ${getBoostRoleName(boostId)} because this role requires a ${getReadableRoleRestrictions(boostId)} player.`
          };
        }
      }
    });
    
    setValidationErrors(newErrors);
  };

  const getReadableRoleRestrictions = (boostId) => {
    const restrictions = ROLE_RESTRICTIONS[boostId] || [];
    if (restrictions.length === 4) return "any role";
    
    const roleNames = {
      'BAT': 'Batter',
      'BOWL': 'Bowler',
      'ALL': 'All-Rounder',
      'WK': 'Wicket Keeper'
    };
    
    const readableRoles = restrictions.map(r => roleNames[r]);
    
    if (readableRoles.length === 1) {
      return readableRoles[0];
    } else if (readableRoles.length === 2) {
      return `${readableRoles[0]} or ${readableRoles[1]}`;
    } else {
      const last = readableRoles.pop();
      return `${readableRoles.join(', ')}, or ${last}`;
    }
  };

  const updateTradePair = (index, side, playerId) => {
    const newPairs = [...tradePairs];
    
    // If this player is already selected in another pair, remove it
    newPairs.forEach((pair, i) => {
      if (i !== index && pair[side] === playerId) {
        pair[side] = null;
      }
    });
    
    // Update the selected pair
    newPairs[index][side] = playerId;
    setTradePairs(newPairs);
    
    // Clear existing validation error for this pair
    if (validationErrors[index]) {
      const newValidationErrors = {...validationErrors};
      delete newValidationErrors[index];
      setValidationErrors(newValidationErrors);
    }
  };

  const checkRoleWarnings = () => {
    // Check if any of the selected players have core squad roles
    const warnings = [];
    
    tradePairs.forEach((pair) => {
      const { myPlayer, theirPlayer } = pair;
      
      if (myPlayer && coreSquadRoles[myPlayer]) {
        const roleId = coreSquadRoles[myPlayer];
        const roleName = getBoostRoleName(roleId);
        const theirPlayerName = theirPlayer ? getPlayerById(theirPlayer, 'theirPlayer').name : 'new player';
        const myPlayerName = getPlayerById(myPlayer, 'myPlayer').name;
        
        warnings.push(
          `${myPlayerName} is currently assigned as your ${roleName}. If this trade is accepted, ${theirPlayerName} will inherit this role.`
        );
      }
    });
    
    if (warnings.length > 0) {
      setWarningMessage(warnings.join(' '));
    } else {
      setWarningMessage(null);
    }
  };

  const isPlayerSelected = (playerId, side) => {
    return tradePairs.some(pair => pair[side] === playerId);
  };

  const handleSubmit = async () => {
    // Validate all pairs are complete
    if (tradePairs.some(pair => pair.myPlayer === null || pair.theirPlayer === null)) {
      setError('All trade pairs must have players selected on both sides');
      return;
    }

    if (tradePairs.length === 0) {
      setError('You must create at least one trade pair');
      return;
    }

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      setError('There are role restriction errors. Please fix them before proceeding.');
      return;
    }

    try {
      // Extract players in correct order for API
      const players_given = tradePairs.map(pair => pair.myPlayer);
      const players_received = tradePairs.map(pair => pair.theirPlayer);

      await api.post('/trades/', {
        initiator: league.my_squad.id,
        receiver: selectedSquad.id,
        players_given,
        players_received
      });

      setSuccess(true);
      setTimeout(() => {
        onTradeCreated();
      }, 1500);
    } catch (error) {
      console.error('Error creating trade:', error);
      setError(error.response?.data?.error || 'Failed to create trade');
    }
  };

  const getPlayerRole = (player) => {
    const roles = {
      'BAT': 'Batter',
      'BOWL': 'Bowler',
      'ALL': 'All-Rounder',
      'WK': 'Wicket Keeper'
    };
    return roles[player.role] || player.role;
  };

  const getPlayerById = (id, side) => {
    const playerList = side === 'myPlayer' ? myPlayers : theirPlayers;
    return playerList.find(player => player.id === id) || {};
  };

  const renderPlayerCard = (player, isSelected, onSelect, disabled = false, side = 'myPlayer') => {
    // Choose different styling based on whether it's my player or their player
    const isMyPlayer = side === 'myPlayer';
    const bgColorSelected = isMyPlayer 
      ? 'bg-indigo-50 dark:bg-indigo-900/30' 
      : 'bg-purple-50 dark:bg-purple-900/30';
    const borderColorSelected = isMyPlayer 
      ? 'border-indigo-500 dark:border-indigo-400' 
      : 'border-purple-500 dark:border-purple-400';
    const iconColor = isMyPlayer 
      ? 'text-indigo-500 dark:text-indigo-400' 
      : 'text-purple-500 dark:text-purple-400';
    const badgeColor = isMyPlayer ? mySquadColor : theirSquadColor;
    const badgeTextColor = getTextColorForBackground(badgeColor);
    
    return (
      <div 
        key={player.id}
        onClick={() => !disabled && onSelect(player.id)}
        className={`
          flex items-center p-3 border rounded-lg transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isSelected ? 
            `${borderColorSelected} ${bgColorSelected}` : 
            'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'}
        `}
      >
        <div className="ml-3 flex-grow">
          <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center">
            {player.name}
            {/* Core Squad Role Indicator with squad color */}
            {coreSquadRoles[player.id] && (
              <span 
                className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  width: 'fit-content', 
                  backgroundColor: badgeColor, 
                  color: badgeTextColor
                }}
              >
                {getBoostRoleName(coreSquadRoles[player.id])}
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {getPlayerRole(player)}
          </p>
        </div>
        <div className="ml-auto">
          {isSelected && (
            <CheckCircle className={`h-5 w-5 ${iconColor}`} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
            Propose New Trade
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-2 text-neutral-500 dark:text-neutral-400">Loading teams...</p>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <p className="mt-2 text-xl font-medium text-neutral-900 dark:text-white">Trade Proposed!</p>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">Your trade proposal has been sent.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {warningMessage && (
                <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ShieldAlert className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Core Squad Role Warning
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                        {warningMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedSquad ? (
                <>
                  <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">
                    Select a team to trade with:
                  </h4>
                  {squads.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                      <p className="text-neutral-500 dark:text-neutral-400">
                        No teams available for trading in this league.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {squads.map((squad) => (
                        <div
                          key={squad.id}
                          onClick={() => handleSquadSelect(squad)}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-2 h-6 rounded-md mr-3"
                              style={{ 
                                backgroundColor: squad.color || '#9333EA'
                              }}
                            ></div>
                            <div>
                              <p className="text-md font-medium text-neutral-900 dark:text-white">
                                {squad.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center">
                      <h4 className="text-md font-semibold text-neutral-900 dark:text-white mr-2">
                        Trading with:
                      </h4>
                      <div 
                        className="w-1.5 h-4 rounded-md mr-2"
                        style={{ 
                          backgroundColor: selectedSquad.color || '#9333EA'
                        }}
                      ></div>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {selectedSquad.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedSquad(null)}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      ← Back to team selection
                    </button>
                  </div>
                  
                  {/* Trade Pairs */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <h5 className="text-md font-medium text-neutral-900 dark:text-white">Trade Pairs</h5>
                        <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                          ({tradePairs.length} {tradePairs.length === 1 ? 'pair' : 'pairs'})
                        </span>
                      </div>
                      <button 
                        onClick={handleAddTradePair}
                        className="px-3 py-1.5 text-sm bg-neutral-600 hover:bg-neutral-700 text-white rounded-md"
                      >
                        Add Pair
                      </button>
                    </div>
                    
                    {tradePairs.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                        <p className="text-neutral-500 dark:text-neutral-400">
                          Click "Add Pair" to create a player trade pairing
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {tradePairs.map((pair, index) => (
                          <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-medium text-neutral-900 dark:text-white">
                                Trade Pair #{index + 1}
                              </h6>
                              <button
                                onClick={() => handleRemoveTradePair(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            
                            {/* Role Validation Error */}
                            {validationErrors[index] && (
                              <div className="mb-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500 p-3">
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  {validationErrors[index].message}
                                </p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                              {/* My Player (You Give) */}
                              <div className="md:col-span-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center mb-2">
                                    <div 
                                      className="w-1 h-4 rounded-sm mr-2"
                                      style={{ 
                                        backgroundColor: mySquadColor 
                                      }}
                                    ></div>
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                      You Give:
                                    </p>
                                  </div>
                                  
                                  {pair.myPlayer ? (
                                    renderPlayerCard(
                                      getPlayerById(pair.myPlayer, 'myPlayer'),
                                      true,
                                      () => updateTradePair(index, 'myPlayer', null),
                                      false,
                                      'myPlayer'
                                    )
                                  ) : (
                                    <div 
                                      className="border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                      onClick={() => {
                                        // Open player selector
                                        document.getElementById(`my-player-selector-${index}`).classList.remove('hidden');
                                      }}
                                    >
                                      <p className="text-neutral-500 dark:text-neutral-400">
                                        Select your player
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div id={`my-player-selector-${index}`} className="hidden mt-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                    <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Select a player from your team</p>
                                      <button
                                        onClick={() => {
                                          document.getElementById(`my-player-selector-${index}`).classList.add('hidden');
                                        }}
                                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="p-2 space-y-2">
                                      {myPlayers.map((player) => (
                                        renderPlayerCard(
                                          player,
                                          pair.myPlayer === player.id,
                                          (playerId) => {
                                            updateTradePair(index, 'myPlayer', playerId);
                                            document.getElementById(`my-player-selector-${index}`).classList.add('hidden');
                                          },
                                          isPlayerSelected(player.id, 'myPlayer'),
                                          'myPlayer'
                                        )
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-center md:col-span-1">
                                <div className="flex items-center">
                                  <ArrowRight className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                                </div>
                              </div>
                              
                              {/* Their Player (You Receive) */}
                              <div className="md:col-span-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center mb-2">
                                    <div 
                                      className="w-1 h-4 rounded-sm mr-2"
                                      style={{ 
                                        backgroundColor: theirSquadColor 
                                      }}
                                    ></div>
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                      You Receive:
                                    </p>
                                  </div>
                                  
                                  {pair.theirPlayer ? (
                                    renderPlayerCard(
                                      getPlayerById(pair.theirPlayer, 'theirPlayer'),
                                      true,
                                      () => updateTradePair(index, 'theirPlayer', null),
                                      false,
                                      'theirPlayer'
                                    )
                                  ) : (
                                    <div 
                                      className="border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                      onClick={() => {
                                        // Open player selector
                                        document.getElementById(`their-player-selector-${index}`).classList.remove('hidden');
                                      }}
                                    >
                                      <p className="text-neutral-500 dark:text-neutral-400">
                                        Select their player
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div id={`their-player-selector-${index}`} className="hidden mt-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                    <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Select a player from {selectedSquad.name}</p>
                                      <button
                                        onClick={() => {
                                          document.getElementById(`their-player-selector-${index}`).classList.add('hidden');
                                        }}
                                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="p-2 space-y-2">
                                      {theirPlayers.map((player) => (
                                        renderPlayerCard(
                                          player,
                                          pair.theirPlayer === player.id,
                                          (playerId) => {
                                            updateTradePair(index, 'theirPlayer', playerId);
                                            document.getElementById(`their-player-selector-${index}`).classList.add('hidden');
                                          },
                                          isPlayerSelected(player.id, 'theirPlayer'),
                                          'theirPlayer'
                                        )
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          {selectedSquad && !success && (
            <button
              onClick={handleSubmit}
              disabled={
                tradePairs.length === 0 || 
                tradePairs.some(pair => !pair.myPlayer || !pair.theirPlayer) ||
                Object.keys(validationErrors).length > 0
              }
              className={`ml-3 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${
                  tradePairs.length === 0 || 
                  tradePairs.some(pair => !pair.myPlayer || !pair.theirPlayer) ||
                  Object.keys(validationErrors).length > 0
                    ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed'
                    : 'bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-500 dark:hover:bg-neutral-600'
                }`}
            >
              Propose Trade
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeForm;