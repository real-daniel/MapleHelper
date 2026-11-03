"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { apiFetch } from "@/lib/api";
import { potentialLineOptions, supportsPotential } from "@/components/potential-lines";
import {
  BLACK_HEART_POTENTIAL_LINES, BLACK_HEART_POTENTIAL_TIER, BLACK_HEART_STAR_FORCE,
  isAstraSecondary, isBlackHeart, itemStarForceCap, supportsFlames, supportsItemPotential, type AstraStage,
} from "@/components/equipment-rules";
import { equipmentJobGroups, isEquipmentJobGroupCompatible, isEquipmentSubclassCompatible, resolveEquipmentName } from "@/components/equipment-names";
import { equipmentTooltipStatRows, starForceRows, type TooltipStatComponent } from "@/components/equipment-tooltip-stats";

export type EquipmentSlot =
  | "RING" | "PENDANT" | "WEAPON" | "SECONDARY" | "EMBLEM"
  | "HAT" | "FACE" | "EYE" | "EARRINGS" | "TOP" | "BOTTOM"
  | "SHOES" | "GLOVES" | "CAPE" | "BELT" | "SHOULDER" | "POCKET"
  | "BADGE" | "MEDAL" | "ANDROID" | "HEART" | "TOTEM";

export type EquipmentItem = {
  id: number;
  characterProfileId: number | null;
  catalogItemId: number | null;
  presetNumber: number;
  slot: EquipmentSlot;
  slotIndex: number | null;
  name: string;
  levelRequirement: number | null;
  starForce: number | null;
  astraStage: AstraStage | null;
  statLines: string;
  flameStats: string;
  flameScoreLines: string;
  potentialTier: string;
  potentialLines: string;
  bonusPotentialTier: string;
  bonusPotentialLines: string;
  rawExtractedText: string;
  catalogBaseStats: Record<string, number> | null;
  catalogStarForceProfile: string | null;
  catalogSetName: string | null;
  catalogMapleItemId: number | null;
  createdAt: string;
  updatedAt: string;
};

