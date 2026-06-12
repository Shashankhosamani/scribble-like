'use client';
import { useState } from 'react';
import { useTheme, THEME_NAMES, THEME_META, type ThemeName } from '../hooks/useTheme';

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 6,
    }}>
      {open && (
        <div style={{
          background: 'var(--t-card-bg)',
          border: '2px solid var(--t-border)',
          borderRadius: 'var(--t-radius)',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: 'var(--t-shadow-lg)',
          animation: 'popIn 180ms ease',
        }}>
          {THEME_NAMES.map(t => (
            <button
              key={t}
              onClick={() => { setTheme(t); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                border: '2px solid',
                borderColor: theme === t ? THEME_META[t].dot : 'var(--t-border)',
                borderRadius: 'var(--t-inp-radius)',
                background: theme === t ? `${THEME_META[t].dot}18` : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 800,
                color: theme === t ? THEME_META[t].dot : 'var(--t-text-2)',
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: THEME_META[t].dot,
                flexShrink: 0,
                boxShadow: theme === t ? `0 0 0 2px ${THEME_META[t].dot}40` : 'none',
              }}/>
              {THEME_META[t].label}
              {theme === t && <span style={{ marginLeft: 2, fontSize: 11 }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Change theme"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '2px solid var(--t-border)',
          background: 'var(--t-card-bg)',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--t-shadow-md)',
          transition: 'transform 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🎨
      </button>
    </div>
  );
}
