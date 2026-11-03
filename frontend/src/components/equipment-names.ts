import type { EquipmentSlot } from "./equipment-manager";

export type EquipmentJobGroup = "Warrior" | "Magician" | "Bowman" | "Thief" | "Pirate";

const JOB_GROUP_PATTERNS: Array<[EquipmentJobGroup, string[]]> = [
  ["Magician", [
    "arch mage", "bishop", "blaze wizard", "battle mage", "evan", "luminous", "kinesis",
    "illium", "lara", "kanna", "lynn", "beast tamer", "sia astelle",
  ]],
  ["Bowman", ["bow master", "bowmaster", "marksman", "pathfinder", "wind archer", "wild hunter", "mercedes", "kain"]],
  ["Thief", ["night lord", "shadower", "blade master", "dual blade", "night walker", "phantom", "cadena", "khali", "hoyoung", "xenon"]],
  ["Pirate", [
    "buccaneer", "cannon master", "cannoneer", "corsair", "captain", "thunder breaker", "shade", "ark",
    "angelic buster", "mechanic", "mo xuan", "jett", "xenon",
  ]],
  ["Warrior", [
    "hero", "paladin", "dark knight", "dawn warrior", "mihile", "aran", "demon slayer",
    "demon avenger", "blaster", "kaiser", "adele", "zero", "hayato", "ren", "erel",
  ]],
];

type ClassSetNames = Record<EquipmentJobGroup, Partial<Record<EquipmentSlot, string>>>;

const ROOT_ABYSS_NAMES: ClassSetNames = {
  Warrior: { HAT: "Royal Warrior Helm", TOP: "Eagle Eye Warrior Armor", BOTTOM: "Trixter Warrior Pants" },
  Magician: { HAT: "Royal Dunwitch Hat", TOP: "Eagle Eye Dunwitch Robe", BOTTOM: "Trixter Dunwitch Pants" },
  Bowman: { HAT: "Royal Ranger Beret", TOP: "Eagle Eye Ranger Cowl", BOTTOM: "Trixter Ranger Pants" },
  Thief: { HAT: "Royal Assassin Hood", TOP: "Eagle Eye Assassin Shirt", BOTTOM: "Trixter Assassin Pants" },
  Pirate: { HAT: "Royal Wanderer Hat", TOP: "Eagle Eye Wanderer Coat", BOTTOM: "Trixter Wanderer Pants" },
};

const ABSOLAB_NAMES: ClassSetNames = {
  Warrior: absoLabArmor("Knight", "Helm"),
  Magician: absoLabArmor("Mage", "Crown"),
  Bowman: absoLabArmor("Archer", "Hood"),
  Thief: absoLabArmor("Bandit", "Cap"),
  Pirate: absoLabArmor("Pirate", "Fedora"),
};

const ARCANE_UMBRA_NAMES: ClassSetNames = {
  Warrior: arcaneUmbraArmor("Knight"),
  Magician: arcaneUmbraArmor("Mage"),
  Bowman: arcaneUmbraArmor("Archer"),
  Thief: arcaneUmbraArmor("Thief"),
  Pirate: arcaneUmbraArmor("Pirate"),
};

const ETERNAL_NAMES: ClassSetNames = {
  Warrior: {
    HAT: "Eternal Knight Helm", TOP: "Eternal Knight Armor", BOTTOM: "Eternal Knight Pants",
    SHOES: "Eternal Knight Shoes", GLOVES: "Eternal Knight Gloves", CAPE: "Eternal Knight Cape",
    SHOULDER: "Eternal Knight Shoulder",
  },
  Magician: {
    HAT: "Eternal Mage Hat", TOP: "Eternal Mage Robe", BOTTOM: "Eternal Mage Pants",
    SHOES: "Eternal Mage Shoes", GLOVES: "Eternal Mage Gloves", CAPE: "Eternal Mage Cape",
    SHOULDER: "Eternal Mage Shoulder",
  },
  Bowman: {
    HAT: "Eternal Archer Hat", TOP: "Eternal Archer Hood", BOTTOM: "Eternal Archer Pants",
    SHOES: "Eternal Archer Shoes", GLOVES: "Eternal Archer Gloves", CAPE: "Eternal Archer Cape",
    SHOULDER: "Eternal Archer Shoulder",
  },
  Thief: {
    HAT: "Eternal Thief Bandana", TOP: "Eternal Thief Shirt", BOTTOM: "Eternal Thief Pants",
    SHOES: "Eternal Thief Shoes", GLOVES: "Eternal Thief Gloves", CAPE: "Eternal Thief Cape",
    SHOULDER: "Eternal Thief Shoulder",
  },
  Pirate: {
    HAT: "Eternal Pirate Hat", TOP: "Eternal Pirate Coat", BOTTOM: "Eternal Pirate Pants",
    SHOES: "Eternal Pirate Shoes", GLOVES: "Eternal Pirate Gloves", CAPE: "Eternal Pirate Cape",
    SHOULDER: "Eternal Pirate Shoulder",
  },
};

