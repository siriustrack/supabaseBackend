import { redisClient } from "../config/redisClient"; // ajuste o caminho se necessário

export async function clearCache() {
  try {
    await redisClient.flushAll();
    console.log("Cache do Redis limpo com sucesso.");
  } catch (error) {
    console.error("Erro ao limpar o cache do Redis:", error);
  }
}
