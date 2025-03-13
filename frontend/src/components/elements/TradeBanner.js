// TradeBanner.js - updated with clearer trade direction
import React from 'react';
import { Check, X, AlertCircle, ArrowRight } from 'lucide-react';

const TradeBanner = ({ trades, onAccept, onReject }) => {
  if (trades.length === 0) return null;
  
  // Format date without seconds
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-500" aria-hidden="true" />
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Pending Trade Offers ({trades.length})
          </h3>
          
          <div className="mt-3 space-y-4">
            {trades.map(trade => (
              <div 
                key={trade.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-yellow-200 dark:border-yellow-900"
              >
                <div className="flex flex-col sm:flex-row justify-between mb-3">
                  <div className="mb-2 sm:mb-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Trade from {trade.initiator_name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(trade.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onAccept(trade.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                      Accept
                    </button>
                    <button
                      onClick={() => onReject(trade.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <X className="h-4 w-4 mr-1" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </div>
                
                {/* Improved trade visualization */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                    {/* Players you'll give */}
                    <div className="md:col-span-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                          You'll Give:
                        </span>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                          <ul className="space-y-2">
                            {(trade.players_received_details || []).map(player => (
                              <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200">
                                {player.name}
                              </li>
                            ))}
                            {(trade.players_received_details || []).length === 0 && (
                              <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No players
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trade direction indicators */}
                    <div className="hidden md:flex md:col-span-1 justify-center items-center">
                      <ArrowRight className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    
                    {/* Mobile direction indicator */}
                    <div className="flex md:hidden justify-center py-2">
                      <ArrowRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    
                    {/* Players you'll receive */}
                    <div className="md:col-span-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                          You'll Receive:
                        </span>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                          <ul className="space-y-2">
                            {(trade.players_given_details || []).map(player => (
                              <li key={player.id} className="text-sm text-gray-800 dark:text-gray-200">
                                {player.name}
                              </li>
                            ))}
                            {(trade.players_given_details || []).length === 0 && (
                              <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No players
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeBanner;