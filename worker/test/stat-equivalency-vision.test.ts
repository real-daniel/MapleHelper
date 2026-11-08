import { describe, expect, it, vi } from "vitest";
import { extractStatEquivalencies } from "../src/vision";
import type { Env } from "../src/types";

function form() {
  const result = new FormData();
  result.append("file", new File([new Uint8Array([137, 80, 78, 71])], "stats.png", { type: "image/png" }));
  return result;
}

function environment(response: unknown) {
  return { AI: { run: vi.fn().mockResolvedValue(response) } } as unknown as Env;
}

describe("stat-equivalency vision extraction", () => {
  it("accepts the plain-text response returned by the vision model", async () => {
    const result = await extractStatEquivalencies(environment({ response: "STR | 30 | 0.235%\nDEX | 30 | 0.120%" }), form());
    expect(result.extractionStatus).toBe("STAT_EQUIVALENCIES_COMPLETED");
    expect(result.equivalencies).toEqual([
      { stat: "STR", quantity: 30, finalDamagePercent: 0.235 },
      { stat: "DEX", quantity: 30, finalDamagePercent: 0.12 },
    ]);
  });

  it("continues to accept a structured JSON response", async () => {
    const response = JSON.stringify({ rawText: "INT 30 0.235%\nLUK 30 0.100%", equivalencies: [] });
    const result = await extractStatEquivalencies(environment({ response }), form());
    expect(result.equivalencies.map((entry) => entry.stat)).toEqual(["INT", "LUK"]);
  });

  it("reports an actionable no-rows result instead of claiming success", async () => {
    const result = await extractStatEquivalencies(environment({ response: "I cannot read this screenshot." }), form());
    expect(result.extractionStatus).toBe("STAT_EQUIVALENCIES_NO_ROWS");
    expect(result.equivalencies).toEqual([]);
    expect(result.extractionNotes).toContain("tighter crop");
  });
});
