import type { ClientMessage, ServerMessage } from '../game/types';

/** In-memory WebSocket stand-in: install with vi.stubGlobal('WebSocket', FakeWebSocket) */
export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: ClientMessage[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  static latest(): FakeWebSocket {
    const ws = FakeWebSocket.instances.at(-1);
    if (!ws) throw new Error('No WebSocket was created');
    return ws;
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as ClientMessage);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  // Test controls

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(msg: ServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  /** The server or network drops the connection */
  drop(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  pushes() {
    return this.sent.filter((m) => m.action === 'push');
  }
}
