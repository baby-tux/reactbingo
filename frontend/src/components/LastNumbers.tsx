import { bingoLetter } from '../game/history';

const PREVIOUS_COUNT = 4;

function DisplayNumber({ value }: { value: number }) {
  return <span>{`${bingoLetter(value)} ${value}`}</span>;
}

/** The current number, big, next to the few previous ones (most recent first) */
export default function LastNumbers({ numbers }: { numbers: number[] }) {
  const current = numbers.at(-1);
  const previous = numbers.slice(0, -1).slice(-PREVIOUS_COUNT).reverse();

  return (
    <div className="last-numbers">
      <div className="previous-numbers">
        {previous.length > 0
          ? previous.map((n) => <div key={n}><DisplayNumber value={n} /></div>)
          : <div>&nbsp;</div>}
      </div>
      <div className="current-number">
        {current !== undefined ? <DisplayNumber value={current} /> : null}
      </div>
    </div>
  );
}
