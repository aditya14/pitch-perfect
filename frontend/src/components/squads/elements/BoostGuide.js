import React from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

// Import the getRoleIcon function or define it here
import { getRoleIcon } from '../../../utils/roleUtils';

const BoostGuide = ({ boostRoles, showGuide, setShowGuide, squadColor }) => {
  if (!Array.isArray(boostRoles) || boostRoles.length === 0) {
    return null;
  }

  // Helper function to format multipliers into grouped format
  const formatMultipliers = (multipliers) => {
    if (!multipliers) return {};
    
    // For Captain and Vice-Captain, use simplified format
    if (Object.values(multipliers).every(val => val === 2)) {
      return { simplified: "2× All", multiplier: 2 };
    }
    if (Object.values(multipliers).every(val => val === 1.5)) {
      return { simplified: "1.5× All", multiplier: 1.5 };
    }
    
    // For other roles, group by multiplier value
    const grouped = { "1.5": [], "2": [] };
    
    Object.entries(multipliers).forEach(([key, value]) => {
      if (value === 1.5) {
        grouped["1.5"].push(key);
      } else if (value === 2) {
        grouped["2"].push(key);
      }
    });
    
    return grouped;
  };
  
  // Format stat name for display
  const formatStatName = (stat) => {
    return stat.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-neutral-950 shadow rounded-lg p-6 mb-6">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex justify-between items-center mb-4"
      >
        <div className="flex items-center">
          <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Boost Guide</h2>
        </div>
        {showGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {showGuide && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
          {boostRoles.map(role => {
            const formattedMultipliers = formatMultipliers(role.multipliers);
            
            return (
              <div key={role.id} className="flex items-start">
                <div className="h-8 w-8 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 mr-3 flex-shrink-0">
                  <div className="flex items-center justify-center">
                    {getRoleIcon(role.name, 18, squadColor)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200 mb-1">{role.name}</div>
                  <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {role.allowed_player_types.join(', ')}
                  </div>
                  
                  {formattedMultipliers.simplified ? (
                    <div className="text-xs font-medium">
                      <span className={
                        formattedMultipliers.multiplier === 2 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-blue-600 dark:text-blue-400"
                      }>
                        {formattedMultipliers.simplified}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {formattedMultipliers["2"] && formattedMultipliers["2"].length > 0 && (
                        <div className="text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-block w-8">2×:</span> 
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {formattedMultipliers["2"].map(stat => formatStatName(stat)).join(', ')}
                          </span>
                        </div>
                      )}
                      {formattedMultipliers["1.5"] && formattedMultipliers["1.5"].length > 0 && (
                        <div className="text-xs">
                          <span className="text-blue-600 dark:text-blue-400 font-medium inline-block w-8">1.5×:</span> 
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {formattedMultipliers["1.5"].map(stat => formatStatName(stat)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BoostGuide;