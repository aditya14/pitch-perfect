import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Users, BarChart3, Zap, ChevronRight, Star, Globe, ChevronDown } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const loginRef = useRef(null);

  // Force dark mode for login screen
  useEffect(() => {
    // Save current theme state
    const currentTheme = document.documentElement.classList.contains('dark');
    const currentBodyBg = document.documentElement.style.backgroundColor;
    
    // Force dark mode
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0a0a0a';
    document.documentElement.dataset.theme = 'dark';
    
    // Cleanup function to restore theme when component unmounts
    return () => {
      // Only restore if we're not staying on auth screens
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        // Let the app handle theme restoration based on user preferences
        if (!currentTheme) {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.backgroundColor = currentBodyBg || '#ffffff';
        }
      }
    };
  }, []);

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

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-10 md:pt-16">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/5 w-72 h-72 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 floating-orb"></div>
        <div className="absolute bottom-1/4 right-1/5 w-56 h-56 rounded-full bg-gradient-to-tr from-blue-400/15 to-primary-500/15 floating-orb" style={{animationDelay: '5s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-gradient-to-bl from-primary-300/10 to-primary-700/10 floating-orb" style={{animationDelay: '10s'}}></div>
        
        <div 
          className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(31,190,221,0.3) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-7xl">
          
          {/* Header Section - Mobile Optimized */}
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-flex items-center mb-6 md:mb-8">
              <div className="liquid-glass-card glass-rounded-lg p-3 md:p-4 mr-4 md:mr-6 brand-glow">
                <img src="/icon.png" alt="Pitch Perfect Logo" className="w-10 h-10 md:w-14 md:h-14" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold font-caption">
                  <span className="text-primary-400">Pitch </span>
                  <span className="text-white">Perfect</span>
                </h1>
                <p className="text-slate-300 text-base md:text-xl mt-2 md:mt-3">Fantasy Cricket Evolved</p>
              </div>
            </div>
            
            {/* Enhanced Mobile CTA Button */}
            <div className="lg:hidden mt-8 md:mt-12">
              <button
                onClick={scrollToLogin}
                className="liquid-glass-button glass-rounded-lg px-6 py-4 w-full max-w-sm mx-auto block group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-center">
                  <span className="text-lg font-semibold text-white mr-3">Ready to step out into the field?</span>
                  <ChevronDown className="w-6 h-6 text-primary-400 animate-bounce" />
                </div>
                <div className="text-xs text-primary-300 mt-1">Tap to login</div>
              </button>
            </div>
          </div>

          {/* Main Layout */}
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            
            {/* Left Side - Feature Showcase */}
            <div className="lg:col-span-3 space-y-6 md:space-y-8">
              
              {/* Hero Message */}
              <div className="liquid-glass-main glass-rounded relative overflow-hidden">
                <div className="glass-shine absolute inset-0 glass-rounded"></div>
                <div className="relative z-10 p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6">
                    The Future of Fantasy Cricket
                  </h2>
                  <p className="text-slate-200 text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                    Experience cricket fantasy like never before with our innovative draft-based platform. 
                    Build your squad, deploy strategic roles, and compete throughout entire seasons.
                  </p>
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="liquid-glass-badge rounded-full px-4 md:px-5 py-2 md:py-3 flex items-center">
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full mr-2 md:mr-3 animate-pulse"></div>
                      <span className="text-xs md:text-sm font-medium text-white">IPL Available Now</span>
                    </div>
                    <div className="liquid-glass-badge rounded-full px-4 md:px-5 py-2 md:py-3 flex items-center">
                      <Globe className="w-3 md:w-4 h-3 md:h-4 text-primary-400 mr-2 md:mr-3" />
                      <span className="text-xs md:text-sm font-medium text-white">International Cricket Coming Soon</span>
                    </div>
                  </div>
                  
                  {/* International Formats */}
                  <div className="pl-3 md:pl-4 border-l-2 border-primary-400/30">
                    <p className="text-slate-300 text-xs md:text-sm mb-2 md:mb-3">Upcoming formats:</p>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {['Tests', 'ODIs', 'T20Is'].map((format) => (
                        <div key={format} className="liquid-glass-input glass-rounded-sm px-3 md:px-4 py-1.5 md:py-2">
                          <span className="text-xs md:text-sm text-primary-300 font-medium">{format}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {[
                  { icon: Users, title: "Draft & Trade", desc: "Build your squad through strategic drafts and active trading throughout the season" },
                  { icon: BarChart3, title: "Core Squad Roles", desc: "Boost player performance with specialized role multipliers and strategic assignments" },
                  { icon: Star, title: "Season-Long Play", desc: "Compete throughout entire cricket seasons, not just individual matches" },
                  { icon: Zap, title: "Live Scoring", desc: "Real-time fantasy points during every ball of every match" }
                ].map((feature, index) => (
                  <div key={index} className="liquid-glass-card glass-rounded-lg p-4 md:p-6 group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start space-x-3 md:space-x-4">
                      <div className="liquid-glass-input glass-rounded-md p-2 md:p-3 group-hover:bg-primary-500/20 transition-colors">
                        <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1 md:mb-2 text-base md:text-lg">{feature.title}</h3>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:col-span-2 flex justify-center lg:justify-end" ref={loginRef}>
              <div className="w-full max-w-md">
                <div className="liquid-glass-main glass-rounded relative overflow-hidden">
                  <div className="glass-shine absolute inset-0 glass-rounded"></div>
                  
                  <div className="relative z-10 p-6 md:p-8">
                    {/* Form Header */}
                    <div className="text-center mb-6 md:mb-8">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">Welcome Back</h3>
                      <p className="text-slate-300 text-sm md:text-base">
                        New to Pitch Perfect?{' '}
                        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                          Create account
                        </Link>
                      </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="liquid-glass-card glass-rounded-md p-3 md:p-4 mb-4 md:mb-6 border border-red-400/20">
                        <div className="flex items-start text-red-300">
                          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-xs md:text-sm font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                      {/* Email Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2 md:mb-3">
                          Email Address
                        </label>
                        <div className="liquid-glass-input glass-rounded-md">
                          <input
                            type="email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 md:px-4 py-3 md:py-4 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none rounded-lg text-sm md:text-base"
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                      </div>

                      {/* Password Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2 md:mb-3">
                          Password
                        </label>
                        <div className="liquid-glass-input glass-rounded-md relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 md:px-4 py-3 md:py-4 pr-10 md:pr-12 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none rounded-lg text-sm md:text-base"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Sign In Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="liquid-glass-button glass-rounded-md w-full py-3 md:py-4 px-4 md:px-6 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center justify-center">
                          {isSubmitting ? 'Signing in...' : 'Sign In'}
                          {!isSubmitting && <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </button>
                    </form>

                    {/* Bottom Text */}
                    <div className="mt-6 md:mt-8 text-center">
                      <p className="text-xs md:text-sm text-slate-400">
                        Join thousands of cricket fans worldwide
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;