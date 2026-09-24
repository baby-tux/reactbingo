import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import redoicon from '../assets/redo.svg';
import reseticon from '../assets/reset.svg';
import undoicon from '../assets/undo.svg';
import Board from '../components/Board';
import CardNumberInput from '../components/CardNumberInput';
import ConnectionStatus from '../components/ConnectionStatus';
import LastNumbers from '../components/LastNumbers';
import PatternPicker from '../components/PatternPicker';
import ValidationCard from '../components/ValidationCard';
import { currentPatterns, drawnNumbers, validatedPatterns } from '../game/history';
import { useGame } from '../game/useGame';

/** /view/:id (read-only) and /control/:id/:code: the mode depends only on the code being present */
export default function GamePage() {
  const { id = '', code } = useParams();
  const navigate = useNavigate();

  const onNotFound = useCallback(() => {
    alert('Game not found!');
    navigate('/', { replace: true });
  }, [navigate]);

  const game = useGame(id, code, onNotFound);
  const { state, isViewMode } = game;
  const numbers = drawnNumbers(state);

  let validation = null;
  if (state.validationResult !== null) validation = <ValidationCard result={state.validationResult} />;
  else if (state.bingo && !isViewMode) validation = <CardNumberInput onValidate={game.checkCard} />;

  return (
    <div className="Bingo">
      <ConnectionStatus
        connection={game.connection}
        syncError={game.syncError}
        viewMode={isViewMode}
        onReconnect={game.reconnect}
      />
      <Board pickedNumbers={numbers} onNumberClick={game.drawNumber} viewMode={isViewMode} />
      <div className="info-sections">
        <LastNumbers numbers={numbers} />
        <div className="buttons" style={isViewMode ? { display: 'none' } : {}}>
          <button onClick={game.undo} disabled={state.eventPosition <= 0}><img alt="Undo" src={undoicon} /></button>
          <button onClick={game.redo} disabled={state.eventPosition >= state.eventHistory.length}><img alt="Redo" src={redoicon} /></button>
          <button onClick={game.reset}><img alt="Reset" src={reseticon} /></button>
        </div>
      </div>
      <div className="bingo-validation">
        {validation}
      </div>
      <div className="bingo-status">
        {state.bingo && isViewMode && state.validationResult === null
          ? <div className="bingo-message">Bingo!</div>
          : <PatternPicker
              lines={game.availablePatterns}
              enabled={state.bingo && !isViewMode}
              validated={validatedPatterns(state)}
              highlighted={state.validatedPatterns}
              current={currentPatterns(state)}
              continueAvailable={state.validationResult !== null}
              onAward={game.awardPatterns}
              onCancel={() => game.setBingo(false)}
            />}
        {!state.bingo && !isViewMode
          ? <div><button onClick={() => game.setBingo(true)} disabled={state.eventPosition <= 0} className="bingoButton">Bingo</button></div>
          : null}
      </div>
    </div>
  );
}
