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
  // Incremented on every accepted push; pushes must be based on the current revision
  revision: { type: Number, default: 0 },
  // Client-generated id of the last accepted push, lets a reconnecting controller tell whether its in-flight push landed
  lastPushId: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('bingo', BingoGame);
