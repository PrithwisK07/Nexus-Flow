import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// If REDIS_URL exists (e.g., in production/Upstash), use it. 
// Otherwise, fall back to local Docker settings.
export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null, 
    });

redisConnection.on('connect', () => console.log('✅ Connected to Redis'));
redisConnection.on('error', (err: any) => console.error('❌ Redis Connection Error:', err));