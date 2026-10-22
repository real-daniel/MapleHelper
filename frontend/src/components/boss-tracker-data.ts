export type ResetPeriod = "WEEKLY" | "MONTHLY";

export type BossDifficulty = { name: string; crystalValue: number };
export type BossDefinition = {
  key: string;
  name: string;
  period: ResetPeriod;
  difficulties: BossDifficulty[];
};

// GMS Heroic reference values, verified against MapleIsland v.271 (September 2026).
// Values remain editable in the tracker because regional and balance updates can change them.
export const BOSSES: BossDefinition[] = [
  { key: "zakum", name: "Zakum", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 81_000_000 }] },
  { key: "magnus", name: "Magnus", period: "WEEKLY", difficulties: [{ name: "Hard", crystalValue: 95_060_000 }] },
  { key: "hilla", name: "Hilla", period: "WEEKLY", difficulties: [{ name: "Hard", crystalValue: 56_250_000 }] },
  { key: "pink-bean", name: "Pink Bean", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 64_000_000 }] },
  { key: "cygnus", name: "Cygnus", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 45_560_000 }, { name: "Normal", crystalValue: 72_250_000 }] },
  { key: "von-bon", name: "Von Bon", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 81_000_000 }] },
  { key: "pierre", name: "Pierre", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 81_000_000 }] },
  { key: "crimson-queen", name: "Crimson Queen", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 81_000_000 }] },
  { key: "vellum", name: "Vellum", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 105_060_000 }] },
  { key: "papulatus", name: "Papulatus", period: "WEEKLY", difficulties: [{ name: "Chaos", crystalValue: 132_250_000 }] },
  { key: "princess-no", name: "Princess No", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 81_000_000 }] },
  { key: "akechi", name: "Akechi Mitsuhide", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 144_000_000 }] },
  { key: "lotus", name: "Lotus", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 162_560_000 }, { name: "Hard", crystalValue: 444_680_000 }, { name: "Extreme", crystalValue: 1_400_000_000 }] },
  { key: "damien", name: "Damien", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 169_000_000 }, { name: "Hard", crystalValue: 421_880_000 }] },
  { key: "guardian-angel-slime", name: "Guardian Angel Slime", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 231_670_000 }, { name: "Chaos", crystalValue: 600_580_000 }] },
  { key: "lucid", name: "Lucid", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 237_010_000 }, { name: "Normal", crystalValue: 253_830_000 }, { name: "Hard", crystalValue: 504_000_000 }] },
  { key: "will", name: "Will", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 246_740_000 }, { name: "Normal", crystalValue: 279_080_000 }, { name: "Hard", crystalValue: 621_810_000 }] },
  { key: "gloom", name: "Gloom", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 297_680_000 }, { name: "Chaos", crystalValue: 563_950_000 }] },
  { key: "darknell", name: "Darknell", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 316_880_000 }, { name: "Hard", crystalValue: 667_920_000 }] },
  { key: "verus-hilla", name: "Verus Hilla", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 581_880_000 }, { name: "Hard", crystalValue: 762_110_000 }] },
  { key: "chosen-seren", name: "Chosen Seren", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 889_020_000 }, { name: "Hard", crystalValue: 1_100_000_000 }] },
  { key: "kalos", name: "Kalos the Guardian", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 937_500_000 }, { name: "Normal", crystalValue: 1_300_000_000 }, { name: "Chaos", crystalValue: 2_600_000_000 }, { name: "Extreme", crystalValue: 5_200_000_000 }] },
  { key: "first-adversary", name: "First Adversary", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 985_000_000 }, { name: "Normal", crystalValue: 1_370_000_000 }, { name: "Hard", crystalValue: 2_940_000_000 }, { name: "Extreme", crystalValue: 5_880_000_000 }] },
  { key: "kaling", name: "Kaling", period: "WEEKLY", difficulties: [{ name: "Easy", crystalValue: 1_030_000_000 }, { name: "Normal", crystalValue: 1_510_000_000 }, { name: "Hard", crystalValue: 2_990_000_000 }, { name: "Extreme", crystalValue: 6_030_000_000 }] },
  { key: "malefic-star", name: "Malefic Star", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 1_450_000_000 }, { name: "Hard", crystalValue: 3_990_000_000 }] },
  { key: "limbo", name: "Limbo", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 2_100_000_000 }, { name: "Hard", crystalValue: 3_750_000_000 }] },
  { key: "baldrix", name: "Baldrix", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 2_800_000_000 }, { name: "Hard", crystalValue: 4_200_000_000 }] },
  { key: "jupiter", name: "Jupiter", period: "WEEKLY", difficulties: [{ name: "Normal", crystalValue: 2_970_000_000 }, { name: "Hard", crystalValue: 5_950_000_000 }] },
  { key: "black-mage", name: "Black Mage", period: "MONTHLY", difficulties: [{ name: "Hard", crystalValue: 4_500_000_000 }, { name: "Extreme", crystalValue: 18_000_000_000 }] },
];

export function personalCrystalIncome(crystalValue: number, partySize: number) {
  return Math.floor(Math.max(0, crystalValue) / Math.min(6, Math.max(1, partySize)));
}

export function formatMeso(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 1 : 2)}b`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}m`;
  return Math.floor(value).toLocaleString();
}
