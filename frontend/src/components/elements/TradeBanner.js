// TradeBanner.js - updated to use player details from serializer
import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

const TradeBanner = ({ trades, onAccept, onReject }) => {
  if (trades.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 m-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-500" aria-hidden="true" />
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Pending Trade Offers ({trades.length})
          </h3>
          
          <div className="mt-2 space-y-4">
            {trades.map(trade => (
              <div 
                key={trade.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-yellow-200 dark:border-yellow-900"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Trade from {trade.initiator_name}
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          You'll Receive:
                        </p>
                        <ul className="mt-1 text-sm text-gray-900 dark:text-white">
                          {(trade.players_given_details || []).map(player => (
                            <li key={player.id} className="py-1">
                              {player.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          You'll Give:
                        </p>
                        <ul className="mt-1 text-sm text-gray-900 dark:text-white">
                          {(trade.players_received_details || []).map(player => (
                            <li key={player.id} className="py-1">
                              {player.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onAccept(trade.id)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => onReject(trade.id)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
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