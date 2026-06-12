'use client';

import { useRef, useState, useCallback } from 'react';
import Ably from 'ably';
import { ABLY_KEY, ROUND_TIME, TOTAL_ROUNDS, WORDS } from '../lib/constants';
import { fetchWordPool } from '../lib/datamuse';
import { genId, genCode } from '../lib/utils';
import { useCanvas } from '../hooks/useCanvas';
import { useTheme } from '../hooks/useTheme';
import Lobby from './Lobby';
import WaitingRoom from './WaitingRoom';
import GameScreen from './GameScreen';
import RoundOverlay from './RoundOverlay';
import WordPickerOverlay from './WordPickerOverlay';
import ThemePicker from './ThemePicker';
import type { Player, DrawLine, ChatMessage, ScoreRow, Phase } from '../types';
import styles from './ScribbleGame.module.css';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function computeHints(word: string, numHints: number, roundTime: number) {
  const chars = Array.from(word);
  const revealable = chars.map((c, i) => (c !== ' ' ? i : -1)).filter(i => i !== -1);
  const shuffled = [...revealable].sort(() => Math.random() - 0.5);
  const actual = Math.min(numHints, Math.floor(revealable.length / 2));
  const buf: string[] = chars.map(c => (c === ' ' ? ' ' : '_'));
  const steps: string[] = [];
  const times: number[] = [];
  for (let i = 0; i < actual; i++) {
    buf[shuffled[i]] = chars[shuffled[i]];
    steps.push(buf.join(' '));
    times.push(Math.round(roundTime * (1 - (i + 1) / (actual + 1))));
  }
  return { steps, times };
}

