import type { ClientMessage, GameState, ServerGameState, ServerMessage } from './types';

const HEARTBEAT_INTERVAL = 25000;
const HEARTBEAT_TIMEOUT = 10000;
const MAX_RECONNECT_DELAY = 30000;

export type ConnectionState = 'connecting' | 'open' | 'closed';

export interface SyncStatus {
  connection: ConnectionState;
  syncError: string | null;
}

export interface SyncCallbacks {
  /** Current local state, read when a push is sent */
  getState(): GameState;
  /** The server state replaces the local state */
  onRemoteState(state: GameState): void;
  onStatus(status: SyncStatus): void;
  onNotFound(): void;
}

export function socketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/api/`;
}

function newPushId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toGameState(doc: ServerGameState): GameState {
  return {
    eventHistory: doc.eventHistory,
    eventPosition: doc.eventPosition,
    bingo: doc.bingo,
    validationResult: doc.validationResult,
    validatedPatterns: doc.validatedPatterns,
  };
}

/**
 * Keeps one game in sync with the server. Viewers only receive state; the controller (created with
 * the game code) also pushes its full state, one push at a time, based on the last server revision
 * it saw. Reconnects with backoff, pings to detect dead connections and queues changes made offline.
 */
export class GameSyncClient {
  private readonly gameId: string;
  private readonly code: string | undefined;
  private readonly callbacks: SyncCallbacks;

  private ws: WebSocket | null = null;
  private retries = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private hasLoaded = false; // received the game state at least once
  private registered = false; // current socket received the game state
  private revision = 0; // server revision the local state is based on
  private dirty = false; // local changes not yet sent
  private pendingPush: { pushId: string; lost: boolean } | null = null; // push awaiting ack
  private blocked = false; // server rejected the control code
  private status: SyncStatus = { connection: 'connecting', syncError: null };

  constructor(gameId: string, code: string | undefined, callbacks: SyncCallbacks) {
    this.gameId = gameId;
    this.code = code;
    this.callbacks = callbacks;
  }

  start(): void {
    document.addEventListener('visibilitychange', this.handleWake);
    window.addEventListener('online', this.handleWake);
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    document.removeEventListener('visibilitychange', this.handleWake);
    window.removeEventListener('online', this.handleWake);
    this.teardownSocket();
  }

  /** Marks the local state as changed and sends it as soon as possible */
  push(): void {
    if (this.isViewMode() || this.blocked) return;
    this.dirty = true;
    this.flush();
  }

  reconnectNow(): void {
    this.retries = 0;
    this.teardownSocket();
    this.connect();
  }

  private isViewMode(): boolean {
    return this.code === undefined;
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    const next = { ...this.status, ...patch };
    if (next.connection === this.status.connection && next.syncError === this.status.syncError) return;
    this.status = next;
    this.callbacks.onStatus(next);
  }

  private connect(): void {
    clearTimeout(this.reconnectTimer);
    const ws = new WebSocket(socketUrl());
    this.ws = ws;
    this.setStatus({ connection: 'connecting' });

    ws.onopen = () => {
      this.retries = 0;
      this.setStatus({ connection: 'open' });
      this.send({ action: 'register', gameId: this.gameId });
      this.heartbeatTimer = setInterval(() => this.checkAlive(), HEARTBEAT_INTERVAL);
    };
    ws.onmessage = (event: MessageEvent<string>) => this.handleMessage(event.data);
    ws.onerror = () => ws.close();
    ws.onclose = () => this.handleDisconnect();
  }

  private teardownSocket(): void {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pongTimer = null;
    this.registered = false;
    // We can't know whether an unacknowledged push reached the server; the next state received tells
    if (this.pendingPush) this.pendingPush.lost = true;

    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onerror = this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private handleDisconnect(): void {
    this.teardownSocket();
    if (this.stopped) return;

    this.setStatus({ connection: 'closed' });
    const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * 2 ** this.retries++) + Math.random() * 500;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleWake = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.checkAlive();
    else if (this.ws === null || this.ws.readyState !== WebSocket.CONNECTING) this.reconnectNow();
  };

  // Browsers don't expose protocol pings, so detect half-open connections with an app-level ping
  private checkAlive(): void {
    if (this.pongTimer || !this.send({ action: 'ping' })) return;
    this.pongTimer = setTimeout(() => this.handleDisconnect(), HEARTBEAT_TIMEOUT);
  }

  private send(msg: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  private handleMessage(data: string): void {
    // Any message proves the connection is alive
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pongTimer = null;

    let msg: ServerMessage;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch {
      console.error('Invalid message from server', data);
      return;
    }

    const pushId = 'pushId' in msg ? msg.pushId : undefined;
    const isPendingPush = this.pendingPush !== null && this.pendingPush.pushId === pushId;
    switch (msg.type) {
      case 'state':
        this.receiveState(msg.state);
        break;
      case 'ack':
        if (!isPendingPush) break;
        this.pendingPush = null;
        this.revision = msg.revision;
        this.setStatus({ syncError: null });
        this.flush();
        break;
      case 'conflict':
        if (!isPendingPush) break;
        this.pendingPush = null;
        this.dirty = true;
        this.reconcile(msg.state);
        break;
      case 'notFound':
        this.callbacks.onNotFound();
        break;
      case 'error':
        console.error('Server error:', msg.error);
        if (isPendingPush) {
          this.pendingPush = null;
          this.dirty = true;
        }
        if (msg.error === 'unauthorized') {
          this.blocked = true;
          this.dirty = false;
        }
        this.setStatus({ syncError: msg.error });
        break;
      case 'pong':
        break;
      default:
        console.warn('Unknown message from server', msg);
    }
  }

  private receiveState(doc: ServerGameState): void {
    this.registered = true;

    if (this.pendingPush) {
      if (doc.lastPushId === this.pendingPush.pushId) {
        // Our push was saved before the connection dropped
        this.pendingPush = null;
        this.revision = doc.revision;
        this.flush();
        return;
      }
      // A broadcast raced our push: the ack or conflict for it will follow
      if (!this.pendingPush.lost) return;
      // The lost push never reached the server
      this.pendingPush = null;
      this.dirty = true;
    }

    this.reconcile(doc);
  }

  private reconcile(doc: ServerGameState): void {
    if (!this.hasLoaded) {
      this.hasLoaded = true;
      this.dirty = false;
    }

    if (
      this.dirty &&
      doc.revision !== this.revision &&
      !window.confirm(
        'This game was changed from somewhere else before your latest changes were saved.\n\n' +
          'OK: overwrite it with your version\nCancel: discard your changes and load the other version',
      )
    ) {
      this.dirty = false;
    }

    this.revision = doc.revision;
    if (this.dirty) this.flush();
    else this.callbacks.onRemoteState(toGameState(doc));
  }

  // Sends local state if there are unsent changes and no push is awaiting acknowledgement
  private flush(): void {
    if (this.code === undefined || this.blocked || !this.dirty || this.pendingPush || !this.registered) return;

    const pushId = newPushId();
    const sent = this.send({
      action: 'push',
      gameId: this.gameId,
      code: this.code,
      pushId,
      baseRevision: this.revision,
      state: this.callbacks.getState(),
    });
    if (!sent) return;

    this.pendingPush = { pushId, lost: false };
    this.dirty = false;
  }
}
