import { useState, useEffect } from 'react';

function applyPrefs(density, theme) {
  document.body.classList.remove('density-compact', 'density-comfortable');
  document.body.classList.add(`density-${density}`);
  document.body.classList.remove('theme-enterprise', 'theme-brand');
  document.body.classList.add(`theme-${theme}`);
}

export function useAppPreferences() {
  const [density, setDensityState] = useState(
    () => localStorage.getItem('purpulse_density') || 'compact'
  );
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('purpulse_theme') || 'enterprise'
  );

  // Apply on mount and whenever values change
  useEffect(() => { applyPrefs(density, theme); }, [density, theme]);

  const setDensity = (v) => {
    setDensityState(v);
    localStorage.setItem('purpulse_density', v);
  };
  const setTheme = (v) => {
    setThemeState(v);
    localStorage.setItem('purpulse_theme', v);
  };

  return { density, setDensity, theme, setTheme };
}