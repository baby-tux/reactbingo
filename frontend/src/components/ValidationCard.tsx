import { CARD_LETTERS, type CardPosition, type ValidationResult } from '../game/types';

const ROWS = [1, 2, 3, 4, 5] as const;
const FREE_CELL: CardPosition = 'n3';

/** The checked card, with drawn numbers and the matched pattern highlighted */
export default function ValidationCard({ result }: { result: ValidationResult }) {
  return (
    <div className="card-table">
      <div className="cardTHead">
        <div className="cardRow">
          {CARD_LETTERS.map((letter, i) => (
            <div className={i === CARD_LETTERS.length - 1 ? 'cardHead cardLastCell' : 'cardHead'} key={letter}>
              {letter.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
      <div className="cardTBody">
        {ROWS.map((row) => (
          <div className="cardRow" key={row}>
            {CARD_LETTERS.map((letter) => {
              const pos: CardPosition = `${letter}${row}`;
              const cell = result[pos];
              let className = 'cardCell';
              if (cell.isOnPattern) className += ' cardCellHighlighted';
              else if (cell.isDrawn) className += ' cardCellSelected';

              return (
                <div className={className} key={pos}>
                  {pos === FREE_CELL ? '★' : cell.number}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
