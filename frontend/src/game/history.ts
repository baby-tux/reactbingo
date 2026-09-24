import type { GameEvent, GameState, PatternLines } from './types';

export const INITIAL_STATE: GameState = {
  eventHistory: [],
  eventPosition: 0,
  bingo: false,
  validationResult: null,
  validatedPatterns: [],
};

/** Events up to the undo/redo cursor */
export function playedEvents(state: GameState): GameEvent[] {
  return state.eventHistory.slice(0, state.eventPosition);
}

export function drawnNumbers(state: GameState): number[] {
  return playedEvents(state).flatMap((e) => (e.number !== null ? [e.number] : []));
}

/** Index of the last drawn number among the played events, -1 if none */
export function lastNumberIndex(state: GameState): number {
  return playedEvents(state).map((e) => e.number !== null).lastIndexOf(true);
}

/** Patterns awarded before the last drawn number: they can't be won again */
export function validatedPatterns(state: GameState): string[] {
  return state.eventHistory.slice(0, lastNumberIndex(state)).flatMap((e) => e.patterns);
}

/** Patterns awarded since the last drawn number */
export function currentPatterns(state: GameState): string[] {
  return state.eventHistory.slice(lastNumberIndex(state), state.eventPosition).flatMap((e) => e.patterns);
}

/** Patterns a card can still be checked against */
export function candidatePatterns(available: PatternLines, state: GameState): string[] {
  const validated = validatedPatterns(state);
  return available.flat().filter((p) => !validated.includes(p));
}

export function bingoLetter(n: number): string {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}
