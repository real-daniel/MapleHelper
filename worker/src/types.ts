export interface Env {
  DB: D1Database;
  AI: { run(model: string, input: unknown): Promise<unknown> };
  ASSETS: Fetcher;
  APP_URL: string;
  NEXON_BASE_URL: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
}

export type Variables = {
  user: AuthenticatedUser;
};

export interface AuthenticatedUser {
  id: number;
  discordUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export type AppBindings = { Bindings: Env; Variables: Variables };

export const EQUIPMENT_SLOTS = [
  "RING", "PENDANT", "WEAPON", "SECONDARY", "EMBLEM", "HAT", "FACE", "EYE",
  "EARRINGS", "TOP", "BOTTOM", "SHOES", "GLOVES", "CAPE", "BELT", "SHOULDER",
  "POCKET", "BADGE", "MEDAL", "ANDROID", "HEART", "TOTEM",
] as const;

export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number];
export type RankingRegion = "NORTH_AMERICA" | "EUROPE";
