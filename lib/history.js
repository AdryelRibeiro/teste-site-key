import { redis } from "./redis";

export const HISTORY_LIST = "licensekey:history";
const MAX_HISTORY = 500;

/**
 * Registra um evento no historico. Tipos usados:
 * "generated" | "activated" | "validation_failed" | "banned" | "unbanned" | "reset" | "deleted"
 */
export async function logHistory(entry) {
  const record = {
    ...entry,
    at: new Date().toISOString(),
  };
  await redis.lpush(HISTORY_LIST, JSON.stringify(record));
  await redis.ltrim(HISTORY_LIST, 0, MAX_HISTORY - 1);
}

export async function getHistory(limit = 200) {
  const raw = await redis.lrange(HISTORY_LIST, 0, limit - 1);
  return raw
    .map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
