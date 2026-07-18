import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Define the semantic design tokens for both modes
export interface ThemeTokens {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  inputBg: string;
  glassBg: string;
}

export type ThemeType = 'light' | 'dark' | 'neon-dark' | 'plum-rose' | 'olive-lime';

export const themeTokens: Record<ThemeType, ThemeTokens> = {
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    border: '#cbd5e1',
    accent: '#1a73e8',
    inputBg: '#ffffff',
    glassBg: 'rgba(248, 250, 252, 0.85)'
  },
  dark: {
    background: '#0c0c0c',
    surface: '#1e1e2e',
    textPrimary: '#cdd6f4',
    textSecondary: '#a6adc8',
    border: '#313244',
    accent: '#ff7e5f',
    inputBg: '#11111b',
    glassBg: 'rgba(12, 12, 12, 0.85)'
  },
  'neon-dark': {
    background: '#171717',
    surface: '#222222',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#2e2e2e',
    accent: '#21F1A8',
    inputBg: '#1b1b1b',
    glassBg: 'rgba(23, 23, 23, 0.85)'
  },
  'plum-rose': {
    background: '#6B3557',
    surface: '#7b4166',
    textPrimary: '#ffffff',
    textSecondary: '#f4d8d3',
    border: '#8c4d75',
    accent: '#E9C1B7',
    inputBg: '#562845',
    glassBg: 'rgba(107, 53, 87, 0.85)'
  },
  'olive-lime': {
    background: '#2D3E2C',
    surface: '#3b5239',
    textPrimary: '#ffffff',
    textSecondary: '#d2e5cf',
    border: '#4b6849',
    accent: '#E4FD97',
    inputBg: '#233222',
    glassBg: 'rgba(45, 62, 44, 0.85)'
  }
};

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  tokens: ThemeTokens;
}

// 2. Create the Context Layer with safe default fallback objects
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => { },
  tokens: themeTokens.dark
});

// 3. Implement the Provider System
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem('toolkit-theme') as ThemeType;
    return (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'neon-dark' || savedTheme === 'plum-rose' || savedTheme === 'olive-lime') ? savedTheme : 'dark';
  });

  const tokens = themeTokens[theme];

  useEffect(() => {
    localStorage.setItem('toolkit-theme', theme);
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.backgroundColor = tokens.background;
    
    // Set dynamic custom properties matching global.css variables
    root.style.setProperty('--bg-app', tokens.background);
    root.style.setProperty('--bg-surface', tokens.surface);
    root.style.setProperty('--text-main', tokens.textPrimary);
    root.style.setProperty('--text-muted', tokens.textSecondary);
    root.style.setProperty('--border-color', tokens.border);
    root.style.setProperty('--accent-color', tokens.accent);
    root.style.setProperty('--input-fill', tokens.inputBg);

    // Direct color system aliases to automatically fix canvas and elements relying on legacy variables
    root.style.setProperty('--color-bg-app', tokens.background);
    root.style.setProperty('--color-bg-surface', tokens.surface);
    root.style.setProperty('--color-text-main', tokens.textPrimary);
    root.style.setProperty('--color-text-muted', tokens.textSecondary);
    root.style.setProperty('--color-border', tokens.border);
    root.style.setProperty('--color-accent', tokens.accent);
    root.style.setProperty('--color-bg-elevated', tokens.inputBg);
    root.style.setProperty('--color-bg-surface-hover', tokens.surface);

    // Additional aliases used across SVG icons, Home.jsx, and tool pages
    root.style.setProperty('--color-bg', tokens.background);
    root.style.setProperty('--color-text-primary', tokens.textPrimary);
    root.style.setProperty('--color-text-secondary', tokens.textSecondary);
    root.style.setProperty('--color-surface', tokens.surface);
    root.style.setProperty('--bg-primary', tokens.background);
    root.style.setProperty('--bg-card', tokens.surface);

    // Metal SVG gradient variables for category icons in Home.jsx
    const isLightMode = theme === 'light';
    root.style.setProperty('--metal-light', isLightMode ? '#d8d8e8' : '#c8c8d8');
    root.style.setProperty('--metal-mid',   isLightMode ? '#909090' : '#888898');
    root.style.setProperty('--metal-dark',  isLightMode ? '#505060' : '#484858');

    // ── Theme-aware interaction variables ───────────────────────────────
    // These are used by Navbar.jsx static style objects (defined outside component)
    // and by any element that needs to adapt hover / label colors
    const isDarkMode = theme !== 'light';
    root.style.setProperty('--hover-bg',            isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');
    root.style.setProperty('--section-label-color', isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.42)');
    root.style.setProperty('--recent-item-color',   isDarkMode ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.55)');
    // SmartSearch sticky bar backdrop — dynamically styled per theme using glassBg tokens
    root.style.setProperty('--ss-root-bg', tokens.glassBg);
    // SmartSearch pill bar tinted frosted background per theme
    const ssBarBg = theme === 'light'         ? 'rgba(255,255,255,0.55)'
                  : theme === 'neon-dark'      ? 'rgba(20,20,20,0.45)'
                  : theme === 'plum-rose'      ? 'rgba(86,40,69,0.50)'
                  : theme === 'olive-lime'     ? 'rgba(30,48,28,0.50)'
                  :                              'rgba(10,10,18,0.40)';
    root.style.setProperty('--ss-bar-bg', ssBarBg);
  }, [theme, tokens]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === 'dark') return 'light';
      if (prevTheme === 'light') return 'neon-dark';
      if (prevTheme === 'neon-dark') return 'plum-rose';
      if (prevTheme === 'plum-rose') return 'olive-lime';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Custom hook to fix Navbar runtime export error
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider framework');
  }
  return {
    theme: context.theme,
    toggleTheme: context.toggleTheme,
    isDarkMode: context.theme !== 'light',
    isDark: context.theme !== 'light',
    tokens: context.tokens
  };
}
