import React from 'react';
import { BarChart3, Trophy, Users, Calendar, Clock } from 'lucide-react';

const LeagueStats = ({ league }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Stats
        </h2>
      </div>
      
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="relative mb-8">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-5 relative z-10">
            <BarChart3 className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
          Advanced Statistics Coming Soon
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 max-w-lg mb-8">
          We're working hard to bring you detailed league statistics and insights. 
          Track player performance, compare squads, and discover trends to help you dominate your fantasy league!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Trophy className="w-6 h-6 text-amber-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Performance Tracking</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Track player and squad performance over the season
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Users className="w-6 h-6 text-indigo-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Squad Comparisons</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Compare your squad with others in the league
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex flex-col items-center">
            <Calendar className="w-6 h-6 text-green-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Weekly Insights</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Get weekly insights to optimize your squad
            </p>
          </div>
        </div>
        
        {/* <div className="mt-10 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 mr-2" />
          <span>Expected release: Week 3 of IPL Season</span>
        </div> */}
      </div>
    </div>
  );
};

export default LeagueStats;