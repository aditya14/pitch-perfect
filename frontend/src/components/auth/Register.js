import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';

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
      <div className="flex items-center text-green-600">
        <Check className="h-4 w-4 mr-1" />
        <span className="text-xs">Looks good</span>
      </div>
    ) : (
      <div className="flex items-center text-red-600">
        <X className="h-4 w-4 mr-1" />
        <span className="text-xs">{errorMessage}</span>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                dark:bg-gray-700 dark:text-white sm:text-sm`}
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      : 'border-gray-300 dark:border-gray-600'
                  } rounded-md shadow-sm placeholder-gray-400 
                  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                  dark:bg-gray-700 dark:text-white sm:text-sm`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      : 'border-gray-300 dark:border-gray-600'
                  } rounded-md shadow-sm placeholder-gray-400 
                  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                  dark:bg-gray-700 dark:text-white sm:text-sm`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isSubmitting ? 'Creating Account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;