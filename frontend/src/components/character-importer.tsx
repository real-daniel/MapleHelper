"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { UpgradeRecommendations } from "@/components/upgrade-recommendations";
import { BossTracker } from "@/components/boss-tracker";
import { AccountBossIncome } from "@/components/account-boss-income";
import { StatEquivalencyOcr } from "@/components/stat-equivalency-ocr";
import { EquipmentManager, type EquipmentItem } from "@/components/equipment-manager";
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

export function CharacterImporter() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<Region>("NORTH_AMERICA");
  const [character, setCharacter] = useState<ImportedCharacter | null>(null);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [characterView, setCharacterView] = useState<"overview" | "equipment" | "stats" | "upgrades" | "bosses" | "manage">("overview");
  const [bossIncomeRevision, setBossIncomeRevision] = useState(0);

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
      setBossIncomeRevision((revision) => revision + 1);
      if (selectedProfileId === String(id)) {
        setSelectedProfileId("");
        await loadEquipment("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
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
          <span className="character-portrait">+</span><span><strong>Add character</strong></span>
        </button>
      </div>

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
                <article><span>Saved gear</span><strong>{equipment.length}</strong></article>
              </div>
              <section className="quick-actions"><h2>Actions</h2><div className="action-grid"><button type="button" onClick={() => setCharacterView("equipment")}><strong>Update equipment</strong></button><button type="button" onClick={() => setCharacterView("upgrades")}><strong>Review upgrades</strong></button></div></section>
            </div>
          )}

          {characterView === "equipment" && (
            <EquipmentManager profileId={selectedProfile.id} equipment={equipment} onChange={setEquipment} onMessage={setMessage} />
          )}

          {characterView === "upgrades" && <UpgradeRecommendations equipment={equipment} selectedProfileId={selectedProfileId} />}

          {characterView === "stats" && <StatEquivalencyOcr key={selectedProfile.id} characterName={selectedProfile.name} />}

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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
