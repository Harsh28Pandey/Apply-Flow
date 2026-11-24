import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, 'MongoDB Connection Failed');
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}
