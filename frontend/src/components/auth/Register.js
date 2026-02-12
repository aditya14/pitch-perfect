import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Lock,
  Sparkles,
  Trophy,
  Zap,
  Shield
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
          setError(errorMessages);
        } else {
          setError(errorData.detail || 'Registration failed. Please try again.');
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <p className="text-xs text-slate-500 dark:text-slate-300">Fantasy Cricket, Evolved</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm lg-glass-tertiary lg-rounded-md text-slate-700 dark:text-slate-200 hover:lg-glass-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
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
            <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/55 backdrop-blur-md" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-slate-900/15 to-slate-900/45 backdrop-blur-sm" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-start p-6 sm:p-8 lg:p-10">
            <div className="space-y-6">
              <div className="lg-glass lg-rounded-xl p-6 sm:p-8 border border-white/40 dark:border-white/10 lg-shine">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  New League Entry
                </p>
                <h2 className="mt-4 text-4xl sm:text-5xl font-bold font-caption text-slate-900 dark:text-white leading-tight">
                  Create your account.
                  <br />
                  Join your league.
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300 text-lg leading-relaxed max-w-xl">
                  Set up your account and get into the draft. Everything else lives in one place once you are in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                  <Trophy className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Season Table</p>
                </div>
                <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                  <Zap className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Live Points</p>
                </div>
                <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Boost Strategy</p>
                </div>
              </div>
            </div>

            <div className="lg-glass-frosted lg-rounded-xl p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-2xl">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 lg-glass-primary rounded-2xl mb-4">
                  <Sparkles className="w-7 h-7 text-primary-700 dark:text-primary-300" />
                </div>
                <h2 className="text-3xl font-bold font-caption text-slate-900 dark:text-white">Create Account</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Start your season.</p>
              </div>

              {error && (
                <div className="mb-5 lg-alert lg-glass-danger">
                  <AlertCircle className="lg-alert-icon" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-11 lg-input bg-white/60 dark:bg-neutral-900/60 border border-white/50 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-11 pr-12 lg-input bg-white/60 dark:bg-neutral-900/60 border border-white/50 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-11 pr-12 lg-input bg-white/60 dark:bg-neutral-900/60 border border-white/50 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400"
                      placeholder="********"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-500 dark:text-slate-300 hover:lg-glass-tertiary"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 lg-button lg-rounded-md text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-700 dark:text-primary-300 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="lg-glass lg-rounded-xl p-6 border border-white/40 dark:border-white/10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-300" />
            You can join or create a league right after registration.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Register;
