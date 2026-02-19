import React from 'react';
import { 
  Crown,
  Zap,
  Handshake,
  Sparkles,
  Anchor,
  Swords,
  Bomb,
  Shield
} from 'lucide-react';

// Helper function to get role icon
export const getRoleIcon = (roleName, size = 16, squadColor) => {
  // Add outline styles for better contrast
  const outlineStyle = {
    color: squadColor || 'currentColor',
    filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.5))',
  };

  switch(roleName) {
    case 'Captain':
      return <Crown size={size} style={outlineStyle} className="text-primary-600 dark:text-primary-400" />;
    case 'Vice-Captain':
      return <Swords size={size} style={outlineStyle} className="text-primary-500 dark:text-primary-300" />;
    case 'Slogger':
      return <Zap size={size} style={outlineStyle} className="text-red-500 dark:text-red-400" />;
    case 'Anchor':
      return <Anchor size={size} style={outlineStyle} className="text-yellow-500 dark:text-yellow-400" />;
    case 'Safe Hands':
      return <Handshake size={size} style={outlineStyle} className="text-cyan-500 dark:text-cyan-400" />;
    case 'Rattler':
      return <Bomb size={size} style={outlineStyle} className="text-green-500 dark:text-green-400" />;
    case 'Guardian':
      return <Shield size={size} style={outlineStyle} className="text-emerald-500 dark:text-emerald-400" />;
    default: // Virtuoso
      return <Sparkles size={size} style={outlineStyle} className="text-purple-500 dark:text-purple-400" />;
  }
};