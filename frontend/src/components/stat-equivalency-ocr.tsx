"use client";

import { FormEvent, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { equivalencyFieldsForJob, normalizeEquivalencyLabel, type CharacterStatEquivalency } from "./stat-equivalencies";

type CharacterStatEquivalencyExtraction = {
  equivalencies: CharacterStatEquivalency[];
  lines: string;
  rawText: string;
  extractionStatus: string;
  extractionNotes: string;
};

export function StatEquivalencyOcr({ profileId, characterName, characterJob, initialEquivalencies, onSaved }: {
  profileId: number;
  characterName: string;
  characterJob: string;
  initialEquivalencies: CharacterStatEquivalency[];
  onSaved: (equivalencies: CharacterStatEquivalency[]) => void;
}) {
  const fields = useMemo(() => equivalencyFieldsForJob(characterJob), [characterJob]);
  const [equivalencies, setEquivalencies] = useState(() => mergeEquivalencies(fields, initialEquivalencies));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<CharacterStatEquivalencyExtraction | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setMessage("Choose a stat equivalency screenshot first.");
    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch("/api/v1/character-stat-equivalencies/extract", { method: "POST", body: formData });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Stat equivalency extraction failed.");
      const extraction = body as CharacterStatEquivalencyExtraction;
      setResult(extraction);
      if (extraction.extractionStatus === "STAT_EQUIVALENCIES_UNAVAILABLE") throw new Error(extraction.extractionNotes);
      if (extraction.equivalencies.length === 0) {
        setMessage(extraction.extractionNotes);
      } else {
        setEquivalencies((current) => mergeEquivalencies(fields, current, extraction.equivalencies));
        setMessage(`Imported ${extraction.equivalencies.length} OCR row(s) into the manual fields. Review them, then save.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stat equivalency extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const savedEntries = equivalencies.filter((entry) => entry.quantity > 0 || entry.finalDamagePercent > 0);
      const response = await apiFetch(`/api/v1/profiles/${profileId}/stat-equivalencies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equivalencies: savedEntries }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Could not save stat equivalencies.");
      const saved = (body.statEquivalencies ?? savedEntries) as CharacterStatEquivalency[];
      setEquivalencies(mergeEquivalencies(fields, saved));
      onSaved(saved);
      setMessage("Saved character stat equivalencies.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save stat equivalencies.");
    } finally {
      setSaving(false);
    }
  }

  function update(stat: string, key: "quantity" | "finalDamagePercent", value: string) {
    const number = Number(value);
    setEquivalencies((current) => current.map((entry) => entry.stat === stat
      ? { ...entry, [key]: Number.isFinite(number) ? number : 0 }
      : entry));
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!image) return setMessage("Clipboard did not contain an image. Copy a screenshot, then paste it into the box.");
    const pastedFile = image.getAsFile();
    if (!pastedFile) return;
    const extension = pastedFile.type.split("/")[1] || "png";
    const namedFile = new File([pastedFile], `stat-equivalencies.${extension}`, { type: pastedFile.type });
    setFile(namedFile);
    setResult(null);
    setMessage(`Pasted ${namedFile.name} (${namedFile.size.toLocaleString()} bytes).`);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(namedFile));
  }

  return (
    <div className="stat-equivalency-tool" aria-label={`${characterName} stat equivalencies`}>
      <section>
        <div className="section-heading">
          <div><h2>Character stat equivalencies</h2><p className="muted">FD values saved here are used by every upgrade calculation for {characterName}.</p></div>
          <button className="primary-button" disabled={saving} type="button" onClick={() => void save()}>{saving ? "Saving..." : "Save equivalencies"}</button>
        </div>
        {message && <p className="message">{message}</p>}
        <div className="table-scroll">
          <table className="equivalency-table">
            <thead><tr><th>Stat</th><th>Quantity</th><th>Final damage</th><th>FD per unit</th></tr></thead>
            <tbody>{equivalencies.map((entry) => (
              <tr key={entry.stat}>
                <td><strong>{entry.stat}</strong></td>
                <td><input aria-label={`${entry.stat} quantity`} min="0" step="any" type="number" value={entry.quantity || ""} onChange={(event) => update(entry.stat, "quantity", event.target.value)} /></td>
                <td><span className="percent-input"><input aria-label={`${entry.stat} final damage`} min="0" step="0.001" type="number" value={entry.finalDamagePercent || ""} onChange={(event) => update(entry.stat, "finalDamagePercent", event.target.value)} /><span>%</span></span></td>
                <td>{entry.quantity > 0 ? `${(entry.finalDamagePercent / entry.quantity).toFixed(6)}%` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Import from MapleScouter screenshot</h2>
        <p className="muted">OCR fills the same character-level fields above; it does not maintain a separate set of values.</p>
        <form onSubmit={extract}>
          <div className="paste-box" role="button" tabIndex={0} onPaste={handlePaste}>
            <strong>Paste stat equivalency screenshot here</strong><span>Click this box, then press Ctrl+V.</span>
            {file && <small>{file.name} - {file.size.toLocaleString()} bytes</small>}
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview from a pasted local clipboard image. */}
            {previewUrl && <img src={previewUrl} alt="Pasted stat equivalency screenshot preview" />}
          </div>
          <button className="secondary-button" disabled={loading || !file} type="submit">{loading ? "Working..." : "Extract into fields"}</button>
        </form>
        {result && <details><summary>OCR details</summary><p className="muted">{result.extractionNotes} ({result.extractionStatus})</p><label className="full-width-field">Normalized lines<textarea readOnly value={result.lines} /></label><label className="full-width-field">Raw OCR text<textarea readOnly value={result.rawText} /></label></details>}
      </section>
    </div>
  );
}

function mergeEquivalencies(fields: string[], ...sources: CharacterStatEquivalency[][]) {
  const values = new Map<string, CharacterStatEquivalency>();
  for (const source of sources) {
    for (const entry of source) values.set(normalizeEquivalencyLabel(entry.stat), entry);
  }
  return fields.map((stat) => {
    const value = values.get(normalizeEquivalencyLabel(stat));
    return { stat, quantity: value?.quantity ?? 0, finalDamagePercent: value?.finalDamagePercent ?? 0 };
  });
}

async function readBody(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
