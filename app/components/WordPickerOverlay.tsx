import styles from './ScribbleGame.module.css';

interface Props {
  options: string[];
  isMyTurn: boolean;
  drawerName: string;
  countdown: number;
  onPick: (word: string) => void;
}

export default function WordPickerOverlay({ options, isMyTurn, drawerName, countdown, onPick }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.ovCard}>
        {isMyTurn ? (
          <>
            <h2 className={styles.ovTitle}>Choose a word to draw</h2>
            <div className={styles.ovWord}>Auto-selects in {countdown}s</div>
            <div className={styles.wordOptions}>
              {options.map(w => (
                <button key={w} className={styles.wordOptionBtn} onClick={() => onPick(w)}>
                  {w}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.ovTitle}>{drawerName} is choosing a word</h2>
            <div className={`${styles.ovCountdown} ${styles.picking}`}>{countdown}</div>
          </>
        )}
      </div>
    </div>
  );
}