function absoLabArmor(group: string, hat: string): Partial<Record<EquipmentSlot, string>> {
  return {
    HAT: `AbsoLab ${group} ${hat}`,
    TOP: `AbsoLab ${group} Suit`,
    SHOES: `AbsoLab ${group} Shoes`,
    GLOVES: `AbsoLab ${group} Gloves`,
    CAPE: `AbsoLab ${group} Cape`,
    SHOULDER: `AbsoLab ${group} Shoulder`,
  };
}

function arcaneUmbraArmor(group: string): Partial<Record<EquipmentSlot, string>> {
  return {
    HAT: `Arcane Umbra ${group} Hat`,
    TOP: `Arcane Umbra ${group} Suit`,
    SHOES: `Arcane Umbra ${group} Shoes`,
    GLOVES: `Arcane Umbra ${group} Gloves`,
    CAPE: `Arcane Umbra ${group} Cape`,
    SHOULDER: `Arcane Umbra ${group} Shoulder`,
  };
}

const CLASS_SET_NAMES: Record<string, ClassSetNames> = {
  "chaos root abyss": ROOT_ABYSS_NAMES,
  absolab: ABSOLAB_NAMES,
  arcane: ARCANE_UMBRA_NAMES,
  "arcane umbra": ARCANE_UMBRA_NAMES,
  eternal: ETERNAL_NAMES,
};

export function equipmentJobGroup(jobName: string): EquipmentJobGroup | null {
  return equipmentJobGroups(jobName)[0] ?? null;
}

export function equipmentJobGroups(jobName: string): EquipmentJobGroup[] {
  const normalized = jobName.trim().toLowerCase();
  return JOB_GROUP_PATTERNS
    .filter(([, patterns]) => patterns.some((pattern) => normalized.includes(pattern)))
    .map(([group]) => group);
}

export function isEquipmentJobGroupCompatible(itemJobGroup: string | null, jobName: string) {
  if (!itemJobGroup) return true;
  return equipmentJobGroups(jobName).some((jobGroup) => itemJobGroup.toLowerCase() === jobGroup.toLowerCase());
}

const WEAPON_JOBS_BY_ITEM_PREFIX: Record<number, string[]> = {
  1212: ["Luminous"],
  1213: ["Adele"],
  1214: ["Kain"],
  1215: ["Ren"],
  1222: ["Angelic Buster"],
  1232: ["Demon Avenger"],
  1242: ["Xenon"],
  1252: ["Lynn", "Beast Tamer"],
  1253: ["Sia Astelle"],
  1262: ["Kinesis"],
  1272: ["Cadena"],
  1282: ["Illium"],
  1292: ["Hoyoung"],
  1302: ["Hero", "Paladin", "Mihile"],
  1312: ["Hero", "Demon Slayer"],
  1322: ["Paladin", "Demon Slayer"],
  1332: ["Shadower", "Blade Master", "Dual Blade"],
  1342: [], // Kattaras belong in the secondary slot, not the primary weapon slot.
  1362: ["Phantom"],
  1372: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop", "Blaze Wizard", "Evan", "Lara"],
  1382: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop", "Blaze Wizard", "Battle Mage", "Evan"],
  1402: ["Hero", "Paladin", "Dawn Warrior", "Kaiser"],
  1403: ["Mo Xuan"],
  1404: ["Khali"],
  1412: ["Hero"],
  1422: ["Paladin"],
  1432: ["Dark Knight"],
  1433: ["Erel Light"],
  1442: ["Dark Knight", "Aran"],
  1452: ["Bow Master", "Bowmaster", "Wind Archer"],
  1462: ["Marksman", "Wild Hunter"],
  1472: ["Night Lord", "Night Walker"],
  1482: ["Buccaneer", "Thunder Breaker", "Shade", "Ark"],
  1492: ["Corsair", "Captain", "Mechanic", "Jett"],
  1522: ["Mercedes"],
  1532: ["Cannon Master", "Cannoneer"],
  1542: ["Hayato"],
  1552: ["Kanna"],
  1562: ["Zero"],
  1572: ["Zero"],
  1582: ["Blaster"],
  1592: ["Pathfinder"],
};

