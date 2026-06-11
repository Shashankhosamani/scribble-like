import type { RefObject } from 'react';
import styles from './ScribbleGame.module.css';

interface Props {
  nameInputRef: RefObject<HTMLInputElement | null>;
  roomInputRef: RefObject<HTMLInputElement | null>;
  statusMsg: string;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export default function Lobby({ nameInputRef, roomInputRef, statusMsg, onCreateRoom, onJoinRoom }: Props) {
  return (
    <div className={styles.lobby}>
      <div className={styles.card}>
        <div className={styles.logo}>Scribble</div>
        <div className={styles.sub}>Draw. Guess. Win.</div>
        <input ref={nameInputRef} className={styles.input} type="text" placeholder="Your name" maxLength={20} />
        <button className={`${styles.btn} ${styles.btnRed}`} onClick={onCreateRoom}>Create Room</button>
        <div className={styles.or}>or join an existing room</div>
        <input
          ref={roomInputRef}
          className={styles.input}
          type="text"
          placeholder="Room code"
          maxLength={8}
          style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
        />
        <button className={`${styles.btn} ${styles.btnBlue}`} onClick={onJoinRoom}>Join Room</button>
        {statusMsg && <div className={styles.statusMsg}>{statusMsg}</div>}
      </div>
    </div>
  );
}
