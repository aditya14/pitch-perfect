import React from 'react';
import { 
  Crown,
  Zap,
  Anchor,
  Handshake,
  Sparkles,
  Swords,
  Bomb,
  EarthLock
} from 'lucide-react';
import { getTextColorForBackground } from '../../utils/colorUtils';

/**
 * BoostInlineElement - A reusable component for displaying boost role icons and labels
 * 
 * @param {Object} props
 * @param {string} props.boostName - The name of the boost role (e.g., 'Captain', 'Slogger')
 * @param {string} props.color - The hexadecimal color code (e.g., '#ff5500')
 * @param {boolean} props.showLabel - Whether to display the boost name alongside the icon
 * @param {string} props.size - Size variant: 'S', 'M', or 'L'
 * @param {string} props.className - Optional additional CSS classes
 */
const BoostInlineElement = ({ boostName, color, showLabel = false, size = 'M', className = '' }) => {
  // Map size values to icon dimensions and text sizes
  const sizeMap = {
    'XS': {
      iconSize: 12,
      badgeClasses: 'px-1 py-0.5 text-xs',
      iconClasses: 'mr-0.5',
      containerClasses: 'rounded ml-1'
    },
    'S': {
      iconSize: 14,
      badgeClasses: 'px-1 py-0.5 text-xs',
      iconClasses: 'mr-0.5',
      containerClasses: 'rounded'
    },
    'M': {
      iconSize: 16,
      badgeClasses: 'px-1.5 py-0.5 text-xs',
      iconClasses: 'mr-1',
      containerClasses: 'rounded-full'
    },
    'L': {
      iconSize: 20,
      badgeClasses: 'px-2 py-1 text-sm',
      iconClasses: 'mr-1.5',
      containerClasses: 'rounded-lg'
    }
  };

  // Get the selected size config (default to M if invalid size provided)
  const sizeConfig = sizeMap[size] || sizeMap['M'];
  
  // Get the appropriate icon based on boost name
  const getBoostIcon = (boostName, size) => {
    switch(boostName) {
      case 'Captain':
        return <Crown size={size} />;
      case 'Vice-Captain':
        return <Swords size={size} />;
      case 'Slogger':
        return <Zap size={size} />;
      case 'Accumulator':
        return <Anchor size={size} />;
      case 'Safe Hands':
        return <Handshake size={size} />;
      case 'Rattler':
        return <Bomb size={size} />;
      case 'Constrictor':
        return <EarthLock size={size} />;
      case 'Virtuoso':
        return <Sparkles size={size} />;
      default:
        return null;
    }
  };

  // If no boost name is provided, don't render anything
  if (!boostName) return null;

  // Determine text color based on background (squad) color
  const textColor = color ? getTextColorForBackground(color) : '#FFFFFF';
  
  // Container style with background and text color
  const containerStyle = {
    backgroundColor: color || '#6366F1', // Default to indigo if no color provided
    color: textColor
  };

  return (
    <span 
      className={`inline-flex items-center ${sizeConfig.badgeClasses} ${sizeConfig.containerClasses} ${className} relative group`}
      style={containerStyle}
    >
      <span className={sizeConfig.iconClasses}>
        {getBoostIcon(boostName, sizeConfig.iconSize)}
      </span>
      
      {showLabel ? (
        <span>{boostName}</span>
      ) : (
        <span className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1 bg-neutral-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          {boostName}
        </span>
      )}
    </span>
  );
};

export default BoostInlineElement;