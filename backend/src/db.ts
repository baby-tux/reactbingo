import * as mongoose from 'mongoose';

mongoose
    .connect('mongodb://db:27017/bingo')
    .catch((e: any) => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection;

export default db;
