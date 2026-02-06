import React from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

import { getRoleIcon } from '../../../utils/roleUtils';

const BoostGuide = ({ boostRoles, showGuide, setShowGuide, squadColor }) => {
  if (!Array.isArray(boostRoles) || boostRoles.length === 0) {
    return null;
  }

  const formatMultipliers = (multipliers) => {
    if (!multipliers) return {};

    if (Object.values(multipliers).every(val => val === 2)) {
      return { simplified: '2x All', multiplier: 2 };
    }
    if (Object.values(multipliers).every(val => val === 1.5)) {
      return { simplified: '1.5x All', multiplier: 1.5 };
    }

    const grouped = { '1.5': [], '2': [] };
    Object.entries(multipliers).forEach(([key, value]) => {
      if (value === 1.5) {
        grouped['1.5'].push(key);
      } else if (value === 2) {
        grouped['2'].push(key);
      }
    });

    return grouped;
  };

  const formatStatName = (stat) => {
    return stat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-neutral-950 shadow rounded-lg p-6">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex justify-between items-center"
        type="button"
      >
        <div>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Boost Guide</h2>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Quick reference for what each boost does.
          </div>
        </div>
        {showGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {showGuide && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:overflow-visible">
          {boostRoles.map(role => {
            const formattedMultipliers = formatMultipliers(role.multipliers);

            return (
              <div
                key={role.id}
                className="min-w-[240px] md:min-w-0 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 flex items-center justify-center bg-white dark:bg-black rounded-full shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800">
                    {getRoleIcon(role.name, 18, squadColor)}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{role.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {role.allowed_player_types.join(', ')}
                    </div>
                  </div>
                </div>

                {formattedMultipliers.simplified ? (
                  <div className="text-xs font-medium">
                    <span
                      className={
                        formattedMultipliers.multiplier === 2
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }
                    >
                      {formattedMultipliers.simplified}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {formattedMultipliers['2'] && formattedMultipliers['2'].length > 0 && (
                      <div className="text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-block w-8">2x:</span>
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {formattedMultipliers['2'].map(stat => formatStatName(stat)).join(', ')}
                        </span>
                      </div>
                    )}
                    {formattedMultipliers['1.5'] && formattedMultipliers['1.5'].length > 0 && (
                      <div className="text-xs">
                        <span className="text-blue-600 dark:text-blue-400 font-medium inline-block w-8">1.5x:</span>
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {formattedMultipliers['1.5'].map(stat => formatStatName(stat)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BoostGuide;