const SECONDARY_JOBS_BY_NAME: Record<string, string[]> = {
  "noble bladebinder": ["Adele"],
  "princess no's soul shield": ["Mihile"],
  "princess no's accursed shield": ["Demon Slayer", "Demon Avenger"],
  "princess no's poisoned sword": ["Blade Master", "Dual Blade"],
  "princess no's accursed arrow": ["Mercedes"],
  "princess no's carte": ["Phantom"],
  "princess no's medal": ["Hero"],
  "princess no's rosary": ["Paladin"],
  "princess no's flower chain": ["Dark Knight"],
  "princess no's flaming book": ["Arch Mage (F/P)"],
  "princess no's damp book": ["Arch Mage (I/L)"],
  "princess no's golden book": ["Bishop"],
  "princess no's feather": ["Bow Master", "Bowmaster"],
  "princess no's wreath": ["Marksman"],
  "princess no's purple shadow": ["Shadower"],
  "princess no's charm": ["Night Lord"],
  "princess no's soul orb": ["Luminous"],
  "princess no's dragon essence": ["Kaiser"],
  "princess no's soul ring": ["Angelic Buster"],
  "princess no's magnum": ["Mechanic"],
  "princess no's wakizashi": ["Hayato"],
  "princess no's talisman": ["Kanna"],
  "princess no's leaf": ["Lynn", "Beast Tamer"],
  "princess no's orion fist": ["Jett"],
  "princess no's skull armor": ["Buccaneer"],
  "princess no's falcon eye": ["Corsair", "Captain"],
  "princess no's fire bomb": ["Cannon Master", "Cannoneer"],
  "princess no's flower ballast": ["Aran"],
  "princess no's dragon legacy": ["Evan"],
  "princess no's accursed marble": ["Battle Mage"],
  "princess no's arrowhead": ["Wild Hunter"],
  "princess no's floral jewel": ["Dawn Warrior", "Blaze Wizard", "Wind Archer", "Night Walker", "Thunder Breaker"],
  "princess no's controller": ["Xenon"],
  "princess no's fox marble": ["Shade"],
  "princess no's oriental king chess piece": ["Kinesis"],
  "princess no's transmitter": ["Cadena"],
  "princess no's megaton charges": ["Blaster"],
  "princess no's lucent wings": ["Illium"],
  "princess no's path": ["Ark"],
  "princess no's immortal relic": ["Pathfinder"],
  "princess no's immortal weapon belt": ["Kain"],
  "princess no's immortal bladebinder": ["Adele"],
  "princess no's immortal hex seeker": ["Khali"],
  "princess no's imugi gem": ["Ren"],
  "princess no's immortal four-jade ornament": ["Lara"],
  "princess no's fan tassel": ["Hoyoung"],
  "princess no's brace band": ["Mo Xuan"],
  "princess no's keir": ["Erel Light"],
  "princess no's compass": ["Sia Astelle"],
  "astra sacred aegis": ["Hero", "Paladin"],
  "astra medallion": ["Hero"],
  "astra rosary": ["Paladin"],
  "astra chain": ["Dark Knight"],
  "astra arcane shield": ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop"],
  "astra feather": ["Bow Master", "Bowmaster"],
  "astra bullseye": ["Marksman"],
  "astra relic": ["Pathfinder"],
  "astra charm": ["Night Lord"],
  "astra bane shield": ["Shadower"],
  "astra katara": ["Blade Master", "Dual Blade"],
  "astra wrist band": ["Buccaneer"],
  "astra raven eye": ["Corsair", "Captain"],
  "astra incendiary": ["Cannon Master", "Cannoneer"],
  "astra topaz aegis": ["Dawn Warrior"],
  "astra topaz": ["Dawn Warrior"],
  "astra ruby shield": ["Blaze Wizard"],
  "astra emerald": ["Wind Archer"],
  "astra obsidian": ["Night Walker"],
  "astra sapphire": ["Thunder Breaker"],
  "astra white tiger pendulum": ["Aran"],
  "astra honor shield": ["Evan"],
  "astra magic arrows": ["Mercedes"],
  "astra carte": ["Phantom"],
  "astra fox marble": ["Shade"],
  "astra orb": ["Luminous"],
  "astra force shield": ["Demon Slayer", "Demon Avenger"],
  "astra umbral shield": ["Battle Mage"],
  "astra wild tusk": ["Wild Hunter"],
  "astra magnum": ["Mechanic"],
  "astra deca core controller": ["Xenon"],
  "astra charges": ["Blaster"],
  "astra kodachi": ["Hayato"],
  "astra talisman": ["Kanna"],
  "astra soul shield": ["Mihile"],
  "astra nova essence": ["Kaiser"],
  "astra weapon belt": ["Kain"],
  "astra transmitter": ["Cadena"],
  "astra soul ring": ["Angelic Buster"],
  "astra hourglass": ["Zero"],
  "astra king chess piece": ["Kinesis"],
  "astra bladebinder": ["Adele"],
  "astra lucent wings": ["Illium"],
  "astra hex seeker": ["Khali"],
  "astra path": ["Ark"],
  "astra imugi gem": ["Ren"],
  "astra four-jade ornament": ["Lara"],
  "astra diamond fan tassel": ["Hoyoung"],
  "astra leaf shield": ["Lynn", "Beast Tamer"],
  "astra brace band": ["Mo Xuan"],
  "astra keir": ["Erel Light"],
  "astra compass": ["Sia Astelle"],
};

