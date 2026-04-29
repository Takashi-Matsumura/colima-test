import { createClient, type RedisClientType } from 'redis';

const globalForRedis = globalThis as unknown as {
  __redisClient?: RedisClientType;
  __redisConnecting?: Promise<RedisClientType>;
};

export async function getRedis(): Promise<RedisClientType> {
  if (globalForRedis.__redisClient?.isOpen) {
    return globalForRedis.__redisClient;
  }
  if (globalForRedis.__redisConnecting) {
    return globalForRedis.__redisConnecting;
  }

  const client: RedisClientType = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));

  globalForRedis.__redisConnecting = client.connect().then(() => {
    globalForRedis.__redisClient = client;
    globalForRedis.__redisConnecting = undefined;
    return client;
  });

  return globalForRedis.__redisConnecting;
}
