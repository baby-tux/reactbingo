import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api/client';
import { INITIAL_STATE } from '../game/history';
import type { ServerGameState, ValidationResult } from '../game/types';
import { FakeWebSocket } from '../test/fakeWebSocket';
import GamePage from './GamePage';

vi.mock('../api/client', () => ({
  getPatterns: vi.fn(),
  validateCard: vi.fn(),
}));

const serverState = (overrides: Partial<ServerGameState> = {}): ServerGameState => ({
  ...INITIAL_STATE,
  revision: 0,
  lastPushId: null,
  ...overrides,
});

async function renderAt(path: string, state = serverState()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/view/:id" element={<GamePage />} />
        <Route path="/control/:id/:code" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
  const ws = FakeWebSocket.latest();
  act(() => {
    ws.open();
    ws.receive({ type: 'state', state });
  });
  // Let the pattern list load
  await act(async () => {});
  return ws;
}

const lastPush = (ws: FakeWebSocket) => {
  const push = ws.pushes().at(-1);
  if (push?.action !== 'push') throw new Error('No push sent');
  return push;
};

/** The server accepts the pending push, which lets the next one go */
let revision = 0;
const ack = (ws: FakeWebSocket) =>
  act(() => ws.receive({ type: 'ack', pushId: lastPush(ws).pushId, revision: ++revision }));

beforeEach(() => {
  revision = 0;
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.mocked(api.getPatterns).mockResolvedValue([['row', 'column']]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('control mode', () => {
  test('each change pushes the state that includes it', async () => {
    const ws = await renderAt('/control/game1/secret');

    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(lastPush(ws)).toMatchObject({
      gameId: 'game1',
      code: 'secret',
      baseRevision: 0,
      state: { eventHistory: [{ number: 7, patterns: [] }], eventPosition: 1 },
    });
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled();

    ack(ws);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(lastPush(ws)).toMatchObject({ baseRevision: revision, state: { eventPosition: 0 } });
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled();
  });

  test('checks a card and awards the matched pattern', async () => {
    const result = {} as ValidationResult;
    for (const letter of ['b', 'i', 'n', 'g', 'o'])
      for (let row = 1; row <= 5; row++)
        result[`${letter}${row}` as keyof ValidationResult] = { number: row, isDrawn: false, isOnPattern: row === 1 };
    vi.mocked(api.validateCard).mockResolvedValue({ isValid: true, patterns: ['row'], result });
    const ws = await renderAt(
      '/control/game1/secret',
      serverState({
        eventHistory: [{ number: 9, patterns: [] }],
        eventPosition: 1,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Bingo' }));
    ack(ws);
    await userEvent.type(screen.getByRole('textbox'), '12{Enter}');
    expect(api.validateCard).toHaveBeenCalledWith({ numbers: [9], patterns: ['row', 'column'], cardNumber: '12' });

    // The checked card replaces the keypad, with the matched pattern highlighted
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    expect(lastPush(ws).state.validatedPatterns).toEqual(['row']);
    expect(screen.getByRole('button', { name: 'row' })).toHaveClass('bingoTypeHighlighted');
    ack(ws);

    await userEvent.click(screen.getByRole('button', { name: '✔' }));
    expect(lastPush(ws).state).toMatchObject({
      eventHistory: [
        { number: 9, patterns: [] },
        { number: null, patterns: ['row'] },
      ],
      bingo: false,
      validationResult: null,
    });
    expect(screen.getByRole('button', { name: 'row' })).toHaveClass('bingoTypeCurrent');
  });

  test('drawing is blocked while checking a bingo', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const ws = await renderAt(
      '/control/game1/secret',
      serverState({
        eventHistory: [{ number: 9, patterns: [] }],
        eventPosition: 1,
        bingo: true,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: '10' }));
    expect(alert).toHaveBeenCalledWith('In bingo mode');
    expect(ws.pushes()).toEqual([]);
  });
});

describe('view mode', () => {
  test('follows the server and never pushes', async () => {
    const ws = await renderAt('/view/game1');
    expect(screen.getByRole('button', { name: 'Undo', hidden: true })).not.toBeVisible();

    act(() =>
      ws.receive({
        type: 'state',
        state: serverState({ eventHistory: [{ number: 64, patterns: [] }], eventPosition: 1 }),
      }),
    );
    expect(screen.getByRole('button', { name: '64' })).toHaveClass('board-number-active');

    await userEvent.click(screen.getByRole('button', { name: '12' }));
    expect(ws.pushes()).toEqual([]);
  });

  test('shows the bingo message while the controller checks a card', async () => {
    await renderAt(
      '/view/game1',
      serverState({ eventHistory: [{ number: 9, patterns: [] }], eventPosition: 1, bingo: true }),
    );
    expect(screen.getByText('Bingo!')).toBeInTheDocument();
  });
});

test('an unknown game goes back to the home page', async () => {
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={['/view/nope']}>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/view/:id" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
  const ws = FakeWebSocket.latest();
  act(() => {
    ws.open();
    ws.receive({ type: 'notFound' });
  });
  expect(alert).toHaveBeenCalledWith('Game not found!');
  expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
});
