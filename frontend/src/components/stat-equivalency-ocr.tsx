"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

type CharacterStatEquivalency = {
  stat: string;
  quantity: number;
  finalDamagePercent: number;
};

type CharacterStatEquivalencyExtraction = {
  equivalencies: CharacterStatEquivalency[];
  lines: string;
  rawText: string;
  extractionStatus: string;
  extractionNotes: string;
};

export function StatEquivalencyOcr() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<CharacterStatEquivalencyExtraction | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a stat equivalency screenshot first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch("/api/v1/character-stat-equivalencies/extract", {
        method: "POST",
        body: formData,
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message ?? "Stat equivalency extraction failed.");
      setResult(body as CharacterStatEquivalencyExtraction);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stat equivalency extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"));

    if (!image) {
      setMessage("Clipboard did not contain an image. Copy a screenshot, then paste it into the box.");
      return;
    }

    const pastedFile = image.getAsFile();
    if (!pastedFile) {
      setMessage("Could not read the pasted image.");
      return;
    }

    const extension = pastedFile.type.split("/")[1] || "png";
    const namedFile = new File([pastedFile], `stat-equivalencies.${extension}`, { type: pastedFile.type });
    setFile(namedFile);
    setResult(null);
    setMessage(`Pasted ${namedFile.name} (${namedFile.size.toLocaleString()} bytes).`);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(namedFile));
  }

  return (
    <main>
      <h1>Stat Equivalency OCR</h1>
      <p className="muted">Paste the final-damage equivalency table from your character stats.</p>

      {message && <p className="message">{message}</p>}

      <section>
        <form onSubmit={extract}>
          <div
            className="paste-box"
            role="button"
            tabIndex={0}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.currentTarget.focus();
              }
            }}
          >
            <strong>Paste stat equivalency screenshot here</strong>
            <span>Click this box, then press Ctrl+V.</span>
            {file && <small>{file.name} - {file.size.toLocaleString()} bytes</small>}
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview from a pasted local clipboard image. */}
            {previewUrl && <img src={previewUrl} alt="Pasted stat equivalency screenshot preview" />}
          </div>
          <button disabled={loading || !file} type="submit">{loading ? "Working..." : "Upload + extract"}</button>
        </form>
      </section>

      {result && (
        <section>
          <h2>Extracted equivalencies</h2>
          <p className="message">{result.extractionNotes}</p>
          <p className="muted">Extraction status: {result.extractionStatus}</p>

          {result.equivalencies.length > 0 && (
            <table>
              <thead>
                <tr><th>Stat</th><th>Quantity</th><th>Final damage</th></tr>
              </thead>
              <tbody>
                {result.equivalencies.map((item) => (
                  <tr key={item.stat}>
                    <td>{item.stat}</td>
                    <td>{item.quantity}</td>
                    <td>{item.finalDamagePercent.toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <label className="full-width-field">Normalized lines<textarea readOnly value={result.lines} /></label>
          <label className="full-width-field">Raw OCR text<textarea readOnly value={result.rawText} /></label>
        </section>
      )}
    </main>
  );
}

async function readBody(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
