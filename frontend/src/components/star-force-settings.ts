export type StarForceMvp = "none" | "silver" | "gold" | "diamond";
export type StarForceMode = 1 | 2 | 3 | 4;

export type StarForceSettings = {
  mvp: StarForceMvp;
  starCatch: boolean;
  thirtyOff: boolean;
  twoStars: boolean;
  reducedBoom: boolean;
  modes: Record<number, StarForceMode>;
};

export const STAR_FORCE_SETTINGS_STORAGE_KEY = "maplehelper.starForceSettings.v1";
export const STAR_FORCE_SETTINGS_EVENT = "maplehelper:star-force-settings";

export const DEFAULT_STAR_FORCE_SETTINGS: StarForceSettings = {
  mvp: "none",
  starCatch: true,
  thirtyOff: false,
  twoStars: false,
  reducedBoom: false,
  modes: Object.fromEntries(Array.from({ length: 7 }, (_, index) => [index + 15, 1])) as Record<number, StarForceMode>,
};

export function loadStarForceSettings(): StarForceSettings {
  if (typeof window === "undefined") return DEFAULT_STAR_FORCE_SETTINGS;

  try {
    const stored = window.localStorage.getItem(STAR_FORCE_SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_STAR_FORCE_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<StarForceSettings>;
    return sanitizeStarForceSettings(parsed);
  } catch {
    return DEFAULT_STAR_FORCE_SETTINGS;
  }
}

export function saveStarForceSettings(settings: StarForceSettings) {
  if (typeof window === "undefined") return;

  const sanitized = sanitizeStarForceSettings(settings);
  window.localStorage.setItem(STAR_FORCE_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(STAR_FORCE_SETTINGS_EVENT, { detail: sanitized }));
}

function sanitizeStarForceSettings(settings: Partial<StarForceSettings>): StarForceSettings {
  const mvp = settings.mvp === "silver" || settings.mvp === "gold" || settings.mvp === "diamond"
    ? settings.mvp
    : "none";
  const modes = { ...DEFAULT_STAR_FORCE_SETTINGS.modes };
  for (const [star, mode] of Object.entries(settings.modes ?? {})) {
    const starNumber = Number(star);
    if (starNumber < 15 || starNumber > 21) continue;
    modes[starNumber] = mode === 2 || mode === 3 || mode === 4 ? mode : 1;
  }

  return {
    mvp,
    starCatch: settings.starCatch ?? DEFAULT_STAR_FORCE_SETTINGS.starCatch,
    thirtyOff: settings.thirtyOff ?? DEFAULT_STAR_FORCE_SETTINGS.thirtyOff,
    twoStars: settings.twoStars ?? DEFAULT_STAR_FORCE_SETTINGS.twoStars,
    reducedBoom: settings.reducedBoom ?? DEFAULT_STAR_FORCE_SETTINGS.reducedBoom,
    modes,
  };
}
