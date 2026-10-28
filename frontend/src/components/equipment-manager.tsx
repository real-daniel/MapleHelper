"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { apiFetch } from "@/lib/api";
import { potentialLineOptions, supportsPotential } from "@/components/potential-lines";

export type EquipmentSlot =
  | "RING" | "PENDANT" | "WEAPON" | "SECONDARY" | "EMBLEM"
  | "HAT" | "FACE" | "EYE" | "EARRINGS" | "TOP" | "BOTTOM"
  | "SHOES" | "GLOVES" | "CAPE" | "BELT" | "SHOULDER" | "POCKET"
  | "BADGE" | "MEDAL" | "ANDROID" | "HEART" | "TOTEM";

export type EquipmentItem = {
  id: number;
  characterProfileId: number | null;
  slot: EquipmentSlot;
  slotIndex: number | null;
  name: string;
  levelRequirement: number | null;
  starForce: number | null;
  statLines: string;
  flameStats: string;
  flameScoreLines: string;
  potentialTier: string;
  potentialLines: string;
  bonusPotentialTier: string;
  bonusPotentialLines: string;
  rawExtractedText: string;
  createdAt: string;
  updatedAt: string;
};

type CatalogItem = {
  id: number;
  slot: string;
  name: string;
  levelRequirement: number | null;
  progressionStage: string | null;
  setName: string | null;
  jobGroup: string | null;
};

type SlotDefinition = {
  key: string;
  slot: EquipmentSlot;
  slotIndex: number | null;
  label: string;
  x: number;
  y: number;
};

type EquipmentDraft = Omit<EquipmentItem, "id" | "characterProfileId" | "createdAt" | "updatedAt">;

const SLOT_DEFINITIONS: SlotDefinition[] = [
  slot("ring-1", "RING", 1, "Ring 1", 24, 101), slot("face", "FACE", null, "Face", 69, 101), slot("hat", "HAT", null, "Hat", 250, 101), slot("cape", "CAPE", null, "Cape", 294, 101),
  slot("ring-2", "RING", 2, "Ring 2", 24, 146), slot("eye", "EYE", null, "Eye", 69, 146), slot("top", "TOP", null, "Top", 250, 146), slot("gloves", "GLOVES", null, "Gloves", 294, 146),
  slot("ring-3", "RING", 3, "Ring 3", 24, 190), slot("earrings", "EARRINGS", null, "Earrings", 69, 190), slot("bottom", "BOTTOM", null, "Bottom", 250, 190), slot("shoes", "SHOES", null, "Shoes", 294, 190),
  slot("ring-4", "RING", 4, "Ring 4", 24, 235), slot("pendant-1", "PENDANT", 1, "Pendant 1", 69, 235), slot("shoulder", "SHOULDER", null, "Shoulder", 250, 235), slot("medal", "MEDAL", null, "Medal", 294, 235),
  slot("belt", "BELT", null, "Belt", 24, 280), slot("pendant-2", "PENDANT", 2, "Pendant 2", 69, 280), slot("weapon", "WEAPON", null, "Weapon", 114, 280), slot("secondary", "SECONDARY", null, "Secondary", 159, 280),
  slot("emblem", "EMBLEM", null, "Emblem", 204, 280), slot("android", "ANDROID", null, "Android", 249, 280), slot("heart", "HEART", null, "Heart", 294, 280), slot("pocket", "POCKET", null, "Pocket", 24, 325), slot("badge", "BADGE", null, "Badge", 294, 325),
];

function slot(key: string, equipmentSlot: EquipmentSlot, slotIndex: number | null, label: string, x: number, y: number): SlotDefinition {
  return { key, slot: equipmentSlot, slotIndex, label, x, y };
}

