import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/client';
import { useDialog } from '../dialog/DialogContext';
import { INITIAL_STATE, candidatePatterns, drawnNumbers } from './history';
import { gameReducer, type GameAction } from './reducer';
import type { GameState, PatternLines } from './types';
import { useGameSync } from './useGameSync';

/**
 * Game state plus the controller actions. Every local change is pushed to the server;
 * in view mode (no code) the state only follows the server.
 */
export function useGame(gameId: string, code: string | undefined, onNotFound: () => void) {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [availablePatterns, setAvailablePatterns] = useState<PatternLines>([]);
  // Latest state, read synchronously by pushes and chained actions
  const stateRef = useRef(state);
  const isViewMode = code === undefined;
  const dialog = useDialog();

  const replaceState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const sync = useGameSync(gameId, code, {
    getState: () => stateRef.current,
    onRemoteState: replaceState,
    onNotFound,
    confirmOverwrite: () =>
      dialog.confirm(
        'This game was changed from somewhere else before your latest changes were saved. ' +
          'Keep your version and overwrite the other one, or discard your changes and load the other version?',
        { title: 'Game changed elsewhere', confirmLabel: 'Keep mine', cancelLabel: 'Load other' },
      ),
  });
  const { push } = sync;

  useEffect(() => {
    api
      .getPatterns()
      .then(setAvailablePatterns)
      .catch((e: unknown) => console.error('Could not load patterns', e));
  }, []);

  const apply = useCallback(
    (action: GameAction) => {
      replaceState(gameReducer(stateRef.current, action));
      push();
    },
    [replaceState, push],
  );

  // Drawing and undo/redo are blocked while a bingo is being checked
  const whenNotInBingo = (action: GameAction) => {
    if (stateRef.current.bingo) {
      void dialog.alert('Finish or cancel the bingo check first.', { title: 'Bingo in progress' });
      return;
    }
    apply(action);
  };

  const checkCard = (cardNumber: string) => {
    api
      .validateCard({
        numbers: drawnNumbers(stateRef.current),
        patterns: candidatePatterns(availablePatterns, stateRef.current),
        cardNumber,
      })
      .then((response) => {
        if (!response.isValid) {
          void dialog.alert(`There is no card number ${cardNumber}.`, { title: 'Invalid card number' });
          return;
        }
        apply({ type: 'setValidation', result: response.result, patterns: response.patterns });
      })
      .catch(() => dialog.alert('Could not validate the card, please retry.', { title: 'Validation failed' }));
  };

  return {
    state,
    availablePatterns,
    isViewMode,
    connection: sync.connection,
    syncError: sync.syncError,
    reconnect: sync.reconnect,
    drawNumber: (n: number) => {
      if (!isViewMode) whenNotInBingo({ type: 'draw', number: n });
    },
    undo: () => whenNotInBingo({ type: 'undo' }),
    redo: () => whenNotInBingo({ type: 'redo' }),
    reset: () => {
      void dialog
        .confirm('Clear all drawn numbers and awarded patterns?', {
          title: 'Reset the game',
          confirmLabel: 'Reset',
        })
        .then((confirmed) => {
          if (confirmed) apply({ type: 'reset' });
        });
    },
    setBingo: (bingo: boolean) => apply({ type: 'setBingo', bingo }),
    awardPatterns: (patterns: string[], keepBingo: boolean) => apply({ type: 'awardPatterns', patterns, keepBingo }),
    checkCard,
  };
}
