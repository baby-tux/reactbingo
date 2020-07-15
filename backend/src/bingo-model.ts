import * as mongoose from 'mongoose';
const Schema = mongoose.Schema

const BingoGame = new Schema({
  gameId: { type: Number, required: true },
  eventHistory: { type: [Object], default: [] },
  eventPosition: { type: Number, default: 0 },
  bingo: { type: Boolean, default: false },
  validationResult: { type: Object, default: null },
  validatedPatterns: { type: [String], default: [] },
});

export default mongoose.model('bingo', BingoGame);
