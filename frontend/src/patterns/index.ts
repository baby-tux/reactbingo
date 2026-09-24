import b from './b.svg'
import i from './i.svg'
import n from './n.svg'
import g from './g.svg'
import o from './o.svg'
import row from './row.svg'
import column from './column.svg'
import diag from './diag.svg'
import corners from './corners.svg'
import x from './x.svg'
import blackout from './blackout.svg'

export interface PatternImage {
  name: string;
  src: string;
}

// name must match the pattern key in backend/src/validation.ts
const images: PatternImage[] = [
  { name: "b", src: b },
  { name: "i", src: i },
  { name: "n", src: n },
  { name: "g", src: g },
  { name: "o", src: o },
  { name: "row", src: row },
  { name: "column", src: column },
  { name: "diag", src: diag },
  { name: "corners", src: corners },
  { name: "x", src: x },
  { name: "full", src: blackout },
];

export function patternImage(name: string): PatternImage | undefined {
  return images.find((p) => p.name === name);
}

export default images;
