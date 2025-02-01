import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import UserDashboard from './components/UserDashboard';
import CreateLeague from './components/leagues/CreateLeague';
import JoinLeague from './components/leagues/JoinLeague';
import CreateSquad from './components/squads/CreateSquad';
import api from './utils/axios';

class App extends Component {
  state = {
    isAuthenticated: false,
    isLoading: true
  };

  componentDidMount() {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Set the default header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      this.setState({ isAuthenticated: true, isLoading: false });
    } else {
      this.setState({ isLoading: false });
    }
  }

  setAuthenticated = (value) => {
    this.setState({ isAuthenticated: value });
  };

  render() {
    if (this.state.isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <Router>
        <div className="min-h-screen bg-gray-100">
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
      </Router>
    );
  }
}

export default App;