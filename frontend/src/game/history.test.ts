import { describe, expect, test } from 'vitest';
import {
  INITIAL_STATE,
  bingoLetter,
  candidatePatterns,
  currentPatterns,
  drawnNumbers,
  lastNumberIndex,
  validatedPatterns,
} from './history';
import type { GameEvent, GameState } from './types';

const n = (number: number): GameEvent => ({ number, patterns: [] });
const award = (...patterns: string[]): GameEvent => ({ number: null, patterns });
const stateOf = (eventHistory: GameEvent[], eventPosition = eventHistory.length): GameState => ({
  ...INITIAL_STATE,
  eventHistory,
  eventPosition,
});

describe('drawnNumbers', () => {
  test('lists numbers in draw order, skipping pattern awards', () => {
    expect(drawnNumbers(stateOf([n(5), n(20), award('row'), n(33)]))).toEqual([5, 20, 33]);
  });

  test('ignores events after the undo cursor', () => {
    expect(drawnNumbers(stateOf([n(5), n(20), n(33)], 1))).toEqual([5]);
  });

  test('is empty for a new game', () => {
    expect(drawnNumbers(INITIAL_STATE)).toEqual([]);
  });
});

describe('lastNumberIndex', () => {
  test('points at the last drawn number before the cursor', () => {
    expect(lastNumberIndex(stateOf([n(5), n(20), award('row')]))).toBe(1);
    expect(lastNumberIndex(stateOf([n(5), n(20), award('row')], 1))).toBe(0);
  });

  test('is -1 when nothing is drawn', () => {
    expect(lastNumberIndex(INITIAL_STATE)).toBe(-1);
  });
});

describe('validated and current patterns', () => {
  test('patterns awarded since the last number are current', () => {
    const state = stateOf([n(5), n(20), award('row'), award('diag')]);
    expect(currentPatterns(state)).toEqual(['row', 'diag']);
    expect(validatedPatterns(state)).toEqual([]);
  });

  test('drawing another number turns current patterns into validated ones', () => {
    const state = stateOf([n(5), n(20), award('row', 'x'), n(33)]);
    expect(validatedPatterns(state)).toEqual(['row', 'x']);
    expect(currentPatterns(state)).toEqual([]);
  });

  test('undoing the award makes the pattern available again', () => {
    const state = stateOf([n(5), n(20), award('row')], 2);
    expect(currentPatterns(state)).toEqual([]);
    expect(validatedPatterns(state)).toEqual([]);
  });
});

describe('candidatePatterns', () => {
  test('flattens the display lines and drops validated patterns', () => {
    const state = stateOf([n(5), award('row'), n(6)]);
    expect(candidatePatterns([['row', 'column'], ['diag']], state)).toEqual(['column', 'diag']);
  });
});

describe('bingoLetter', () => {
  test.each([
    [1, 'B'],
    [15, 'B'],
    [16, 'I'],
    [30, 'I'],
    [31, 'N'],
    [45, 'N'],
    [46, 'G'],
    [60, 'G'],
    [61, 'O'],
    [75, 'O'],
  ])('%i is under %s', (value, letter) => {
    expect(bingoLetter(value)).toBe(letter);
  });
});
