import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import TimelineComponent from './TimelineComponent';
import { Trophy, Users, ChevronRight, Calendar, AlertCircle, Check, Clock, AlertTriangle, Plus, Zap, BarChart3, Star } from 'lucide-react';
import LoadingScreen from './elements/LoadingScreen';

const parseSeasonDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSeasonBucket = (season, referenceDate = new Date()) => {
  if (!season) return null;

  const status = (season.status || '').toString().trim().toUpperCase();
  const startDate = parseSeasonDate(season.start_date);
  const endDate = parseSeasonDate(season.end_date);

  // Future start date should always appear under Upcoming.
  if (startDate && startDate > referenceDate) return 'UPCOMING';
  if (status === 'UPCOMING') return 'UPCOMING';

  if (status === 'COMPLETED') return 'COMPLETED';
  if (endDate && endDate < referenceDate) return 'COMPLETED';

  if (status === 'ONGOING') return 'ONGOING';
  if (startDate && startDate <= referenceDate && (!endDate || endDate >= referenceDate)) {
    return 'ONGOING';
  }

  return status || null;
};

const LeagueCard = ({ league }) => {
  const navigate = useNavigate();
  
  // Check if season is upcoming
  const isUpcomingSeason = getSeasonBucket(league.season) === 'UPCOMING';
  
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
    const startDate = parseSeasonDate(league.season?.start_date);
    if (!startDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const diffTime = normalizedStartDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysUntilStart = getDaysUntilStart();
  
  // If season is upcoming, show pre-season card
  if (isUpcomingSeason) {
    return (
      <div 
        className="lg-glass-secondary lg-rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group lg-shine"
        onClick={() => navigate(`/leagues/${league.id}`)}
      >
        <div className="relative z-10 p-6">
          {/* League Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors font-caption">
                {league.name}
              </h3>
              
              {/* Season Badge */}
              <div className="flex items-center mb-3">
                <span className="text-sm text-slate-600 dark:text-slate-300 mr-3">
                  {league.season?.name || 'No season'}
                </span>
                <div className="lg-badge lg-badge-primary lg-pulse">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
                  <span className="text-xs font-medium">Upcoming</span>
                </div>
              </div>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ChevronRight className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          
          {/* Squad Info */}
          {league.my_squad ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <div 
                  className="h-1 w-8 rounded-md mr-3"
                  style={{ backgroundColor: league.my_squad.color }}
                />
                <span className="font-medium text-slate-900 dark:text-white font-caption">
                  {league.my_squad.name}
                </span>
              </div>
              
              {/* Season Status */}
              <div className="lg-glass-tertiary lg-rounded-md p-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      Season starts {formatDate(league.season?.start_date)}
                    </p>
                    {daysUntilStart !== null && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {daysUntilStart > 1
                          ? `${daysUntilStart} days to go`
                          : daysUntilStart === 1
                            ? '1 day to go'
                            : 'Starts today'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Draft Status */}
              <div className={`lg-glass-tertiary lg-rounded-md p-4 ${
                league.draft_completed ? 'border-green-400/20' : 'border-green-400/20'
              }`}>
                <div className="flex items-start">
                  {league.draft_completed ? (
                    <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      league.draft_completed ? 'text-green-700 dark:text-green-300' : 'text-green-700 dark:text-green-300'
                    }`}>
                      {league.draft_completed ? "Draft completed" : "Draft open"}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {league.draft_completed ? 
                        "Finalize your team before the season starts" : 
                        "Make sure to rank your players before the draft closes"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg-glass-tertiary lg-rounded-md p-4">
              <p className="text-slate-600 dark:text-slate-400 italic text-sm">
                You haven't joined this league yet
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="lg-glass-tertiary rounded-t-none px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-slate-600 dark:text-slate-400 mr-2" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {league.squads_count}/{league.max_teams} Squads
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-500" />
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
      secondPlaceOrLeaderInfo = sortedSquads[1];
    } else if (sortedSquads.length > 0) {
      secondPlaceOrLeaderInfo = sortedSquads[0];
    }
  }
  
  // Regular season card (active season)
  return (
    <div 
      className="lg-glass-secondary lg-rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group lg-shine"
      onClick={() => navigate(`/leagues/${league.id}`)}
    >
      <div className="relative z-10 p-6">
        {/* League Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors font-caption">
              {league.name}
            </h3>
            
            {/* Season Info */}
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full mr-2"></div>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {league.season?.name || 'No season'}
              </p>
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ChevronRight className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        
        {/* Squad Info */}
        {league.my_squad ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div 
                className="h-1 w-8 rounded-md mr-3"
                style={{ backgroundColor: league.my_squad.color }}
              />
              <span className="font-medium text-slate-900 dark:text-white font-caption">
                {league.my_squad.name}
              </span>
            </div>
            
            {/* Position and Points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  {isUserLeading ? (
                    <>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{league.season.status == "ONGOING" ? 'LEADING' : league.season.status == 'COMPLETED' ? 'WINNER' : ''}</span>
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-2" />
                        <span className="font-bold text-amber-600 dark:text-amber-400 font-caption">
                          1
                          <span className="text-xs font-normal text-slate-600 dark:text-slate-400 ml-1">
                            of {league.squads_count}
                          </span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-600 dark:text-slate-400">Position</span>
                      <span className="font-bold text-slate-900 dark:text-white font-caption">
                        {userPosition}
                        <span className="text-xs font-normal text-slate-600 dark:text-slate-400 ml-1">
                          of {league.squads_count}
                        </span>
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Points</span>
                  <span className="font-bold text-slate-900 dark:text-white font-caption">
                    {league.my_squad.total_points || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg-glass-tertiary lg-rounded-md p-4">
            <p className="text-slate-600 dark:text-slate-400 italic text-sm">
              You haven't joined this league yet
            </p>
          </div>
        )}
        
        {/* Leader or Runner-up Info */}
        {secondPlaceOrLeaderInfo && (
          <div className="pt-4 mt-4 border-t border-slate-300/30 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isUserLeading ? (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    2nd Place:
                  </span>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-2" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {league.season.status == "ONGOING" ? 'Leading' : league.season.status == 'COMPLETED' ? 'Winner' : ''}:

                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center">
                <div 
                  className="h-3 w-1 rounded-md mr-2"
                  style={{ backgroundColor: secondPlaceOrLeaderInfo.color }}
                />
                <span className="text-sm font-medium text-slate-900 dark:text-white mr-3 font-caption">
                  {secondPlaceOrLeaderInfo.name}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {secondPlaceOrLeaderInfo.total_points || 0} pts
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="lg-glass-tertiary rounded-t-none px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="h-4 w-4 text-slate-600 dark:text-slate-400 mr-2" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {league.squads_count}/{league.max_teams} Squads
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-500" />
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seasonFilter, setSeasonFilter] = useState('ONGOING'); // 'ONGOING' | 'UPCOMING' | 'COMPLETED'

  // Set document title for dashboard
  useDocumentTitle('Home');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await api.get('/leagues/my_leagues/');
      console.log('Leagues:', response.data);

      const now = new Date();
      const hasOngoingLeagues = response.data.some((league) => getSeasonBucket(league.season, now) === 'ONGOING');
      const hasUpcomingLeagues = response.data.some((league) => getSeasonBucket(league.season, now) === 'UPCOMING');

      if (!hasOngoingLeagues && hasUpcomingLeagues) {
        setSeasonFilter('UPCOMING');
      } else {
        setSeasonFilter('ONGOING');
      }

      setLeagues(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Failed to fetch leagues');
      setLoading(false);
    }
  };

  // Group leagues by season state (status + dates)
  const now = new Date();
  const ongoingLeagues = leagues.filter((league) => getSeasonBucket(league.season, now) === 'ONGOING');
  const upcomingLeagues = leagues.filter((league) => getSeasonBucket(league.season, now) === 'UPCOMING');
  const completedLeagues = leagues.filter((league) => getSeasonBucket(league.season, now) === 'COMPLETED');

  // Filtered leagues for current tab
  let filteredLeagues = [];
  if (seasonFilter === 'ONGOING') filteredLeagues = ongoingLeagues;
  if (seasonFilter === 'UPCOMING') filteredLeagues = upcomingLeagues;
  if (seasonFilter === 'COMPLETED') filteredLeagues = completedLeagues;

  if (loading) {
    return <LoadingScreen message="Loading your leagues..." />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        {/* Floating Glass Orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full bg-gradient-to-br from-primary-400/8 to-primary-600/8 dark:from-primary-400/15 dark:to-primary-600/15 lg-float"></div>
        <div className="absolute bottom-1/3 right-1/5 w-48 h-48 rounded-full bg-gradient-to-tr from-blue-400/5 to-primary-500/5 dark:from-blue-400/10 dark:to-primary-500/10 lg-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-gradient-to-bl from-primary-300/4 to-primary-700/4 dark:from-primary-300/8 dark:to-primary-700/8 lg-float" style={{animationDelay: '6s'}}></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(31,190,221,0.2) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-12 relative z-20">
          <div className="lg-glass lg-rounded-lg relative overflow-visible lg-glow">
            <div className="lg-shine absolute inset-0 lg-rounded-lg"></div>
            
            <div className="relative z-10 p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                <div className="flex-1">
                  {user?.first_name ? 
                  <h1 className="text-3xl md:text-3xl font-bold text-slate-900 dark:text-white font-caption">
                    Welcome, <span className="text-primary-600 dark:text-primary-400">{user?.first_name}</span>
                  </h1>
                  :
                  <h1 className="text-xl md:text-xl font-bold text-slate-900 dark:text-white font-caption">
                    Welcome to Pitch Perfect
                  </h1>
                  }
                </div>
                
                {/* Action Buttons */}
                {/* Mobile: inline, Desktop: spaced */}
                <div className="relative z-30">
                  {/* Mobile inline */}
                  <div className="flex flex-row gap-2 sm:hidden">
                    <button
                      onClick={() => navigate('/leagues/join')}
                      className="lg-button lg-rounded-md px-6 py-3 font-semibold text-white transition-all duration-300"
                    >
                      <div className="flex items-center justify-center">
                        Join League
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </div>
                    </button>
                  </div>
                  {/* Desktop spaced */}
                  <div className="hidden sm:flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate('/leagues/join')}
                      className="lg-button lg-rounded-md px-6 py-3 font-semibold text-white transition-all duration-300"
                    >
                      <div className="flex items-center justify-center">
                        Join League
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="lg-alert lg-glass-danger mb-8">
            <AlertCircle className="lg-alert-icon" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Leagues Section */}
        {leagues.length === 0 ? (
          <div className="lg-glass lg-rounded-lg text-center py-16 lg-glow relative">
            <div className="lg-shine absolute inset-0 lg-rounded-lg"></div>
            
            <div className="relative z-10">
              <div className="lg-glass-secondary lg-rounded-lg w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 font-caption">
                Your Fantasy Journey Awaits
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-md mx-auto">
                Join your first league to experience draft-based fantasy cricket like never before.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8 px-4">
                {[
                  { icon: Users, title: "Draft", desc: "Build your squad strategically" },
                  { icon: BarChart3, title: "Boosted Roles", desc: "Get the most out of your players" },
                  { icon: Star, title: "Season-Long", desc: "Compete all season long" }
                ].map((feature, index) => (
                  <div key={index} className="lg-glass-tertiary lg-rounded-md p-4 text-center">
                    <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center relative z-30">
                <button
                  onClick={() => navigate('/leagues/join')}
                  className="lg-button lg-rounded-md px-8 py-4 font-semibold text-white inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Join Your First League
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between mb-8 min-w-0 space-y-2 sm:space-y-0">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-caption">
                My Leagues
              </h2>
              {/* Pill Filter Bar: below on mobile, right on desktop */}
              <div className="flex space-x-2 flex-nowrap overflow-x-auto -mx-1.5 px-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setSeasonFilter('ONGOING')}
                  className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                    seasonFilter === 'ONGOING'
                      ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium'
                      : 'lg-glass-tertiary text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  Ongoing
                  <span className="ml-2 text-xs font-normal">{ongoingLeagues.length}</span>
                </button>
                <button
                  onClick={() => setSeasonFilter('UPCOMING')}
                  className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                    seasonFilter === 'UPCOMING'
                      ? 'lg-glass-primary text-blue-700 dark:text-blue-300 font-medium'
                      : 'lg-glass-tertiary text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  Upcoming
                  <span className="ml-2 text-xs font-normal">{upcomingLeagues.length}</span>
                </button>
                <button
                  onClick={() => setSeasonFilter('COMPLETED')}
                  className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                    seasonFilter === 'COMPLETED'
                      ? 'lg-glass-primary text-slate-700 dark:text-slate-200 font-medium'
                      : 'lg-glass-tertiary text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  Completed
                  <span className="ml-2 text-xs font-normal">{completedLeagues.length}</span>
                </button>
              </div>
            </div>
            {/* Filtered Leagues */}
            {filteredLeagues.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg-glass-tertiary lg-rounded-lg px-8 py-10 flex flex-col items-center justify-center shadow-lg min-h-[260px] min-w-0 w-full md:w-auto md:min-w-[320px] text-center self-start mt-0 md:mt-0">
                  <div className="mb-6">
                    {seasonFilter === 'ONGOING' && (
                      <Trophy className="w-12 h-12 text-primary-400 dark:text-primary-300 opacity-80" />
                    )}
                    {seasonFilter === 'UPCOMING' && (
                      <Calendar className="w-12 h-12 text-blue-400 dark:text-blue-300 opacity-80" />
                    )}
                    {seasonFilter === 'COMPLETED' && (
                      <Check className="w-12 h-12 text-green-400 dark:text-green-300 opacity-80" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-caption">
                      {seasonFilter === 'ONGOING' && "No Ongoing Leagues"}
                      {seasonFilter === 'UPCOMING' && "No Upcoming Seasons"}
                      {seasonFilter === 'COMPLETED' && "No Completed Seasons"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-base max-w-xs mx-auto mb-6">
                      {seasonFilter === 'ONGOING' && "You are not participating in any ongoing seasons. Join a league to get started!"}
                      {seasonFilter === 'UPCOMING' && "There are no upcoming seasons for your leagues. Check back soon or join a new league!"}
                      {seasonFilter === 'COMPLETED' && "You haven't completed any seasons yet. Play through a season to see your results here!"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeagues.map(league => (
                  <LeagueCard key={league.id} league={league} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
