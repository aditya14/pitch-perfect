// Convert hex to RGB for luminance calculation
const hexToRGB = (hex) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  };
  
  // Calculate relative luminance using WCAG formula
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  // Get contrast ratio between two colors
  const getContrastRatio = (l1, l2) => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };
  
  // Get the best text color (dark or light) for a given background color
  export const getTextColorForBackground = (backgroundColor) => {
    const bgHex = backgroundColor.replace('#', '');
    const [r, g, b] = hexToRGB(bgHex);
    const bgLuminance = getLuminance(r, g, b);
    
    // Define our light and dark text colors
    const lightText = '#ffffff';
    const darkText = '#000000';
    
    // Calculate contrast ratios
    const lightContrast = getContrastRatio(bgLuminance, getLuminance(...hexToRGB(lightText)));
    const darkContrast = getContrastRatio(bgLuminance, getLuminance(...hexToRGB(darkText)));
    
    // Return the color with better contrast
    return lightContrast > darkContrast ? lightText : darkText;
  };