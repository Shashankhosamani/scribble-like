export interface Player {
  id: string;
  name: string;
  host: boolean;
  score: number;
}

export interface DrawLine {
  x1: number; y1: number; x2: number; y2: number;
  c: string; s: number;
}

export interface ChatMessage {
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close';
}

export interface ScoreRow {
  name: string;
  score: number;
}

export type Phase = 'lobby' | 'waiting' | 'game';
