// TradeTutorial.js - Simplified, visual tutorial for pre-draft trading
import React from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, Info, AlertCircle } from 'lucide-react';

const TradeTutorial = ({ league }) => {
  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Trades
        </h2>
      </div>
      
      {/* Trading Status Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-l-4 border-amber-400 dark:border-amber-500 mx-4 mt-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-400 dark:text-amber-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Trading Will Be Available After Draft
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
              Trading opens once the draft is completed. For now, focus on ranking your draft preferences.
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Visual Guide */}
      <div className="p-6">
        {/* How Trading Works Visual - Matching Actual UI */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 mb-8">
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="font-medium text-neutral-900 dark:text-white">
              How Trading Works
            </h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
              {/* My Player (You Give) */}
              <div className="md:col-span-3">
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-1 h-4 rounded-sm mr-2"
                      style={{ backgroundColor: "#1414AD" }}
                    ></div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      You Give:
                    </p>
                  </div>
                  
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-900/30">
                    <div className="flex items-center">
                      <div className="ml-3 flex-grow">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center">
                          Virat Kohli
                          <span 
                            className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: "#1414AD", 
                              color: "white"
                            }}
                          >
                            Captain
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Batter
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center md:col-span-1">
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <ArrowLeft className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-2" />
                </div>
              </div>
              
              {/* Their Player (You Receive) */}
              <div className="md:col-span-3">
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-1 h-4 rounded-sm mr-2"
                      style={{ backgroundColor: "#9333EA" }}
                    ></div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      You Receive:
                    </p>
                  </div>
                  
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/30">
                    <div className="flex items-center">
                      <div className="ml-3 flex-grow">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          Jasprit Bumrah
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Bowler
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-5">
              Both managers must agree for a trade to complete
            </div>
          </div>
        </div>
        
        {/* Tips and Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
              <h3 className="font-medium text-neutral-900 dark:text-white">Trading Benefits</h3>
            </div>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-start">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400 mt-1.5 mr-2"></span>
                Balance your squad composition
              </li>
              <li className="flex items-start">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400 mt-1.5 mr-2"></span>
                Acquire players that fit your strategy
              </li>
              <li className="flex items-start">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400 mt-1.5 mr-2"></span>
                Optimize for upcoming matches
              </li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center mb-4">
              <Info className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
              <h3 className="font-medium text-neutral-900 dark:text-white">Trading Boosted Players</h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              When trading a player with a boost role (like Captain):
            </p>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
              The incoming player inherits that boost until the weekly update window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeTutorial;