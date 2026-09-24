import { useState } from 'react';
import reseticon from '../assets/reset.svg';
import type { PatternLines } from '../game/types';
import { patternImage } from '../patterns';

interface PatternButtonProps {
  name: string;
  selected: boolean;
  highlighted: boolean;
  current: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PatternButton({ name, selected, highlighted, current, disabled, onClick }: PatternButtonProps) {
  let className: string | undefined;
  if (selected) className = 'bingoTypeSelected';
  else if (highlighted) className = 'bingoTypeHighlighted';
  else if (current) className = 'bingoTypeCurrent';

  const image = patternImage(name);
  return (
    <div className="bingoType">
      <button className={className} disabled={disabled} onClick={onClick}>
        {image ? <img src={image.src} alt={name} /> : name}
      </button>
    </div>
  );
}

interface PatternPickerProps {
  lines: PatternLines;
  /** Controller is checking a bingo: patterns can be picked and awarded */
  enabled: boolean;
  /** Already won before the last number: shown disabled */
  validated: string[];
  /** Matched by the checked card: awarded as-is, manual picking is off */
  highlighted: string[];
  /** Won since the last number */
  current: string[];
  continueAvailable: boolean;
  onAward: (patterns: string[], keepBingo: boolean) => void;
  onCancel: () => void;
}

export default function PatternPicker(props: PatternPickerProps) {
  const { lines, enabled, validated, highlighted, current, continueAvailable, onAward, onCancel } = props;
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) => {
    if (!enabled || highlighted.length > 0 || current.includes(name)) return;
    setSelected((s) => (s.includes(name) ? s.filter((p) => p !== name) : [...s, name]));
  };

  const award = (keepBingo: boolean) => {
    onAward(highlighted.length > 0 ? highlighted : selected, keepBingo);
    setSelected([]);
  };

  const cancel = () => {
    setSelected([]);
    onCancel();
  };

  return (
    <div>
      <div className="bingo-types">
        {lines.map((line, i) => (
          <div className="bingo-types-line" key={i}>
            {line.map((name) => (
              <PatternButton
                key={name}
                name={name}
                selected={selected.includes(name)}
                highlighted={highlighted.includes(name)}
                current={current.includes(name)}
                disabled={validated.includes(name)}
                onClick={() => toggle(name)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="bingo-types-buttons" style={enabled ? {} : { display: 'none' }}>
        <button disabled={selected.length === 0 && highlighted.length === 0} onClick={() => award(false)}>✔</button>&nbsp;
        <button onClick={cancel}>✖</button>&nbsp;
        <button className="smalltext" disabled={!continueAvailable} onClick={() => award(true)}>
          <img alt="Other bingo" src={reseticon} />
        </button>
      </div>
    </div>
  );
}
