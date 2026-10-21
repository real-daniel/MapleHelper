import type { RankingRegion } from "./types";
import { HttpError } from "./http";

const WORLD_NAMES: Record<number, string> = {
  0: "Scania", 1: "Bera", 2: "Broa", 3: "Windia", 4: "Khaini", 5: "Bellocan", 6: "Mardia",
  7: "Kradia", 8: "Yellonde", 9: "Demethos", 10: "Galicia", 11: "El Nido", 12: "Zenith",
  13: "Arcania", 14: "Chaos", 15: "Nova", 16: "Renegades", 17: "Aurora", 18: "Elysium",
  19: "Scania", 30: "Luna", 45: "Kronos", 46: "Solis", 48: "Challengers Interactive",
  49: "Challengers Interactive", 52: "Challengers Heroic", 54: "Challengers Heroic", 70: "Hyperion",
};

interface RankingCharacter {
  characterName: string;
  gap: number;
  rank: number;
  worldID: number;
  characterImgURL?: string | null;
  jobName: string;
  isSearchTarget?: boolean;
}

export interface ImportedCharacter {
  name: string;
  world: string;
  job: string;
  weeklyRank: number;
  weeklyExperience: number;
  imageUrl: string | null;
  region: RankingRegion;
  sourceUrl: string;
  retrievedAt: string;
}

export function parseRegion(value: string | undefined): RankingRegion {
  if (value !== "NORTH_AMERICA" && value !== "EUROPE") throw new HttpError(400, "region must be NORTH_AMERICA or EUROPE.");
  return value;
}

export async function importCharacter(baseUrl: string, nameValue: string | undefined, regionValue: string | undefined): Promise<ImportedCharacter> {
  const name = (nameValue ?? "").trim();
  if (!/^[A-Za-z0-9]{1,20}$/.test(name)) throw new HttpError(400, "name must contain 1-20 letters or numbers.");
  const region = parseRegion(regionValue);
  const path = region === "NORTH_AMERICA" ? "na" : "eu";
  const api = new URL(`/api/maplestory/no-auth/ranking/v2/${path}`, baseUrl);
  api.search = new URLSearchParams({ type: "overall", id: "weekly", reboot_index: "0", page_index: "1", character_name: name }).toString();
  let response: Response;
  try {
    response = await fetch(api, { headers: { "User-Agent": "MapleHelper/1.0 (Cloudflare Workers)" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new HttpError(502, "NEXON rankings request failed.");
  }
  if (!response.ok) throw new HttpError(502, `NEXON rankings returned HTTP ${response.status}.`);
  const body = await response.json<{ ranks?: RankingCharacter[] }>();
  const character = (body.ranks ?? []).find((candidate) => candidate.isSearchTarget || candidate.characterName.toLowerCase() === name.toLowerCase());
  if (!character) throw new HttpError(404, `Character ${name} was not found.`);
  const avatar = character.characterImgURL ? new URL(character.characterImgURL) : null;
  const imageUrl = avatar?.protocol === "https:" && avatar.hostname === "msavatar1.nexon.net" ? avatar.toString() : null;
  const source = new URL(`/maplestory/rankings/${path}/overall/weekly`, baseUrl);
  source.search = new URLSearchParams({ world_type: "both", search_type: "character-name", search: name }).toString();
  return {
    name: character.characterName,
    world: WORLD_NAMES[character.worldID] ?? "Unknown",
    job: character.jobName,
    weeklyRank: character.rank,
    weeklyExperience: character.gap,
    imageUrl,
    region,
    sourceUrl: source.toString(),
    retrievedAt: new Date().toISOString(),
  };
}
