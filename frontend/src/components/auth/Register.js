import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { AlertCircle, Eye, EyeOff, Check, X, Users, BarChart3, Zap, ChevronRight, Star, Globe, Shield } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validation states
  const [validations, setValidations] = useState({
    email: null,
    password: null,
    passwordMatch: null
  });

  // Force dark mode for register screen
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
  
  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePassword = (password) => {
    return password.length >= 8;
  };
  
  const validatePasswordMatch = (password, confirmPassword) => {
    return password === confirmPassword;
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate as user types
    if (name === 'email') {
      setValidations(prev => ({
        ...prev,
        email: value ? validateEmail(value) : null
      }));
    } else if (name === 'password') {
      setValidations(prev => ({
        ...prev,
        password: value ? validatePassword(value) : null,
        passwordMatch: formData.confirmPassword 
          ? validatePasswordMatch(value, formData.confirmPassword)
          : null
      }));
    } else if (name === 'confirmPassword') {
      setValidations(prev => ({
        ...prev,
        passwordMatch: formData.password 
          ? validatePasswordMatch(formData.password, value)
          : null
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate all fields
    const emailValid = validateEmail(formData.email);
    const passwordValid = validatePassword(formData.password);
    const passwordsMatch = validatePasswordMatch(formData.password, formData.confirmPassword);
    
    setValidations({
      email: emailValid,
      password: passwordValid,
      passwordMatch: passwordsMatch
    });
    
    // Check if all validations pass
    if (!emailValid || !passwordValid || !passwordsMatch) {
      setError('Please correct the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Register the user - username is set to the email value
      await api.post('/register/', {
        username: formData.email,
        email: formData.email,
        password: formData.password
      });
      
      // Auto-login after successful registration
      await login(formData.email, formData.password);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.response?.data?.email) {
        setError(`Email error: ${error.response.data.email[0]}`);
      } else if (error.response?.data?.username) {
        setError(`Username error: ${error.response.data.username[0]}`);
      } else if (error.response?.data?.password) {
        setError(`Password error: ${error.response.data.password[0]}`);
      } else if (error.response?.data?.non_field_errors) {
        setError(error.response.data.non_field_errors[0]);
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Inline validation indicators
  const ValidationIndicator = ({ isValid, errorMessage }) => {
    if (isValid === null) return null;
    
    return isValid ? (
      <div className="flex items-center text-green-400 mt-2">
        <Check className="h-4 w-4 mr-1" />
        <span className="text-xs">Looks good</span>
      </div>
    ) : (
      <div className="flex items-center text-red-300 mt-2">
        <X className="h-4 w-4 mr-1" />
        <span className="text-xs">{errorMessage}</span>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        {/* Floating Glass Orbs */}
        <div className="absolute top-1/4 left-1/5 w-72 h-72 rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/20 floating-orb"></div>
        <div className="absolute bottom-1/4 right-1/5 w-56 h-56 rounded-full bg-gradient-to-tr from-blue-400/15 to-primary-500/15 floating-orb" style={{animationDelay: '5s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-gradient-to-bl from-primary-300/10 to-primary-700/10 floating-orb" style={{animationDelay: '10s'}}></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(31,190,221,0.3) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-7xl">
          
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center mb-6">
              <div className="liquid-glass-card glass-rounded-lg p-4 mr-6 brand-glow">
                <img src="/icon.png" alt="Pitch Perfect Logo" className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold text-white font-caption">
                  <span className="text-primary-400">Pitch </span>
                  <span>Perfect</span>
                </h1>
                <p className="text-slate-300 text-lg mt-2">Fantasy Cricket Evolved</p>
              </div>
            </div>
          </div>

          {/* Main Layout - Side by Side */}
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            
            {/* Left Side - Feature Showcase (3 columns) */}
            <div className="lg:col-span-3 space-y-8 order-last lg:order-first">
              
              {/* Hero Message */}
              <div className="liquid-glass-main glass-rounded relative overflow-hidden">
                <div className="glass-shine absolute inset-0 glass-rounded"></div>
                <div className="relative z-10 p-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    Join the Revolution
                  </h2>
                  <p className="text-slate-200 text-lg leading-relaxed mb-8">
                    Create your account and experience fantasy cricket like never before. 
                    Join thousands of cricket fans who have already transformed their 
                    fantasy experience with our innovative platform.
                  </p>
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="liquid-glass-badge rounded-full px-5 py-3 flex items-center">
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm font-medium text-white">IPL Available Now</span>
                    </div>
                    <div className="liquid-glass-badge rounded-full px-5 py-3 flex items-center">
                      <Globe className="w-4 h-4 text-primary-400 mr-3" />
                      <span className="text-sm font-medium text-white">International Cricket Coming Soon</span>
                    </div>
                  </div>
                  
                  {/* International Formats */}
                  <div className="pl-4 border-l-2 border-primary-400/30">
                    <p className="text-slate-300 text-sm mb-3">Upcoming formats:</p>
                    <div className="flex flex-wrap gap-3">
                      {['Tests', 'ODIs', 'T20Is'].map((format) => (
                        <div key={format} className="liquid-glass-input glass-rounded-sm px-4 py-2">
                          <span className="text-sm text-primary-300 font-medium">{format}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Users, title: "Draft System", desc: "Unique squad building through strategic snake drafts with your league" },
                  { icon: BarChart3, title: "Core Squad Strategy", desc: "Boost key players with specialized roles and point multipliers" },
                  { icon: Shield, title: "Season-Long", desc: "Compete throughout entire cricket seasons with trades and strategy" },
                  { icon: Zap, title: "Real-Time", desc: "Live scoring and instant updates during every match" }
                ].map((feature, index) => (
                  <div key={index} className="liquid-glass-card glass-rounded-lg p-6 group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start space-x-4">
                      <div className="liquid-glass-input glass-rounded-md p-3 group-hover:bg-primary-500/20 transition-colors">
                        <feature.icon className="w-6 h-6 text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2 text-lg">{feature.title}</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Register Form (2 columns) */}
            <div className="lg:col-span-2 flex justify-center lg:justify-end order-first lg:order-last">
              <div className="w-full max-w-md">
                <div className="liquid-glass-main glass-rounded relative overflow-hidden">
                  <div className="glass-shine absolute inset-0 glass-rounded"></div>
                  
                  <div className="relative z-10 p-8">
                    {/* Form Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-white mb-3">Create Your Account</h3>
                      <p className="text-slate-300">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                          Sign in
                        </Link>
                      </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="liquid-glass-card glass-rounded-md p-4 mb-6 border border-red-400/20">
                        <div className="flex items-start text-red-300">
                          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Email Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-3">
                          Email Address <span className="text-red-400">*</span>
                        </label>
                        <div className={`liquid-glass-input glass-rounded-md ${
                          validations.email === false ? 'border-red-400/50' : ''
                        }`}>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none rounded-lg"
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                        <ValidationIndicator 
                          isValid={validations.email} 
                          errorMessage="Please enter a valid email address" 
                        />
                      </div>

                      {/* Password Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-3">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <div className={`liquid-glass-input glass-rounded-md relative ${
                          validations.password === false ? 'border-red-400/50' : ''
                        }`}>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-4 pr-12 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none rounded-lg"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <ValidationIndicator 
                          isValid={validations.password} 
                          errorMessage="Password must be at least 8 characters long" 
                        />
                      </div>

                      {/* Confirm Password Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-3">
                          Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <div className={`liquid-glass-input glass-rounded-md relative ${
                          validations.passwordMatch === false ? 'border-red-400/50' : ''
                        }`}>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-4 pr-12 bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none rounded-lg"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <ValidationIndicator 
                          isValid={validations.passwordMatch} 
                          errorMessage="Passwords do not match" 
                        />
                      </div>

                      {/* Sign Up Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="liquid-glass-button glass-rounded-md w-full py-4 px-6 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center justify-center">
                          {isSubmitting ? 'Creating Account...' : 'Create Account'}
                          {!isSubmitting && <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </button>
                    </form>

                    {/* Bottom Text */}
                    <div className="mt-8 text-center">
                      <p className="text-sm text-slate-400">
                        Join thousands of cricket fans worldwide
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-sm text-slate-300">
                    <Users className="w-4 h-4 mr-3 text-primary-400" />
                    <span>Join thousands of fantasy cricket enthusiasts</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-300">
                    <Zap className="w-4 h-4 mr-3 text-yellow-400" />
                    <span>Get started with IPL 2025 season</span>
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

export default Register;