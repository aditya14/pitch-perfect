import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { AlertCircle, Eye, EyeOff, Check, X, Users, Zap } from 'lucide-react';

// Add this style to ensure safe top spacing on mobile browsers
const safeTopStyle = `
  .safe-top {
    padding-top: env(safe-area-inset-top, 1rem);
  }
`;

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
      <div className="flex items-center text-green-600 dark:text-green-400">
        <Check className="h-4 w-4 mr-1" />
        <span className="text-xs">Looks good</span>
      </div>
    ) : (
      <div className="flex items-center text-red-600 dark:text-red-400">
        <X className="h-4 w-4 mr-1" />
        <span className="text-xs">{errorMessage}</span>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-950 pt-10 pb-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Inject safe-area CSS */}
      <style dangerouslySetInnerHTML={{ __html: safeTopStyle }} />
      
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-neutral-100 dark:bg-neutral-900/20 blur-3xl opacity-50"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-blue-100 dark:bg-blue-900/20 blur-3xl opacity-40"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/2 transform -translate-x-1/2 w-screen h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-30"></div>
      </div>
      
      <div className="container mx-auto max-w-7xl z-10 relative">
        {/* App Logo - Always at the top on all screens with safe spacing */}
        <div className="flex items-center justify-center mb-8 safe-top">
          <img src="/icon.png" alt="PitchPerfect Logo" className="h-12 w-12 sm:h-16 sm:w-16 mr-3" />
          <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white">
            <span className="text-primary-500 dark:text-primary-500">Pitch</span>Perfect
          </h1>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          {/* Registration Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-700">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Or{' '}
                  <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                    sign in to your existing account
                  </Link>
                </p>
              </div>
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className={`appearance-none block w-full px-3 py-2 border ${
                        validations.email === false 
                          ? 'border-red-300 dark:border-red-700' 
                          : 'border-neutral-300 dark:border-neutral-600'
                      } rounded-md shadow-sm placeholder-neutral-400 
                      focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                      dark:bg-neutral-700 dark:text-white sm:text-sm bg-neutral-100 text-black`}
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <ValidationIndicator 
                      isValid={validations.email} 
                      errorMessage="Please enter a valid email address" 
                    />
                  </div>
                  
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        required
                        className={`appearance-none block w-full px-3 py-2 border ${
                          validations.password === false 
                            ? 'border-red-300 dark:border-red-700' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        } rounded-md shadow-sm placeholder-neutral-400 
                        focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-neutral-700 dark:text-white sm:text-sm bg-neutral-100 text-black`}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <ValidationIndicator 
                      isValid={validations.password} 
                      errorMessage="Password must be at least 8 characters long" 
                    />
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Confirm Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        required
                        className={`appearance-none block w-full px-3 py-2 border ${
                          validations.passwordMatch === false 
                            ? 'border-red-300 dark:border-red-700' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        } rounded-md shadow-sm placeholder-neutral-400 
                        focus:outline-none focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-neutral-700 dark:text-white sm:text-sm bg-neutral-100 text-black`}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <ValidationIndicator 
                      isValid={validations.passwordMatch} 
                      errorMessage="Passwords do not match" 
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                      bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-500 dark:hover:bg-neutral-600 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                      disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Sign up'}
                  </button>
                </div>
              </form>
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      Join the community
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <div className="inline-flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                <Users className="h-4 w-4 mr-2 text-primary-500" />
                <span>Join thousands of fantasy cricket enthusiasts</span>
              </div>
              <div className="inline-flex items-center text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                <span>Ready for the 2025 IPL season</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
          <p>© 2025 PitchPerfect. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;