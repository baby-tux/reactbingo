import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FakeWebSocket } from '../test/fakeWebSocket';
import { INITIAL_STATE } from './history';
import { GameSyncClient, type SyncStatus } from './syncClient';
import type { GameState, ServerGameState } from './types';

const serverState = (overrides: Partial<ServerGameState> = {}): ServerGameState => ({
  ...INITIAL_STATE,
  revision: 0,
  lastPushId: null,
  ...overrides,
});
const withNumbers = (...numbers: number[]): GameState => ({
  ...INITIAL_STATE,
  eventHistory: numbers.map((number) => ({ number, patterns: [] })),
  eventPosition: numbers.length,
});

/** `code: null` sets up a viewer */
function setup(code: string | null = 'secret') {
  let local: GameState = INITIAL_STATE;
  const statuses: SyncStatus[] = [];
  const onRemoteState = vi.fn((s: GameState) => {
    local = s;
  });
  const onNotFound = vi.fn();
  const confirmOverwrite = vi.fn(() => Promise.resolve(true));
  const client = new GameSyncClient('game1', code ?? undefined, {
    getState: () => local,
    onRemoteState,
    onNotFound,
    confirmOverwrite,
    onStatus: (s) => statuses.push(s),
  });
  client.start();
  const ws = FakeWebSocket.latest();
  return {
    client,
    ws,
    statuses,
    onRemoteState,
    onNotFound,
    confirmOverwrite,
    lastStatus: () => statuses.at(-1),
    /** Simulates a local change followed by a push, as useGame does */
    change: (next: GameState) => {
      local = next;
      client.push();
    },
    /** Opens the socket and receives the initial state */
    connect: (socket: FakeWebSocket, state = serverState()) => {
      socket.open();
      socket.receive({ type: 'state', state });
    },
  };
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('connection', () => {
  test('connects to /api/ on the page host and registers for the game', () => {
    const { ws, lastStatus } = setup();
    expect(ws.url).toBe(`ws://${window.location.host}/api/`);
    expect(lastStatus()).toBeUndefined();

    ws.open();
    expect(ws.sent).toEqual([{ action: 'register', gameId: 'game1' }]);
    expect(lastStatus()).toEqual({ connection: 'open', syncError: null });
  });

  test('applies the received state without server-only fields', () => {
    const { ws, connect, onRemoteState } = setup();
    connect(ws, serverState({ ...withNumbers(5), revision: 3, lastPushId: 'x' }));
    expect(onRemoteState).toHaveBeenCalledWith(withNumbers(5));
  });

  test('reports a missing game', () => {
    const { ws, onNotFound } = setup();
    ws.open();
    ws.receive({ type: 'notFound' });
    expect(onNotFound).toHaveBeenCalledOnce();
  });

  test('reconnects with exponential backoff', () => {
    const { ws, lastStatus } = setup();
    ws.drop();
    expect(lastStatus()?.connection).toBe('closed');

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.latest().drop();
    vi.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  test('a successful connection resets the backoff', () => {
    const { ws } = setup();
    ws.drop();
    vi.advanceTimersByTime(1000);
    FakeWebSocket.latest().open();
    FakeWebSocket.latest().drop();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  test('pings periodically and drops a connection that does not answer', () => {
    const { ws, lastStatus } = setup();
    ws.open();
    vi.advanceTimersByTime(25000);
    expect(ws.sent.at(-1)).toEqual({ action: 'ping' });

    ws.receive({ type: 'pong' });
    vi.advanceTimersByTime(25000);
    expect(lastStatus()?.connection).toBe('open');

    vi.advanceTimersByTime(10000);
    expect(lastStatus()?.connection).toBe('closed');
  });

  test('stop closes the socket and does not reconnect', () => {
    const { client, ws } = setup();
    ws.open();
    client.stop();
    expect(ws.readyState).toBe(FakeWebSocket.CLOSED);
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  test('reconnectNow opens a new socket right away', () => {
    const { client, ws } = setup();
    ws.drop();
    client.reconnectNow();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});

describe('pushes', () => {
  test('sends the full local state based on the server revision', () => {
    const { ws, connect, change } = setup();
    connect(ws, serverState({ revision: 4 }));
    change(withNumbers(5));
    expect(ws.pushes()).toEqual([
      {
        action: 'push',
        gameId: 'game1',
        code: 'secret',
        pushId: expect.any(String),
        baseRevision: 4,
        state: withNumbers(5),
      },
    ]);
  });

  test('never pushes in view mode', () => {
    const { ws, connect, change } = setup(null);
    connect(ws);
    change(withNumbers(5));
    expect(ws.pushes()).toEqual([]);
  });

  test('sends one push at a time and the latest state after the ack', () => {
    const { ws, connect, change } = setup();
    connect(ws);
    change(withNumbers(5));
    change(withNumbers(5, 6));
    change(withNumbers(5, 6, 7));
    expect(ws.pushes()).toHaveLength(1);

    const first = ws.pushes()[0];
    ws.receive({ type: 'ack', pushId: first.action === 'push' ? first.pushId : '', revision: 1 });
    expect(ws.pushes()).toHaveLength(2);
    expect(ws.pushes()[1]).toMatchObject({ baseRevision: 1, state: withNumbers(5, 6, 7) });
  });

  test('ignores acks for other pushes', () => {
    const { ws, connect, change } = setup();
    connect(ws);
    change(withNumbers(5));
    change(withNumbers(5, 6));
    ws.receive({ type: 'ack', pushId: 'someone-else', revision: 9 });
    expect(ws.pushes()).toHaveLength(1);
  });

  test('queues changes made while offline and sends them once registered again', () => {
    const { ws, connect, change } = setup();
    connect(ws);
    ws.drop();
    change(withNumbers(5));
    expect(ws.pushes()).toEqual([]);

    vi.advanceTimersByTime(1000);
    const next = FakeWebSocket.latest();
    connect(next);
    expect(next.pushes()).toEqual([expect.objectContaining({ baseRevision: 0, state: withNumbers(5) })]);
  });
});

describe('conflicts', () => {
  /** Gets a conflict for a local change; the answer is given by calling `answer` */
  function conflicted() {
    const ctx = setup();
    let answer: (keepLocal: boolean) => void = () => {};
    ctx.confirmOverwrite.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    ctx.connect(ctx.ws);
    ctx.change(withNumbers(5));
    const push = ctx.ws.pushes()[0];
    ctx.ws.receive({
      type: 'conflict',
      pushId: push.action === 'push' ? push.pushId : '',
      state: serverState({ ...withNumbers(70), revision: 2 }),
    });
    return {
      ...ctx,
      answer: async (keepLocal: boolean) => {
        answer(keepLocal);
        await vi.waitFor(() => {});
      },
    };
  }

  test('keeping the local version re-pushes it on top of the new revision', async () => {
    const { ws, confirmOverwrite, onRemoteState, answer } = conflicted();
    expect(confirmOverwrite).toHaveBeenCalledOnce();
    await answer(true);
    expect(ws.pushes()[1]).toMatchObject({ baseRevision: 2, state: withNumbers(5) });
    expect(onRemoteState).toHaveBeenCalledTimes(1); // only the initial load
  });

  test('discarding the local version loads the server one', async () => {
    const { ws, onRemoteState, answer } = conflicted();
    await answer(false);
    expect(ws.pushes()).toHaveLength(1);
    expect(onRemoteState).toHaveBeenLastCalledWith(withNumbers(70));
  });

  test('nothing is pushed while waiting for the answer, which applies to the newest server state', async () => {
    const { ws, change, confirmOverwrite, onRemoteState, answer } = conflicted();
    change(withNumbers(5, 6));
    ws.receive({ type: 'state', state: serverState({ ...withNumbers(70, 71), revision: 3 }) });
    expect(ws.pushes()).toHaveLength(1);
    expect(confirmOverwrite).toHaveBeenCalledOnce();

    await answer(false);
    expect(onRemoteState).toHaveBeenLastCalledWith(withNumbers(70, 71));
  });

  test('keeping the local version after more remote changes pushes on the newest revision', async () => {
    const { ws, change, answer } = conflicted();
    change(withNumbers(5, 6));
    ws.receive({ type: 'state', state: serverState({ ...withNumbers(70, 71), revision: 3 }) });

    await answer(true);
    expect(ws.pushes()[1]).toMatchObject({ baseRevision: 3, state: withNumbers(5, 6) });
  });
});

describe('push lost with the connection', () => {
  function pushThenDrop() {
    const ctx = setup();
    ctx.connect(ctx.ws, serverState({ revision: 1 }));
    ctx.change(withNumbers(5));
    const push = ctx.ws.pushes()[0];
    ctx.ws.drop();
    vi.advanceTimersByTime(1000);
    return { ...ctx, pushId: push.action === 'push' ? push.pushId : '', next: FakeWebSocket.latest() };
  }

  test('is not re-sent when the server saved it', () => {
    const { next, pushId, onRemoteState, connect } = pushThenDrop();
    connect(next, serverState({ ...withNumbers(5), revision: 2, lastPushId: pushId }));
    expect(next.pushes()).toEqual([]);
    expect(onRemoteState).toHaveBeenCalledTimes(1);
  });

  test('is re-sent when it never reached the server', () => {
    const { next, connect } = pushThenDrop();
    connect(next, serverState({ revision: 1, lastPushId: null }));
    expect(next.pushes()).toEqual([expect.objectContaining({ baseRevision: 1, state: withNumbers(5) })]);
  });
});

describe('server errors', () => {
  test('an invalid code blocks further pushes', () => {
    const { ws, connect, change, lastStatus } = setup('wrong');
    connect(ws);
    change(withNumbers(5));
    const push = ws.pushes()[0];
    ws.receive({ type: 'error', error: 'unauthorized', pushId: push.action === 'push' ? push.pushId : '' });
    expect(lastStatus()?.syncError).toBe('unauthorized');

    change(withNumbers(5, 6));
    expect(ws.pushes()).toHaveLength(1);
  });

  test('other errors are shown until the next successful push', () => {
    const { ws, connect, change, lastStatus } = setup();
    connect(ws);
    change(withNumbers(5));
    const first = ws.pushes()[0];
    ws.receive({ type: 'error', error: 'serverError', pushId: first.action === 'push' ? first.pushId : '' });
    expect(lastStatus()?.syncError).toBe('serverError');

    change(withNumbers(5, 6));
    const second = ws.pushes()[1];
    ws.receive({ type: 'ack', pushId: second.action === 'push' ? second.pushId : '', revision: 1 });
    expect(lastStatus()?.syncError).toBeNull();
  });

  test('ignores malformed messages', () => {
    const { ws } = setup();
    ws.open();
    expect(() => ws.onmessage?.({ data: 'not json' })).not.toThrow();
  });
});