const EMBLEM_JOBS_BY_NAME: Record<string, string[]> = {
  "gold maple leaf emblem": [
    "Hero", "Paladin", "Dark Knight", "Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop",
    "Bow Master", "Bowmaster", "Marksman", "Pathfinder", "Night Lord", "Shadower",
    "Blade Master", "Dual Blade", "Buccaneer", "Corsair", "Captain", "Cannon Master", "Cannoneer",
  ],
  "gold cygnus emblem": ["Dawn Warrior", "Blaze Wizard", "Wind Archer", "Night Walker", "Thunder Breaker", "Mihile"],
  "gold heroes emblem": ["Aran", "Evan", "Mercedes", "Phantom", "Luminous", "Shade"],
  "gold resistance emblem": ["Battle Mage", "Wild Hunter", "Mechanic", "Blaster"],
  "gold demon emblem": ["Demon Slayer", "Demon Avenger"],
  "hybrid heart": ["Xenon"],
  "dragon emblem": ["Kaiser"],
  "angel emblem": ["Angelic Buster"],
  "gold agent emblem": ["Cadena"],
  "gold hitman emblem": ["Kain"],
  "gold knight's emblem": ["Adele"],
  "gold crystal emblem": ["Illium"],
  "gold chaser emblem": ["Khali"],
  "gold abyssal emblem": ["Ark"],
  "eternal time emblem": ["Zero"],
  "gold kinesis emblem": ["Kinesis"],
  "gold crescent emblem": ["Hayato"],
  "gold blossom emblem": ["Kanna"],
  "gold earthseer emblem": ["Lara"],
  "gold three paths emblem": ["Hoyoung"],
  "gold forest emblem": ["Lynn", "Beast Tamer"],
  "gold xuanshan school emblem": ["Mo Xuan"],
  "gold guardian emblem": ["Sia Astelle"],
  "gold sword emblem": ["Ren"],
  "gold knight emblem": ["Erel Light", "Erel"],
  "gold astro emblem": ["Jett"],
};

export function isEquipmentSubclassCompatible(slot: EquipmentSlot, mapleItemId: number | null, itemName: string, jobName: string) {
  if (slot === "WEAPON") {
    if (mapleItemId == null) return true;
    const compatibleJobs = WEAPON_JOBS_BY_ITEM_PREFIX[Math.floor(mapleItemId / 1000)];
    return compatibleJobs ? compatibleJobs.some((job) => sameJob(job, jobName)) : true;
  }
  if (slot === "EMBLEM") {
    const compatibleJobs = EMBLEM_JOBS_BY_NAME[itemName.trim().toLowerCase()];
    return compatibleJobs ? compatibleJobs.some((job) => sameJob(job, jobName)) : true;
  }
  if (slot !== "SECONDARY") return true;

  const normalizedName = itemName.trim().toLowerCase();
  const compatibleJobs = SECONDARY_JOBS_BY_NAME[normalizedName];
  if (compatibleJobs) return compatibleJobs.some((job) => sameJob(job, jobName));
  // Known class-bound families must be explicitly mapped before they can appear.
  return !normalizedName.startsWith("princess no's ") && !normalizedName.startsWith("astra ");
}

function sameJob(expected: string, actual: string) {
  const normalizedExpected = expected.trim().toLowerCase();
  const normalizedActual = actual.trim().toLowerCase();
  return normalizedExpected === normalizedActual
    || (normalizedExpected === "bowmaster" && normalizedActual === "bow master")
    || (normalizedExpected === "bow master" && normalizedActual === "bowmaster")
    || (normalizedExpected === "dual blade" && normalizedActual === "blade master")
    || (normalizedExpected === "blade master" && normalizedActual === "dual blade")
    || (normalizedExpected === "cannoneer" && normalizedActual === "cannon master")
    || (normalizedExpected === "cannon master" && normalizedActual === "cannoneer")
    || (normalizedExpected === "captain" && normalizedActual === "corsair")
    || (normalizedExpected === "corsair" && normalizedActual === "captain");
}

export function resolveEquipmentName(name: string, slot: EquipmentSlot, jobName: string) {
  const normalizedName = name.trim().toLowerCase();
  const jobGroup = equipmentJobGroup(jobName);
  if (!jobGroup) return name;
  if (normalizedName === "mitra's rage") return `Mitra's Rage: ${jobGroup}`;
  return CLASS_SET_NAMES[normalizedName]?.[jobGroup][slot] ?? name;
}
