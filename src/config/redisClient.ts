import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  try {
    await redisClient.connect();
    console.log("Redis conectado com sucesso.");
  } catch (err) {
    console.error("Erro ao conectar ao Redis:", err);
  }
})();
