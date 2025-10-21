import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle2, Mail, Lock, Sparkles } from 'lucide-react';

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

  // Force light mode for register screen
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      // Use email as username
      await register(formData.email, formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      if (error.response?.data) {
        // Handle multiple error messages
        const errorData = error.response.data;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Animated Background Orbs - More subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-primary-100/40 to-slate-100/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-tr from-slate-100/40 to-primary-100/40 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-bl from-primary-50/30 to-slate-50/30 rounded-full blur-3xl animate-float-slow" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                <img src="/icon.png" alt="Pitch Perfect" className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-caption bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  Pitch Perfect
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">Fantasy Cricket Evolved</p>
              </div>
            </div>

            {/* Back to Login */}
            <Link
              to="/login"
              className="flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-primary-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Marketing Content */}
            <div className="hidden lg:block">
              <div className="space-y-8">
                <div>
                  <h2 className="text-5xl font-bold font-caption mb-4 leading-tight text-slate-900">
                    Join the Future
                    <br />
                    <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                      of Fantasy Cricket
                    </span>
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    Create your account and start building your squad.
                  </p>
                </div>

                {/* Features - Monochrome with hover */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Snake Draft System</h3>
                      <p className="text-sm text-slate-600">Fair drafting that gives everyone a chance at top players</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">8 Strategic Boosts</h3>
                      <p className="text-sm text-slate-600">Multiply your players' points with unique role assignments</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Live Ball-by-Ball Scoring</h3>
                      <p className="text-sm text-slate-600">Watch your fantasy points grow in real-time</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-slate-700" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Season-Long Competition</h3>
                      <p className="text-sm text-slate-600">Compete throughout entire seasons, not just one match</p>
                    </div>
                  </div>
                </div>

                {/* Stats - Monochrome */}
                {/* <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="text-2xl font-bold font-mono text-primary-600 mb-1">1000+</div>
                    <div className="text-xs text-slate-600">Managers</div>
                  </div>
                  <div className="p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="text-2xl font-bold font-mono text-primary-600 mb-1">50+</div>
                    <div className="text-xs text-slate-600">Leagues</div>
                  </div>
                  <div className="p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                    <div className="text-2xl font-bold font-mono text-primary-600 mb-1">10K+</div>
                    <div className="text-xs text-slate-600">Matches</div>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-10">
                <div className="text-center mb-8">
                  <div className="inline-block p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold font-caption text-slate-900 mb-2">
                    Create Account
                  </h2>
                  <p className="text-slate-600">
                    Start your fantasy cricket journey today
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all duration-200 placeholder:text-slate-400"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all duration-200 placeholder:text-slate-400"
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
                    <p className="text-xs text-slate-500 mt-2">Must be at least 8 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all duration-200 placeholder:text-slate-400"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all duration-200"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>

              {/* Mobile Stats - Only visible on mobile */}
              <div className="lg:hidden grid grid-cols-3 gap-3 mt-6">
                <div className="p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                  <div className="text-xl font-bold font-mono text-primary-600 mb-1">1000+</div>
                  <div className="text-xs text-slate-600">Managers</div>
                </div>
                <div className="p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                  <div className="text-xl font-bold font-mono text-primary-600 mb-1">50+</div>
                  <div className="text-xs text-slate-600">Leagues</div>
                </div>
                <div className="p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md text-center hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                  <div className="text-xl font-bold font-mono text-primary-600 mb-1">10K+</div>
                  <div className="text-xs text-slate-600">Matches</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }

        /* Glass effect ring styles */
        input:focus, button:focus-visible {
          outline: none;
        }

        /* Smooth button morphing */
        button, a {
          transform-origin: center;
        }

        /* Icon color transition on focus */
        .group:focus-within .text-slate-400 {
          color: rgb(31 190 221); /* primary-600 */
        }
      `}</style>
    </div>
  );
};

export default Register;
