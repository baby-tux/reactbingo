import { useCallback, useEffect, useRef, useState } from 'react';
import { GameSyncClient, type SyncCallbacks, type SyncStatus } from './syncClient';

type Handlers = Omit<SyncCallbacks, 'onStatus'>;

/** Connects to a game for the lifetime of the component (see GameSyncClient) */
export function useGameSync(gameId: string, code: string | undefined, handlers: Handlers) {
  const [status, setStatus] = useState<SyncStatus>({ connection: 'connecting', syncError: null });
  const handlersRef = useRef(handlers);
  const clientRef = useRef<GameSyncClient | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const client = new GameSyncClient(gameId, code, {
      getState: () => handlersRef.current.getState(),
      onRemoteState: (state) => handlersRef.current.onRemoteState(state),
      onNotFound: () => handlersRef.current.onNotFound(),
      confirmOverwrite: () => handlersRef.current.confirmOverwrite(),
      onStatus: setStatus,
    });
    clientRef.current = client;
    client.start();
    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, [gameId, code]);

  const push = useCallback(() => clientRef.current?.push(), []);
  const reconnect = useCallback(() => clientRef.current?.reconnectNow(), []);

  return { ...status, push, reconnect };
}
