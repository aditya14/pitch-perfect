import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  Zap,
  Sparkles,
  Trophy,
  Crown,
  Swords,
  Anchor,
  Handshake,
  Bomb,
  Shield,
  Target,
  Award,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Force dark theme on auth screen for consistent logged-out styling
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains('dark');
    const previousTheme = root.dataset.theme;
    const previousBackground = root.style.backgroundColor;

    root.classList.add('dark');
    root.style.backgroundColor = '#0a0a0a';
    root.dataset.theme = 'dark';

    return () => {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        if (!hadDarkClass) {
          root.classList.remove('dark');
        }
        if (previousTheme) {
          root.dataset.theme = previousTheme;
        } else {
          delete root.dataset.theme;
        }
        if (previousBackground) {
          root.style.backgroundColor = previousBackground;
        } else {
          root.style.removeProperty('background-color');
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
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Invalid credentials');
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

  const boostRoles = {
    leadership: [
      { name: 'Captain', icon: Crown, eligible: 'Any', boost: '2x all points', description: 'Your star player' },
      { name: 'Vice Captain', icon: Swords, eligible: 'Any', boost: '1.5x all points', description: 'Reliable performer' }
    ],
    batting: [
      { name: 'Slogger', icon: Zap, eligible: 'BAT, WK', boost: '2x SR, Fours and Sixes', description: 'Big hitting power' },
      { name: 'Anchor', icon: Anchor, eligible: 'BAT, WK', boost: '2x Runs and Milestones', description: 'Consistent scorer' }
    ],
    specialist: [
      { name: 'Safe Hands', icon: Handshake, eligible: 'WK', boost: '2x Fielding', description: 'Keeper excellence' },
      { name: 'Virtuoso', icon: Sparkles, eligible: 'ALL', boost: '1.5x Runs, Wickets, Fielding', description: 'All-round impact' }
    ],
    bowling: [
      { name: 'Rattler', icon: Bomb, eligible: 'BOWL', boost: '2x Wickets', description: 'Strike bowler' },
      { name: 'Guardian', icon: Shield, eligible: 'BOWL', boost: '2x Economy', description: 'Tight bowling' }
    ]
  };

  const allBoostRoles = [
    ...boostRoles.leadership,
    ...boostRoles.batting,
    ...boostRoles.specialist,
    ...boostRoles.bowling
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full bg-gradient-to-br from-primary-400/8 to-primary-600/8 dark:from-primary-400/15 dark:to-primary-600/15 lg-float"></div>
        <div className="absolute bottom-1/3 right-1/5 w-48 h-48 rounded-full bg-gradient-to-tr from-blue-400/5 to-primary-500/5 dark:from-blue-400/10 dark:to-primary-500/10 lg-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-gradient-to-bl from-primary-300/4 to-primary-700/4 dark:from-primary-300/8 dark:to-primary-700/8 lg-float" style={{ animationDelay: '6s' }}></div>
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(31,190,221,0.2) 1px, transparent 0)',
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      <header className="relative z-20 border-b border-white/30 dark:border-white/10 backdrop-blur-xl bg-white/60 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Pitch Perfect" className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-caption bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                Pitch Perfect
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm lg-glass-tertiary lg-rounded-md text-slate-700 dark:text-slate-200 hover:lg-glass-secondary"
              type="button"
            >
              Learn More
              <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white lg-button lg-rounded-md"
            >
              Sign Up
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="relative overflow-hidden lg-rounded-xl border border-white/30 dark:border-white/10">
          <div className="absolute inset-0 pointer-events-none">
            <video
              src="https://pub-83784c6e5d2c48c98bbfb52f217af0ad.r2.dev/hero.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-110 blur-sm"
            />
            <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/55 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-slate-900/15 to-slate-900/35 backdrop-blur-sm" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-start p-6 sm:p-8 lg:p-10">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="lg-glass lg-rounded-xl p-6 sm:p-8 border border-white/40 dark:border-white/10 lg-shine">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300 font-semibold">
                <Sparkles className="w-4 h-4" />
                Season-long fantasy league
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold font-caption text-slate-900 dark:text-white leading-tight">
                Fantasy Cricket, Evolved
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 text-lg leading-relaxed max-w-xl">
                Draft your squad and compete all season with your friends.
              </p>
              {/* <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="lg-glass-secondary lg-rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Format</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Snake draft + season table</div>
                </div>
                <div className="lg-glass-secondary lg-rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Scoring</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Ball-by-ball updates</div>
                </div>
              </div> */}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                <Trophy className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Season-Long Play</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Build a campaign, not one-off match picks.</p>
              </div>
              <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                <Target className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Deep Strategy</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Boost top players based on matchups.</p>
              </div>
              {/* <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                <Zap className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Real-Time Action</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">See standings move as the match unfolds.</p>
              </div> */}
              <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                <Users className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Bragging Rights</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Compete with friends in private leagues.</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg-glass-frosted lg-rounded-xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 lg-glass-primary rounded-2xl mb-4">
                <Sparkles className="w-7 h-7 text-primary-700 dark:text-primary-300" />
              </div>
              <h3 className="text-3xl font-bold font-caption text-slate-900 dark:text-white">Welcome Back</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Sign in to continue your season.</p>
            </div>

            {error && (
              <div className="mb-5 lg-alert lg-glass-danger">
                <AlertCircle className="lg-alert-icon" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Email</label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full lg-input bg-white/60 dark:bg-neutral-900/60 border border-white/50 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-12 lg-input bg-white/60 dark:bg-neutral-900/60 border border-white/50 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-300 hover:lg-glass-tertiary"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 lg-button lg-rounded-md text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-600 dark:text-slate-300 mt-5">
              New to Pitch Perfect?{' '}
              <Link to="/register" className="text-primary-700 dark:text-primary-300 font-semibold hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-bold font-caption text-primary-700 dark:text-primary-300">How It Works</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg-glass lg-rounded-xl p-6 border border-white/40 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl lg-glass-primary flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold mb-4">1</div>
            <h3 className="text-2xl font-bold font-caption text-slate-900 dark:text-white mb-3">Draft Your Squad</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Join a snake draft, rank players, and build your core squad before the season starts.
            </p>
            <div className="w-full mt-4 rounded-lg overflow-hidden border border-white/40 dark:border-white/10 bg-[rgba(248,250,252,0.75)] dark:bg-neutral-900/50 backdrop-blur-sm">
              <video
                src="https://pub-83784c6e5d2c48c98bbfb52f217af0ad.r2.dev/snake_draft_animation.webm"
                autoPlay
                loop
                muted
                playsInline
                className="block h-[220px] sm:h-[250px] w-[calc(100%+8px)] -ml-[4px] object-cover object-top"
              />
            </div>
          </div>

          <div className="lg-glass lg-rounded-xl p-6 border border-white/40 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl lg-glass-primary flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold mb-4">2</div>
            <h3 className="text-2xl font-bold font-caption text-slate-900 dark:text-white mb-3">Set Your Boosts</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
              Assign eight role-based multipliers each phase to optimize your weekly output.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {allBoostRoles.map((role, idx) => (
                <div key={idx} className="lg-glass-tertiary lg-rounded-md p-2 border border-white/40 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <role.icon className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{role.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{role.boost}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg-glass lg-rounded-xl p-6 border border-white/40 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl lg-glass-primary flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold mb-4">3</div>
            <h3 className="text-2xl font-bold font-caption text-slate-900 dark:text-white mb-3">Track It Live</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Points update ball-by-ball and standings refresh in real time across the entire league.
            </p>
            <div className="mt-4 lg-glass-tertiary lg-rounded-lg border border-white/40 dark:border-white/10 overflow-hidden">
              <div className="grid grid-cols-[36px_1fr_56px] px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-white/30 dark:border-white/10">
                <span>Rank</span>
                <span>Squad</span>
                <span className="text-right">Points</span>
              </div>
              {[ 
                { color: '#38bdf8', points: '784' },
                { color: '#fb7185', points: '776' },
                { color: '#34d399', points: '761' },
                { color: '#f59e0b', points: '748' }
              ].map((row, idx) => (
                <div
                  key={row.color}
                  className="grid grid-cols-[36px_1fr_56px] items-center px-3 py-2.5 border-b last:border-b-0 border-white/20 dark:border-white/5"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{idx + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-4 w-1 rounded-sm" style={{ backgroundColor: row.color }} />
                    <span className="h-2.5 rounded-full bg-slate-300/80 dark:bg-slate-700/80 block" style={{ width: `${62 - idx * 8}%` }} />
                  </div>
                  <span className="text-right text-xs font-semibold font-number text-slate-800 dark:text-slate-100">{row.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
        <div className="lg-glass-primary lg-rounded-xl p-8 sm:p-10 text-center border border-primary-300/30 dark:border-primary-300/20 shadow-2xl">
          <Award className="w-14 h-14 text-primary-700 dark:text-primary-300 mx-auto mb-4" />
          <h2 className="text-4xl sm:text-5xl font-bold font-caption text-slate-900 dark:text-white mb-4">Ready to Play?</h2>
          <p className="text-lg text-slate-700 dark:text-slate-200 mb-6 max-w-2xl mx-auto">
            Build your league, draft your squad, and compete all season.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 lg-button lg-rounded-md text-white font-semibold">
            Create Your Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Login;
