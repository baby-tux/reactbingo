import { useEffect, useState } from 'react';
import * as api from '../api/client';
import { useDialog } from '../dialog/DialogContext';

const MAX_GAME_ID_LENGTH = 32;

/** Public games updated recently, and the form to create a game */
export default function HomePage() {
  const [gameList, setGameList] = useState<string[] | null>(null);
  const [newGameId, setNewGameId] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [newError, setNewError] = useState('');
  const dialog = useDialog();

  useEffect(() => {
    api
      .getGameList()
      .then(setGameList)
      .catch(() => setGameList([]));
  }, []);

  const createGame = () => {
    api
      .createGame({ gameId: newGameId, isPublic: newPublic })
      .then((resp) => {
        if (resp.success) {
          void dialog.alert(
            `Control it at ${window.location.origin}/control/${newGameId}/${resp.code}\n\nKeep this code secret: anyone who has it can control the game.`,
            {
              title: `Game created, code ${resp.code}`,
            },
          );
          setNewGameId('');
          setNewPublic(true);
          setNewError('');
        } else {
          setNewError('Could not create game (the name may already be taken)');
        }
      })
      .catch(() => setNewError('Could not reach the server'));
  };

  let list;
  if (gameList === null) list = <p>Loading...</p>;
  else if (gameList.length === 0) list = <p>No game found</p>;
  else
    list = (
      <ul>
        {gameList.map((g) => (
          <li key={g}>
            <a href={`/view/${g}`} target="_blank" rel="noopener noreferrer">
              {g}
            </a>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <h1>Bingo</h1>
      <h2>Game list</h2>
      {list}
      <h2>Create new game</h2>
      <p>
        Enter name:{' '}
        <input
          type="text"
          maxLength={MAX_GAME_ID_LENGTH}
          onChange={(e) => setNewGameId(e.target.value.replace(/\W/g, ''))}
          value={newGameId}
          placeholder="Game ID (alphanumeric, no spaces)"
        />
        <br />
        <br />
        <input type="checkbox" id="isPublic" checked={newPublic} onChange={(e) => setNewPublic(e.target.checked)} />
        <label htmlFor="isPublic">&nbsp;Public game</label>
        <br />
        <br />
        {newError.length > 0 ? (
          <span>
            Error: {newError}
            <br />
          </span>
        ) : null}
        &nbsp;
        <button disabled={newGameId.length < 1} onClick={createGame}>
          Create!
        </button>
      </p>
    </>
  );
}
