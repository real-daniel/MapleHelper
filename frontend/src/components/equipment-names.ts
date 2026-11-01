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

export function resolveEquipmentName(name: string, slot: EquipmentSlot, jobName: string) {
  const normalizedName = name.trim().toLowerCase();
  const jobGroup = equipmentJobGroup(jobName);
  if (!jobGroup) return name;
  if (normalizedName === "mitra's rage") return `Mitra's Rage: ${jobGroup}`;
  return CLASS_SET_NAMES[normalizedName]?.[jobGroup][slot] ?? name;
}
