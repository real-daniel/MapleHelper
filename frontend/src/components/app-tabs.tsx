"use client";

import { useState } from "react";
import { CharacterImporter } from "@/components/character-importer";
import { CubeCalculator } from "@/components/cube-calculator";
import { FlameCalculator } from "@/components/flame-calculator";
import { StarForceCalculator } from "@/components/star-force-calculator";
import { StatEquivalencyOcr } from "@/components/stat-equivalency-ocr";

type Tab = "progression" | "stat-equivalency" | "star-force" | "cube" | "flame";

export function AppTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("progression");

  return (
    <>
      <nav className="app-tabs" aria-label="MapleHelper modules">
        <button
          type="button"
          aria-pressed={activeTab === "progression"}
          onClick={() => setActiveTab("progression")}
        >
          Character and Equipment
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "stat-equivalency"}
          onClick={() => setActiveTab("stat-equivalency")}
        >
          Stat Equivalency OCR
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "star-force"}
          onClick={() => setActiveTab("star-force")}
        >
          Star Force Calculator
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "cube"}
          onClick={() => setActiveTab("cube")}
        >
          Cube Calculator
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "flame"}
          onClick={() => setActiveTab("flame")}
        >
          Flame Calculator
        </button>
      </nav>

      {activeTab === "progression" && <CharacterImporter />}
      {activeTab === "stat-equivalency" && <StatEquivalencyOcr />}
      {activeTab === "star-force" && <StarForceCalculator />}
      {activeTab === "cube" && <CubeCalculator />}
      {activeTab === "flame" && <FlameCalculator />}
    </>
  );
}
