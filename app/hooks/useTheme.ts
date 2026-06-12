import { useEffect, useState, useCallback } from 'react';

export const THEME_NAMES = ['Crayon', 'Chalk', 'Arcade'] as const;
export type ThemeName = typeof THEME_NAMES[number];

export const THEME_META: Record<ThemeName, { label: string; dot: string; logoColors: string[] }> = {
  Crayon: {
    label: 'Crayon',
    dot: '#FF4B4B',
    logoColors: ['#FF6B6B','#FDCB6E','#00CEC9','#6C5CE7','#FD79A8','#0984E3','#E17055','#FF4B4B','#A78BFA'],
  },
  Chalk: {
    label: 'Chalk',
    dot: '#F0D080',
    logoColors: ['#F0D080','#F08090','#80C0F0','#C890F0','#80F0A0','#F0A060','#60E0C0','#F0B0D0','#F0D080'],
  },
  Arcade: {
    label: 'Arcade',
    dot: '#7C3AED',
    logoColors: ['#A78BFA','#34D399','#F472B6','#FBBF24','#60A5FA','#F87171','#38BDF8','#A3E635','#A78BFA'],
  },
};

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>('Crayon');

  useEffect(() => {
    const saved = localStorage.getItem('scribble-theme') as ThemeName | null;
    const initial = saved && THEME_NAMES.includes(saved) ? saved : 'Crayon';
    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial.toLowerCase());
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('scribble-theme', t);
    document.documentElement.setAttribute('data-theme', t.toLowerCase());
  }, []);

  return { theme, setTheme };
}
