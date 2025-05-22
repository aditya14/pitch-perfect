import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import TimelineComponent from './TimelineComponent';
import { Trophy, Users, ChevronRight, Calendar, AlertCircle, Check, Clock, AlertTriangle } from 'lucide-react';
import LoadingScreen from './elements/LoadingScreen';

const LeagueCard = ({ league }) => {
  const navigate = useNavigate();
  
  // Check if season is upcoming
  const isUpcomingSeason = league.season?.status === "UPCOMING";
  
  // Format start date if available
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Calculate days until season starts
  const getDaysUntilStart = () => {
    if (!league.season?.start_date) return null;
    const today = new Date();
    const startDate = new Date(league.season.start_date);
    const diffTime = startDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysUntilStart = getDaysUntilStart();
  
  // If season is upcoming, show pre-season card
  if (isUpcomingSeason) {
    return (
      <div 
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg border border-neutral-200 dark:border-neutral-700 border-l-4 cursor-pointer"
        style={{ borderLeftColor: league.color || '#6366F1' }}
        onClick={() => navigate(`/leagues/${league.id}`)}
      >
        <div className="p-5">
          {/* League Name */}
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            {league.name}
          </h3>
          
          {/* Season Name with Upcoming Badge */}
          <div className="flex items-center mb-4">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">
              {league.season?.name || 'No season'}
            </span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-0.5 rounded">
              Upcoming
            </span>
          </div>
          
          {/* Squad Info */}
          {league.my_squad ? (
            <div className="mb-5">
              <div className="flex items-center mb-3">
                <div 
                  className="h-5 w-1.5 rounded-md mr-2"
                  style={{ backgroundColor: league.my_squad.color }}
                />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {league.my_squad.name}
                </span>
              </div>
              
              {/* Season status info */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-2">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Season starts Mar 22, 2025
                    </p>
                    {daysUntilStart !== null && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Less than a day to go!
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Draft Status */}
              <div className={`rounded-lg p-3 ${league.draft_completed ? 
                'bg-green-50 dark:bg-green-900/30' : 
                'bg-amber-50 dark:bg-amber-900/30'}`}>
                <div className="flex items-start">
                  {league.draft_completed ? (
                    <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${league.draft_completed ? 
                      'text-green-700 dark:text-green-300' : 
                      'text-amber-700 dark:text-amber-300'}`}>
                      {league.draft_completed ? 
                        "Draft completed" : 
                        "Draft pending"}
                    </p>
                    <p className={`text-xs mt-1 ${league.draft_completed ? 
                      'text-green-600 dark:text-green-400' : 
                      'text-amber-600 dark:text-amber-400'}`}>
                      {league.draft_completed ? 
                        "Finalize your team before the season starts" : 
                        "Make sure to rank your players before the draft closes"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 text-neutral-500 dark:text-neutral-400 italic text-sm">
              You haven't joined this league yet
            </div>
          )}
        </div>
        
        {/* Footer with League Info */}
        <div className="bg-neutral-50 dark:bg-neutral-700 px-5 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-1" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {league.squads_count}/{league.max_teams} Squads
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
        </div>
      </div>
    );
  }
  
  // Get sorted squads for active seasons
  const sortedSquads = league.squads 
    ? [...league.squads].sort((a, b) => b.total_points - a.total_points)
    : [];
    
  // Get position in the league
  const userPosition = league.my_squad && sortedSquads.length > 0
    ? sortedSquads.findIndex(squad => squad.id === league.my_squad?.id) + 1
    : '-';
  
  // Check if user is in first place
  const isUserLeading = userPosition === 1;
  
  // Get runner-up or leader info
  let secondPlaceOrLeaderInfo = null;
  
  if (sortedSquads.length > 0) {
    if (isUserLeading && sortedSquads.length > 1) {
      // If user is leading, get the second place
      secondPlaceOrLeaderInfo = sortedSquads[1];
    } else if (sortedSquads.length > 0) {
      // Otherwise get the leader
      secondPlaceOrLeaderInfo = sortedSquads[0];
    }
  }
  
  // Regular season card (active season)
  return (
    <div 
      className="bg-white dark:bg-neutral-950 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-neutral-200 dark:border-neutral-700 border-l-4 cursor-pointer group"
      style={{ borderLeftColor: league.color || '#6366F1' }}
      onClick={() => navigate(`/leagues/${league.id}`)}
    >
      <div className="p-6">
        {/* League Name with better typography */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {league.name}
          </h3>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5 text-primary-500" />
          </div>
        </div>
        
        {/* Season Name with better visual treatment */}
        <div className="flex items-center mb-4">
          <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            {league.season?.name || 'No season'}
          </p>
        </div>
        
        {/* Squad Info */}
        {league.my_squad ? (
          <div className="mb-5">
            <div className="flex items-center mb-2">
              <div 
                className="h-5 w-1.5 rounded-md mr-2"
                style={{ backgroundColor: league.my_squad.color }}
              />
              <span className="font-medium font-caption text-neutral-800 dark:text-neutral-200">
                {league.my_squad.name}
              </span>
            </div>
            
            {/* Position and Points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex flex-col">
                  {isUserLeading ? (
                    <>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">LEADING</span>
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-bold text-yellow-600 dark:text-yellow-400">
                          1
                          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-1">
                            of {league.squads_count}
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Position</span>
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {userPosition}
                        <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-1">
                          of {league.squads_count}
                        </span>
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Points</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {league.my_squad.total_points || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-5 text-neutral-500 dark:text-neutral-400 italic text-sm">
            You haven't joined this league yet
          </div>
        )}
        
        {/* Leader or Runner-up Info */}
        {secondPlaceOrLeaderInfo && (
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isUserLeading ? (
                  <>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      2nd Place:
                    </span>
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Leader:
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center">
                <div 
                  className="h-4 w-1 rounded-md mr-1"
                  style={{ backgroundColor: secondPlaceOrLeaderInfo.color }}
                />
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mr-2">
                  {secondPlaceOrLeaderInfo.name}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {secondPlaceOrLeaderInfo.total_points || 0} pts
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with League Info */}
      <div className="bg-neutral-50 dark:bg-neutral-800 px-5 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-1" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {league.squads_count}/{league.max_teams} Squads
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set document title for dashboard
  useDocumentTitle('Home');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await api.get('/leagues/my_leagues/');
      console.log('Leagues:', response.data);
      setLeagues(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Failed to fetch leagues');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your leagues..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-caption font-bold dark:text-white">My Leagues</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
          
          <Link
            to="/leagues/join"
            className="bg-primary-600 font-caption text-white border-transparent hover:bg-primary-700 focus:ring-primary-500 inline-block py-2 px-4 rounded-md text-sm font-medium"
          >
            Join League
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded">
          <p className="text-neutral-600 dark:text-neutral-300">You haven't joined any leagues yet.</p>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Join a league to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map(league => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;