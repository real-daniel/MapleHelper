import { afterEach, describe, expect, it, vi } from "vitest";
import { importCharacter } from "../src/nexon";

afterEach(() => vi.unstubAllGlobals());

describe("legacy Nexon character import parity", () => {
  it("imports the search target and maps its world", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ranks: [{
      characterName: "Unbob", gap: 123456, rank: 42, worldID: 45,
      characterImgURL: "https://msavatar1.nexon.net/Character/Unbob.png", jobName: "Adele", isSearchTarget: true,
    }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await importCharacter("https://www.nexon.com", "Unbob", "NORTH_AMERICA");
    expect(result).toMatchObject({ name: "Unbob", world: "Kronos", job: "Adele", weeklyRank: 42, weeklyExperience: 123456 });
    expect(result.imageUrl).toBe("https://msavatar1.nexon.net/Character/Unbob.png");
  });

  it("rejects avatar URLs outside Nexon's trusted HTTPS host", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ranks: [{
      characterName: "Unbob", gap: 1, rank: 1, worldID: 70,
      characterImgURL: "https://example.com/tracker.png", jobName: "Adele", isSearchTarget: true,
    }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    expect((await importCharacter("https://www.nexon.com", "Unbob", "NORTH_AMERICA")).imageUrl).toBeNull();
  });

  it("reports missing characters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ranks: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })));
    await expect(importCharacter("https://www.nexon.com", "Missing", "EUROPE"))
      .rejects.toMatchObject({ status: 404, message: "Character Missing was not found." });
  });
});
