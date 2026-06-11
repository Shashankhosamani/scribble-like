import type { ScoreRow } from '../types';
import styles from './ScribbleGame.module.css';

interface Props {
  title: string;
  word: string;
  scores: ScoreRow[];
  countdown: string;
}

const RANK = ['1st', '2nd', '3rd'];

export default function RoundOverlay({ title, word, scores, countdown }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.ovCard}>
        <h2 className={styles.ovTitle}>{title}</h2>
        <div className={styles.ovWord}>{word}</div>
        <div className={styles.ovScores}>
          {scores.map((s, i) => (
            <div key={i} className={styles.scRow}>
              <span>{RANK[i] ?? `${i + 1}th`} &nbsp; {s.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {s.score > 0 ? `+${s.score}` : '—'}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.ovCountdown}>{countdown}</div>
      </div>
    </div>
  );
}
