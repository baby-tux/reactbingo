import type { ConnectionState } from '../game/syncClient';

interface ConnectionStatusProps {
  connection: ConnectionState;
  syncError: string | null;
  viewMode: boolean;
  onReconnect: () => void;
}

export default function ConnectionStatus({ connection, syncError, viewMode, onReconnect }: ConnectionStatusProps) {
  let message: string | null = null;
  if (syncError === 'unauthorized') message = 'Invalid control code: changes are not saved';
  else if (connection === 'connecting') message = 'Connecting…';
  else if (connection === 'closed')
    message = viewMode ? 'Disconnected, retrying…' : 'Disconnected, retrying… Changes will sync when reconnected';
  else if (syncError) message = 'Last change could not be saved';

  if (message === null) return null;

  return (
    <div className="connection-status">
      {message}
      {connection === 'closed' ? <button onClick={onReconnect}>Reconnect</button> : null}
    </div>
  );
}
