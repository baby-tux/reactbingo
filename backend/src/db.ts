import * as mongoose from 'mongoose';

const mongoHost = process.env.NODE_ENV === 'production' ? 'db' : 'localhost';

mongoose
    .connect(`mongodb://${mongoHost}:27017/bingo`)
    .catch((e: any) => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection;

export default db;
