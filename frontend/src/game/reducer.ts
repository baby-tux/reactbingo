import { INITIAL_STATE, playedEvents } from './history';
import type { GameState, ValidationResult } from './types';

export type GameAction =
  | { type: 'draw'; number: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' }
  | { type: 'setBingo'; bingo: boolean }
  | { type: 'awardPatterns'; patterns: string[]; keepBingo: boolean }
  | { type: 'setValidation'; result: ValidationResult; patterns: string[] };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'draw':
      // Drawing after an undo discards the undone events
      return {
        ...state,
        eventHistory: [...playedEvents(state), { number: action.number, patterns: [] }],
        eventPosition: state.eventPosition + 1,
      };
    case 'undo':
      return { ...state, eventPosition: Math.max(0, state.eventPosition - 1) };
    case 'redo':
      return { ...state, eventPosition: Math.min(state.eventHistory.length, state.eventPosition + 1) };
    case 'reset':
      return INITIAL_STATE;
    case 'setBingo':
      return { ...state, bingo: action.bingo, validationResult: null, validatedPatterns: [] };
    case 'awardPatterns':
      return {
        ...state,
        eventHistory: [...playedEvents(state), { number: null, patterns: action.patterns }],
        eventPosition: state.eventPosition + 1,
        bingo: action.keepBingo,
        validationResult: null,
        validatedPatterns: [],
      };
    case 'setValidation':
      return { ...state, validationResult: action.result, validatedPatterns: action.patterns };
  }
}