export function EquipmentManager({
  profileId,
  characterName,
  characterImageUrl,
  equipment,
  onChange,
  onMessage,
}: {
  profileId: number;
  characterName: string;
  characterImageUrl: string | null;
  equipment: EquipmentItem[];
  onChange: (equipment: EquipmentItem[]) => void;
  onMessage: (message: string) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<SlotDefinition | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<EquipmentDraft | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);

  async function chooseSlot(definition: SlotDefinition) {
    setSelectedSlot(definition);
    onMessage("");
    const current = findEquipment(equipment, definition);
    setDraft(current ? fromItem(current) : emptyDraft(definition));
    setLoadingCatalog(true);
    try {
      const query = new URLSearchParams({ slot: definition.slot });
      if (definition.slotIndex != null) query.set("slotIndex", String(definition.slotIndex));
      const response = await apiFetch(`/api/v1/equipment/catalog?${query}`);
      const body = await readBody(response);
      if (!response.ok) throw new Error(responseMessage(body, "Could not load equipment catalog."));
      setCatalog(deduplicateCatalog(body as CatalogItem[]));
    } catch (error) {
      setCatalog([]);
      onMessage(error instanceof Error ? error.message : "Could not load equipment catalog.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  function update<Key extends keyof EquipmentDraft>(key: Key, value: EquipmentDraft[Key]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function chooseCatalogItem(name: string) {
    const item = catalog.find((candidate) => candidate.name === name);
    setDraft((current) => current ? {
      ...current,
      name,
      levelRequirement: item?.levelRequirement ?? current.levelRequirement,
    } : current);
  }

  function updateFlameStat(stat: string, value: string) {
    if (!draft) return;
    const values = parseFlameStats(draft.flameStats);
    if (value === "") values.delete(stat);
    else values.set(stat, Number(value));
    update("flameStats", formatFlameStats(values));
  }

  function updateDisplayedStat(stat: string, value: string) {
    if (!draft) return;
    const values = parseFlameStats(draft.statLines);
    if (value === "") values.delete(stat);
    else values.set(stat, Number(value));
    update("statLines", [...values].map(([name, amount]) => `${name}: +${amount}`).join("\n"));
  }

  function updatePotentialLine(index: number, value: string) {
    if (!draft) return;
    const lines = parsePotentialLines(draft.potentialLines);
    lines[index] = value;
    update("potentialLines", lines.filter(Boolean).join("\n"));
  }

  async function saveEquipment() {
    if (!selectedSlot || !draft || !draft.name.trim()) return;
    setSaving(true);
    onMessage("");
    try {
      const response = await apiFetch("/api/v1/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, characterProfileId: profileId, rawExtractedText: "" }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(responseMessage(body, "Equipment save failed."));
      const saved = body as EquipmentItem;
      onChange([...equipment.filter((item) => !samePosition(item, selectedSlot)), saved]);
      setDraft(fromItem(saved));
      onMessage(`Saved ${saved.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Equipment save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEquipment() {
    if (!selectedSlot) return;
    const current = findEquipment(equipment, selectedSlot);
    if (!current) return;
    setSaving(true);
    onMessage("");
    try {
      const response = await apiFetch(`/api/v1/equipment/${current.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await readBody(response);
        throw new Error(responseMessage(body, "Equipment delete failed."));
      }
      onChange(equipment.filter((item) => item.id !== current.id));
      setDraft(emptyDraft(selectedSlot));
      onMessage(`Removed ${current.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Equipment delete failed.");
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = selectedSlot ? findEquipment(equipment, selectedSlot) : null;

  return (
    <div className="equipment-manager">
      <section className="equipment-slots-panel">
        <div className="section-heading">
          <h2>Equipment</h2>
          <span className="muted">{equipment.length} / {SLOT_DEFINITIONS.length}</span>
        </div>
        <div className="equipment-slot-grid" aria-label="Equipment slots">
          <Image className="equipment-window-image" src="/equipment/equipment-inventory.png" alt="" width={363} height={442} priority />
          <div className="equipment-character">
            {characterImageUrl ? <Image src={characterImageUrl} alt={characterName} width={132} height={176} unoptimized /> : <span>{characterName.slice(0, 1)}</span>}
          </div>
          {SLOT_DEFINITIONS.map((definition) => {
            const item = findEquipment(equipment, definition);
            return (
              <button
                className={`equipment-slot equipment-slot-${definition.key}`}
                type="button"
                key={definition.key}
                title={item ? `${definition.label}: ${item.name}` : definition.label}
                aria-pressed={selectedSlot?.key === definition.key}
                aria-label={item ? `${definition.label}, ${item.name}` : `${definition.label}, empty`}
                onClick={() => void chooseSlot(definition)}
                style={{
                  "--slot-x": `${definition.x / 363 * 100}%`,
                  "--slot-y": `${definition.y / 442 * 100}%`,
                } as CSSProperties}
              >
                <span className="sr-only">{definition.label}</span>
                {item && <span className="equipment-slot-occupied" aria-hidden="true" />}
                {item?.starForce != null && <small>{item.starForce}★</small>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="equipment-editor" aria-live="polite">
        {!selectedSlot || !draft ? (
          <div className="empty-state"><h2>Select a slot</h2><p>Choose a slot to add or edit equipment.</p></div>
        ) : (
          <>
            <div className="section-heading">
              <h2>{selectedSlot.label}</h2>
              {selectedItem && <button className="text-button danger" type="button" disabled={saving} onClick={() => void removeEquipment()}>Remove</button>}
            </div>

            <div className="equipment-editor-fields">
              <label>Item
                <input list="equipment-catalog" value={draft.name} onChange={(event) => chooseCatalogItem(event.target.value)} placeholder={loadingCatalog ? "Loading…" : "Select or enter an item"} />
                <datalist id="equipment-catalog">{catalog.map((item) => <option key={item.id} value={item.name}>{item.levelRequirement ? `Lv. ${item.levelRequirement}` : ""}</option>)}</datalist>
              </label>

              <div className="field-grid">
                <label>Level<input type="number" min={0} max={300} value={draft.levelRequirement ?? ""} onChange={(event) => update("levelRequirement", nullableNumber(event.target.value))} /></label>
                <label>Star Force<input type="number" min={0} max={25} value={draft.starForce ?? ""} onChange={(event) => update("starForce", nullableNumber(event.target.value))} /></label>
              </div>

              <details open>
                <summary>Flame</summary>
                <div className="flame-field-grid">
                  {flameFields(draft.slot).map((field) => <label key={field.key}>{field.label}<input type="number" min={0} value={parseFlameStats(draft.flameStats).get(field.key) ?? ""} onChange={(event) => updateFlameStat(field.key, event.target.value)} /></label>)}
                </div>
              </details>

              {supportsPotential(draft.slot) && <details open>
                <summary>Potential</summary>
                <label>Tier<select value={draft.potentialTier} onChange={(event) => { update("potentialTier", event.target.value); update("potentialLines", ""); }}>{potentialTierOptions()}</select></label>
                <div className="potential-line-list">
                  {[0, 1, 2].map((index) => {
                    const current = parsePotentialLines(draft.potentialLines)[index] ?? "";
                    const options = potentialLineOptions(draft.slot, draft.potentialTier, index);
                    return <label key={index}>Line {index + 1}<select value={current} disabled={!draft.potentialTier} onChange={(event) => updatePotentialLine(index, event.target.value)}><option value="">None</option>{current && !options.includes(current) && <option value={current}>{current}</option>}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
                  })}
                </div>
              </details>}

              <details>
                <summary>Additional stats</summary>
                <div className="flame-field-grid">
                  {BASE_ITEM_STAT_FIELDS.map((field) => <label key={field.key}>{field.label}<input type="number" min={0} value={parseFlameStats(draft.statLines).get(field.key) ?? ""} onChange={(event) => updateDisplayedStat(field.key, event.target.value)} /></label>)}
                </div>
              </details>

              <button className="primary-button" type="button" disabled={saving || !draft.name.trim()} onClick={() => void saveEquipment()}>{saving ? "Saving…" : "Save equipment"}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function potentialTierOptions() {
  return <><option value="">None</option><option>Rare</option><option>Epic</option><option>Unique</option><option>Legendary</option></>;
}

const BASE_FLAME_FIELDS = [
  { key: "STR", label: "STR" },
  { key: "DEX", label: "DEX" },
  { key: "INT", label: "INT" },
  { key: "LUK", label: "LUK" },
  { key: "Max HP", label: "Max HP" },
  { key: "All Stat", label: "All Stat %" },
  { key: "Attack Power", label: "ATT" },
  { key: "Magic Attack", label: "M. ATT" },
];

const BASE_ITEM_STAT_FIELDS = BASE_FLAME_FIELDS.filter((field) => field.key !== "All Stat");

function flameFields(slot: EquipmentSlot) {
  return slot === "WEAPON"
    ? [...BASE_FLAME_FIELDS, { key: "Boss Damage", label: "Boss %" }, { key: "Damage", label: "Damage %" }]
    : BASE_FLAME_FIELDS;
}

function parseFlameStats(text: string) {
  const values = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(.+?):\s*\+?(-?\d+)/);
    if (match) values.set(match[1].trim(), Number(match[2]));
  }
  return values;
}

function formatFlameStats(values: Map<string, number>) {
  return [...values].map(([stat, value]) => `${stat}: +${value}${["All Stat", "Boss Damage", "Damage"].includes(stat) ? "%" : ""}`).join("\n");
}

function parsePotentialLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 3);
}

function emptyDraft(definition: SlotDefinition): EquipmentDraft {
  return {
    slot: definition.slot,
    slotIndex: definition.slotIndex,
    name: "",
    levelRequirement: null,
    starForce: null,
    statLines: "",
    flameStats: "",
    flameScoreLines: "",
    potentialTier: "",
    potentialLines: "",
    bonusPotentialTier: "",
    bonusPotentialLines: "",
    rawExtractedText: "",
  };
}

function fromItem(item: EquipmentItem): EquipmentDraft {
  return {
    slot: item.slot,
    slotIndex: item.slotIndex,
    name: item.name,
    levelRequirement: item.levelRequirement,
    starForce: item.starForce,
    statLines: item.statLines,
    flameStats: item.flameStats,
    flameScoreLines: item.flameScoreLines,
    potentialTier: item.potentialTier,
    potentialLines: item.potentialLines,
    bonusPotentialTier: item.bonusPotentialTier,
    bonusPotentialLines: item.bonusPotentialLines,
    rawExtractedText: item.rawExtractedText,
  };
}

function findEquipment(equipment: EquipmentItem[], definition: SlotDefinition) {
  return equipment.find((item) => samePosition(item, definition)) ?? null;
}

function samePosition(item: Pick<EquipmentItem, "slot" | "slotIndex">, definition: SlotDefinition) {
  return item.slot === definition.slot && (item.slotIndex ?? null) === definition.slotIndex;
}

function deduplicateCatalog(items: CatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown> | unknown[];
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${response.status}).`);
  }
}

function responseMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && !Array.isArray(body) && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return fallback;
}
