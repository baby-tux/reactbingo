import { Fragment, useState } from 'react';

const KEYPAD_ROWS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

/** Card number entry with an on-screen keypad for touch screens */
export default function CardNumberInput({ onValidate }: { onValidate: (cardNumber: string) => void }) {
  const [value, setValue] = useState('');

  const digit = (d: number) => (
    <button key={d} onClick={() => setValue((v) => v + d)}>
      {d}
    </button>
  );

  return (
    <div className="card-number-input">
      <div className="number-display">
        Card #:{' '}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          size={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter') onValidate(value);
          }}
        />
      </div>
      {KEYPAD_ROWS.map((row) => (
        <Fragment key={row[0]}>
          {row.map(digit)}
          <br />
        </Fragment>
      ))}
      <button onClick={() => setValue('')}>C</button>
      {digit(0)}
      <button onClick={() => onValidate(value)}>✔</button>
    </div>
  );
}
