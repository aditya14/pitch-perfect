import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Users, ArrowRightLeft, TrendingUp, Zap, Activity } from 'lucide-react';

// Add this style to ensure safe top spacing on mobile browsers
const safeTopStyle = `
  .safe-top {
    padding-top: env(safe-area-inset-top, 1rem);
  }
`;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      await login(username, password);
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Draft Players",
      description: "Rank, draft, and build your dream squad from the official IPL player pool"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Boost Strategy",
      description: "Assign specialized roles with unique point multipliers to maximize scoring"
    },
    {
      icon: <ArrowRightLeft className="h-6 w-6" />,
      title: "In-Season Trading",
      description: "Trade players with other managers to optimize your lineup strategy"
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Dynamic Scoring",
      description: "Comprehensive scoring system for batting, bowling, fielding, and achievements"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-primary-950 pt-10 pb-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Inject safe-area CSS */}
      <style dangerouslySetInnerHTML={{ __html: safeTopStyle }} />
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-100 dark:bg-primary-900/20 blur-3xl opacity-50"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-blue-100 dark:bg-blue-900/20 blur-3xl opacity-40"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/2 transform -translate-x-1/2 w-screen h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-30"></div>
      </div>

      <div className="container mx-auto max-w-7xl z-10 relative">
        {/* App Logo - Always at the top on all screens with safe spacing */}
        <div className="flex items-center justify-center lg:justify-start mb-8 safe-top">
          <img src="/icon.png" alt="PitchPerfect Logo" className="h-12 w-12 sm:h-16 sm:w-16 mr-3" />
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
            <span className="text-primary-500 dark:text-primary-500">Pitch</span>Perfect
          </h1>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12">
          {/* App Info Section - After login on mobile, side-by-side on desktop */}
          <div className="w-full lg:w-1/2 space-y-6 lg:space-y-8 text-center lg:text-left order-last lg:order-first">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                Fantasy Cricket Reimagined
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto lg:mx-0">
                The premier draft-based fantasy cricket platform for IPL enthusiasts. Build your squad, deploy strategic roles, and compete throughout the season.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start p-3 sm:p-4 bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                    <div className="flex-shrink-0 p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-400 mr-3">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-md mb-1">{feature.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                <span>Ready for the 2025 IPL season</span>
              </div>
            </div>
          </div>

          {/* Mobile Onboarding - Login First Approach */}
          <div className="w-full sm:max-w-md mx-auto order-first mb-8 lg:mb-0 lg:order-last lg:w-5/12">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
              <div className="mb-4 sm:mb-6 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Or{' '}
                  <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                    create a new account
                  </Link>
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Username/Email */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      id="username"
                      type="text"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 
                        focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-gray-700 dark:text-white sm:text-sm bg-gray-100 text-black"
                      placeholder="you@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 
                          focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                          dark:bg-gray-700 dark:text-white sm:text-sm bg-gray-100 text-black"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                      bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                      disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Fantasy Cricket at its finest
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center lg:hidden">
              <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                <span>Ready for the 2025 IPL season</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 lg:mt-12 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>© 2025 PitchPerfect. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;