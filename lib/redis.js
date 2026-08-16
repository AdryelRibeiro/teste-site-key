import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

let redisClient = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn("Redis client init warning:", e.message);
  }
}

// Memory fallback store
const memoryStore = new Map();
const DB_FILE = path.join(process.cwd(), "data_store.json");

function loadMemoryDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      Object.keys(data).forEach((k) => memoryStore.set(k, data[k]));
    }
  } catch (e) {}
}
loadMemoryDB();

function saveMemoryDB() {
  try {
    // Only attempt save if not in read-only Vercel environment
    if (!process.env.VERCEL) {
      const obj = {};
      memoryStore.forEach((v, k) => (obj[k] = v));
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), "utf-8");
    }
  } catch (e) {}
}

export const redis = {
  get: async (key) => {
    if (redisClient) {
      try {
        const val = await redisClient.get(key);
        if (val !== null && val !== undefined) return val;
      } catch (e) {}
    }
    return memoryStore.get(key) || null;
  },
  set: async (key, val) => {
    if (redisClient) {
      try {
        await redisClient.set(key, val);
      } catch (e) {}
    }
    memoryStore.set(key, val);
    saveMemoryDB();
    return "OK";
  },
  del: async (key) => {
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch (e) {}
    }
    memoryStore.delete(key);
    saveMemoryDB();
    return 1;
  },
  sadd: async (setKey, member) => {
    if (redisClient) {
      try {
        await redisClient.sadd(setKey, member);
      } catch (e) {}
    }
    const current = memoryStore.get(setKey) || [];
    if (!current.includes(member)) {
      current.push(member);
      memoryStore.set(setKey, current);
      saveMemoryDB();
    }
    return 1;
  },
  srem: async (setKey, member) => {
    if (redisClient) {
      try {
        await redisClient.srem(setKey, member);
      } catch (e) {}
    }
    const current = memoryStore.get(setKey) || [];
    const updated = current.filter((x) => x !== member);
    memoryStore.set(setKey, updated);
    saveMemoryDB();
    return 1;
  },
  smembers: async (setKey) => {
    if (redisClient) {
      try {
        const members = await redisClient.smembers(setKey);
        if (members) return members;
      } catch (e) {}
    }
    return memoryStore.get(setKey) || [];
  },
};

export const KEY_PREFIX = "licensekey:";
export const KEY_INDEX = "licensekey:index";
export const USER_PREFIX = "user:";
export const USER_INDEX = "user:index";
