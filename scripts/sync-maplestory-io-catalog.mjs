import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUTPUT = resolve(process.argv[2] ?? "migrations/0010_maplestory_io_catalog_sync.sql");
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const dbOutput = execFileSync(process.execPath, [
  wrangler, "d1", "execute", "maplehelper", "--local", "--json",
  "--command", "SELECT id,slot,name,level_requirement,set_name,family_key,variant_group,job_group,name_pattern,base_stats,star_force_profile FROM equipment_catalog_items ORDER BY id",
], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
const catalog = JSON.parse(dbOutput)[0].results;

const versions = await json("https://maplestory.io/api/wz");
const version = versions
  .filter((item) => item.region === "GMS" && item.isReady && item.hasImages && /^\d+$/.test(item.mapleVersionId))
  .sort((left, right) => Number(right.mapleVersionId) - Number(left.mapleVersionId))[0]?.mapleVersionId;
if (!version) throw new Error("MapleStory.io has no ready GMS dataset.");

const api = `https://maplestory.io/api/GMS/${version}/item`;
const searchCache = new Map();
const detailCache = new Map();
const search = async (query) => {
  if (!searchCache.has(query)) {
    const url = `${api}?${new URLSearchParams({ searchFor: query, count: "400" })}`;
    searchCache.set(query, await json(url));
  }
  return searchCache.get(query);
};
const detail = async (id) => {
  if (!detailCache.has(id)) detailCache.set(id, await json(`${api}/${id}`));
  return detailCache.get(id);
};

const exactRows = catalog.filter((row) => !row.name_pattern);
const resolvedExact = [];
const unresolved = [];
const exactAliases = new Map([
  ["Superior Gollux Pendant", { id: 1122267, name: "Superior Engraved Gollux Pendant" }],
  ["Superior Gollux Belt", { id: 1132246, name: "Superior Engraved Gollux Belt" }],
  ["Mitra's Rage: Warrior", { id: 1190555, name: "Mitra's Rage: Warrior" }],
  ["Mitra's Rage: Bowman", { id: 1190556, name: "Mitra's Rage: Bowman" }],
  ["Mitra's Rage: Magician", { id: 1190557, name: "Mitra's Rage: Magician" }],
  ["Mitra's Rage: Thief", { id: 1190558, name: "Mitra's Rage: Thief" }],
  ["Mitra's Rage: Pirate", { id: 1190559, name: "Mitra's Rage: Pirate" }],
  ["7 Day Monster Parker", { id: 1142922, name: "Seven Day Monster Parker" }],
  ["7 Day Badge", { id: 1182200, name: "Seven Days Badge", allowExistingStats: true }],
]);
for (const row of exactRows) {
  const alias = exactAliases.get(row.name);
  if (alias) {
    try {
      const value = await detail(alias.id);
      resolvedExact.push({ row, item: { id: alias.id, name: alias.name }, detail: value });
    } catch {
      if (!alias.allowExistingStats || !row.base_stats) unresolved.push(`${row.slot}: ${row.name} (Maple item ${alias.id} detail unavailable)`);
      else resolvedExact.push({ row, item: { id: alias.id, name: alias.name }, detail: { metaInfo: { reqLevel: row.level_requirement }, description: { name: alias.name } }, baseStats: JSON.parse(row.base_stats), usedFallback: true });
    }
    continue;
  }
  const matches = (await search(row.name))
    .filter((item) => item.name?.toLowerCase() === row.name.toLowerCase())
    .filter((item) => item.typeInfo?.overallCategory === "Equip" && !item.isCash)
    .filter((item) => row.level_requirement == null || item.requiredLevel === row.level_requirement)
    .filter((item) => slotMatches(row.slot, item));
  const match = await resolveCandidate(matches, `${row.slot}: ${row.name} (Lv. ${row.level_requirement ?? "?"})`);
  if (match) resolvedExact.push({ row, ...match });
}

const expansions = [];
const addExactNames = async (slot, names, metadata) => {
  for (const name of names) {
    const items = (await search(name)).filter((item) => item.name?.toLowerCase() === name.toLowerCase());
    const candidates = uniqueBy(items, (item) => item.id)
      .filter((item) => item.typeInfo?.overallCategory === "Equip" && !item.isCash)
      .filter((item) => slotMatches(slot, item));
    const match = await resolveCandidate(candidates, `${slot}: ${name}`);
    if (match) expansions.push({ slot, ...match, ...metadata });
  }
};

const groups = ["Knight", "Mage", "Archer", "Thief", "Pirate"];
const jobs = ["Warrior", "Magician", "Bowman", "Thief", "Pirate"];
await addExactNames("HAT", ["Royal Warrior Helm", "Royal Dunwitch Hat", "Royal Ranger Beret", "Royal Assassin Hood", "Royal Wanderer Hat"], family("Root Abyss", "ROOT_ABYSS"));
await addExactNames("TOP", ["Eagle Eye Warrior Armor", "Eagle Eye Dunwitch Robe", "Eagle Eye Ranger Cowl", "Eagle Eye Assassin Shirt", "Eagle Eye Wanderer Coat"], family("Root Abyss", "ROOT_ABYSS"));
await addExactNames("BOTTOM", ["Trixter Warrior Pants", "Trixter Dunwitch Pants", "Trixter Ranger Pants", "Trixter Assassin Pants", "Trixter Wanderer Pants"], family("Root Abyss", "ROOT_ABYSS"));

const absoGroups = ["Knight", "Mage", "Archer", "Bandit", "Pirate"];
for (const [slot, piece] of [["SHOES", "Shoes"], ["GLOVES", "Gloves"], ["CAPE", "Cape"], ["SHOULDER", "Shoulder"]]) {
  await addExactNames(slot, absoGroups.map((group) => `AbsoLab ${group} ${piece}`), family("Absolab", "ABSOLAB"));
}
for (const [slot, piece] of [["SHOES", "Shoes"], ["GLOVES", "Gloves"], ["CAPE", "Cape"], ["SHOULDER", "Shoulder"]]) {
  await addExactNames(slot, groups.map((group) => `Arcane Umbra ${group} ${piece}`), family("Arcane Umbra", "ARCANE_UMBRA"));
}

const eternalNames = {
  HAT: ["Eternal Knight Helm", "Eternal Mage Hat", "Eternal Archer Hat", "Eternal Thief Bandana", "Eternal Pirate Hat"],
  TOP: ["Eternal Knight Armor", "Eternal Mage Robe", "Eternal Archer Hood", "Eternal Thief Shirt", "Eternal Pirate Coat"],
  BOTTOM: groups.map((group) => `Eternal ${group} Pants`),
  SHOES: groups.map((group) => `Eternal ${group} Shoes`),
  GLOVES: groups.map((group) => `Eternal ${group} Gloves`),
  CAPE: groups.map((group) => `Eternal ${group} Cape`),
  SHOULDER: groups.map((group) => `Eternal ${group} Shoulder`),
};
for (const [slot, names] of Object.entries(eternalNames)) await addExactNames(slot, names, family("Eternal", "ETERNAL"));

for (const [query, level, setName, familyKey] of [
  ["Fafnir", 150, "Root Abyss", "ROOT_ABYSS"],
  ["AbsoLab", 160, "Absolab", "ABSOLAB"],
  ["Arcane Umbra", 200, "Arcane Umbra", "ARCANE_UMBRA"],
  ["Genesis", 200, "Genesis", null],
  ["Destiny", 250, "Eternal", "ETERNAL"],
]) {
  const items = (await search(query))
    .filter((item) => item.requiredLevel === level && item.typeInfo?.overallCategory === "Equip" && !item.isCash)
    .filter((item) => item.typeInfo?.category?.endsWith("Weapon"))
    .filter((item) => !item.name.startsWith("Sealed "));
  for (const [name, candidates] of groupBy(items, (item) => item.name.toLowerCase())) {
    const match = await resolveCandidate(candidates, `WEAPON: ${name}`);
    if (match) expansions.push({ slot: "WEAPON", ...match, setName, familyKey, variantGroup: "EXACT" });
  }
}

for (const [query, level] of [["Princess No", 140], ["Astra", 200]]) {
  const items = (await search(query))
    .filter((item) => item.requiredLevel === level && item.typeInfo?.overallCategory === "Equip" && !item.isCash)
    .filter((item) => item.typeInfo?.category === "Secondary Weapon" || item.typeInfo?.subCategory === "Shield" || item.typeInfo?.subCategory === "Katara");
  for (const [name, candidates] of groupBy(items, (item) => item.name.toLowerCase())) {
    const match = await resolveCandidate(candidates, `SECONDARY: ${name}`);
    if (match) expansions.push({ slot: "SECONDARY", ...match, setName: null, familyKey: null, variantGroup: "EXACT" });
  }
}

if (unresolved.length) throw new Error(`Unresolved MapleStory.io items:\n${unresolved.join("\n")}`);

const statements = [
  "DROP INDEX IF EXISTS equipment_catalog_maple_item_uq;",
  "CREATE INDEX IF NOT EXISTS equipment_catalog_maple_item_idx ON equipment_catalog_items(maple_item_id);",
];
for (const { row, item, detail: value, baseStats, usedFallback } of resolvedExact) {
  const canonicalName = value.description?.name ?? item.name ?? row.name;
  const note = usedFallback
    ? `MapleStory.io GMS v${version} item ID verified; detail endpoint unavailable, retained previously verified base stats.`
    : `Base stats synced from MapleStory.io GMS v${version}.`;
  statements.push(`UPDATE equipment_catalog_items SET name=${sql(canonicalName)}, maple_item_id=${item.id}, base_stats=${sql(JSON.stringify(baseStats ?? stats(value.metaInfo)))}, level_requirement=${numberOrNull(value.metaInfo?.reqLevel ?? item.requiredLevel ?? row.level_requirement)}, notes=${sql(note)} WHERE id=${row.id};`);
}

const uniqueExpansions = uniqueBy(expansions, (entry) => `${entry.slot}:${entry.item.name.toLowerCase()}`);
for (const entry of uniqueExpansions) {
  const jobGroup = singleJobGroup(entry.item.requiredJobs);
  statements.push(`INSERT INTO equipment_catalog_items (slot,name,level_requirement,progression_stage,set_name,family_key,variant_group,job_group,name_pattern,base_stats,star_force_profile,notes,maple_item_id) VALUES (${[
    sql(entry.slot), sql(entry.item.name), numberOrNull(entry.detail.metaInfo?.reqLevel ?? entry.item.requiredLevel), "NULL", sql(entry.setName), sql(entry.familyKey), sql(entry.variantGroup ?? "EXACT"), sql(jobGroup), "0", sql(JSON.stringify(stats(entry.detail.metaInfo))), sql(entry.slot === "WEAPON" ? "WEAPON" : entry.slot === "SECONDARY" ? "NONE" : "ARMOR_ACCESSORY"), sql(`Base stats synced from MapleStory.io GMS v${version}.`), entry.item.id,
  ].join(",")}) ON CONFLICT(slot,name) DO UPDATE SET level_requirement=excluded.level_requirement,set_name=excluded.set_name,family_key=excluded.family_key,variant_group=excluded.variant_group,job_group=excluded.job_group,name_pattern=0,base_stats=excluded.base_stats,star_force_profile=excluded.star_force_profile,notes=excluded.notes,maple_item_id=excluded.maple_item_id;`);
}
statements.push("DELETE FROM equipment_catalog_items WHERE name_pattern=1;");
statements.push(`-- Generated from MapleStory.io GMS v${version}: ${resolvedExact.length} existing records refreshed, ${uniqueExpansions.length} exact variants imported.`);
writeFileSync(OUTPUT, `${statements.join("\n\n")}\n`);
process.stdout.write(`Generated ${OUTPUT}\nGMS version: ${version}\nRefreshed: ${resolvedExact.length}\nImported variants: ${uniqueExpansions.length}\n`);

function family(setName, familyKey) { return { setName, familyKey, variantGroup: "EXACT" }; }
function uniqueBy(items, key) { return [...new Map(items.map((item) => [key(item), item])).values()]; }
function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}
async function resolveCandidate(items, label) {
  for (const item of uniqueBy(items, (candidate) => candidate.id).sort((left, right) => left.id - right.id)) {
    try {
      const value = await detail(item.id);
      if (value.metaInfo) return { item, detail: value };
    } catch { /* Try the next duplicate ID. */ }
  }
  unresolved.push(`${label} (no usable detail record)`);
  return null;
}
function numberOrNull(value) { return Number.isFinite(value) ? String(value) : "NULL"; }
function sql(value) { return value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`; }
function singleJobGroup(values) {
  const matches = (values ?? []).filter((value) => ["Warrior", "Magician", "Bowman", "Thief", "Pirate"].includes(value));
  return matches.length === 1 ? matches[0] : null;
}
function slotMatches(slotValue, item) {
  const slot = slotValue.replace(/_(?:1|2|3|4)$/, "");
  const category = item.typeInfo?.category ?? "";
  const sub = item.typeInfo?.subCategory ?? "";
  const expected = {
    RING: ["Ring"], PENDANT: ["Pendant"], HAT: ["Hat"], FACE: ["Face Accessory"], EYE: ["Eye Decoration"],
    EARRINGS: ["Earrings"], TOP: ["Top", "Overall"], BOTTOM: ["Bottom"], SHOES: ["Shoes"], GLOVES: ["Glove"],
    CAPE: ["Cape"], BELT: ["Belt"], SHOULDER: ["Shoulder Accessory"], POCKET: ["Pocket Item"], BADGE: ["Badge"],
    MEDAL: ["Medal"], ANDROID: ["Android"], HEART: ["Mechanical Heart"], TOTEM: ["Totem"], EMBLEM: ["Emblem"],
  };
  if (slot === "WEAPON") return category.endsWith("Weapon") && category !== "Secondary Weapon";
  if (slot === "SECONDARY") return category === "Secondary Weapon" || sub === "Shield" || sub === "Katara";
  return expected[slot]?.includes(sub) ?? true;
}
function stats(meta = {}) {
  const fields = [
    ["STR", "incSTR"], ["DEX", "incDEX"], ["INT", "incINT"], ["LUK", "incLUK"],
    ["Max HP", "incMHP"], ["Max MP", "incMMP"], ["Attack Power", "incPAD"], ["Magic Attack", "incMAD"],
    ["Defense", "incPDD"], ["Speed", "incSpeed"], ["Jump", "incJump"], ["Boss Damage", "bdR"],
    ["Enemy Defense Ignored", "imdR"], ["All Stats", "incAllStat"],
  ];
  return Object.fromEntries(fields.flatMap(([label, key]) => typeof meta[key] === "number" && meta[key] !== 0 ? [[label, meta[key]]] : []));
}
async function json(url) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (response.ok) return response.json();
    lastStatus = response.status;
    if (response.status < 500) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 200));
  }
  throw new Error(`${url} returned HTTP ${lastStatus}`);
}
