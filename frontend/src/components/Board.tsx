import { CARD_LETTERS } from '../game/types';

interface BoardNumberProps {
  value: number;
  picked: boolean;
  last: boolean;
  viewMode: boolean;
  onClick: () => void;
}

function BoardNumber({ value, picked, last, viewMode, onClick }: BoardNumberProps) {
  let className = 'board-number';
  if (last) className += ' board-number-active';
  else if (viewMode) className += ' board-number-view';

  return (
    <button className={className} onClick={onClick} disabled={picked}>
      {value}
    </button>
  );
}

interface BoardProps {
  pickedNumbers: number[];
  viewMode: boolean;
  onNumberClick: (n: number) => void;
}

const NUMBERS_PER_LETTER = 15;

export default function Board({ pickedNumbers, viewMode, onNumberClick }: BoardProps) {
  const last = pickedNumbers.at(-1);

  return (
    <div className="game-board">
      {CARD_LETTERS.map((letter, row) => (
        <div className="board-row" key={letter}>
          <div className="board-letter">{letter.toUpperCase()}</div>
          {Array.from({ length: NUMBERS_PER_LETTER }, (_, i) => {
            const n = row * NUMBERS_PER_LETTER + i + 1;
            return (
              <BoardNumber
                key={n}
                value={n}
                picked={pickedNumbers.includes(n)}
                last={n === last}
                viewMode={viewMode}
                onClick={() => onNumberClick(n)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
