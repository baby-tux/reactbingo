// Shapes shared with the backend (backend/src/bingo-model.ts, server.ts, validation.ts).
// Keep them in sync when the protocol changes.

/** A drawn number (`patterns` empty) or, with `number: null`, patterns awarded after a bingo */
export interface GameEvent {
  number: number | null;
  patterns: string[];
}

export const CARD_LETTERS = ['b', 'i', 'n', 'g', 'o'] as const;
export type CardLetter = (typeof CARD_LETTERS)[number];
export type CardPosition = `${CardLetter}${1 | 2 | 3 | 4 | 5}`;

export interface CellResult {
  number: number;
  isDrawn: boolean;
  isOnPattern: boolean;
}

export type ValidationResult = Record<CardPosition, CellResult>;

/** The part of a game the controller pushes and every client displays */
export interface GameState {
  eventHistory: GameEvent[];
  eventPosition: number;
  bingo: boolean;
  validationResult: ValidationResult | null;
  validatedPatterns: string[];
}

/** Game state as stored by the server */
export interface ServerGameState extends GameState {
  revision: number;
  lastPushId: string | null;
}

/** Pattern names grouped by display line (max 2 lines) */
export type PatternLines = string[][];

export type ClientMessage =
  | { action: 'register'; gameId: string }
  | { action: 'ping' }
  | { action: 'push'; gameId: string; code: string; pushId: string; baseRevision: number; state: GameState };

export type ServerMessage =
  | { type: 'state'; state: ServerGameState }
  | { type: 'ack'; pushId: string; revision: number }
  | { type: 'conflict'; pushId: string; state: ServerGameState }
  | { type: 'notFound' }
  | { type: 'error'; error: string; pushId?: string }
  | { type: 'pong' };
