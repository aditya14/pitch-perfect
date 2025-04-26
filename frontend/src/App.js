import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import './styles/transitions.css';
import SquadView from './components/squads/SquadView';
import MatchView from './components/matches/MatchView';
import LoadingScreen from './components/elements/LoadingScreen';
import PullToRefresh from './components/elements/PullToRefresh';
import HowItWorksComponent from './components/HowItWorksComponent';
import useDocumentTitle from './hooks/useDocumentTitle';
import { DraftModalProvider } from './context/DraftModalContext';
import DraftModalContainer from './components/leagues/modals/DraftModalContainer';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState(() => {
    // Prefer user profile theme if available, else localStorage, else system
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) return storedTheme;
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDarkMode ? 'dark' : 'light';
  });

  // Set default document title
  useDocumentTitle('Home');

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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className={`
        min-h-screen 
        theme-transition
        bg-white dark:bg-neutral-900 
        text-neutral-900 dark:text-white
        relative
      `}>
        {user && (
          <Header 
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        )}
        <div className={`
          theme-transition 
          dark:bg-neutral-900
          ${user ? '' : ''}
        `}>
          <Routes>
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
            </Route>
            <Route 
              path="/leagues/:leagueId/roster" 
              element={
                user ? 
                <RosterView /> : 
                <Navigate to="/login" />
              }
            />
            <Route 
              path="/squads/:squadId"
              element={
                user ? 
                <SquadView /> : 
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
              path="/leagues/:leagueId/matches/:matchId" 
              element={
                user ? 
                <MatchView /> : 
                <Navigate to="/login" />
              }
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </PullToRefresh>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <PlayerModalProvider>
          <AppContent />
        </PlayerModalProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;