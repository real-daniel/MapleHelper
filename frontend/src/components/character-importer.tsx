"use client";

import Image from "next/image";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { UpgradeRecommendations } from "@/components/upgrade-recommendations";
import { BossTracker } from "@/components/boss-tracker";
import { AccountBossIncome } from "@/components/account-boss-income";
import { StatEquivalencyOcr } from "@/components/stat-equivalency-ocr";
import { EquipmentManager, normalizeEquipmentItem, type EquipmentItem } from "@/components/equipment-manager";
import { apiFetch } from "@/lib/api";
import type { CharacterStatEquivalency } from "@/components/stat-equivalencies";

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
  statEquivalencies: CharacterStatEquivalency[];
  createdAt: string;
  updatedAt: string;
};

type ProfilePointerDrag = {
  pointerId: number;
  profileId: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  width: number;
  height: number;
  started: boolean;
};

type ProfileDragOverlay = {
  profile: CharacterProfile;
  left: number;
  top: number;
  width: number;
  height: number;
};

export function CharacterImporter() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<Region>("NORTH_AMERICA");
  const [character, setCharacter] = useState<ImportedCharacter | null>(null);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [activeEquipmentPreset, setActiveEquipmentPreset] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [characterView, setCharacterView] = useState<"overview" | "equipment" | "stats" | "upgrades" | "bosses" | "manage">("overview");
  const [bossIncomeRevision, setBossIncomeRevision] = useState(0);
  const [draggingProfileId, setDraggingProfileId] = useState<number | null>(null);
  const [dragOverlay, setDragOverlay] = useState<ProfileDragOverlay | null>(null);
  const dragStartOrder = useRef<number[]>([]);
  const dragOrder = useRef<number[]>([]);
  const draggedProfileId = useRef<number | null>(null);
  const pointerDrag = useRef<ProfilePointerDrag | null>(null);
  const pendingTileRects = useRef<Map<number, DOMRect> | null>(null);
  const tileAnimations = useRef(new Map<number, Animation>());
  const suppressProfileClick = useRef(false);

  const selectedProfile = profiles.find((profile) => String(profile.id) === selectedProfileId) ?? null;

  useEffect(() => {
    void loadProfiles();
    void loadEquipment("");
    // The test harness should perform one startup load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const previousRects = pendingTileRects.current;
    pendingTileRects.current = null;
    if (!previousRects) return;

    for (const [profileId, previous] of previousRects) {
      if (profileId === draggedProfileId.current) continue;
      const tile = document.querySelector<HTMLElement>(`[data-profile-id="${profileId}"]`);
      if (!tile) continue;
      tileAnimations.current.get(profileId)?.cancel();
      tileAnimations.current.delete(profileId);
      const current = tile.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
      const animation = tile.animate([
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: 180, easing: "cubic-bezier(.2, .8, .2, 1)" });
      tileAnimations.current.set(profileId, animation);
      animation.addEventListener("finish", () => tileAnimations.current.delete(profileId), { once: true });
    }
  }, [profiles]);

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
      setEquipment((body as EquipmentItem[]).map(normalizeEquipmentItem));
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
      setBossIncomeRevision((revision) => revision + 1);
      if (selectedProfileId === String(id)) {
        setSelectedProfileId("");
        await loadEquipment("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  function prepareProfileDrag(event: ReactPointerEvent<HTMLButtonElement>, profile: CharacterProfile) {
    if (event.button !== 0 || pointerDrag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const order = profiles.map((profile) => profile.id);
    dragStartOrder.current = order;
    dragOrder.current = order;
    draggedProfileId.current = profile.id;
    pointerDrag.current = {
      pointerId: event.pointerId,
      profileId: profile.id,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      width: rect.width,
      height: rect.height,
      started: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateProfileDrag(event: ReactPointerEvent<HTMLButtonElement>, profile: CharacterProfile) {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.profileId !== profile.id) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.started) {
      if (Math.hypot(deltaX, deltaY) < 5) return;
      drag.started = true;
      suppressProfileClick.current = true;
      setDraggingProfileId(profile.id);
    }
    event.preventDefault();
    setDragOverlay({
      profile,
      left: drag.originLeft + deltaX,
      top: drag.originTop + deltaY,
      width: drag.width,
      height: drag.height,
    });

    const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-profile-id]");
    const targetProfileId = Number(hovered?.dataset.profileId);
    if (Number.isInteger(targetProfileId)) moveDraggedProfile(targetProfileId);
  }

  function releaseProfileDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerDrag.current = null;
    setDragOverlay(null);
    if (drag.started) finishProfileDrag();
    else {
      draggedProfileId.current = null;
    }
  }

  function moveDraggedProfile(targetProfileId: number) {
    const draggedId = draggedProfileId.current;
    if (draggedId == null || draggedId === targetProfileId) return;
    pendingTileRects.current = captureProfileTileRects();
    setProfiles((current) => {
      const from = current.findIndex((profile) => profile.id === draggedId);
      const to = current.findIndex((profile) => profile.id === targetProfileId);
      if (from < 0 || to < 0 || from === to) {
        pendingTileRects.current = null;
        return current;
      }
      const reordered = [...current];
      const [dragged] = reordered.splice(from, 1);
      reordered.splice(to, 0, dragged);
      dragOrder.current = reordered.map((profile) => profile.id);
      return reordered;
    });
  }

  function finishProfileDrag() {
    setDraggingProfileId(null);
    draggedProfileId.current = null;
    window.setTimeout(() => { suppressProfileClick.current = false; }, 0);
    const nextOrder = dragOrder.current;
    const previousOrder = dragStartOrder.current;
    if (nextOrder.length === 0 || nextOrder.every((id, index) => id === previousOrder[index])) return;
    void saveProfileOrder(nextOrder, previousOrder);
  }

  async function saveProfileOrder(profileIds: number[], previousOrder: number[]) {
    try {
      const response = await apiFetch("/api/v1/profiles/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileIds }),
      });
      if (!response.ok) {
        const body = await readBody(response);
        throw new Error(body.message ?? "Could not save character order.");
      }
    } catch (error) {
      setProfiles((current) => {
        const byId = new Map(current.map((profile) => [profile.id, profile]));
        return previousOrder.map((id) => byId.get(id)).filter((profile): profile is CharacterProfile => Boolean(profile));
      });
      setMessage(error instanceof Error ? error.message : "Could not save character order.");
    }
  }

  return (
    <main className="character-workspace">
      <div className="workspace-heading">
        <h1>Characters</h1>
        <button className="primary-button" type="button" onClick={() => setCharacterView("manage")}>+ Add character</button>
      </div>

      <div className="character-roster" aria-label="Your characters">
        {profiles.map((profile) => (
          <button
            className={`character-tile${draggingProfileId === profile.id ? " dragging" : ""}`}
            type="button"
            title="Drag to rearrange"
            data-profile-id={profile.id}
            aria-pressed={selectedProfileId === String(profile.id) && characterView !== "manage"}
            key={profile.id}
            onClick={() => {
              if (suppressProfileClick.current) return;
              setSelectedProfileId(String(profile.id)); setActiveEquipmentPreset(1); setCharacterView("overview"); void loadEquipment(String(profile.id));
            }}
            onPointerDown={(event) => prepareProfileDrag(event, profile)}
            onPointerMove={(event) => updateProfileDrag(event, profile)}
            onPointerUp={releaseProfileDrag}
            onPointerCancel={releaseProfileDrag}
          >
            <span className="character-portrait">
              {profile.imageUrl ? <Image src={profile.imageUrl} alt="" width={68} height={68} draggable={false} unoptimized /> : profile.name.slice(0, 1)}
            </span>
            <span><strong>{profile.name}</strong><small>{profile.job} · {profile.world}</small></span>
          </button>
        ))}
        <button className="character-tile add-character-tile" type="button" aria-pressed={characterView === "manage"} onClick={() => setCharacterView("manage")}>
          <span className="character-portrait">+</span><span><strong>Add character</strong></span>
        </button>
      </div>

      {dragOverlay && (
        <div className="character-tile character-drag-overlay" aria-hidden="true" style={{ left: dragOverlay.left, top: dragOverlay.top, width: dragOverlay.width, height: dragOverlay.height }}>
          <span className="character-portrait">
            {dragOverlay.profile.imageUrl ? <Image src={dragOverlay.profile.imageUrl} alt="" width={68} height={68} draggable={false} unoptimized /> : dragOverlay.profile.name.slice(0, 1)}
          </span>
          <span><strong>{dragOverlay.profile.name}</strong><small>{dragOverlay.profile.job} · {dragOverlay.profile.world}</small></span>
        </div>
      )}

      {message && <p className="message">{message}</p>}

      <AccountBossIncome revision={bossIncomeRevision} />

      {characterView === "manage" ? (
        <section className="add-character-panel">
          <div className="panel-intro"><h2>Import character</h2></div>
          <form className="import-form" onSubmit={importCharacter}>
            <label>Character name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter an IGN" pattern="[A-Za-z0-9]+" maxLength={20} required /></label>
            <label>Region<select value={region} onChange={(event) => setRegion(event.target.value as Region)}><option value="NORTH_AMERICA">North America</option><option value="EUROPE">Europe</option></select></label>
            <button className="primary-button" disabled={loading || !name.trim()} type="submit">{loading ? "Searching..." : "Find character"}</button>
          </form>
          {character && (
            <div className="import-result">
              <div className="character-portrait large">{character.imageUrl ? <Image src={character.imageUrl} alt="" width={96} height={96} unoptimized /> : character.name.slice(0, 1)}</div>
              <div><h3>{character.name}</h3><p>{character.job} · {character.world}</p><small>Weekly rank #{character.weeklyRank.toLocaleString()}</small></div>
              <button className="primary-button" disabled={loading} type="button" onClick={saveImportedProfile}>Add to my characters</button>
            </div>
          )}
        </section>
      ) : selectedProfile ? (
        <>
          <section className="character-hero">
            <div className="character-portrait hero-portrait">{selectedProfile.imageUrl ? <Image src={selectedProfile.imageUrl} alt={`${selectedProfile.name} avatar`} width={120} height={120} unoptimized /> : selectedProfile.name.slice(0, 1)}</div>
            <div className="character-identity"><h2>{selectedProfile.name}</h2><p>{selectedProfile.job} <span>·</span> {selectedProfile.world} <span>·</span> {selectedProfile.region === "NORTH_AMERICA" ? "North America" : "Europe"}</p></div>
            <a className="secondary-button" href={selectedProfile.sourceUrl} target="_blank" rel="noreferrer">View ranking ↗</a>
          </section>

          <nav className="character-nav" aria-label={`${selectedProfile.name} sections`}>
            {(["overview", "equipment", "stats", "upgrades", "bosses"] as const).map((view) => <button type="button" key={view} aria-pressed={characterView === view} onClick={() => setCharacterView(view)}>{view === "stats" ? "Stat equivalency" : view === "upgrades" ? "Upgrade plan" : view === "bosses" ? "Boss tracker" : view[0].toUpperCase() + view.slice(1)}</button>)}
          </nav>

          {characterView === "overview" && (
            <div className="character-dashboard">
              <div className="stat-grid">
                <article><span>Weekly rank</span><strong>#{selectedProfile.weeklyRank.toLocaleString()}</strong></article>
                <article><span>Weekly EXP</span><strong>{formatCompactNumber(selectedProfile.weeklyExperience)}</strong></article>
                <article><span>Saved gear</span><strong>{equipment.filter((item) => (item.presetNumber ?? 1) === activeEquipmentPreset).length}</strong></article>
              </div>
              <section className="quick-actions"><h2>Actions</h2><div className="action-grid"><button type="button" onClick={() => setCharacterView("equipment")}><strong>Update equipment</strong></button><button type="button" onClick={() => setCharacterView("upgrades")}><strong>Review upgrades</strong></button></div></section>
            </div>
          )}

          {characterView === "equipment" && (
            <EquipmentManager profileId={selectedProfile.id} characterName={selectedProfile.name} characterJob={selectedProfile.job} characterImageUrl={selectedProfile.imageUrl} equipment={equipment} activePreset={activeEquipmentPreset} onPresetChange={setActiveEquipmentPreset} onChange={setEquipment} onMessage={setMessage} />
          )}

          {characterView === "upgrades" && <UpgradeRecommendations key={selectedProfile.id} equipment={equipment.filter((item) => (item.presetNumber ?? 1) === activeEquipmentPreset)} selectedProfileId={selectedProfileId} characterJob={selectedProfile.job} statEquivalencies={selectedProfile.statEquivalencies ?? []} />}

          {characterView === "stats" && <StatEquivalencyOcr key={`${selectedProfile.id}-${selectedProfile.job}`} profileId={selectedProfile.id} characterName={selectedProfile.name} characterJob={selectedProfile.job} initialEquivalencies={selectedProfile.statEquivalencies ?? []} onSaved={(statEquivalencies) => setProfiles((current) => current.map((profile) => profile.id === selectedProfile.id ? { ...profile, statEquivalencies } : profile))} />}

          {characterView === "bosses" && <BossTracker key={selectedProfile.id} profileId={selectedProfile.id} characterName={selectedProfile.name} onPlanChange={() => setBossIncomeRevision((revision) => revision + 1)} />}

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

function captureProfileTileRects() {
  return new Map([...document.querySelectorAll<HTMLElement>("[data-profile-id]")].map((tile) => [
    Number(tile.dataset.profileId),
    tile.getBoundingClientRect(),
  ]));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
