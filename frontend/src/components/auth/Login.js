import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  AlertCircle, Eye, EyeOff, Users, BarChart3, Zap, Star, 
  TrendingUp, Clock, Trophy, Sparkles, Crown, ChevronRight,
  Swords, Anchor, Handshake, Bomb, Shield, Target, Award,
  X, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showScoringDetails, setShowScoringDetails] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const loginDropdownRef = useRef(null);

  // Force light mode for login screen
  useEffect(() => {
    const currentTheme = document.documentElement.classList.contains('dark');
    
    // Force light mode
    document.documentElement.classList.remove('dark');
    document.documentElement.style.backgroundColor = '#ffffff';
    document.documentElement.dataset.theme = 'light';
    
    return () => {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage && currentTheme) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#0a0a0a';
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target)) {
        setShowLoginDropdown(false);
      }
    };

    if (showLoginDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLoginDropdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Boost roles data - ALL SAME COLOR NOW
  const boostRoles = {
    leadership: [
      {
        name: 'Captain',
        icon: Crown,
        eligible: 'Any',
        boost: '2× all points',
        description: 'Your star player'
      },
      {
        name: 'Vice Captain',
        icon: Swords,
        eligible: 'Any',
        boost: '1.5× all points',
        description: 'Reliable performer'
      }
    ],
    batting: [
      {
        name: 'Slogger',
        icon: Zap,
        eligible: 'BAT, WK',
        boost: '2× SR, Fours & Sixes',
        description: 'Big hitting power'
      },
      {
        name: 'Accumulator',
        icon: Anchor,
        eligible: 'BAT, WK',
        boost: '2× Runs & Milestones',
        description: 'Consistent scorer'
      }
    ],
    specialist: [
      {
        name: 'Safe Hands',
        icon: Handshake,
        eligible: 'WK',
        boost: '2× Fielding',
        description: 'Keeper excellence'
      },
      {
        name: 'Virtuoso',
        icon: Sparkles,
        eligible: 'ALL',
        boost: '1.5× Runs, Wickets, Fielding',
        description: 'All-round impact'
      }
    ],
    bowling: [
      {
        name: 'Rattler',
        icon: Bomb,
        eligible: 'BOWL',
        boost: '2× Wickets',
        description: 'Strike bowler'
      },
      {
        name: 'Guardian',
        icon: Shield,
        eligible: 'BOWL',
        boost: '2× Economy',
        description: 'Tight bowling'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Animated Background Orbs - More subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-primary-100/40 to-slate-100/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-tr from-slate-100/40 to-primary-100/40 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-bl from-primary-50/30 to-slate-50/30 rounded-full blur-3xl animate-float-slow" />
      </div>

      {/* Hero Section with Auth */}
      <section className="relative z-10 pt-0 px-0 lg:px-4 hero-section">
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            src="https://pub-83784c6e5d2c48c98bbfb52f217af0ad.r2.dev/hero.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center hero-video"
            style={{ background: 'transparent' }}
          />
          <div className="absolute inset-0 bg-slate-700/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white/10" />
        </div>

        {/* Auth Buttons - Top Right */}
        <div className="absolute top-8 right-8 z-50 flex items-center space-x-4" ref={loginDropdownRef}>
          <button
            onClick={() => setShowLoginDropdown(!showLoginDropdown)}
            className="px-6 py-3 text-lg font-semibold text-white hover:text-white/80 transition-all duration-200"
          >
            Login
          </button>
          <Link
            to="/register"
            className="px-8 py-3 text-lg font-semibold text-white rounded-xl border-2 border-white hover:bg-white/10 backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-lg"
          >
            Sign Up
          </Link>

          {/* Login Dropdown */}
          {showLoginDropdown && (
            <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-8 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary-600">Welcome Back</h3>
                <button
                  onClick={() => setShowLoginDropdown(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all duration-200 placeholder:text-slate-400"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all duration-200 placeholder:text-slate-400"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all duration-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-600 mt-6">
                New to Pitch Perfect?{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Create account
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Main Hero Content - Centered Logo */}
        <div
          className="relative z-10 max-w-6xl mx-auto text-center flex flex-col items-center justify-center px-4"
          style={{ minHeight: '100vh' }}
        >
          {/* Large Logo and Title - always one line */}
          <div className="flex flex-nowrap items-center justify-center space-x-4 mb-8 w-full">
            <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                src="/icon.png"
                alt="Pitch Perfect Logo"
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0 2px 24px rgba(31,190,221,0.25))' }}
              />
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold font-caption bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent drop-shadow-2xl whitespace-nowrap">
              Pitch Perfect
            </h1>
          </div>
          {/* Subheader */}
          <p className="text-2xl sm:text-3xl lg:text-3xl text-white/90 mb-12 font-light">
            Fantasy Cricket, Evolved
          </p>

          {/* CTA Button */}
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="px-8 py-4 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-semibold rounded-xl hover:bg-white/30 hover:scale-105 transition-all duration-300 shadow-2xl flex items-center gap-2"
          >
            Learn More
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold font-caption mb-4 text-primary-600">
              How It Works
            </h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-md">
                1
              </div>
              <h3 className="text-2xl font-bold font-caption text-primary-600 mb-3">
                Draft Your Squad
              </h3>
              <p className="text-slate-600 text-base leading-relaxed mb-6">
                Build your squad through a live snake draft. Rank your player choices, get them drafted, and own your season.
              </p>
              <div className="w-full max-w-md mx-auto mt-2 rounded-lg overflow-hidden border border-slate-200 bg-[rgba(248,250,252,0.9)] backdrop-blur-[8px]">
                <video
                  src="https://pub-83784c6e5d2c48c98bbfb52f217af0ad.r2.dev/snake_draft_animation.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-contain object-top video-mobile-zoom"
                  style={{
                    minHeight: '180px',
                    maxHeight: '320px',
                    background: 'rgba(248,250,252,0.9)',
                  }}
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-md">
                2
              </div>
              <h3 className="text-2xl font-bold font-caption text-primary-600 mb-3">
                Set Your Boosts
              </h3>
              <p className="text-slate-600 text-base mb-6 leading-relaxed">
                Each week, assign eight roles that shape your scoring strategy. Smart multipliers reward different styles and player types.
              </p>
              {/* Boost Role Cards - Monochrome */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {[...boostRoles.leadership, ...boostRoles.batting, ...boostRoles.specialist, ...boostRoles.bowling].map((role, idx) => (
                  <div key={idx} className="group bg-white/95 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center text-center border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all duration-200">
                    <div className="mb-3">
                      <role.icon className="w-8 h-8 text-slate-600 group-hover:text-primary-600 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="font-bold text-primary-600 text-sm mb-1">{role.name}</div>
                    <div className="text-xs text-slate-600 font-medium">{role.boost}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-md">
                3
              </div>
              <h3 className="text-2xl font-bold font-caption text-primary-600 mb-3">
                Track It Live
              </h3>
              <p className="text-slate-600 text-base mb-6 leading-relaxed">
                Points update ball-by-ball. Every boundary, wicket, and catch moves the standings in real time.
              </p>
              {/* Scoring details - Compact Grid */}
              <div className="mt-2 animate-fade-in-up text-left w-full space-y-3">
                <div className="bg-slate-50 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                  <div className="font-bold text-primary-600 mb-3">
                    Batting
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
                    <div>Run <span className="font-mono font-bold text-primary-600 float-right">+1</span></div>
                    <div>Four <span className="font-mono font-bold text-primary-600 float-right">+1</span></div>
                    <div>Six <span className="font-mono font-bold text-primary-600 float-right">+2</span></div>
                    <div>50+ <span className="font-mono font-bold text-primary-600 float-right">+8</span></div>
                    <div>100+ <span className="font-mono font-bold text-primary-600 float-right">+16</span></div>
                    <div>Strike Rate <span className="font-mono font-bold text-primary-600 float-right">-6 → +6</span></div>
                  </div>
                </div>
                <div className="bg-slate-50 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                  <div className="font-bold text-primary-600 mb-3">
                    Bowling
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
                    <div>Wicket <span className="font-mono font-bold text-primary-600 float-right">+25</span></div>
                    <div>Maiden <span className="font-mono font-bold text-primary-600 float-right">+8</span></div>
                    <div>3+ Wkts <span className="font-mono font-bold text-primary-600 float-right">+8</span></div>
                    <div>5+ Wkts <span className="font-mono font-bold text-primary-600 float-right">+16</span></div>
                    <div className="col-span-2">Economy <span className="font-mono font-bold text-primary-600 float-right">-6 → +6</span></div>
                  </div>
                </div>
                <div className="bg-slate-50 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                  <div className="font-bold text-primary-600 mb-3">
                    Fielding & Other
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
                    <div>Catch <span className="font-mono font-bold text-primary-600 float-right">+8</span></div>
                    <div>Stumping <span className="font-mono font-bold text-primary-600 float-right">+12</span></div>
                    <div>Run Out <span className="font-mono font-bold text-primary-600 float-right">+8</span></div>
                    <div>PotM <span className="font-mono font-bold text-primary-600 float-right">+50</span></div>
                    <div className="col-span-2">Playing XI <span className="font-mono font-bold text-primary-600 float-right">+4</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights - Why Pitch Perfect */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold font-caption mb-4 text-primary-600">
              A New Way to Compete
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl hover:border-primary-300 transition-all duration-300">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-slate-700 group-hover:text-primary-600 group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-primary-600 mb-3">Season-Long Play</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Compete throughout the entire seasons, not just individual matches. Build a legacy.
              </p>
            </div>
            <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl hover:border-primary-300 transition-all duration-300">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <Target className="w-10 h-10 text-slate-700 group-hover:text-primary-600 group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-primary-600 mb-3">Deep Strategy</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                8 unique boost roles, draft positioning, and squad composition create endless strategic depth.
              </p>
            </div>
            <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl hover:border-primary-300 transition-all duration-300">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <Zap className="w-10 h-10 text-slate-700 group-hover:text-primary-600 group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-primary-600 mb-3">Real-Time Action</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Watch your fantasy points update ball-by-ball. Every delivery matters.
              </p>
            </div>
            <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl hover:border-primary-300 transition-all duration-300">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <Users className="w-10 h-10 text-slate-700 group-hover:text-primary-600 group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-primary-600 mb-3">Private Leagues</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Create leagues with friends. Draft together. Compete all season long.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-20 px-4 mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-12 text-center shadow-2xl">
            <Award className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-4xl sm:text-5xl font-bold font-caption text-white mb-4">
              Ready to Play?
            </h2>
            <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
              Get your friends together, set up a league, and show them who's boss
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-primary-600 font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Create Your Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(15px) translateX(-15px); }
          66% { transform: translateY(-10px) translateX(10px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          50% { transform: translateY(-15px) translateX(15px) rotate(5deg); }
        }

        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(-10px) scale(0.98); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Glass effect ring styles */
        input:focus, button:focus-visible {
          outline: none;
        }

        /* Smooth button morphing */
        button, a {
          transform-origin: center;
        }

        /* Autofill fix for input fields in login dropdown */
        input:-webkit-autofill,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:active {
          box-shadow: 0 0 0 1000px #f8fafc inset !important; /* slate-50 */
          -webkit-box-shadow: 0 0 0 1000px #f8fafc inset !important;
          background-color: #f8fafc !important;
          color: #334155 !important; /* slate-700 */
          transition: background-color 9999s ease-in-out 0s;
        }
        input:-webkit-autofill::first-line {
          color: #334155 !important;
        }
        /* For Firefox */
        input:-moz-autofill {
          box-shadow: 0 0 0 1000px #f8fafc inset !important;
          background-color: #f8fafc !important;
          color: #334155 !important;
        }

        .video-mobile-zoom {
          /* Always scale up, keep top fixed */
          transform: scale(1.08) translateY(0);
          transform-origin: top center;
        }

        /* Ensure hero section and video fill viewport on mobile and desktop */
        .hero-section {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .hero-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          object-fit: cover;
        }
        @media (min-width: 1024px) {
          .hero-section {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .hero-video {
            position: absolute;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
