import IORedis from 'ioredis';

const connectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, 
};

export const redisConnection = new IORedis(connectionOptions);

redisConnection.on('connect', () => console.log('✅ Connected to Redis'));
redisConnection.on('error', (err: any) => console.error('❌ Redis Connection Error:', err));