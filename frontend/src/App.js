import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerModalProvider } from './context/PlayerModalContext';
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

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    initializeAuth();
    applyTheme();
  }, []);

  const initializeAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const response = await api.get('/user/');
        setIsAuthenticated(true);
        setTheme(response.data.profile?.theme || theme);
      } catch (error) {
        console.error('Auth error:', error);
      }
    }
    setIsLoading(false);
  };

  const applyTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme();
    
    if (isAuthenticated) {
      try {
        await api.post('/user/preferences/', { theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <PlayerModalProvider>
        <div className={`
          min-h-screen 
          theme-transition
          bg-white dark:bg-gray-900 
          text-gray-900 dark:text-white
        `}>
          {isAuthenticated && (
            <Header 
              setAuthenticated={setIsAuthenticated}
              theme={theme}
              onThemeChange={handleThemeChange}
            />
          )}
          <div className="theme-transition dark:bg-gray-900">
            <Routes>
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? 
                  <Login setAuthenticated={setIsAuthenticated} /> : 
                  <Navigate to="/dashboard" />
                }
              />
              <Route 
                path="/dashboard" 
                element={
                  isAuthenticated ? 
                  <UserDashboard /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/create" 
                element={
                  isAuthenticated ? 
                  <CreateLeague /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/join" 
                element={
                  isAuthenticated ? 
                  <JoinLeague /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/squads/create" 
                element={
                  isAuthenticated ? 
                  <CreateSquad /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/:leagueId" 
                element={
                  isAuthenticated ? 
                  <LeagueView /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/:leagueId/roster" 
                element={
                  isAuthenticated ? 
                  <RosterView /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/squads/:squadId"
                element={
                  isAuthenticated ? 
                  <SquadView /> : 
                  <Navigate to="/login" />
                }
              />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
        </div>
      </PlayerModalProvider>
    </Router>
  );
};

export default App;