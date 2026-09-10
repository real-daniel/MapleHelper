"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { UpgradeRecommendations } from "@/components/upgrade-recommendations";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
  const [name, setName] = useState("FangBlade");
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

  useEffect(() => {
    void loadProfiles();
    void loadEquipment("");
    // The test harness should perform one startup load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfiles() {
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/profiles`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/equipment${params}`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/characters/import?${params}`);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/profiles/import`, {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/profiles/${id}`, { method: "DELETE" });
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
      const response = await fetch(`${API_BASE_URL}/api/v1/equipment/extract`, {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/equipment`, {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/equipment/${id}`, { method: "DELETE" });
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
    <main>
      <h1>MapleHelper Test UI</h1>
      <p className="muted">API: {API_BASE_URL}</p>

      {message && <p className="message">{message}</p>}

      <section>
        <h2>Import character</h2>
        <form onSubmit={importCharacter}>
          <label>
            Character name
            <input value={name} onChange={(event) => setName(event.target.value)} pattern="[A-Za-z0-9]+" maxLength={20} required />
          </label>

          <label>
            Region
            <select value={region} onChange={(event) => setRegion(event.target.value as Region)}>
              <option value="NORTH_AMERICA">North America</option>
              <option value="EUROPE">Europe</option>
            </select>
          </label>

          <button disabled={loading || !name.trim()} type="submit">{loading ? "Working..." : "Import"}</button>
        </form>
      </section>

      {character && (
        <section>
          <h2>Imported result</h2>
          <dl>
            <dt>Name</dt><dd>{character.name}</dd>
            <dt>World</dt><dd>{character.world}</dd>
            <dt>Job</dt><dd>{character.job}</dd>
            <dt>Weekly rank</dt><dd>{character.weeklyRank.toLocaleString()}</dd>
            <dt>Weekly EXP gained</dt><dd>{character.weeklyExperience.toLocaleString()}</dd>
            <dt>Source</dt><dd><a href={character.sourceUrl} target="_blank" rel="noreferrer">Open Nexon rankings</a></dd>
          </dl>
          {character.imageUrl && (
            <Image className="avatar" src={character.imageUrl} alt={`${character.name} avatar`} width={96} height={96} unoptimized />
          )}
          <button disabled={loading} type="button" onClick={saveImportedProfile}>Save profile</button>
        </section>
      )}

      <section>
        <h2>Equipment screenshot MVP</h2>
        <p className="muted">Paste screenshot -&gt; extract draft -&gt; review/edit -&gt; confirm-save.</p>

        <label>
          Save equipment to profile
          <select
            value={selectedProfileId}
            onChange={(event) => {
              setSelectedProfileId(event.target.value);
              void loadEquipment(event.target.value);
            }}
          >
            <option value="">No profile selected</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name} ({profile.world})</option>
            ))}
          </select>
        </label>

        <form onSubmit={extractEquipment}>
          <div
            className="paste-box"
            role="button"
            tabIndex={0}
            onPaste={handleEquipmentPaste}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.currentTarget.focus();
              }
            }}
          >
            <strong>Paste equipment screenshot here</strong>
            <span>Click this box, then press Ctrl+V.</span>
            {equipmentFile && <small>{equipmentFile.name} - {equipmentFile.size.toLocaleString()} bytes</small>}
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview from a pasted local clipboard image. */}
            {equipmentPreviewUrl && <img src={equipmentPreviewUrl} alt="Pasted equipment screenshot preview" />}
          </div>
          <button disabled={loading || !equipmentFile} type="submit">{loading ? "Working..." : "Upload + extract"}</button>
        </form>

        {equipmentDraft && (
          <form className="review-form" onSubmit={confirmEquipment}>
            <h3>Review extracted equipment</h3>
            <p className="message">{equipmentDraft.extractionNotes}</p>
            <p className="muted">File: {equipmentDraft.originalFilename} ({equipmentDraft.imageBytes.toLocaleString()} bytes)</p>
            <p className="muted">Extraction status: {equipmentDraft.extractionStatus}</p>

            <label>
              Slot
              <select value={equipmentDraft.slot} onChange={(event) => updateDraftSlot(event.target.value as EquipmentSlot)}>
                {EQUIPMENT_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>

            {(SLOT_CAPACITY[equipmentDraft.slot] ?? 1) > 1 && (
              <label>
                Preferred slot
                <select
                  value={equipmentDraft.slotIndex ?? 1}
                  onChange={(event) => updateDraft("slotIndex", Number(event.target.value))}
                >
                  {Array.from({ length: SLOT_CAPACITY[equipmentDraft.slot] ?? 1 }, (_, index) => index + 1)
                    .map((slotIndex) => <option key={slotIndex} value={slotIndex}>{slotIndex}</option>)}
                </select>
              </label>
            )}

            <label>
              Item name
              <input value={equipmentDraft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={120} required />
            </label>

            <label>
              Level requirement
              <input type="number" min={0} max={300} value={equipmentDraft.levelRequirement ?? ""} onChange={(event) => updateDraft("levelRequirement", nullableNumber(event.target.value))} />
            </label>

            <label>
              Star force
              <input type="number" min={0} max={25} value={equipmentDraft.starForce ?? ""} onChange={(event) => updateDraft("starForce", nullableNumber(event.target.value))} />
            </label>

            <label>Flame stats<textarea value={equipmentDraft.flameStats} onChange={(event) => updateDraft("flameStats", event.target.value)} /></label>
            <label>Flame score lines<textarea value={equipmentDraft.flameScoreLines} onChange={(event) => updateDraft("flameScoreLines", event.target.value)} /></label>
            <label>Potential tier<input value={equipmentDraft.potentialTier} onChange={(event) => updateDraft("potentialTier", event.target.value)} /></label>
            <label>Potential lines<textarea value={equipmentDraft.potentialLines} onChange={(event) => updateDraft("potentialLines", event.target.value)} /></label>
            <label>Bonus potential tier<input value={equipmentDraft.bonusPotentialTier} onChange={(event) => updateDraft("bonusPotentialTier", event.target.value)} /></label>
            <label>Bonus potential lines<textarea value={equipmentDraft.bonusPotentialLines} onChange={(event) => updateDraft("bonusPotentialLines", event.target.value)} /></label>
            <label>Raw extracted text<textarea value={equipmentDraft.rawExtractedText} onChange={(event) => updateDraft("rawExtractedText", event.target.value)} /></label>

            <button disabled={loading || !equipmentDraft.name.trim()} type="submit">Confirm save</button>
          </form>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h2>Saved equipment</h2>
          <button type="button" onClick={() => void loadEquipment()}>Reload</button>
        </div>

        {equipment.length === 0 ? (
          <p className="muted">No equipment saved yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Slot</th><th>Name</th><th>Stars</th><th>Potential</th><th /></tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr key={item.id}>
                  <td>{formatEquipmentSlot(item)}</td>
                  <td>{item.name}</td>
                  <td>{item.starForce ?? "-"}</td>
                  <td>{item.potentialTier || "-"}</td>
                  <td><button type="button" onClick={() => void deleteEquipment(item.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <UpgradeRecommendations equipment={equipment} selectedProfileId={selectedProfileId} />

      <section>
        <div className="section-heading">
          <h2>Saved profiles</h2>
          <button type="button" onClick={() => void loadProfiles()}>Reload</button>
        </div>

        {profiles.length === 0 ? (
          <p className="muted">No profiles saved yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>World</th><th>Job</th><th>Rank</th><th /></tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.name}</td>
                  <td>{profile.world}</td>
                  <td>{profile.job}</td>
                  <td>{profile.weeklyRank.toLocaleString()}</td>
                  <td><button type="button" onClick={() => void deleteProfile(profile.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
