import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../utils/axios';
import { Shield, Check, AlertCircle } from 'lucide-react';

// Predefined color palette
const COLOR_PALETTE = [
  { name: 'Light Blue', hex: '#3197F7' },
  { name: 'Dark Blue', hex: '#1414AD' },
  { name: 'Dark Green', hex: '#006605' },
  { name: 'Lime Green', hex: '#93F500' },
  { name: 'Turquoise', hex: '#02EDAF' },
  { name: 'Purple', hex: '#79059C' },
  { name: 'Pink', hex: '#FA14DB' },
  { name: 'Red', hex: '#AB001C' },
  { name: 'Orange', hex: '#FF8800' },
  { name: 'Yellow', hex: '#EBE600' }
];

// Helper function to determine text color based on background
const getTextColor = (backgroundColor) => {
  if (!backgroundColor) return '#000000';
  
  // Convert hex to RGB
  let r = 0, g = 0, b = 0;
  
  // Handle both #RGB and #RRGGBB formats
  if (backgroundColor.length === 4) {
    r = parseInt(backgroundColor[1] + backgroundColor[1], 16);
    g = parseInt(backgroundColor[2] + backgroundColor[2], 16);
    b = parseInt(backgroundColor[3] + backgroundColor[3], 16);
  } else if (backgroundColor.length === 7) {
    r = parseInt(backgroundColor.substring(1, 3), 16);
    g = parseInt(backgroundColor.substring(3, 5), 16);
    b = parseInt(backgroundColor.substring(5, 7), 16);
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Blank shield with initial appearance
const BlankShield = ({ className }) => (
  <div className={`relative ${className || ''}`}>
    <Shield size={48} className="text-neutral-300 dark:text-neutral-600" />
    <span className="absolute inset-0 flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-xs">
      Select
    </span>
  </div>
);

// Color picker component
const ColorPicker = ({ selectedColor, onChange, usedColors, showUsedColors = true }) => {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Squad Color
      </label>
      <div className="grid grid-cols-5 gap-3">
        {COLOR_PALETTE.map((color) => {
          const isUsed = usedColors.includes(color.hex);
          const isSelected = selectedColor === color.hex;
          
          return (
            <button
              key={color.hex}
              type="button"
              disabled={isUsed && !isSelected && showUsedColors}
              onClick={() => !isUsed || isSelected ? onChange(color.hex) : null}
              className={`
                w-full aspect-square rounded-lg p-1 relative
                transition-all duration-200
                ${isSelected ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-neutral-800 scale-110' : ''}
                ${isUsed && !isSelected && showUsedColors ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              `}
              style={{ backgroundColor: color.hex }}
              title={`${color.name}${isUsed && !isSelected ? ' (Already in use)' : ''}`}
            >
              {isSelected && (
                <Check
                  size={20}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ color: getTextColor(color.hex) }}
                />
              )}
              {isUsed && !isSelected && showUsedColors && (
                <AlertCircle
                  size={20}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ color: getTextColor(color.hex) }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Squad preview component
const SquadPreview = ({ name, color }) => {
  const textColor = getTextColor(color);
  const displayName = name.trim() || 'Your Squad';
  
  return (
    <div className="mt-6 mb-8">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Preview</h3>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-4 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center">
          {color ? (
            <div 
              className="rounded-full h-12 w-12 flex items-center justify-center mr-3"
              style={{ backgroundColor: color, color: textColor }}
            >
              <Shield size={24} />
            </div>
          ) : (
            <BlankShield className="mr-3" />
          )}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {displayName}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              0 points • New Squad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Existing squads component
const ExistingSquads = ({ squads, leagueName }) => {
  if (!squads || squads.length === 0) return null;
  
  return (
    <div className="mt-6 mb-2">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Existing Squads in {leagueName}
      </h3>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm overflow-hidden border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700">
        {squads.map((squad) => (
          <div key={squad.id} className="flex items-center p-3">
            <div 
              className="w-1.5 h-8 rounded-sm mr-3"
              style={{ backgroundColor: squad.color }}
            />
            <span className="text-neutral-900 dark:text-white font-medium">
              {squad.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// SquadForm component that can be used in both CreateSquad and JoinLeague
export const SquadForm = ({ 
  initialName = '',
  initialColor = '',
  leagueId,
  leagueData,
  existingSquads = [],
  onSubmit,
  submitLabel = 'Create Squad',
  showError = null,
  isProcessing = false
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [formError, setFormError] = useState(null);
  
  // Compute used colors from existing squads
  const usedColors = existingSquads.map(squad => squad.color);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      setFormError('Please enter a squad name');
      return;
    }
    
    if (!color) {
      setFormError('Please select a squad color');
      return;
    }
    
    // Submit the form data to parent component
    onSubmit({ name: name.trim(), color, leagueId });
  };
  
  // Show either parent error or form validation error
  const error = showError || formError;
  
  return (
    <div>
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Squad Name
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="Enter squad name"
            className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm 
              transition-colors duration-200
              bg-white dark:bg-neutral-700 
              text-neutral-900 dark:text-white
              focus:outline-none focus:ring-primary-500 focus:border-primary-500 
              dark:border-neutral-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        {/* Color Picker */}
        <ColorPicker
          selectedColor={color}
          onChange={setColor}
          usedColors={usedColors}
        />
        
        {/* Preview */}
        <SquadPreview name={name} color={color} />
        
        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                   text-white bg-primary-600 hover:bg-primary-700 
                   dark:bg-primary-700 dark:hover:bg-primary-800
                   transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-neutral-800
                   disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Processing...</span>
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
      
      {/* Existing Squads */}
      <ExistingSquads 
        squads={existingSquads} 
        leagueName={leagueData?.name || 'this league'} 
      />
    </div>
  );
};

// CreateSquad component that uses the SquadForm
const CreateSquad = () => {
  const [status, setStatus] = useState({
    loading: true,
    error: null,
    redirect: false,
    leagueDetails: null,
    existingSquads: [],
    leagueId: null,
    isSubmitting: false
  });
  
  useEffect(() => {
    getLeagueFromUrl();
  }, []);
  
  const getLeagueFromUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const leagueId = params.get('league');
    
    if (!leagueId) {
      setStatus(prev => ({ 
        ...prev,
        error: 'No league specified',
        loading: false
      }));
      return;
    }

    try {
      // Get league details
      const leagueResponse = await api.get(`/leagues/${leagueId}/`);
      
      setStatus(prev => ({ 
        ...prev,
        leagueId,
        leagueDetails: leagueResponse.data,
        existingSquads: leagueResponse.data.squads || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching league:', error);
      setStatus(prev => ({ 
        ...prev,
        error: 'Failed to fetch league details: ' + (error.response?.data?.detail || error.message),
        loading: false
      }));
    }
  };

  const handleSubmit = async (formData) => {
    setStatus(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      await api.post('/squads/', {
        name: formData.name,
        color: formData.color,
        league: formData.leagueId
      });
      
      // Redirect on success
      setStatus(prev => ({ ...prev, redirect: true }));
    } catch (error) {
      console.error('Error creating squad:', error);
      setStatus(prev => ({ 
        ...prev,
        error: error.response?.data?.detail || 'Failed to create squad',
        isSubmitting: false
      }));
    }
  };

  // Handle redirect
  if (status.redirect) {
    return <Navigate to="/dashboard" />;
  }

  // Show loading state
  if (status.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md">
          <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-center text-neutral-700 dark:text-neutral-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:py-12">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
            Create Your Squad
          </h2>
          {status.leagueDetails && (
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
              for {status.leagueDetails.name}
            </p>
          )}
        </div>
        
        {/* Main Card */}
        <div className="bg-white dark:bg-neutral-800 shadow-md rounded-lg p-6 mb-6">
          <SquadForm
            leagueId={status.leagueId}
            leagueData={status.leagueDetails}
            existingSquads={status.existingSquads}
            onSubmit={handleSubmit}
            showError={status.error}
            isProcessing={status.isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateSquad;