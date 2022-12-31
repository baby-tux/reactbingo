import * as mongoose from 'mongoose';
const Schema = mongoose.Schema

const BingoGame = new Schema({
  gameId: { type: String, required: true, match: /\w+/, index: true, unique: true, maxLength: 16 },
  code: { type: String, required: true, match: /[a-z0-9]+/, minLength: 6, maxLength: 32},
  isPublic: { type: Boolean, default: true },
  eventHistory: { type: [Object], default: [] },
  eventPosition: { type: Number, default: 0 },
  bingo: { type: Boolean, default: false },
  validationResult: { type: Object, default: null },
  validatedPatterns: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model('bingo', BingoGame);
