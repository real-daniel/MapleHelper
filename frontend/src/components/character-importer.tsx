"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { UpgradeRecommendations } from "@/components/upgrade-recommendations";
import { apiFetch } from "@/lib/api";

type Region = "NORTH_AMERICA" | "EUROPE";

type ImportedCharacter = {
  name: string;
  world: string;
  job: string;
  weeklyRank: number;
  weeklyExperience: number;
  imageUrl: string | null;
  region: Region;
  sourceUrl: string;
  retrievedAt: string;
};

type CharacterProfile = ImportedCharacter & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

type EquipmentSlot =
  | "RING" | "PENDANT"
  | "WEAPON" | "SECONDARY" | "EMBLEM"
  | "HAT" | "FACE" | "EYE" | "EARRINGS"
  | "TOP" | "BOTTOM" | "SHOES" | "GLOVES" | "CAPE"
  | "BELT" | "SHOULDER" | "POCKET" | "BADGE" | "MEDAL"
  | "ANDROID" | "HEART"
  | "TOTEM";

type EquipmentDraft = {
  originalFilename: string;
  imageBytes: number;
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
  extractionStatus: string;
  extractionNotes: string;
};

type EquipmentItem = Omit<EquipmentDraft, "originalFilename" | "imageBytes" | "extractionStatus" | "extractionNotes"> & {
  id: number;
  characterProfileId: number | null;
  createdAt: string;
  updatedAt: string;
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  "RING", "PENDANT",
  "WEAPON", "SECONDARY", "EMBLEM",
  "HAT", "FACE", "EYE", "EARRINGS",
  "TOP", "BOTTOM", "SHOES", "GLOVES", "CAPE",
  "BELT", "SHOULDER", "POCKET", "BADGE", "MEDAL",
  "ANDROID", "HEART",
  "TOTEM",
];

const SLOT_CAPACITY: Partial<Record<EquipmentSlot, number>> = {
  RING: 4,
  PENDANT: 2,
  TOTEM: 3,
};