type CatalogItem = {
  id: number;
  mapleItemId: number | null;
  slot: string;
  name: string;
  levelRequirement: number | null;
  progressionStage: string | null;
  setName: string | null;
  jobGroup: string | null;
  namePattern: boolean;
  starForceProfile: string | null;
  baseStats: Record<string, number> | null;
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

type EquipmentTooltipState = {
  item: EquipmentItem;
  label: string;
  anchor: HTMLButtonElement;
};

const SLOT_DEFINITIONS: SlotDefinition[] = [
  slot("ring-1", "RING", 1, "Ring 1", 24, 101), slot("face", "FACE", null, "Face", 69, 101), slot("hat", "HAT", null, "Hat", 250, 101), slot("cape", "CAPE", null, "Cape", 294, 101),
  slot("ring-2", "RING", 2, "Ring 2", 24, 146), slot("eye", "EYE", null, "Eye", 69, 146), slot("top", "TOP", null, "Top", 250, 146), slot("gloves", "GLOVES", null, "Gloves", 294, 146),
  slot("ring-3", "RING", 3, "Ring 3", 24, 190), slot("earrings", "EARRINGS", null, "Earrings", 69, 190), slot("bottom", "BOTTOM", null, "Bottom", 250, 190), slot("shoes", "SHOES", null, "Shoes", 294, 190),
  slot("ring-4", "RING", 4, "Ring 4", 24, 235), slot("pendant-1", "PENDANT", 1, "Pendant 1", 69, 235), slot("shoulder", "SHOULDER", null, "Shoulder", 250, 235), slot("medal", "MEDAL", null, "Medal", 294, 235),
  slot("belt", "BELT", null, "Belt", 24, 280), slot("pendant-2", "PENDANT", 2, "Pendant 2", 69, 280), slot("weapon", "WEAPON", null, "Weapon", 114, 280), slot("secondary", "SECONDARY", null, "Secondary", 159, 280),
  slot("emblem", "EMBLEM", null, "Emblem", 204, 280), slot("android", "ANDROID", null, "Android", 249, 280), slot("heart", "HEART", null, "Heart", 294, 280), slot("pocket", "POCKET", null, "Pocket", 24, 325), slot("badge", "BADGE", null, "Badge", 294, 325),
];

const EQUIPMENT_CROP = { x: 15, y: 92, width: 329, height: 316 };

function slot(key: string, equipmentSlot: EquipmentSlot, slotIndex: number | null, label: string, x: number, y: number): SlotDefinition {
  return { key, slot: equipmentSlot, slotIndex, label, x, y };
}

export function EquipmentManager({
  profileId,
  characterName,
  characterJob,
  characterImageUrl,
  equipment,
  activePreset,
  onPresetChange,
  onChange,
  onMessage,
}: {
  profileId: number;
  characterName: string;
  characterJob: string;
  characterImageUrl: string | null;
  equipment: EquipmentItem[];
  activePreset: number;
  onPresetChange: (preset: number) => void;
  onChange: (equipment: EquipmentItem[]) => void;
  onMessage: (message: string) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<SlotDefinition | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<EquipmentDraft | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [equipmentTooltip, setEquipmentTooltip] = useState<EquipmentTooltipState | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!equipmentTooltip || !tooltipRef.current) return;

    const positionTooltip = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      const anchor = equipmentTooltip.anchor.getBoundingClientRect();
      const gap = 12;
      const edge = 12;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const roomOnRight = window.innerWidth - anchor.right;
      const preferredLeft = roomOnRight >= width + gap
        ? anchor.right + gap
        : anchor.left - width - gap;
      setTooltipPosition({
        left: Math.max(edge, Math.min(preferredLeft, window.innerWidth - width - edge)),
        top: Math.max(edge, Math.min(anchor.top - 36, window.innerHeight - height - edge)),
      });
    };

    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [equipmentTooltip]);

  function showEquipmentTooltip(item: EquipmentItem, label: string, anchor: HTMLButtonElement) {
    setTooltipPosition(null);
    setEquipmentTooltip({ item, label, anchor });
  }

  function hideEquipmentTooltip() {
    setEquipmentTooltip(null);
    setTooltipPosition(null);
  }

  async function chooseSlot(definition: SlotDefinition) {
    setSelectedSlot(definition);
    onMessage("");
    const current = findEquipment(equipment, definition, activePreset);
    setDraft(current ? { ...fromItem(current), name: resolveEquipmentName(current.name, current.slot, characterJob) } : emptyDraft(definition, activePreset));
    setLoadingCatalog(true);
    try {
      const query = new URLSearchParams({ slot: definition.slot });
      if (definition.slotIndex != null) query.set("slotIndex", String(definition.slotIndex));
      const jobGroups = equipmentJobGroups(characterJob);
      if (jobGroups.length) query.set("jobGroup", jobGroups.join(","));
      const response = await apiFetch(`/api/v1/equipment/catalog?${query}`);
      const body = await readBody(response);
      if (!response.ok) throw new Error(responseMessage(body, "Could not load equipment catalog."));
      const loadedCatalog = deduplicateCatalog(body as CatalogItem[], definition.slot, characterJob);
      setCatalog(loadedCatalog);
      setDraft((currentDraft) => {
        if (!currentDraft || currentDraft.catalogItemId != null) return currentDraft;
        const match = findCatalogItem(loadedCatalog, currentDraft.name, currentDraft.slot, characterJob);
        return match ? { ...currentDraft, catalogItemId: match.id } : currentDraft;
      });
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
    setDraft((current) => {
      if (!current) return current;
      const item = findCatalogItem(catalog, name, current.slot, characterJob);
      const resolvedName = resolveEquipmentName(name, current.slot, characterJob);
      const levelRequirement = name ? item?.levelRequirement ?? current.levelRequirement : null;
      const astraStage = isAstraSecondary(current.slot, resolvedName) ? current.astraStage ?? 1 : null;
      const cap = itemStarForceCap(current.slot, resolvedName, levelRequirement, item?.starForceProfile, astraStage, characterJob);
      const blackHeart = isBlackHeart(current.slot, resolvedName);
      return {
        ...current,
        catalogItemId: item?.id ?? null,
        name: resolvedName,
        levelRequirement,
        astraStage,
        starForce: blackHeart ? BLACK_HEART_STAR_FORCE : current.starForce != null && current.starForce > cap ? cap : current.starForce,
        flameStats: supportsFlames(current.slot, resolvedName) ? current.flameStats : "",
        flameScoreLines: supportsFlames(current.slot, resolvedName) ? current.flameScoreLines : "",
        potentialTier: blackHeart ? BLACK_HEART_POTENTIAL_TIER : supportsItemPotential(current.slot, resolvedName) ? current.potentialTier : "",
        potentialLines: blackHeart ? BLACK_HEART_POTENTIAL_LINES : supportsItemPotential(current.slot, resolvedName) ? current.potentialLines : "",
      };
    });
  }

  function updateAstraStage(value: string) {
    const stage = Number(value) as AstraStage;
    setDraft((current) => {
      if (!current) return current;
      const cap = itemStarForceCap(current.slot, current.name, current.levelRequirement, "NONE", stage, characterJob);
      return { ...current, astraStage: stage, starForce: current.starForce != null && current.starForce > cap ? cap : current.starForce };
    });
  }

  function updateLevel(value: string) {
    const levelRequirement = nullableNumber(value);
    setDraft((current) => {
      if (!current) return current;
      const item = findCatalogItem(catalog, current.name, current.slot, characterJob);
      const cap = itemStarForceCap(current.slot, current.name, levelRequirement, item?.starForceProfile, current.astraStage, characterJob);
      return { ...current, levelRequirement, starForce: current.starForce != null && current.starForce > cap ? cap : current.starForce };
    });
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
      const payload = {
        ...draft,
        starForce: isBlackHeart(draft.slot, draft.name) ? BLACK_HEART_STAR_FORCE : starForceCap > 0 ? draft.starForce : null,
        flameStats: supportsFlames(draft.slot, draft.name) ? draft.flameStats : "",
        flameScoreLines: supportsFlames(draft.slot, draft.name) ? draft.flameScoreLines : "",
        potentialTier: isBlackHeart(draft.slot, draft.name) ? BLACK_HEART_POTENTIAL_TIER : supportsItemPotential(draft.slot, draft.name) ? draft.potentialTier : "",
        potentialLines: isBlackHeart(draft.slot, draft.name) ? BLACK_HEART_POTENTIAL_LINES : supportsItemPotential(draft.slot, draft.name) ? draft.potentialLines : "",
        characterProfileId: profileId,
        rawExtractedText: "",
      };
      const response = await apiFetch("/api/v1/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(responseMessage(body, "Equipment save failed."));
      const saved = normalizeEquipmentItem(body as EquipmentItem);
      onChange([...equipment.filter((item) => !samePosition(item, selectedSlot, activePreset)), saved]);
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
    const current = findEquipment(equipment, selectedSlot, activePreset);
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
      setDraft(emptyDraft(selectedSlot, activePreset));
      onMessage(`Removed ${current.name}.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Equipment delete failed.");
    } finally {
      setSaving(false);
    }
  }

  function selectPreset(preset: number) {
    onPresetChange(preset);
    if (!selectedSlot) return;
    const current = findEquipment(equipment, selectedSlot, preset);
    setDraft(current ? { ...fromItem(current), name: resolveEquipmentName(current.name, current.slot, characterJob) } : emptyDraft(selectedSlot, preset));
  }

  const activeEquipment = equipment.filter((item) => (item.presetNumber ?? 1) === activePreset);
  const selectedItem = selectedSlot ? findEquipment(equipment, selectedSlot, activePreset) : null;
  const selectedCatalogItem = draft ? catalog.find((item) => item.id === draft.catalogItemId)
    ?? findCatalogItem(catalog, draft.name, draft.slot, characterJob)
    : null;
  const starForceCap = draft
    ? itemStarForceCap(draft.slot, draft.name, draft.levelRequirement, selectedCatalogItem?.starForceProfile, draft.astraStage, characterJob)
    : 0;

  return (
    <div className="equipment-manager">
      <section className="equipment-slots-panel">
        <div className="section-heading">
          <h2>Equipment</h2>
          <span className="muted">Preset {activePreset} · {activeEquipment.length} / {SLOT_DEFINITIONS.length}</span>
        </div>
        <div className="equipment-slot-grid" aria-label="Equipment slots">
          <Image className="equipment-window-image" src="/equipment/equipment-inventory.png" alt="" width={363} height={442} priority />
          <div className="equipment-character">
            {characterImageUrl ? <Image src={characterImageUrl} alt={characterName} width={132} height={176} unoptimized /> : <span>{characterName.slice(0, 1)}</span>}
          </div>
          {SLOT_DEFINITIONS.map((definition) => {
            const item = findEquipment(equipment, definition, activePreset);
            const displayItem = item ? { ...item, name: resolveEquipmentName(item.name, item.slot, characterJob) } : null;
            return (
              <button
                className={`equipment-slot equipment-slot-${definition.key}`}
                type="button"
                key={definition.key}
                title={item ? undefined : definition.label}
                aria-pressed={selectedSlot?.key === definition.key}
                aria-label={displayItem ? `${definition.label}, ${displayItem.name}` : `${definition.label}, empty`}
                aria-describedby={item ? "equipment-tooltip" : undefined}
                onMouseEnter={(event) => displayItem && showEquipmentTooltip(displayItem, definition.label, event.currentTarget)}
                onMouseLeave={hideEquipmentTooltip}
                onFocus={(event) => displayItem && showEquipmentTooltip(displayItem, definition.label, event.currentTarget)}
                onBlur={hideEquipmentTooltip}
                onClick={() => void chooseSlot(definition)}
                style={{
                  "--slot-x": `${(definition.x - EQUIPMENT_CROP.x) / EQUIPMENT_CROP.width * 100}%`,
                  "--slot-y": `${(definition.y - EQUIPMENT_CROP.y) / EQUIPMENT_CROP.height * 100}%`,
                } as CSSProperties}
              >
                <span className="sr-only">{definition.label}</span>
                {displayItem && (
                  <span
                    className="equipment-slot-icon"
                    aria-hidden="true"
                    style={{ backgroundImage: `url("${equipmentIconUrl(displayItem)}")` }}
                  />
                )}
                {item?.starForce != null && <small>{item.starForce}★</small>}
              </button>
            );
          })}
          <span className="equipment-apply-mask" aria-hidden="true" />
          <div className="equipment-preset-controls" aria-label="Equipment preset">
            {[1, 2, 3].map((preset) => <button key={preset} type="button" aria-label={`Equipment preset ${preset}`} aria-pressed={activePreset === preset} onClick={() => selectPreset(preset)}>{preset}</button>)}
          </div>
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
                <select value={draft.name} disabled={loadingCatalog} onChange={(event) => chooseCatalogItem(event.target.value)}>
                  <option value="">{loadingCatalog ? "Loading equipment…" : "Select equipment"}</option>
                  {draft.name && !findCatalogItem(catalog, draft.name, draft.slot, characterJob) && <option value={draft.name}>{draft.name}</option>}
                  {catalog.map((item) => {
                    const displayName = resolveEquipmentName(item.name, draft.slot, characterJob);
                    return <option key={item.id} value={displayName}>{displayName}{item.levelRequirement ? ` · Lv. ${item.levelRequirement}` : ""}</option>;
                  })}
                </select>
              </label>

              <div className="field-grid">
                <label>Original level<input type="number" min={0} max={300} value={draft.levelRequirement ?? ""} onChange={(event) => updateLevel(event.target.value)} /></label>
                {starForceCap > 0 && <label>Star Force<input type="number" min={0} max={starForceCap} disabled={isBlackHeart(draft.slot, draft.name)} value={isBlackHeart(draft.slot, draft.name) ? BLACK_HEART_STAR_FORCE : draft.starForce ?? ""} onChange={(event) => update("starForce", nullableNumber(event.target.value))} /></label>}
              </div>

              {isAstraSecondary(draft.slot, draft.name) && <label>Astra phase
                <select value={draft.astraStage ?? 1} onChange={(event) => updateAstraStage(event.target.value)}>
                  <option value={1}>I · 15★</option>
                  <option value={2}>II · 20★</option>
                  <option value={3}>III · 30★</option>
                </select>
                <small><a href="https://maplestorywiki.net/w/Astra_Secondary_Weapon" target="_blank" rel="noreferrer">Astra Katara and Astra Talisman</a> can reach 30★ at every phase.</small>
              </label>}

              {supportsFlames(draft.slot, draft.name) && <details open>
                <summary>Flame</summary>
                <div className="flame-field-grid">
                  {flameFields(draft.slot).map((field) => <label key={field.key}>{field.label}<input type="number" min={0} value={parseFlameStats(draft.flameStats).get(field.key) ?? ""} onChange={(event) => updateFlameStat(field.key, event.target.value)} /></label>)}
                </div>
              </details>}

              {supportsPotential(draft.slot) && supportsItemPotential(draft.slot, draft.name) && <details open>
                <summary>Potential</summary>
                <label>Tier<select value={draft.potentialTier} disabled={isBlackHeart(draft.slot, draft.name)} onChange={(event) => { update("potentialTier", event.target.value); update("potentialLines", ""); }}>{potentialTierOptions()}</select></label>
                <div className="potential-line-list">
                  {[0, 1, 2].map((index) => {
                    const current = parsePotentialLines(draft.potentialLines)[index] ?? "";
                    const options = potentialLineOptions(draft.slot, draft.potentialTier, index, draft.levelRequirement, characterJob);
                    return <label key={index}>Line {index + 1}<select value={current} disabled={!draft.potentialTier || isBlackHeart(draft.slot, draft.name)} onChange={(event) => updatePotentialLine(index, event.target.value)}><option value="">None</option>{current && !options.includes(current) && <option value={current}>{current}</option>}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
                  })}
                </div>
              </details>}

              <details>
                <summary>Displayed total stats (optional override)</summary>
                <div className="flame-field-grid">
                  {BASE_ITEM_STAT_FIELDS.map((field) => <label key={field.key}>{field.label}<input type="number" min={0} value={parseFlameStats(draft.statLines).get(field.key) ?? ""} onChange={(event) => updateDisplayedStat(field.key, event.target.value)} /></label>)}
                </div>
              </details>

              <button className="primary-button" type="button" disabled={saving || !draft.name.trim()} onClick={() => void saveEquipment()}>{saving ? "Saving…" : "Save equipment"}</button>
            </div>
          </>
        )}
      </section>

      {equipmentTooltip && (
        <EquipmentTooltip
          ref={tooltipRef}
          item={equipmentTooltip.item}
          slotLabel={equipmentTooltip.label}
          characterJob={characterJob}
          position={tooltipPosition}
        />
      )}
    </div>
  );
}

function EquipmentTooltip({
  ref,
  item,
  slotLabel,
  characterJob,
  position,
}: {
  ref: React.Ref<HTMLDivElement>;
  item: EquipmentItem;
  slotLabel: string;
  characterJob: string;
  position: { left: number; top: number } | null;
}) {
  const statRows = equipmentTooltipStatRows(item);
  const blackHeart = isBlackHeart(item.slot, item.name);
  const potentialLines = displayLines(blackHeart ? BLACK_HEART_POTENTIAL_LINES : item.potentialLines);
  const bonusPotentialLines = displayLines(item.bonusPotentialLines);
  const starCap = itemStarForceCap(item.slot, item.name, item.levelRequirement, item.catalogStarForceProfile, item.astraStage, characterJob);
  const displayedStarForce = blackHeart ? BLACK_HEART_STAR_FORCE : item.starForce ?? 0;
  const groupedStars = starForceRows(displayedStarForce, starCap);
  const hasDetails = statRows.length > 0 || potentialLines.length > 0 || bonusPotentialLines.length > 0;

  return (
    <div
      ref={ref}
      id="equipment-tooltip"
      className="equipment-tooltip"
      role="tooltip"
      style={{ left: position?.left ?? 12, top: position?.top ?? 12, visibility: position ? "visible" : "hidden" }}
    >
      {starCap > 0 && (
        <div className="equipment-tooltip-stars" aria-label={`${displayedStarForce} of ${starCap} Star Force`}>
          {groupedStars.map((row, rowIndex) => <div className="equipment-tooltip-star-row" key={rowIndex}>
            {row.map((group, groupIndex) => <span className="equipment-tooltip-star-group" key={groupIndex}>
              {group.map((filled, starIndex) => <i className={filled ? "is-filled" : ""} key={starIndex}>★</i>)}
            </span>)}
          </div>)}
        </div>
      )}
      <header>
        <strong className={`equipment-tooltip-name tier-${tierClass(item.potentialTier)}`}>{item.name}</strong>
        <small>({slotLabel})</small>
      </header>

      <div className="equipment-tooltip-overview">
        <span className="equipment-tooltip-icon" style={{ backgroundImage: `url("${equipmentIconUrl(item)}")` }} />
        <div>
          <span>REQ LEV: <strong>{item.levelRequirement ?? "—"}</strong></span>
          {starCap > 0 && <span>STAR FORCE: <strong>{item.starForce ?? 0} / {starCap}</strong></span>}
          {item.astraStage != null && <span>Astra phase: <strong>{romanNumeral(item.astraStage)}</strong></span>}
        </div>
      </div>

      <div className="equipment-tooltip-section equipment-tooltip-summary">
        <span>Equipment type: <strong>{slotLabel}</strong></span>
        {item.catalogSetName && <span>Set: <strong>{item.catalogSetName}</strong></span>}
        {statRows.length > 0 && <b className="equipment-tooltip-section-title">Item stats</b>}
        {statRows.map((row) => <span className="equipment-tooltip-stat" key={row.key}>
          <b>{row.label}: +{row.total.toLocaleString()}{row.percent ? "%" : ""}</b>
          {row.components.length > 0 && <small>({row.components.map((component, index) => <span key={`${component.kind}-${index}`} className={`component-${component.kind}`}>
            {index > 0 && <em> + </em>}{formatStatComponent(component, row.percent)}
          </span>)})</small>}
        </span>)}
        {!hasDetails && <span className="equipment-tooltip-empty">No detailed stats saved.</span>}
      </div>

      {potentialLines.length > 0 && (
        <TooltipPotentialSection title={`${blackHeart ? BLACK_HEART_POTENTIAL_TIER : item.potentialTier || "Potential"} potential`} lines={potentialLines} />
      )}
      {bonusPotentialLines.length > 0 && (
        <TooltipPotentialSection title={`${item.bonusPotentialTier || "Bonus"} potential`} lines={bonusPotentialLines} bonus />
      )}
    </div>
  );
}

function TooltipPotentialSection({ title, lines, bonus = false }: { title: string; lines: string[]; bonus?: boolean }) {
  return (
    <div className="equipment-tooltip-section equipment-tooltip-potential">
      <b><i>{bonus ? "B" : "P"}</i>{title}</b>
      {lines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
    </div>
  );
}

function displayLines(value: string | null | undefined) {
  return (value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function formatStatComponent(component: TooltipStatComponent, percent: boolean) {
  return `${component.value.toLocaleString()}${percent ? "%" : ""}`;
}

function tierClass(value: string) {
  const tier = value.trim().toLowerCase();
  return ["rare", "epic", "unique", "legendary"].includes(tier) ? tier : "common";
}

function romanNumeral(value: number) {
  return value === 1 ? "I" : value === 2 ? "II" : "III";
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

function parseFlameStats(text: string | null | undefined) {
  const values = new Map<string, number>();
  for (const line of (text ?? "").split(/\r?\n/)) {
    const match = line.match(/^(.+?):\s*\+?(-?\d+)/);
    if (match) values.set(match[1].trim(), Number(match[2]));
  }
  return values;
}

function formatFlameStats(values: Map<string, number>) {
  return [...values].map(([stat, value]) => `${stat}: +${value}${["All Stat", "Boss Damage", "Damage"].includes(stat) ? "%" : ""}`).join("\n");
}

function parsePotentialLines(text: string | null | undefined) {
  return (text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 3);
}

function emptyDraft(definition: SlotDefinition, presetNumber: number): EquipmentDraft {
  return {
    presetNumber,
    catalogItemId: null,
    slot: definition.slot,
    slotIndex: definition.slotIndex,
    name: "",
    levelRequirement: null,
    starForce: null,
    astraStage: null,
    statLines: "",
    flameStats: "",
    flameScoreLines: "",
    potentialTier: "",
    potentialLines: "",
    bonusPotentialTier: "",
    bonusPotentialLines: "",
    rawExtractedText: "",
    catalogBaseStats: null,
    catalogStarForceProfile: null,
    catalogSetName: null,
    catalogMapleItemId: null,
  };
}

function fromItem(item: EquipmentItem): EquipmentDraft {
  const normalized = normalizeEquipmentItem(item);
  const blackHeart = isBlackHeart(normalized.slot, normalized.name);
  return {
    presetNumber: normalized.presetNumber,
    catalogItemId: normalized.catalogItemId,
    slot: normalized.slot,
    slotIndex: normalized.slotIndex,
    name: normalized.name,
    levelRequirement: normalized.levelRequirement,
    starForce: blackHeart ? BLACK_HEART_STAR_FORCE : normalized.starForce,
    astraStage: normalized.astraStage,
    statLines: normalized.statLines,
    flameStats: normalized.flameStats,
    flameScoreLines: normalized.flameScoreLines,
    potentialTier: blackHeart ? BLACK_HEART_POTENTIAL_TIER : normalized.potentialTier,
    potentialLines: blackHeart ? BLACK_HEART_POTENTIAL_LINES : normalized.potentialLines,
    bonusPotentialTier: normalized.bonusPotentialTier,
    bonusPotentialLines: normalized.bonusPotentialLines,
    rawExtractedText: normalized.rawExtractedText,
    catalogBaseStats: normalized.catalogBaseStats,
    catalogStarForceProfile: normalized.catalogStarForceProfile,
    catalogSetName: normalized.catalogSetName,
    catalogMapleItemId: normalized.catalogMapleItemId,
  };
}

export function normalizeEquipmentItem(item: EquipmentItem): EquipmentItem {
  return {
    ...item,
    catalogItemId: item.catalogItemId ?? null,
    presetNumber: item.presetNumber ?? 1,
    astraStage: item.astraStage ?? null,
    statLines: item.statLines ?? "",
    flameStats: item.flameStats ?? "",
    flameScoreLines: item.flameScoreLines ?? "",
    potentialTier: item.potentialTier ?? "",
    potentialLines: item.potentialLines ?? "",
    bonusPotentialTier: item.bonusPotentialTier ?? "",
    bonusPotentialLines: item.bonusPotentialLines ?? "",
    catalogBaseStats: item.catalogBaseStats ?? null,
    catalogStarForceProfile: item.catalogStarForceProfile ?? null,
    catalogSetName: item.catalogSetName ?? null,
    catalogMapleItemId: item.catalogMapleItemId ?? null,
    rawExtractedText: item.rawExtractedText ?? "",
  };
}

function findEquipment(equipment: EquipmentItem[], definition: SlotDefinition, presetNumber: number) {
  return equipment.find((item) => samePosition(item, definition, presetNumber)) ?? null;
}

function samePosition(item: Pick<EquipmentItem, "slot" | "slotIndex" | "presetNumber">, definition: SlotDefinition, presetNumber: number) {
  return (item.presetNumber ?? 1) === presetNumber && item.slot === definition.slot && (item.slotIndex ?? null) === definition.slotIndex;
}

function equipmentIconUrl(item: EquipmentItem) {
  const params = new URLSearchParams({ name: item.name, slot: item.slot });
  if (item.levelRequirement != null) params.set("level", String(item.levelRequirement));
  return `/api/v1/equipment-icons?${params.toString()}`;
}

function deduplicateCatalog(items: CatalogItem[], slot: EquipmentSlot, jobName: string) {
  const unique = new Map<string, CatalogItem>();
  for (const item of items) {
    if (!isEquipmentJobGroupCompatible(item.jobGroup, jobName)) continue;
    if (!isEquipmentSubclassCompatible(slot, item.mapleItemId, item.name, jobName)) continue;
    const key = resolveEquipmentName(item.name, slot, jobName).toLowerCase();
    const existing = unique.get(key);
    if (!existing || (existing.namePattern && !item.namePattern)) unique.set(key, item);
  }
  return [...unique.values()];
}

function findCatalogItem(items: CatalogItem[], name: string, slot: EquipmentSlot, jobName: string) {
  return items.find((item) => item.name === name || resolveEquipmentName(item.name, slot, jobName) === name);
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