export default function ScribbleGame() {
  useTheme(); // applies saved theme on mount

  // ── Screen ───────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('lobby');
  const [statusMsg, setStatusMsg] = useState('');

  // ── Waiting screen ───────────────────────────────────────────────────────
  const [waitingPlayers, setWaitingPlayers] = useState<Player[]>([]);
  const [roomCodeDisplay, setRoomCodeDisplay] = useState('----');
  const [codeCopied, setCodeCopied] = useState(false);
  const [startDisabled, setStartDisabled] = useState(true);
  const [startHint, setStartHint] = useState('Need at least 2 players');
  const [selectedTopic, setSelectedTopic] = useState('vanilla');
  const [selectedRounds, setSelectedRounds] = useState(3);
  const [selectedHints, setSelectedHints] = useState(2);
  const [selectedTime, setSelectedTime] = useState(90);

  // ── Game screen ──────────────────────────────────────────────────────────
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>([]);
  const [currentDrawerState, setCurrentDrawerState] = useState<string | null>(null);
  const [wordDisplay, setWordDisplay] = useState('_ _ _ _');
  const [hintBar, setHintBar] = useState('');
  const [roundInfo, setRoundInfo] = useState('Round 1');
  const [timerPct, setTimerPct] = useState(100);
  const [timerTxt, setTimerTxt] = useState('90s');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [guessDisabled, setGuessDisabled] = useState(false);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [activeColor, setActiveColor] = useState('#000000');
  const [activeSize, setActiveSize] = useState(4);
  const [eraserActive, setEraserActive] = useState(false);
  const [fillActive, setFillActive] = useState(false);

  // ── Overlay ──────────────────────────────────────────────────────────────
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState('');
  const [overlayWord, setOverlayWord] = useState('');
  const [overlayScores, setOverlayScores] = useState<ScoreRow[]>([]);
  const [overlayCountdown, setOverlayCountdown] = useState('');

  // ── Word picker ──────────────────────────────────────────────────────────
  const [wordPickerVisible, setWordPickerVisible] = useState(false);
  const [wordPickerOptions, setWordPickerOptions] = useState<string[]>([]);
  const [wordPickerIsMyTurn, setWordPickerIsMyTurn] = useState(false);
  const [wordPickerDrawerName, setWordPickerDrawerName] = useState('');
  const [wordPickerCountdown, setWordPickerCountdown] = useState(15);

  // ── Refs: network + game ─────────────────────────────────────────────────
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const chRef = useRef<Ably.RealtimeChannel | null>(null);
  const myIdRef = useRef('');
  const myNameRef = useRef('');
  const roomCodeRef = useRef('');
  const amHostRef = useRef(false);
  const phaseRef = useRef<Phase>('lobby');
  const currentHintRef = useRef('');
  const playersRef = useRef<Record<string, Player>>({});
  const topicRef = useRef('vanilla');
  const playerOrderRef = useRef<string[]>([]);
  const turnIdxRef = useRef(0);
  const roundNumRef = useRef(0);
  const currentDrawerRef = useRef<string | null>(null);
  const hostWordRef = useRef('');
  const isMyTurnToDrawRef = useRef(false);
  const guessedSetRef = useRef(new Set<string>());
  const timerIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(0);
  const roundOverRef = useRef(false);
  const pendingDrawerRef = useRef('');
  const pendingRoundRef = useRef(0);
  const wordPickerOptionsRef = useRef<string[]>([]);
  const wordPickerIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordPoolRef = useRef<string[]>([]);
  const totalRoundsRef = useRef(3);
  const numHintsRef = useRef(2);
  const roundTimeRef = useRef(90);
  const hintStepsRef = useRef<string[]>([]);
  const hintTimesRef = useRef<number[]>([]);
  const hintIdxRef = useRef(0);
  const roundGainsRef = useRef<Record<string, number>>({});

  // ── Input refs ───────────────────────────────────────────────────────────
  const nameInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const guessInputRef = useRef<HTMLInputElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // ── Canvas hook ──────────────────────────────────────────────────────────
  const { canvasRef, colorRef, sizeRef, erasingRef, fillingRef, drawBufRef, flushIvRef, localLine, localFill, resetCanvas, flushDraw } =
    useCanvas(chRef, isMyTurnToDrawRef, phase);

  // ── Chat ─────────────────────────────────────────────────────────────────
  const addChat = useCallback((text: string, type: ChatMessage['type']) => {
    setChatMessages(prev => [...prev, { text, type }]);
    setTimeout(() => {
      if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 0);
  }, []);

  const refreshWaitingPlayers = useCallback(() => {
    const all = Object.values(playersRef.current);
    setWaitingPlayers([...all]);
    const n = all.length;
    setStartDisabled(n < 2);
    setStartHint(n < 2 ? 'Need at least 2 players' : `${n} players ready!`);
  }, []);

  const refreshGamePlayers = useCallback(() => {
    setDisplayPlayers(Object.values(playersRef.current).sort((a, b) => b.score - a.score));
  }, []);

  // ── Game logic ───────────────────────────────────────────────────────────
  const endRound = useCallback(() => {
    if (roundOverRef.current) return;
    roundOverRef.current = true;
    if (timerIvRef.current) clearInterval(timerIvRef.current);
    if (flushIvRef.current) { clearInterval(flushIvRef.current); flushIvRef.current = null; }
    const drawerId = currentDrawerRef.current!;
    const nonDrawerCount = playerOrderRef.current.filter(id => id !== drawerId).length;
    const guessedCount = guessedSetRef.current.size;
    const drawerPts = nonDrawerCount > 0 && guessedCount > 0
      ? Math.round((guessedCount / nonDrawerCount) * 100)
      : 0;
    if (drawerPts > 0 && playersRef.current[drawerId]) {
      playersRef.current[drawerId].score += drawerPts;
      roundGainsRef.current[drawerId] = (roundGainsRef.current[drawerId] ?? 0) + drawerPts;
    }
    const scores = Object.values(playersRef.current)
      .map(p => ({ name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
    const roundGains = Object.values(playersRef.current)
      .map(p => ({ name: p.name, score: roundGainsRef.current[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    showOverlay(hostWordRef.current, roundGains, false);
    chRef.current?.publish('end_round', { word: hostWordRef.current, scores, drawerBonus: { id: drawerId, pts: drawerPts } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hostNextRound = useCallback(() => {
    if (roundNumRef.current >= totalRoundsRef.current * playerOrderRef.current.length) {
      const scores = Object.values(playersRef.current)
        .map(p => ({ name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score);
      chRef.current?.publish('game_over', { scores });
      return;
    }
    const drawerId = playerOrderRef.current[turnIdxRef.current % playerOrderRef.current.length];
    turnIdxRef.current++;
    roundNumRef.current++;
    const source = wordPoolRef.current.length > 0
      ? wordPoolRef.current
      : (WORDS[topicRef.current] ?? WORDS.vanilla);
    const pool = [...source].sort(() => Math.random() - 0.5);
    const options = pool.slice(0, 3);
    chRef.current?.publish('word_choice', { drawerId, options, round: roundNumRef.current });
  }, []);

  const publishBeginRound = useCallback((drawerId: string, word: string, round: number) => {
    if (wordPickerIvRef.current) { clearInterval(wordPickerIvRef.current); wordPickerIvRef.current = null; }
    const hint = Array.from(word).map(c => c === ' ' ? ' ' : '_').join(' ');
    hostWordRef.current = word;
    const { steps, times } = computeHints(word, numHintsRef.current, roundTimeRef.current);
    chRef.current?.publish('begin_round', { drawerId, hint, hintSteps: steps, hintTimes: times, roundTime: roundTimeRef.current, round });
  }, []);

  const checkAllGuessed = useCallback(() => {
    const nonDrawers = playerOrderRef.current.filter(id => id !== currentDrawerRef.current);
    if (nonDrawers.length && nonDrawers.every(id => guessedSetRef.current.has(id))) endRound();
  }, [endRound]);

  const validateGuess = useCallback((d: { id: string; name: string; text: string }) => {
    if (guessedSetRef.current.has(d.id)) return;
    if (d.text.trim().toLowerCase() === hostWordRef.current.toLowerCase()) {
      const pts = Math.max(10, Math.round((timeLeftRef.current / roundTimeRef.current) * 100));
      if (playersRef.current[d.id]) playersRef.current[d.id].score += pts;
      guessedSetRef.current.add(d.id);
      chRef.current?.publish('correct', { id: d.id, name: d.name, pts });
      checkAllGuessed();
    } else {
      const answer = hostWordRef.current.toLowerCase();
      const dist = levenshtein(d.text.trim().toLowerCase(), answer);
      if (dist <= 2 && dist < answer.length) {
        chRef.current?.publish('close_guess', { id: d.id });
      }
      chRef.current?.publish('chat_msg', { name: d.name, text: d.text });
    }
  }, [checkAllGuessed]);

  const startTimer = useCallback((secs: number) => {
    if (timerIvRef.current) clearInterval(timerIvRef.current);
    timeLeftRef.current = secs;
    setTimerPct(100);
    setTimerTxt(secs + 's');
    timerIvRef.current = setInterval(() => {
      timeLeftRef.current--;
      setTimerPct(Math.max(0, (timeLeftRef.current / secs) * 100));
      setTimerTxt(timeLeftRef.current + 's');
      if (!isMyTurnToDrawRef.current && hintIdxRef.current < hintTimesRef.current.length) {
        if (timeLeftRef.current <= hintTimesRef.current[hintIdxRef.current]) {
          const revealed = hintStepsRef.current[hintIdxRef.current];
          currentHintRef.current = revealed;
          setWordDisplay(revealed);
          hintIdxRef.current++;
        }
      }
      if (timeLeftRef.current <= 0) {
        clearInterval(timerIvRef.current!);
        if (isMyTurnToDrawRef.current && !roundOverRef.current) endRound();
      }
    }, 1000);
  }, [endRound]);

  const showOverlay = useCallback((word: string, scores: ScoreRow[], isGameOver: boolean) => {
    if (timerIvRef.current) clearInterval(timerIvRef.current);
    setOverlayTitle(isGameOver ? '🏆 Game Over!' : 'Round Over!');
    setOverlayWord(isGameOver ? `Winner: ${scores[0]?.name ?? '?'}` : (word ? `The word was: "${word}"` : ''));
    setOverlayScores(scores);
    setOverlayVisible(true);
    if (!isGameOver) {
      let c = 5;
      setOverlayCountdown(`Next round in ${c}s…`);
      const iv = setInterval(() => {
        c--;
        setOverlayCountdown(`Next round in ${c}s…`);
        if (c <= 0) { clearInterval(iv); setOverlayVisible(false); }
      }, 1000);
    } else {
      setOverlayCountdown('Thanks for playing!');
    }
  }, []);

  const startRound = useCallback((d: { drawerId: string; hint: string; round: number; hintSteps?: string[]; hintTimes?: number[]; roundTime?: number }) => {
    setWordPickerVisible(false);
    if (wordPickerIvRef.current) { clearInterval(wordPickerIvRef.current); wordPickerIvRef.current = null; }
    roundOverRef.current = false;
    guessedSetRef.current = new Set();
    roundGainsRef.current = {};
    currentDrawerRef.current = d.drawerId;
    const isMine = d.drawerId === myIdRef.current;
    isMyTurnToDrawRef.current = isMine;
    if (!isMine) hostWordRef.current = '';
    hintStepsRef.current = d.hintSteps ?? [];
    hintTimesRef.current = d.hintTimes ?? [];
    hintIdxRef.current = 0;
    currentHintRef.current = d.hint;
    if (d.roundTime) roundTimeRef.current = d.roundTime;
    resetCanvas(false);
    setCurrentDrawerState(d.drawerId);
    setIsMyTurnState(isMine);
    const cycleNum = Math.ceil(d.round / playerOrderRef.current.length);
    setRoundInfo(`Round ${cycleNum} of ${totalRoundsRef.current}`);
    setGuessDisabled(isMine);
    setWordDisplay(isMine ? hostWordRef.current : d.hint);
    setHintBar(isMine
      ? `Draw this! (${hostWordRef.current.length} letters)`
      : `${playersRef.current[d.drawerId]?.name ?? '?'} is drawing…`
    );
    refreshGamePlayers();
    if (isMine) {
      if (flushIvRef.current) clearInterval(flushIvRef.current);
      flushIvRef.current = setInterval(flushDraw, 80);
    } else {
      if (flushIvRef.current) { clearInterval(flushIvRef.current); flushIvRef.current = null; }
    }
    startTimer(d.roundTime ?? roundTimeRef.current);
  }, [flushDraw, flushIvRef, refreshGamePlayers, resetCanvas, startTimer, wordPickerIvRef]);

  // ── Message handler ──────────────────────────────────────────────────────
  const onMsg = useCallback((msg: Ably.Message) => {
    const t = msg.name;
    const d = msg.data as any;

    if (t === 'join') {
      if (!playersRef.current[d.id]) {
        playersRef.current[d.id] = { id: d.id, name: d.name, host: d.host, score: d.score ?? 0 };
      }
      if (phaseRef.current === 'game') {
        if (amHostRef.current) {
          if (!playerOrderRef.current.includes(d.id)) playerOrderRef.current.push(d.id);
          chRef.current?.publish('game_state', {
            players: Object.values(playersRef.current),
            playerOrder: playerOrderRef.current,
            currentDrawer: currentDrawerRef.current,
            round: roundNumRef.current,
            hint: currentHintRef.current,
            hintSteps: hintStepsRef.current,
            hintTimes: hintTimesRef.current,
            hintIdx: hintIdxRef.current,
            timeLeft: timeLeftRef.current,
            topic: topicRef.current,
            rounds: totalRoundsRef.current,
            hints: numHintsRef.current,
            time: roundTimeRef.current,
          });
        }
        refreshGamePlayers();
      } else {
        refreshWaitingPlayers();
        if (amHostRef.current)
          chRef.current?.publish('state', { players: Object.values(playersRef.current), topic: topicRef.current, phase: 'waiting' });
      }
    }

    if (t === 'game_state' && phaseRef.current !== 'game') {
      (d.players as Player[]).forEach((p: Player) => { playersRef.current[p.id] = p; });
      playerOrderRef.current = d.playerOrder;
      totalRoundsRef.current = d.rounds;
      numHintsRef.current = d.hints;
      roundTimeRef.current = d.time;
      topicRef.current = d.topic;
      roundNumRef.current = d.round;
      currentDrawerRef.current = d.currentDrawer;
      const isMine = d.currentDrawer === myIdRef.current;
      isMyTurnToDrawRef.current = isMine;
      hintStepsRef.current = d.hintSteps ?? [];
      hintTimesRef.current = d.hintTimes ?? [];
      hintIdxRef.current = d.hintIdx ?? 0;
      currentHintRef.current = d.hint;
      phaseRef.current = 'game';
      setPhase('game');
      resetCanvas(false);
      setCurrentDrawerState(d.currentDrawer);
      setIsMyTurnState(isMine);
      const cycleNum = Math.ceil(d.round / d.playerOrder.length);
      setRoundInfo(`Round ${cycleNum} of ${d.rounds}`);
      setWordDisplay(isMine ? hostWordRef.current : d.hint);
      setHintBar(isMine
        ? `Draw this! (${hostWordRef.current.length} letters)`
        : `${playersRef.current[d.currentDrawer]?.name ?? '?'} is drawing…`
      );
      setGuessDisabled(isMine);
      setTimerTxt(d.timeLeft + 's');
      setTimerPct(Math.max(0, (d.timeLeft / d.time) * 100));
      refreshGamePlayers();
    }

    if (t === 'state' && d.phase === 'waiting') {
      (d.players as Player[]).forEach((p: Player) => { if (!playersRef.current[p.id]) playersRef.current[p.id] = p; });
      topicRef.current = d.topic ?? 'vanilla';
      setSelectedTopic(topicRef.current);
      refreshWaitingPlayers();
    }

    if (t === 'req_state' && amHostRef.current)
      chRef.current?.publish('state', { players: Object.values(playersRef.current), topic: topicRef.current, phase: 'waiting' });

    if (t === 'topic_change') { topicRef.current = d.topic; setSelectedTopic(d.topic); }

    if (t === 'word_choice') {
      pendingDrawerRef.current = d.drawerId;
      pendingRoundRef.current = d.round;
      wordPickerOptionsRef.current = d.options;
      setWordPickerOptions(d.options);
      setWordPickerIsMyTurn(d.drawerId === myIdRef.current);
      setWordPickerDrawerName(playersRef.current[d.drawerId]?.name ?? '?');
      if (wordPickerIvRef.current) clearInterval(wordPickerIvRef.current);
      let c = 15;
      setWordPickerCountdown(c);
      setWordPickerVisible(true);
      wordPickerIvRef.current = setInterval(() => {
        c--;
        setWordPickerCountdown(c);
        if (c <= 0) {
          clearInterval(wordPickerIvRef.current!);
          wordPickerIvRef.current = null;
          if (pendingDrawerRef.current === myIdRef.current) {
            const opts = wordPickerOptionsRef.current;
            publishBeginRound(pendingDrawerRef.current, opts[Math.floor(Math.random() * opts.length)], pendingRoundRef.current);
          }
        }
      }, 1000);
    }

    if (t === 'begin_game') {
      playerOrderRef.current = d.order;
      topicRef.current = d.topic;
      totalRoundsRef.current = d.rounds ?? TOTAL_ROUNDS;
      numHintsRef.current = d.hints ?? 2;
      roundTimeRef.current = d.time ?? ROUND_TIME;
      Object.values(playersRef.current).forEach(p => { p.score = 0; });
      turnIdxRef.current = 0;
      roundNumRef.current = 0;
      phaseRef.current = 'game';
      setPhase('game');
      resetCanvas(false);
      if (amHostRef.current) hostNextRound();
    }

    if (t === 'begin_round') startRound(d);

    if (t === 'draw') (d.lines as DrawLine[]).forEach(l => localLine(l.x1, l.y1, l.x2, l.y2, l.c, l.s));
    if (t === 'fill') localFill(d.x, d.y, d.color, false);

    if (t === 'clear') {
      const canvas = canvasRef.current;
      if (canvas) { const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }

    if (t === 'guess' && isMyTurnToDrawRef.current) validateGuess(d);
    if (t === 'close_guess' && d.id === myIdRef.current) addChat('Very close! Only a letter or two off.', 'close');
    if (t === 'chat_msg') addChat(`${d.name}: ${d.text}`, 'chat');

    if (t === 'correct') {
      addChat(`🎉 ${d.name} guessed it!`, 'correct');
      if (playersRef.current[d.id]) playersRef.current[d.id].score += d.pts;
      roundGainsRef.current[d.id] = (roundGainsRef.current[d.id] ?? 0) + d.pts;
      guessedSetRef.current.add(d.id);
      refreshGamePlayers();
      if (d.id === myIdRef.current) setGuessDisabled(true);
      if (isMyTurnToDrawRef.current) checkAllGuessed();
    }

    if (t === 'end_round') {
      if (!isMyTurnToDrawRef.current && d.drawerBonus?.pts > 0 && playersRef.current[d.drawerBonus.id]) {
        playersRef.current[d.drawerBonus.id].score += d.drawerBonus.pts;
        roundGainsRef.current[d.drawerBonus.id] = (roundGainsRef.current[d.drawerBonus.id] ?? 0) + d.drawerBonus.pts;
      }
      const roundGains = Object.values(playersRef.current)
        .map(p => ({ name: p.name, score: roundGainsRef.current[p.id] ?? 0 }))
        .sort((a, b) => b.score - a.score);
      showOverlay(d.word, roundGains, false);
      if (amHostRef.current) setTimeout(() => hostNextRound(), 6000);
    }
    if (t === 'game_over') showOverlay('', d.scores, true);
  }, [addChat, canvasRef, checkAllGuessed, hostNextRound, localFill, localLine, publishBeginRound, refreshGamePlayers, refreshWaitingPlayers, resetCanvas, showOverlay, startRound, validateGuess]);

  // ── Ably connection ──────────────────────────────────────────────────────
  const connectAndJoin = useCallback(async (code: string) => {
    const ably = new Ably.Realtime({ key: ABLY_KEY, clientId: myIdRef.current });
    ablyRef.current = ably;
    await Promise.race([
      new Promise<void>((res, rej) => {
        ably.connection.on('connected', () => res());
        ably.connection.on('failed', () => rej(new Error('Ably connection failed')));
        ably.connection.on('suspended', () => rej(new Error('Connection suspended')));
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Connection timed out')), 10000)),
    ]);
    const ch = ably.channels.get('scribble3_' + code);
    chRef.current = ch;
    await ch.subscribe(onMsg);
    return ch;
  }, [onMsg]);

  // ── Lobby actions ────────────────────────────────────────────────────────
  const createRoom = useCallback(async () => {
    const name = nameInputRef.current?.value.trim() || 'Host';
    const id = genId();
    const code = genCode();
    myIdRef.current = id;
    myNameRef.current = name;
    roomCodeRef.current = code;
    amHostRef.current = true;
    setStatusMsg('Connecting…');
    try {
      const ch = await connectAndJoin(code);
      playersRef.current[id] = { id, name, host: true, score: 0 };
      ch.publish('join', { id, name, host: true, score: 0 });
      setRoomCodeDisplay(code);
      phaseRef.current = 'waiting';
      setPhase('waiting');
      setStatusMsg('');
    } catch (err: any) {
      setStatusMsg('Error: ' + err.message);
    }
  }, [connectAndJoin]);

  const joinRoom = useCallback(async () => {
    const name = nameInputRef.current?.value.trim() || 'Guest';
    const code = roomInputRef.current?.value.trim().toUpperCase() || '';
    if (!code) { setStatusMsg('Enter a room code!'); return; }
    const id = genId();
    myIdRef.current = id;
    myNameRef.current = name;
    roomCodeRef.current = code;
    amHostRef.current = false;
    setStatusMsg('Connecting…');
    try {
      const ch = await connectAndJoin(code);
      playersRef.current[id] = { id, name, host: false, score: 0 };
      setRoomCodeDisplay(code);
      phaseRef.current = 'waiting';
      setPhase('waiting');
      ch.publish('join', { id, name, host: false, score: 0 });
      setTimeout(() => ch.publish('req_state', { from: id }), 400);
      setStatusMsg('');
    } catch (err: any) {
      setStatusMsg('Error: ' + err.message);
    }
  }, [connectAndJoin]);

  const startGame = useCallback(async () => {
    setStartHint('Fetching words…');
    setStartDisabled(true);
    const pool = await fetchWordPool(topicRef.current);
    wordPoolRef.current = pool.length > 0 ? pool : (WORDS[topicRef.current] ?? WORDS.vanilla);
    chRef.current?.publish('begin_game', {
      order: Object.keys(playersRef.current),
      topic: topicRef.current,
      rounds: totalRoundsRef.current,
      hints: numHintsRef.current,
      time: roundTimeRef.current,
    });
  }, []);

  const changeRounds = useCallback((n: number) => {
    totalRoundsRef.current = n;
    setSelectedRounds(n);
  }, []);

  const changeHints = useCallback((n: number) => {
    numHintsRef.current = n;
    setSelectedHints(n);
  }, []);

  const changeTime = useCallback((n: number) => {
    roundTimeRef.current = n;
    setSelectedTime(n);
  }, []);

  const changeTopic = useCallback((t: string) => {
    const next = topicRef.current === t ? 'vanilla' : t;
    topicRef.current = next;
    setSelectedTopic(next);
    chRef.current?.publish('topic_change', { topic: next });
  }, []);

  const handleWordPick = useCallback((word: string) => {
    publishBeginRound(pendingDrawerRef.current, word, pendingRoundRef.current);
  }, [publishBeginRound]);

  const copyCode = useCallback(() => {
    const code = roomCodeRef.current;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    } else {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1000);
  }, []);

  // ── Drawing tools ────────────────────────────────────────────────────────
  const handleSetColor = useCallback((c: string) => {
    colorRef.current = c;
    erasingRef.current = false;
    fillingRef.current = false;
    setActiveColor(c);
    setEraserActive(false);
    setFillActive(false);
  }, [colorRef, erasingRef, fillingRef]);

  const handleSetSize = useCallback((s: number) => {
    sizeRef.current = s;
    erasingRef.current = false;
    fillingRef.current = false;
    setActiveSize(s);
    setEraserActive(false);
    setFillActive(false);
  }, [sizeRef, erasingRef, fillingRef]);

  const handleToggleEraser = useCallback(() => {
    const next = !erasingRef.current;
    erasingRef.current = next;
    fillingRef.current = false;
    setEraserActive(next);
    setFillActive(false);
  }, [erasingRef, fillingRef]);

  const handleToggleFill = useCallback(() => {
    const next = !fillingRef.current;
    fillingRef.current = next;
    erasingRef.current = false;
    setFillActive(next);
    setEraserActive(false);
  }, [fillingRef, erasingRef]);

  const handleClearCanvas = useCallback(() => {
    if (isMyTurnToDrawRef.current) resetCanvas(true);
  }, [resetCanvas]);

  // ── Guess ────────────────────────────────────────────────────────────────
  const sendGuess = useCallback(() => {
    const inp = guessInputRef.current;
    if (!inp) return;
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    if (isMyTurnToDrawRef.current) return;
    if (guessedSetRef.current.has(myIdRef.current)) return;
    chRef.current?.publish('guess', { id: myIdRef.current, name: myNameRef.current, text: txt });
  }, [addChat]);

  const handleGuessKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendGuess();
  }, [sendGuess]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      {phase === 'lobby' && (
        <Lobby
          nameInputRef={nameInputRef}
          roomInputRef={roomInputRef}
          statusMsg={statusMsg}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
        />
      )}

      {phase === 'waiting' && (
        <WaitingRoom
          roomCode={roomCodeDisplay}
          codeCopied={codeCopied}
          players={waitingPlayers}
          isHost={amHostRef.current}
          selectedTopic={selectedTopic}
          selectedRounds={selectedRounds}
          selectedHints={selectedHints}
          selectedTime={selectedTime}
          startDisabled={startDisabled}
          startHint={startHint}
          onCopyCode={copyCode}
          onChangeTopic={changeTopic}
          onChangeRounds={changeRounds}
          onChangeHints={changeHints}
          onChangeTime={changeTime}
          onStartGame={startGame}
        />
      )}

      {phase === 'game' && (
        <GameScreen
          roundInfo={roundInfo}
          timerPct={timerPct}
          timerTxt={timerTxt}
          players={displayPlayers}
          currentDrawerId={currentDrawerState}
          wordDisplay={wordDisplay}
          hintBar={hintBar}
          canvasRef={canvasRef}
          isMyTurn={isMyTurnState}
          activeColor={activeColor}
          activeSize={activeSize}
          eraserActive={eraserActive}
          fillActive={fillActive}
          onSetColor={handleSetColor}
          onSetSize={handleSetSize}
          onToggleEraser={handleToggleEraser}
          onToggleFill={handleToggleFill}
          onClearCanvas={handleClearCanvas}
          chatMessages={chatMessages}
          chatBoxRef={chatBoxRef}
          guessInputRef={guessInputRef}
          guessDisabled={guessDisabled}
          onSendGuess={sendGuess}
          onGuessKey={handleGuessKey}
        />
      )}

      {wordPickerVisible && (
        <WordPickerOverlay
          options={wordPickerOptions}
          isMyTurn={wordPickerIsMyTurn}
          drawerName={wordPickerDrawerName}
          countdown={wordPickerCountdown}
          onPick={handleWordPick}
        />
      )}

      {overlayVisible && (
        <RoundOverlay
          title={overlayTitle}
          word={overlayWord}
          scores={overlayScores}
          countdown={overlayCountdown}
        />
      )}

      <ThemePicker />
    </div>
  );
}
