import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { generateColorShades } from '../utils/colors';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_PRIMARY_COLOR = '#9333ea'; // Purple (fixed, not customizable)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor] = useState(() => {
    // Always use default purple color - customization disabled
    return DEFAULT_PRIMARY_COLOR;
  });
  
  // Disable color customization
  const setPrimaryColor = (_color: string) => {
    // Color customization disabled - primary color is fixed to purple
  };
  
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('logoUrl') || null;
  });

  useEffect(() => {
    // Don't save to localStorage - color is fixed to purple
    // localStorage.setItem('primaryColor', primaryColor);
    
    const shades = generateColorShades(primaryColor);
    const root = document.documentElement;

    for (const [shade, hslValue] of Object.entries(shades)) {
      root.style.setProperty(`--color-primary-${shade}`, hslValue);
    }
  }, [primaryColor]);

  const handleSetLogoUrl = (url: string | null) => {
    if (url) {
        localStorage.setItem('logoUrl', url);
    } else {
        localStorage.removeItem('logoUrl');
    }
    setLogoUrl(url);
  };

  const value = useMemo(() => ({
    primaryColor,
    setPrimaryColor,
    logoUrl,
    setLogoUrl: handleSetLogoUrl,
  }), [primaryColor, logoUrl]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};