import { describe, expect, test } from 'vitest';
import { INITIAL_STATE } from './history';
import { gameReducer, type GameAction } from './reducer';
import type { GameState, ValidationResult } from './types';

const run = (actions: GameAction[], from: GameState = INITIAL_STATE) => actions.reduce(gameReducer, from);
const result = {} as ValidationResult;

describe('gameReducer', () => {
  test('draw appends a number and moves the cursor', () => {
    const state = run([
      { type: 'draw', number: 5 },
      { type: 'draw', number: 20 },
    ]);
    expect(state.eventHistory).toEqual([
      { number: 5, patterns: [] },
      { number: 20, patterns: [] },
    ]);
    expect(state.eventPosition).toBe(2);
  });

  test('undo and redo move the cursor without touching the history', () => {
    const drawn = run([
      { type: 'draw', number: 5 },
      { type: 'draw', number: 20 },
    ]);
    const undone = gameReducer(drawn, { type: 'undo' });
    expect(undone.eventPosition).toBe(1);
    expect(undone.eventHistory).toBe(drawn.eventHistory);
    expect(gameReducer(undone, { type: 'redo' }).eventPosition).toBe(2);
  });

  test('undo and redo stay within the history', () => {
    expect(gameReducer(INITIAL_STATE, { type: 'undo' }).eventPosition).toBe(0);
    expect(gameReducer(INITIAL_STATE, { type: 'redo' }).eventPosition).toBe(0);
  });

  test('drawing after an undo discards the undone events', () => {
    const state = run([
      { type: 'draw', number: 5 },
      { type: 'draw', number: 20 },
      { type: 'undo' },
      { type: 'draw', number: 7 },
    ]);
    expect(state.eventHistory.map((e) => e.number)).toEqual([5, 7]);
    expect(state.eventPosition).toBe(2);
  });

  test('setBingo clears any validation in progress', () => {
    const checking = run([
      { type: 'draw', number: 5 },
      { type: 'setBingo', bingo: true },
      { type: 'setValidation', result, patterns: ['row'] },
    ]);
    expect(checking.validationResult).toBe(result);
    expect(checking.validatedPatterns).toEqual(['row']);

    const cancelled = gameReducer(checking, { type: 'setBingo', bingo: false });
    expect(cancelled).toMatchObject({ bingo: false, validationResult: null, validatedPatterns: [] });
  });

  test('awardPatterns records the patterns and optionally stays in bingo mode', () => {
    const base = run([
      { type: 'draw', number: 5 },
      { type: 'setBingo', bingo: true },
      { type: 'setValidation', result, patterns: ['row'] },
    ]);
    const done = gameReducer(base, { type: 'awardPatterns', patterns: ['row'], keepBingo: false });
    expect(done.eventHistory.at(-1)).toEqual({ number: null, patterns: ['row'] });
    expect(done).toMatchObject({ eventPosition: 2, bingo: false, validationResult: null, validatedPatterns: [] });

    const another = gameReducer(base, { type: 'awardPatterns', patterns: ['row'], keepBingo: true });
    expect(another.bingo).toBe(true);
  });

  test('reset returns to an empty game', () => {
    expect(run([{ type: 'draw', number: 5 }, { type: 'reset' }])).toEqual(INITIAL_STATE);
  });

  test('never mutates the previous state', () => {
    const before = run([{ type: 'draw', number: 5 }]);
    const snapshot = structuredClone(before);
    run(
      [{ type: 'draw', number: 6 }, { type: 'undo' }, { type: 'awardPatterns', patterns: ['x'], keepBingo: false }],
      before,
    );
    expect(before).toEqual(snapshot);
  });
});
