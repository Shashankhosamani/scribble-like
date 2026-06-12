'use client';
import { useTheme, THEME_META } from '../hooks/useTheme';
import styles from './ScribbleGame.module.css';

const ROTATIONS = [-4, 3, -2, 4, -3, 2, -4, 3];
const LETTERS   = 'SCRIBBLE'.split('');

export default function ScribbleLogo() {
  const { theme } = useTheme();
  const colors = THEME_META[theme].logoColors;
  return (
    <div className={styles.logo}>
      {LETTERS.map((l, i) => (
        <span
          key={i}
          className={styles.logoLetter}
          style={{
            color: colors[i],
            transform: `rotate(${ROTATIONS[i]}deg)`,
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
