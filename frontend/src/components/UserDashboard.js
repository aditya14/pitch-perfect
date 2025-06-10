import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import TimelineComponent from './TimelineComponent';
import { Trophy, Users, ChevronRight, Calendar, AlertCircle, Check, Clock, AlertTriangle, Plus, Zap, BarChart3, Star } from 'lucide-react';
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
        className="liquid-glass-card glass-rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        onClick={() => navigate(`/leagues/${league.id}`)}
      >
        {/* Liquid Glass Shine Effect */}
        <div className="glass-shine absolute inset-0 glass-rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
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
                <div className="liquid-glass-badge glass-rounded-sm px-3 py-1 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Upcoming</span>
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
              <div className="liquid-glass-input glass-rounded-md p-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      Season starts Mar 22, 2025
                    </p>
                    {daysUntilStart !== null && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Less than a day to go!
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Draft Status */}
              <div className={`liquid-glass-input glass-rounded-md p-4 ${
                league.draft_completed ? 'border-green-400/20' : 'border-amber-400/20'
              }`}>
                <div className="flex items-start">
                  {league.draft_completed ? (
                    <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      league.draft_completed ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {league.draft_completed ? "Draft completed" : "Draft pending"}
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
            <div className="liquid-glass-input glass-rounded-md p-4">
              <p className="text-slate-600 dark:text-slate-400 italic text-sm">
                You haven't joined this league yet
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="liquid-glass-input glass-rounded-t-none px-6 py-4 flex justify-between items-center">
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
      className="liquid-glass-card glass-rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      onClick={() => navigate(`/leagues/${league.id}`)}
    >
      {/* Liquid Glass Shine Effect */}
      <div className="glass-shine absolute inset-0 glass-rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
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
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">WINNER</span>
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
          <div className="liquid-glass-input glass-rounded-md p-4">
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
                      Winner:
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
      <div className="liquid-glass-input glass-rounded-t-none px-6 py-4 flex justify-between items-center">
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        {/* Floating Glass Orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full bg-gradient-to-br from-primary-400/8 to-primary-600/8 dark:from-primary-400/15 dark:to-primary-600/15 floating-orb"></div>
        <div className="absolute bottom-1/3 right-1/5 w-48 h-48 rounded-full bg-gradient-to-tr from-blue-400/5 to-primary-500/5 dark:from-blue-400/10 dark:to-primary-500/10 floating-orb" style={{animationDelay: '8s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-gradient-to-bl from-primary-300/4 to-primary-700/4 dark:from-primary-300/8 dark:to-primary-700/8 floating-orb" style={{animationDelay: '15s'}}></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-3" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(31,190,221,0.2) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-12">
          <div className="liquid-glass-main glass-rounded-lg relative overflow-hidden">
            <div className="glass-shine absolute inset-0 glass-rounded-lg"></div>
            
            <div className="relative z-10 p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 font-caption">
                    Welcome back! <span className="text-primary-600 dark:text-primary-400">{user?.first_name}</span>
                  </h1>
                  {/* <p className="text-slate-700 dark:text-slate-200 text-lg mb-6">
                    Ready to dominate the fantasy cricket world? Manage your squads, check standings, and make those game-changing trades.
                  </p> */}
                  
                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4">
                    <div className="liquid-glass-badge glass-rounded-sm px-4 py-2 flex items-center">
                      <Users className="w-4 h-4 text-primary-600 dark:text-primary-400 mr-2" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{leagues.length} Active League{leagues.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* <div className="liquid-glass-badge glass-rounded-sm px-4 py-2 flex items-center">
                      <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">IPL 2025 Season</span>
                    </div> */}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/leagues/join"
                    className="liquid-glass-button glass-rounded-md px-6 py-3 font-semibold text-white group transition-all duration-300"
                  >
                    <div className="flex items-center justify-center">
                      <Plus className="w-5 h-5 mr-2" />
                      Join League
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="liquid-glass-card glass-rounded-md p-6 mb-8 border border-red-400/20">
            <div className="flex items-start text-red-600 dark:text-red-300">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Leagues Section */}
        {leagues.length === 0 ? (
          <div className="liquid-glass-main glass-rounded-lg text-center py-16">
            <div className="glass-shine absolute inset-0 glass-rounded-lg"></div>
            
            <div className="relative z-10">
              <div className="liquid-glass-card glass-rounded-lg w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 font-caption">
                Your Fantasy Journey Awaits
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-md mx-auto">
                Join your first league to experience draft-based fantasy cricket like never before.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
                {[
                  { icon: Users, title: "Draft & Trade", desc: "Build your squad strategically" },
                  { icon: BarChart3, title: "Core Squad Roles", desc: "Boost player performance" },
                  { icon: Star, title: "Season-Long", desc: "Compete all season long" }
                ].map((feature, index) => (
                  <div key={index} className="liquid-glass-input glass-rounded-md p-4 text-center">
                    <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
              
              <Link
                to="/leagues/join"
                className="liquid-glass-button glass-rounded-md px-8 py-4 font-semibold text-white inline-flex items-center group"
              >
                <Plus className="w-5 h-5 mr-2" />
                Join Your First League
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-caption">My Leagues</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {leagues.length} league{leagues.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map(league => (
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;