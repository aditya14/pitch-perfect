import React, { Component } from 'react';
import axios from 'axios';
import api from '../../utils/axios';

class Login extends Component {
  state = {
    username: '',
    password: '',
    error: null
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login...');
      
      const response = await axios.post('http://localhost:8000/api/token/', {
        username: this.state.username,
        password: this.state.password
      });
      
      console.log('Login response:', response.data);
      
      const accessToken = response.data.access;
      
      // Store token
      localStorage.setItem('accessToken', accessToken);
      
      // Configure axios instance
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      console.log('Token stored and headers set');
      console.log('Current headers:', api.defaults.headers.common);
      
      // Test the token immediately
      try {
        const testResponse = await api.get('/user/');
        console.log('Token test successful:', testResponse.data);
      } catch (error) {
        console.error('Token test failed:', error);
      }
      
      this.props.setAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      this.setState({ 
        error: error.response?.data?.detail || 'Invalid credentials' 
      });
    }
  };

  render() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900">
              Sign in to Pitch Perfect
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={this.handleSubmit}>
            {this.state.error && (
              <div className="text-red-500 text-center">
                {this.state.error}
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={this.state.username}
                  onChange={(e) => this.setState({ username: e.target.value })}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={this.state.password}
                  onChange={(e) => this.setState({ password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default Login;