export function CharacterImporter() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<Region>("NORTH_AMERICA");
  const [character, setCharacter] = useState<ImportedCharacter | null>(null);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [equipmentFile, setEquipmentFile] = useState<File | null>(null);
  const [equipmentPreviewUrl, setEquipmentPreviewUrl] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [characterView, setCharacterView] = useState<"overview" | "equipment" | "upgrades" | "manage">("overview");

  const selectedProfile = profiles.find((profile) => String(profile.id) === selectedProfileId) ?? null;

  useEffect(() => {
    void loadProfiles();
    void loadEquipment("");
    // The test harness should perform one startup load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfiles() {
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/profiles");
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Could not load profiles.");
      const loadedProfiles = body as CharacterProfile[];
      setProfiles(loadedProfiles);
      if (!selectedProfileId && loadedProfiles.length > 0) {
        setSelectedProfileId(String(loadedProfiles[0].id));
        void loadEquipment(String(loadedProfiles[0].id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load profiles.");
    }
  }

  async function loadEquipment(profileId = selectedProfileId) {
    setMessage("");
    try {
      const params = profileId ? `?characterProfileId=${profileId}` : "";
      const response = await apiFetch(`/api/v1/equipment${params}`);
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Could not load equipment.");
      setEquipment(body as EquipmentItem[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load equipment.");
    }
  }

  async function importCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setCharacter(null);

    try {
      const params = new URLSearchParams({ name: name.trim(), region });
      const response = await apiFetch(`/api/v1/characters/import?${params}`);
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Import failed.");
      setCharacter(body as ImportedCharacter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveImportedProfile() {
    if (!character) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/profiles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: character.name, region: character.region }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Save failed.");
      const saved = body as CharacterProfile;
      setCharacter(null);
      await loadProfiles();
      setSelectedProfileId(String(saved.id));
      await loadEquipment(String(saved.id));
      setMessage(`Saved ${character.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProfile(id: number) {
    setMessage("");
    try {
      const response = await apiFetch(`/api/v1/profiles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await readBody(response);
        throw new Error(body.message ?? "Delete failed.");
      }
      setProfiles((current) => current.filter((profile) => profile.id !== id));
      if (selectedProfileId === String(id)) {
        setSelectedProfileId("");
        await loadEquipment("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function extractEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!equipmentFile) {
      setMessage("Choose an equipment screenshot first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setEquipmentDraft(null);

    try {
      const formData = new FormData();
      formData.append("file", equipmentFile);
      const response = await apiFetch("/api/v1/equipment/extract", {
        method: "POST",
        body: formData,
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Equipment extraction failed.");
      setEquipmentDraft(body as EquipmentDraft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Equipment extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleEquipmentPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"));

    if (!image) {
      setMessage("Clipboard did not contain an image. Copy a screenshot, then paste it into the box.");
      return;
    }

    const file = image.getAsFile();
    if (!file) {
      setMessage("Could not read the pasted image.");
      return;
    }

    const extension = file.type.split("/")[1] || "png";
    const pastedFile = new File([file], `equipment-screenshot.${extension}`, { type: file.type });
    setEquipmentFile(pastedFile);
    setEquipmentDraft(null);
    setMessage(`Pasted ${pastedFile.name} (${pastedFile.size.toLocaleString()} bytes).`);

    if (equipmentPreviewUrl) {
      URL.revokeObjectURL(equipmentPreviewUrl);
    }
    setEquipmentPreviewUrl(URL.createObjectURL(pastedFile));
  }

  async function confirmEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!equipmentDraft) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterProfileId: selectedProfileId ? Number(selectedProfileId) : null,
          slot: equipmentDraft.slot,
          slotIndex: equipmentDraft.slotIndex,
          name: equipmentDraft.name,
          levelRequirement: equipmentDraft.levelRequirement,
          starForce: equipmentDraft.starForce,
          statLines: equipmentDraft.statLines,
          flameStats: equipmentDraft.flameStats,
          flameScoreLines: equipmentDraft.flameScoreLines,
          potentialTier: equipmentDraft.potentialTier,
          potentialLines: equipmentDraft.potentialLines,
          bonusPotentialTier: equipmentDraft.bonusPotentialTier,
          bonusPotentialLines: equipmentDraft.bonusPotentialLines,
          rawExtractedText: equipmentDraft.rawExtractedText,
        }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Equipment save failed.");
      setEquipmentDraft(null);
      setEquipmentFile(null);
      await loadEquipment();
      setMessage(`Saved ${(body as EquipmentItem).name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Equipment save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEquipment(id: number) {
    setMessage("");
    try {
      const response = await apiFetch(`/api/v1/equipment/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await readBody(response);
        throw new Error(body.message ?? "Equipment delete failed.");
      }
      setEquipment((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Equipment delete failed.");
    }
  }

  function updateDraft<Key extends keyof EquipmentDraft>(key: Key, value: EquipmentDraft[Key]) {
    setEquipmentDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function updateDraftSlot(slot: EquipmentSlot) {
    setEquipmentDraft((current) => {
      if (!current) return current;
      const capacity = SLOT_CAPACITY[slot] ?? 1;
      return { ...current, slot, slotIndex: capacity > 1 ? clampSlotIndex(current.slotIndex, capacity) : null };
    });
  }

  return (
    <main className="character-workspace">
      <div className="workspace-heading">
        <div><p className="eyebrow">Your account</p><h1>Characters</h1><p className="muted">Choose a character to view and manage their progression.</p></div>
        <button className="primary-button" type="button" onClick={() => setCharacterView("manage")}>+ Add character</button>
      </div>

      <div className="character-roster" aria-label="Your characters">
        {profiles.map((profile) => (
          <button
            className="character-tile"
            type="button"
            aria-pressed={selectedProfileId === String(profile.id) && characterView !== "manage"}
            key={profile.id}
            onClick={() => { setSelectedProfileId(String(profile.id)); setCharacterView("overview"); void loadEquipment(String(profile.id)); }}
          >
            <span className="character-portrait">
              {profile.imageUrl ? <Image src={profile.imageUrl} alt="" width={68} height={68} unoptimized /> : profile.name.slice(0, 1)}
            </span>
            <span><strong>{profile.name}</strong><small>{profile.job} · {profile.world}</small></span>
          </button>
        ))}
        <button className="character-tile add-character-tile" type="button" aria-pressed={characterView === "manage"} onClick={() => setCharacterView("manage")}>
          <span className="character-portrait">+</span><span><strong>Add character</strong><small>Import from rankings</small></span>
        </button>
      </div>

      {message && <p className="message">{message}</p>}

      {characterView === "manage" ? (
        <section className="add-character-panel">
          <div className="panel-intro"><p className="eyebrow">New character</p><h2>Import from MapleStory rankings</h2><p className="muted">We’ll pull in the character portrait, class, world, and current weekly ranking.</p></div>
          <form className="import-form" onSubmit={importCharacter}>
            <label>Character name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter an IGN" pattern="[A-Za-z0-9]+" maxLength={20} required /></label>
            <label>Region<select value={region} onChange={(event) => setRegion(event.target.value as Region)}><option value="NORTH_AMERICA">North America</option><option value="EUROPE">Europe</option></select></label>
            <button className="primary-button" disabled={loading || !name.trim()} type="submit">{loading ? "Searching..." : "Find character"}</button>
          </form>
          {character && (
            <div className="import-result">
              <div className="character-portrait large">{character.imageUrl ? <Image src={character.imageUrl} alt="" width={96} height={96} unoptimized /> : character.name.slice(0, 1)}</div>
              <div><p className="eyebrow">Character found</p><h3>{character.name}</h3><p>{character.job} · {character.world}</p><small>Weekly rank #{character.weeklyRank.toLocaleString()}</small></div>
              <button className="primary-button" disabled={loading} type="button" onClick={saveImportedProfile}>Add to my characters</button>
            </div>
          )}
        </section>
      ) : selectedProfile ? (
        <>
          <section className="character-hero">
            <div className="character-portrait hero-portrait">{selectedProfile.imageUrl ? <Image src={selectedProfile.imageUrl} alt={`${selectedProfile.name} avatar`} width={120} height={120} unoptimized /> : selectedProfile.name.slice(0, 1)}</div>
            <div className="character-identity"><span className="status-pill">Active character</span><h2>{selectedProfile.name}</h2><p>{selectedProfile.job} <span>·</span> {selectedProfile.world} <span>·</span> {selectedProfile.region === "NORTH_AMERICA" ? "North America" : "Europe"}</p></div>
            <a className="secondary-button" href={selectedProfile.sourceUrl} target="_blank" rel="noreferrer">View ranking ↗</a>
          </section>

          <nav className="character-nav" aria-label={`${selectedProfile.name} sections`}>
            {(["overview", "equipment", "upgrades"] as const).map((view) => <button type="button" key={view} aria-pressed={characterView === view} onClick={() => setCharacterView(view)}>{view === "upgrades" ? "Upgrade plan" : view[0].toUpperCase() + view.slice(1)}</button>)}
          </nav>

          {characterView === "overview" && (
            <div className="character-dashboard">
              <div className="stat-grid">
                <article><span>Weekly rank</span><strong>#{selectedProfile.weeklyRank.toLocaleString()}</strong><small>Latest rankings snapshot</small></article>
                <article><span>Weekly EXP</span><strong>{formatCompactNumber(selectedProfile.weeklyExperience)}</strong><small>Experience gained this week</small></article>
                <article><span>Saved gear</span><strong>{equipment.length}</strong><small>{equipment.length === 1 ? "item" : "items"} tracked</small></article>
              </div>
              <section className="quick-actions"><div><p className="eyebrow">Continue building</p><h2>What would you like to work on?</h2></div><div className="action-grid"><button type="button" onClick={() => setCharacterView("equipment")}><strong>Update equipment</strong><span>Paste a screenshot and extract its stats →</span></button><button type="button" onClick={() => setCharacterView("upgrades")}><strong>Review upgrade plan</strong><span>See the most efficient next improvements →</span></button></div></section>
            </div>
          )}

          {characterView === "equipment" && (
            <div className="equipment-layout">
              <section>
                <div className="section-heading"><div><p className="eyebrow">Equipment</p><h2>Saved gear</h2></div><span className="count-badge">{equipment.length} items</span></div>
                {equipment.length === 0 ? <div className="empty-state"><strong>No equipment saved yet</strong><p>Paste your first item screenshot to start building this character’s loadout.</p></div> : <div className="table-scroll"><table><thead><tr><th>Slot</th><th>Item</th><th>Stars</th><th>Potential</th><th /></tr></thead><tbody>{equipment.map((item) => <tr key={item.id}><td><span className="slot-label">{formatEquipmentSlot(item)}</span></td><td><strong>{item.name}</strong></td><td>{item.starForce ?? "—"}</td><td>{item.potentialTier || "—"}</td><td><button className="text-button danger" type="button" onClick={() => void deleteEquipment(item.id)}>Remove</button></td></tr>)}</tbody></table></div>}
              </section>
              <section className="capture-panel">
                <p className="eyebrow">Add gear</p><h2>Paste a screenshot</h2><p className="muted">Copy an equipment tooltip in game, then paste it below. We’ll extract the stats for you.</p>
                <form onSubmit={extractEquipment}><div className="paste-box" role="button" tabIndex={0} onPaste={handleEquipmentPaste}><strong>{equipmentFile ? "Screenshot ready" : "Press Ctrl + V to paste"}</strong><span>{equipmentFile ? equipmentFile.name : "Click here first, then paste an image"}</span>{equipmentPreviewUrl && <Image src={equipmentPreviewUrl} alt="Equipment screenshot preview" width={520} height={260} unoptimized />}</div><button className="primary-button" disabled={loading || !equipmentFile} type="submit">{loading ? "Reading item..." : "Extract item"}</button></form>
                {equipmentDraft && <form className="review-form" onSubmit={confirmEquipment}><h3>Review extracted item</h3><p className="message">{equipmentDraft.extractionNotes}</p><label>Slot<select value={equipmentDraft.slot} onChange={(event) => updateDraftSlot(event.target.value as EquipmentSlot)}>{EQUIPMENT_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>{(SLOT_CAPACITY[equipmentDraft.slot] ?? 1) > 1 && <label>Position<select value={equipmentDraft.slotIndex ?? 1} onChange={(event) => updateDraft("slotIndex", Number(event.target.value))}>{Array.from({ length: SLOT_CAPACITY[equipmentDraft.slot] ?? 1 }, (_, index) => index + 1).map((index) => <option key={index}>{index}</option>)}</select></label>}<label>Item name<input value={equipmentDraft.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label><label>Star Force<input type="number" min={0} max={25} value={equipmentDraft.starForce ?? ""} onChange={(event) => updateDraft("starForce", nullableNumber(event.target.value))} /></label><label>Potential tier<input value={equipmentDraft.potentialTier} onChange={(event) => updateDraft("potentialTier", event.target.value)} /></label><label>Potential lines<textarea value={equipmentDraft.potentialLines} onChange={(event) => updateDraft("potentialLines", event.target.value)} /></label><button className="primary-button" disabled={loading || !equipmentDraft.name.trim()} type="submit">Save equipment</button></form>}
              </section>
            </div>
          )}

          {characterView === "upgrades" && <UpgradeRecommendations equipment={equipment} selectedProfileId={selectedProfileId} />}

          <div className="character-footer"><span>Last synced {new Date(selectedProfile.retrievedAt).toLocaleDateString()}</span><button className="text-button danger" type="button" onClick={() => void deleteProfile(selectedProfile.id)}>Remove character</button></div>
        </>
      ) : (
        <section className="empty-state large-empty"><h2>Add your first character</h2><p>Import a MapleStory character to start tracking equipment and planning upgrades.</p><button className="primary-button" type="button" onClick={() => setCharacterView("manage")}>Add character</button></section>
      )}
    </main>
  );
}

async function readBody(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function nullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

function clampSlotIndex(value: number | null, capacity: number) {
  if (value == null || value < 1 || value > capacity) return 1;
  return value;
}

function formatEquipmentSlot(item: { slot: EquipmentSlot; slotIndex: number | null }) {
  return item.slotIndex == null ? item.slot : `${item.slot} ${item.slotIndex}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
