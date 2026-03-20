import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisPublisher = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL)
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });