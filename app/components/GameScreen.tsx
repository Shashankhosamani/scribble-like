import type { RefObject } from 'react';
import type { Player, ChatMessage } from '../types';
import { COLORS } from '../lib/constants';
import styles from './ScribbleGame.module.css';

interface Props {
  roundInfo: string;
  timerPct: number;
  timerTxt: string;
  players: Player[];
  currentDrawerId: string | null;
  wordDisplay: string;
  hintBar: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isMyTurn: boolean;
  activeColor: string;
  activeSize: number;
  eraserActive: boolean;
  fillActive: boolean;
  onSetColor: (c: string) => void;
  onSetSize: (s: number) => void;
  onToggleEraser: () => void;
  onToggleFill: () => void;
  onClearCanvas: () => void;
  chatMessages: ChatMessage[];
  chatBoxRef: RefObject<HTMLDivElement | null>;
  guessInputRef: RefObject<HTMLInputElement | null>;
  guessDisabled: boolean;
  onSendGuess: () => void;
  onGuessKey: (e: React.KeyboardEvent) => void;
}

const SIZE_LABELS = ['S', 'M', 'L', 'XL'];
const SIZES = [4, 10, 20, 36];

export default function GameScreen({
  roundInfo, timerPct, timerTxt, players, currentDrawerId,
  wordDisplay, hintBar, canvasRef, isMyTurn, activeColor, activeSize, eraserActive, fillActive,
  onSetColor, onSetSize, onToggleEraser, onToggleFill, onClearCanvas,
  chatMessages, chatBoxRef, guessInputRef, guessDisabled, onSendGuess, onGuessKey,
}: Props) {
  return (
    <div className={styles.gameScreen}>
      {/* Left: timer + players */}
      <div className={styles.lp}>
        <div className={styles.panel}>
          <div className={styles.roundInfo}>{roundInfo}</div>
          <div className={styles.timerWrap}>
            <div className={styles.timerBar} style={{ width: `${timerPct}%` }} />
          </div>
          <div className={styles.timerTxt}>{timerTxt}</div>
        </div>
        <div className={styles.panel}>
          <div className={styles.sectionLabel}>Players</div>
          <div className={styles.playersList}>
            {players.map(p => (
              <div key={p.id} className={`${styles.pRow} ${p.id === currentDrawerId ? styles.drawing : ''}`}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.id === currentDrawerId ? '» ' : ''}{p.name}{p.host ? ' (host)' : ''}
                </span>
                <span className={styles.pScore}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center: word + canvas + tools */}
      <div className={styles.cp}>
        <div className={styles.panel} style={{ padding: '8px 14px' }}>
          <div className={styles.wordDisplay}>{wordDisplay}</div>
          <div className={styles.hintBar}>{hintBar}</div>
        </div>
        <div className={styles.panel} style={{ padding: 8 }}>
          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={700}
              height={440}
              className={styles.canvas}
              style={{ cursor: isMyTurn ? (fillActive ? 'cell' : 'crosshair') : 'default' }}
            />
          </div>
        </div>
        <div
          className={styles.panel}
          style={{ opacity: isMyTurn ? 1 : 0.4, pointerEvents: isMyTurn ? 'auto' : 'none' }}
        >
          <div className={styles.toolRow}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorSwatch} ${activeColor === c && !eraserActive ? styles.swatchActive : ''}`}
                style={{ background: c }}
                onClick={() => onSetColor(c)}
              />
            ))}
          </div>
          <div className={styles.toolRow} style={{ marginTop: 6 }}>
            {SIZES.map((s, i) => (
              <button
                key={s}
                className={`${styles.szBtn} ${activeSize === s && !eraserActive ? styles.szActive : ''}`}
                onClick={() => onSetSize(s)}
              >
                {SIZE_LABELS[i]}
              </button>
            ))}
            <button
              className={`${styles.toolBtn} ${eraserActive ? styles.szActive : ''}`}
              onClick={onToggleEraser}
            >
              Eraser
            </button>
            <button
              className={`${styles.toolBtn} ${fillActive ? styles.szActive : ''}`}
              onClick={onToggleFill}
            >
              Fill
            </button>
            <button className={styles.toolBtn} onClick={onClearCanvas}>Clear</button>
          </div>
        </div>
      </div>

      {/* Right: chat */}
      <div className={styles.rp}>
        <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className={styles.sectionLabel}>Guesses</div>
          <div ref={chatBoxRef} className={styles.chatBox}>
            {chatMessages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${styles['msg_' + m.type]}`}>{m.text}</div>
            ))}
          </div>
          <div className={styles.guessRow}>
            <input
              ref={guessInputRef}
              className={styles.guessInput}
              type="text"
              placeholder="Type your guess"
              maxLength={60}
              disabled={guessDisabled}
              onKeyDown={onGuessKey}
            />
            <button className={styles.guessBtn} onClick={onSendGuess}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
