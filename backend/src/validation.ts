import * as csv_parser from 'papaparse';
import * as fs from 'fs';

//Possible patterns
//name: array of arrays of the required filled positions
//Add your own here!
const bingoTypeValidations = {
  b: [['b1', 'b2', 'b3', 'b4', 'b5']], //Column 'B'
  i: [['i1', 'i2', 'i3', 'i4', 'i5']], //Column 'I'
  n: [['n1', 'n2', 'n4', 'n5']], //Column 'N'
  g: [['g1', 'g2', 'g3', 'g4', 'g5']], //Column 'G'
  o: [['o1', 'o2', 'o3', 'o4', 'o5']], //Column 'O'
  column: [['b1', 'b2', 'b3', 'b4', 'b5'],['i1', 'i2', 'i3', 'i4', 'i5'],['n1', 'n2', 'n4', 'n5'],['g1', 'g2', 'g3', 'g4', 'g5'],['o1', 'o2', 'o3', 'o4', 'o5']], //Any column
  row: [['b1', 'i1', 'n1', 'g1', 'o1'], ['b2', 'i2', 'n2', 'g2', 'o2'], ['b3', 'i3', 'g3', 'o3'], ['b4', 'i4', 'n4', 'g4', 'o4'], ['b5', 'i5', 'n5', 'g5', 'o5']], //Any row
  diag: [['b1', 'i2', 'g4', 'o5'], ['b5', 'i4', 'g2', 'o1']], //A diagonal
  corners: [['b1', 'b5', 'o1', 'o5']], //Four corners
  x: [['b1', 'i2', 'g4', 'o5', 'b5', 'i4', 'g2', 'o1']], //X pattern
  full: [['b1', 'b2', 'b3', 'b4', 'b5', 'i1', 'i2', 'i3', 'i4', 'i5', 'n1', 'n2', 'n4', 'n5', 'g1', 'g2', 'g3', 'g4', 'g5', 'o1', 'o2', 'o3', 'o4', 'o5']] //Coverall (blackout)
};

class Validation {
  private data: Array<any> = [];

  constructor(csvFile: string) {
    fs.readFile(csvFile, 'utf8', (err, data) => {
      if (err) throw err;

      let cardInfo = csv_parser.parse(data, {header: true, dynamicTyping: true, skipEmptyLines: true});
      this.data = cardInfo.data;
    });
  }

  validate(id: Number, drawnNumbers: Array<any>, completedPatterns: Array<string>) {
    let index = this.data.findIndex(c => c.id === id);
    if (index === -1) {
      return {isValid: false};
    }

    let card = Object.assign({}, this.data[index]);
    delete card.id;

    let cardNumbers = Object.values(card);

    let intersect = cardNumbers.filter(value => drawnNumbers.includes(value));

    let intersectKeys: Array<string> = [];
    let foundPatterns: Array<string> = [];
    let cardResult: any = {};

    for (const [pos, number] of Object.entries(card)) {
      let isDrawn = drawnNumbers.includes(number);
      if (isDrawn) intersectKeys.push(pos);

      cardResult[pos] = {number: number, isOnPattern: false, isDrawn: isDrawn};
    }

    cardResult['n3'] = {number: '*', isOnPattern: false, isDraw: false};

    let validations = Object.keys(bingoTypeValidations).filter(v => !completedPatterns.includes(v));

    validations.map(type => {
      let patterns: string[][] = (bingoTypeValidations as any)[type];
      let isFound = false;
      patterns.map(pattern => {
        let patternInt = intersectKeys.filter(value => pattern.includes(value));
        if (patternInt.length === pattern.length)
        {
          isFound = true;
          pattern.map(pos => cardResult[pos]['isOnPattern'] = true);
          if ((pattern.includes('n2') && pattern.includes('n4')) || (pattern.includes('i3') && pattern.includes('g3')) || (pattern.includes('i2') && pattern.includes('g4')) || (pattern.includes('i4') && pattern.includes('g2')))
          {
            cardResult['n3']['isOnPattern'] = true;
          }
        }
      });
      if (isFound) foundPatterns.push(type);
    });

    return {isValid: true, patterns: foundPatterns, result: cardResult};
  }
}

export default Validation;
