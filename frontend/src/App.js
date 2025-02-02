import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import UserDashboard from './components/UserDashboard';
import CreateLeague from './components/leagues/CreateLeague';
import JoinLeague from './components/leagues/JoinLeague';
import CreateSquad from './components/squads/CreateSquad';
import api from './utils/axios';
import Header from './components/Header';
import './styles/transitions.css';

class App extends Component {
  state = {
    isAuthenticated: false,
    isLoading: true,
    theme: localStorage.getItem('theme') || 'light'
  };

  componentDidMount() {
    this.initializeAuth();
    this.applyTheme();
  }

  initializeAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        // Get user details including theme preference
        const response = await api.get('/user/');
        this.setState({ 
          isAuthenticated: true, 
          isLoading: false,
          theme: response.data.profile?.theme || this.state.theme 
        });
      } catch (error) {
        this.setState({ isLoading: false });
      }
    } else {
      this.setState({ isLoading: false });
    }
  };

  applyTheme = () => {
    if (this.state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  setAuthenticated = (value) => {
    this.setState({ isAuthenticated: value });
  };

  handleThemeChange = async (newTheme) => {
    this.setState({ theme: newTheme }, () => {
      this.applyTheme();
      localStorage.setItem('theme', newTheme);
      
      // Update theme preference in backend
      if (this.state.isAuthenticated) {
        api.post('/user/preferences/', { theme: newTheme })
          .catch(error => console.error('Failed to update theme preference:', error));
      }
    });
  };

  render() {
    if (this.state.isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <Router>
        <div className={`
          min-h-screen 
          theme-transition
          bg-white dark:bg-gray-900 
          text-gray-900 dark:text-white
        `}>
          {this.state.isAuthenticated && (
            <Header 
              setAuthenticated={this.setAuthenticated}
              theme={this.state.theme}
              onThemeChange={this.handleThemeChange}
            />
          )}
          <div className="theme-transition dark:bg-gray-900">
            <Routes>
              <Route 
                path="/login" 
                element={
                  !this.state.isAuthenticated ? 
                  <Login setAuthenticated={this.setAuthenticated} /> : 
                  <Navigate to="/dashboard" />
                }
              />
              <Route 
                path="/dashboard" 
                element={
                  this.state.isAuthenticated ? 
                  <UserDashboard /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/create" 
                element={
                  this.state.isAuthenticated ? 
                  <CreateLeague /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/leagues/join" 
                element={
                  this.state.isAuthenticated ? 
                  <JoinLeague /> : 
                  <Navigate to="/login" />
                }
              />
              <Route 
                path="/squads/create" 
                element={
                  this.state.isAuthenticated ? 
                  <CreateSquad /> : 
                  <Navigate to="/login" />
                }
              />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
        </div>
      </Router>
    );
  }
}

export default App;