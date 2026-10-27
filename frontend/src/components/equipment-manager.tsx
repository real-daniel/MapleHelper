"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

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
};

type EquipmentDraft = Omit<EquipmentItem, "id" | "characterProfileId" | "createdAt" | "updatedAt">;

const SLOT_DEFINITIONS: SlotDefinition[] = [
  slot("ring-1", "RING", 1, "Ring 1"), slot("face", "FACE", null, "Face"), slot("hat", "HAT", null, "Hat"), slot("cape", "CAPE", null, "Cape"), slot("ring-2", "RING", 2, "Ring 2"),
  slot("ring-3", "RING", 3, "Ring 3"), slot("eye", "EYE", null, "Eye"), slot("top", "TOP", null, "Top"), slot("gloves", "GLOVES", null, "Gloves"), slot("ring-4", "RING", 4, "Ring 4"),
  slot("pendant-1", "PENDANT", 1, "Pendant 1"), slot("earrings", "EARRINGS", null, "Earrings"), slot("bottom", "BOTTOM", null, "Bottom"), slot("shoes", "SHOES", null, "Shoes"), slot("pendant-2", "PENDANT", 2, "Pendant 2"),
  slot("belt", "BELT", null, "Belt"), slot("shoulder", "SHOULDER", null, "Shoulder"), slot("weapon", "WEAPON", null, "Weapon"), slot("secondary", "SECONDARY", null, "Secondary"), slot("emblem", "EMBLEM", null, "Emblem"),
  slot("pocket", "POCKET", null, "Pocket"), slot("badge", "BADGE", null, "Badge"), slot("medal", "MEDAL", null, "Medal"), slot("android", "ANDROID", null, "Android"), slot("heart", "HEART", null, "Heart"),
  slot("totem-1", "TOTEM", 1, "Totem 1"), slot("totem-2", "TOTEM", 2, "Totem 2"), slot("totem-3", "TOTEM", 3, "Totem 3"),
];

function slot(key: string, equipmentSlot: EquipmentSlot, slotIndex: number | null, label: string): SlotDefinition {
  return { key, slot: equipmentSlot, slotIndex, label };
}

export function EquipmentManager({
  profileId,
  equipment,
  onChange,
  onMessage,
}: {
  profileId: number;
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
          {SLOT_DEFINITIONS.map((definition) => {
            const item = findEquipment(equipment, definition);
            return (
              <button
                className="equipment-slot"
                type="button"
                key={definition.key}
                aria-pressed={selectedSlot?.key === definition.key}
                onClick={() => void chooseSlot(definition)}
              >
                <span>{definition.label}</span>
                <strong>{item?.name ?? "Empty"}</strong>
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
                <label>Bonus stats<textarea value={draft.flameStats} onChange={(event) => update("flameStats", event.target.value)} placeholder="STR: +40&#10;All Stat: +6%" /></label>
              </details>

              <details open>
                <summary>Potential</summary>
                <label>Tier<select value={draft.potentialTier} onChange={(event) => update("potentialTier", event.target.value)}>{potentialTierOptions()}</select></label>
                <label>Lines<textarea value={draft.potentialLines} onChange={(event) => update("potentialLines", event.target.value)} placeholder="STR: +12%" /></label>
              </details>

              <details>
                <summary>Bonus potential</summary>
                <label>Tier<select value={draft.bonusPotentialTier} onChange={(event) => update("bonusPotentialTier", event.target.value)}>{potentialTierOptions()}</select></label>
                <label>Lines<textarea value={draft.bonusPotentialLines} onChange={(event) => update("bonusPotentialLines", event.target.value)} /></label>
              </details>

              <details>
                <summary>Additional stats</summary>
                <label>Displayed stats<textarea value={draft.statLines} onChange={(event) => update("statLines", event.target.value)} /></label>
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
