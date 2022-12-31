import * as mongoose from 'mongoose';

mongoose
    .connect('mongodb://localhost:27017/bingo', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .catch((e: any) => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection;

export default db;
