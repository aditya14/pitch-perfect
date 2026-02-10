import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { PlayerModalProvider } from './context/PlayerModalContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Resigter from './components/auth/Register';
import UserDashboard from './components/UserDashboard';
import CreateLeague from './components/leagues/CreateLeague';
import JoinLeague from './components/leagues/JoinLeague';
import CreateSquad from './components/squads/CreateSquad';
import LeagueView from './components/leagues/LeagueView';
import RosterView from './components/leagues/RosterView';
import Profile from './components/user/Profile';
import api from './utils/axios';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import './styles/transitions.css';
import SquadView from './components/squads/SquadView';
import MatchView from './components/matches/MatchView';
import LoadingScreen from './components/elements/LoadingScreen';
import PullToRefresh from './components/elements/PullToRefresh';
import HowItWorksComponent from './components/HowItWorksComponent';
import useDocumentTitle from './hooks/useDocumentTitle';
import { DraftModalProvider } from './context/DraftModalContext';
import DraftModalContainer from './components/leagues/modals/DraftModalContainer';
import MatchPreview from './components/matches/MatchPreview';
import PlayerPage from './components/players/PlayerPage';

// New component to redirect old squad URLs to league context
const SquadRedirect = () => {
  const { squadId } = useParams();
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState(null);

  useEffect(() => {
    const fetchSquadLeague = async () => {
      try {
        console.log('Fetching league for squad:', squadId);
        const response = await api.get(`/squads/${squadId}/`);
        console.log('Data received for squad:', response.data);
        setLeagueId(response.data.league_id);
      } catch (error) {
        console.error('Failed to fetch squad league:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSquadLeague();
  }, [squadId]);

  if (loading) {
    return <LoadingScreen message="Redirecting..." />;
  }

  if (leagueId) {
    return <Navigate to={`/leagues/${leagueId}/my_squad`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    // Prefer user profile theme if available, else localStorage, else system
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) return storedTheme;
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDarkMode ? 'dark' : 'light';
  });
  
  const [isStandalone, setIsStandalone] = useState(false);

  const getLeagueIdFromPath = () => {
    const match = location.pathname.match(/\/leagues\/([^\/]+)/);
    if (!match) return null;
    const candidate = match[1]?.toLowerCase();
    if (candidate === 'join' || candidate === 'create') return null;
    return match[1];
  };

  const isLeagueView = location.pathname.includes('/leagues/') && getLeagueIdFromPath();

  // Set default document title
  useDocumentTitle('Home');

  // Detect standalone mode
  useEffect(() => {
    const checkStandalone = () => {
      const isRunningStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://');
      
      setIsStandalone(isRunningStandalone);
    };
    
    checkStandalone();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    
    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  // Always apply theme when theme state changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0a0a0a';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#ffffff';
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Update theme from user profile if available
  useEffect(() => {
    if (user && user.profile?.theme && user.profile.theme !== theme) {
      setTheme(user.profile.theme);
      localStorage.setItem('theme', user.profile.theme);
    }
  }, [user]); // Only runs when user changes

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (user) {
      try {
        await api.post('/user/preferences/', { theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    }
  };

  // Add a function to update the viewport height
  useEffect(() => {
    // Fix for iOS viewport height issues
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height', 
        `${window.innerHeight}px`
      );
    };
    
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    setAppHeight();
    
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  const handleRefresh = () => {
    // Add a class to the document during refresh to maintain dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('force-dark');
    }
    
    // Reload the page
    window.location.reload();
  };

  if (loading) {
    return <LoadingScreen message="Loading your leagues..." />;
  }

  // Calculate bottom padding based on standalone mode and screen size
  const getBottomPadding = () => {
    if (!user) return '';
    
    // No bottom padding on desktop (md and up)
    // On mobile, adjust for bottom nav height and standalone mode
    if (isStandalone) {
      return 'pb-20 md:pb-6'; // Less padding in standalone mode
    } else {
      return 'pb-24 md:pb-6'; // Standard padding in browser mode
    }
  };

  const getMainTopPadding = () => {
    if (!user) return 'min-h-screen';
    if (isLeagueView) {
      return 'pt-20 md:pt-24';
    }
    return 'pt-16';
  };

  return (
    <>
      {/* Fixed Header */}
      {user && (
        <Header 
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}

      {/* Main Content Area with Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main 
          className={`
            theme-transition 
            bg-white dark:bg-neutral-900 
            text-neutral-900 dark:text-white
            ${getMainTopPadding()}
            ${getBottomPadding()}
          `}
          style={{
            minHeight: user ? 'calc(100vh - 40px)' : '100vh'
          }}
        >
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                !user ? 
                <Login /> : 
                <Navigate to="/dashboard" />
              }
            />
            <Route 
              path="/register" 
              element={
                !user ? 
                <Resigter /> : 
                <Navigate to="/dashboard" />
              }
            />
            
            {/* Authenticated Routes */}
            <Route 
              path="/dashboard" 
              element={
                user ? 
                <UserDashboard /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/profile" 
              element={
                user ? 
                <Profile /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/how-it-works" 
              element={
                user ? 
                <HowItWorksComponent /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/leagues/create" 
              element={
                user ? 
                <CreateLeague /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/leagues/join" 
              element={
                user ? 
                <JoinLeague /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/squads/create" 
              element={
                user ? 
                <CreateSquad /> : 
                <Navigate to="/login" />
              }
            />

            <Route 
              path="/leagues/:leagueId/squads/:squadId"
              element={user ? <SquadView leagueContext={true} /> : <Navigate to="/login" />}
            />
            
            {/* League routes with nested tab routes */}
            <Route 
              path="/leagues/:leagueId"
              element={user ? <LeagueView /> : <Navigate to="/login" />}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={null} />
              <Route path="matches" element={null} />
              <Route path="table" element={null} />
              <Route path="trades" element={null} />
              <Route path="stats" element={null} />
              <Route path="squads" element={null} />
              <Route path="my_squad" element={null} />
            </Route>
            
            <Route 
              path="/leagues/:leagueId/roster" 
              element={
                user ? 
                <RosterView /> : 
                <Navigate to="/login" />
              }
            />
            
            {/* OLD ROUTE: Redirect old squad URLs to new league context */}
            <Route 
              path="/squads/:squadId"
              element={
                user ? 
                <SquadRedirect /> : 
                <Navigate to="/login" />
              }
            />
            
            <Route 
              path="/matches/:matchId" 
              element={
                user ? 
                <MatchView /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/matches/:matchId/preview" 
              element={
                user ? 
                <MatchPreview /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/leagues/:leagueId/matches/:matchId" 
              element={
                user ? 
                <MatchView /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/leagues/:leagueId/players/:playerId" 
              element={
                user ? 
                <PlayerPage /> : 
                <Navigate to="/login" />
              }
            />
            {/* Add Route for MatchPreview within league context */}
            <Route 
              path="/leagues/:leagueId/matches/:matchId/preview" 
              element={
                user ? 
                <MatchPreview leagueContext={true} /> : // Pass leagueContext prop
                <Navigate to="/login" />
              }
            />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} /> {/* Adjusted fallback */}
          </Routes>
        </main>
      </PullToRefresh>

      {/* Fixed Bottom Navigation - Mobile only */}
      {user && <BottomNavigation />}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <PlayerModalProvider>
          <div className="relative w-full h-full overflow-hidden">
            <AppContent />
          </div>
        </PlayerModalProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
