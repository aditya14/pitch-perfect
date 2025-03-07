import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerModalProvider } from './context/PlayerModalContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import UserDashboard from './components/UserDashboard';
import CreateLeague from './components/leagues/CreateLeague';
import JoinLeague from './components/leagues/JoinLeague';
import CreateSquad from './components/squads/CreateSquad';
import LeagueView from './components/leagues/LeagueView';
import RosterView from './components/leagues/RosterView';
import api from './utils/axios';
import Header from './components/Header';
import './styles/transitions.css';
import SquadView from './components/squads/SquadView';
import MatchView from './components/matches/MatchView';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (user) {
      setTheme(user.profile?.theme || theme);
    }
    applyTheme();
  }, [user]);

  const applyTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      console.log('Theme applied:', theme);
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Theme applied:', theme);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    console.log('Theme changed to:', newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme();
    
    if (user) {
      try {
        await api.post('/user/preferences/', { theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`
      min-h-screen 
      theme-transition
      bg-white dark:bg-gray-900 
      text-gray-900 dark:text-white
    `}>
      {user && (
        <Header 
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}
      <div className="theme-transition dark:bg-gray-900">
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
            path="/dashboard" 
            element={
              user ? 
              <UserDashboard /> : 
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
            path="/leagues/:leagueId" 
            element={
              user ? 
              <LeagueView /> : 
              <Navigate to="/login" />
            }
          />
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