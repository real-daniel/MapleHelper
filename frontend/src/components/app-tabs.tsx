"use client";

import { useState } from "react";
import { CharacterImporter } from "@/components/character-importer";
import { CubeCalculator } from "@/components/cube-calculator";
import { FlameCalculator } from "@/components/flame-calculator";
import { StarForceCalculator } from "@/components/star-force-calculator";

type Area = "characters" | "calculators";
type Calculator = "star-force" | "cube" | "flame";

export function AppTabs() {
  const [activeArea, setActiveArea] = useState<Area>("characters");
  const [activeCalculator, setActiveCalculator] = useState<Calculator>("star-force");

  return (
    <div className="app-shell">
      <nav className="app-tabs" aria-label="MapleHelper modules">
        <button type="button" aria-pressed={activeArea === "characters"} onClick={() => setActiveArea("characters")}>
          <NavIcon name="characters" /> Characters
        </button>
        <button type="button" aria-pressed={activeArea === "calculators"} onClick={() => setActiveArea("calculators")}>
          <NavIcon name="calculator" /> Calculators
        </button>
      </nav>

      {activeArea === "characters" && <CharacterImporter />}
      {activeArea === "calculators" && (
        <div className="module-layout">
          <aside className="module-sidebar">
            <h2>Calculators</h2>
            <nav className="side-nav" aria-label="Calculators">
              <button type="button" aria-pressed={activeCalculator === "star-force"} onClick={() => setActiveCalculator("star-force")}>Star Force</button>
              <button type="button" aria-pressed={activeCalculator === "cube"} onClick={() => setActiveCalculator("cube")}>Cubing</button>
              <button type="button" aria-pressed={activeCalculator === "flame"} onClick={() => setActiveCalculator("flame")}>Flames</button>
            </nav>
          </aside>
          <div className="module-content">
            {activeCalculator === "star-force" && <StarForceCalculator />}
            {activeCalculator === "cube" && <CubeCalculator />}
            {activeCalculator === "flame" && <FlameCalculator />}
          </div>
        </div>
      )}
    </div>
  );
}

function NavIcon({ name }: { name: "characters" | "calculator" }) {
  if (name === "characters") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0-3.7-5.5A5 5 0 0 1 13 8a5 5 0 0 1-.94 2.93A6 6 0 0 1 18 17v1h4v-1a6 6 0 0 0-6-6ZM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 3v4h12V5H6Zm0 7v2h2v-2H6Zm5 0v2h2v-2h-2Zm5 0v2h2v-2h-2ZM6 17v2h2v-2H6Zm5 0v2h2v-2h-2Zm5 0v2h2v-2h-2Z" /></svg>;
}
