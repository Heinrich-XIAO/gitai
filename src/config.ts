import path from "node:path";

export const APP_NAME = "GitAI";
export const DATA_DIR = path.join(process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "gitai.sqlite");
export const REPOS_DIR = path.join(DATA_DIR, "repos");
export const WORK_DIR = path.join(DATA_DIR, "work");
export const PORT = Number(process.env.PORT ?? 3000);

export const STARTER_COINS = 50;
export const RUN_THRESHOLD_COINS = 10;
export const COINS_PER_DOLLAR = 10;
export const COIN_PACKS = [
  { id: "starter-100", coins: 100, usdCents: 1000 },
  { id: "builder-500", coins: 500, usdCents: 5000 },
  { id: "shipper-1000", coins: 1000, usdCents: 10000 },
] as const;

export const SESSION_COOKIE = "gitai_user";

