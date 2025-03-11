import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Users, ChevronRight, RefreshCw } from 'lucide-react';
import api from '../../utils/axios';

// Import tab components
import LeagueDashboard from './LeagueDashboard';
import MatchList from './MatchList';
import LeagueTable from './LeagueTable';
import TradeList from './TradeList';
import LeagueStats from './LeagueStats';
import UpdatePointsButton from '../UpdatePointsButton';

const LeagueView = () => {
  const { leagueId } = useParams();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchLeagueData();
    // checkAdminStatus();
  }, [leagueId]);

  const fetchLeagueData = async () => {
    try {
      const response = await api.get(`/leagues/${leagueId}/`);
      console.log('League:', response.data);
      setLeague(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this league');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch league data');
      }
    } finally {
      setLoading(false);
    }
  };

  // const checkAdminStatus = async () => {
  //   try {
  //     const response = await api.get('/users/me/');
  //     // Check if the current user is a staff member or superuser
  //     setIsAdmin(response.data.is_staff || response.data.is_superuser);
  //   } catch (err) {
  //     console.error('Failed to check admin status:', err);
  //     setIsAdmin(false);
  //   }
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const isUpcomingSeason = league?.season?.status === 'UPCOMING';
  const isDraftAllowed = isUpcomingSeason && new Date(league?.season?.start_date) > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const isDraftCompleted = league?.draft_completed;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', component: LeagueDashboard },
    { id: 'matches', label: 'Matches', component: MatchList },
    { id: 'table', label: 'Table', component: LeagueTable },
    { id: 'trades', label: 'Trade Market', component: TradeList },
    { id: 'stats', label: 'Stats', component: LeagueStats },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* League Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {league?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {league?.season?.name ? `Season: ${league.season.name}` : 'Loading season...'}
            </p>
          </div>
          <div className="flex gap-4">
            {isDraftAllowed && (
              <Link 
                to={`/leagues/${leagueId}/roster`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 
                         hover:bg-gray-50 dark:hover:bg-gray-700 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                <Users className="h-4 w-4" />
                Player Roster
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            
            {/* Update Points Button */}
            <UpdatePointsButton />
            
            <Link 
              to={league?.my_squad && isDraftCompleted ? `/squads/${league.my_squad.id}` : '#'}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium
                        ${(isDraftCompleted && league?.my_squad) 
                          ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 focus:ring-indigo-500' 
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
              onClick={e => (!isDraftCompleted || !league?.my_squad) && e.preventDefault()}
            >
              <Trophy className="h-4 w-4" />
              My Squad
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {ActiveComponent && <ActiveComponent league={league} />}
    </div>
  );
};

export default LeagueView;