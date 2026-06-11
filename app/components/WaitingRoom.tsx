import type { Player } from '../types';
import { TOPICS } from '../lib/constants';
import styles from './ScribbleGame.module.css';

interface Props {
  roomCode: string;
  codeCopied: boolean;
  players: Player[];
  isHost: boolean;
  selectedTopic: string;
  selectedRounds: number;
  selectedHints: number;
  selectedTime: number;
  startDisabled: boolean;
  startHint: string;
  onCopyCode: () => void;
  onChangeTopic: (t: string) => void;
  onChangeRounds: (n: number) => void;
  onChangeHints: (n: number) => void;
  onChangeTime: (n: number) => void;
  onStartGame: () => void;
}

const ROUND_OPTIONS = [2, 3, 4, 5];
const HINT_OPTIONS = [0, 1, 2, 3];
const TIME_OPTIONS = [60, 90, 120];

export default function WaitingRoom({
  roomCode, codeCopied, players, isHost, selectedTopic,
  selectedRounds, selectedHints, selectedTime,
  startDisabled, startHint, onCopyCode, onChangeTopic,
  onChangeRounds, onChangeHints, onChangeTime, onStartGame,
}: Props) {
  return (
    <div className={styles.waiting}>
      <div className={styles.card} style={{ maxWidth: 520, textAlign: 'center' }}>
        <div className={styles.logo}>Scribble</div>
        <p className={styles.mutedText}>Share this code with friends:</p>
        <div className={styles.roomCodeBox} onClick={onCopyCode}>
          {codeCopied ? 'Copied!' : roomCode}
        </div>
        <p className={styles.tinyText}>Click to copy</p>
        <div className={styles.playersWaiting}>
          {players.map(p => (
            <div key={p.id} className={styles.pwPill}>
              {p.name}{p.host ? ' 👑' : ''}
            </div>
          ))}
        </div>
        {isHost ? (
          <div className={styles.hostSection}>
            <p className={styles.mutedText}>
              Topic: <strong>{selectedTopic === 'vanilla' ? '🎲 Random' : TOPICS.find(t => t.id === selectedTopic)?.label}</strong>
            </p>
            <div className={styles.topicGrid}>
              {TOPICS.map(t => (
                <button
                  key={t.id}
                  className={`${styles.topicBtn} ${selectedTopic === t.id ? styles.topicSel : ''}`}
                  onClick={() => onChangeTopic(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={styles.settingsGrid}>
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Rounds</span>
                <div className={styles.settingBtns}>
                  {ROUND_OPTIONS.map(n => (
                    <button
                      key={n}
                      className={`${styles.settingBtn} ${selectedRounds === n ? styles.settingBtnSel : ''}`}
                      onClick={() => onChangeRounds(n)}
                    >{n}</button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Hints</span>
                <div className={styles.settingBtns}>
                  {HINT_OPTIONS.map(n => (
                    <button
                      key={n}
                      className={`${styles.settingBtn} ${selectedHints === n ? styles.settingBtnSel : ''}`}
                      onClick={() => onChangeHints(n)}
                    >{n === 0 ? 'None' : n}</button>
                  ))}
                </div>
              </div>
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Time</span>
                <div className={styles.settingBtns}>
                  {TIME_OPTIONS.map(n => (
                    <button
                      key={n}
                      className={`${styles.settingBtn} ${selectedTime === n ? styles.settingBtnSel : ''}`}
                      onClick={() => onChangeTime(n)}
                    >{n}s</button>
                  ))}
                </div>
              </div>
            </div>

            <button className={styles.startBtn} disabled={startDisabled} onClick={onStartGame}>
              Start Game
            </button>
            <p className={styles.tinyText}>{startHint}</p>
          </div>
        ) : (
          <div className={styles.guestSection}>Waiting for host to start…</div>
        )}
      </div>
    </div>
  );
}
