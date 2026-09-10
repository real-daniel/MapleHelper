#!/usr/bin/env python3
"""Extract character stat equivalencies from MapleStory table screenshots.

The target screenshot is a dark table with columns for stat name, quantity, and
final damage equivalency. Tesseract reads this format well after isolating the
bright text from the dark grid, then this script normalizes the common OCR
misreads from that UI.

Output is JSON:
  {
    "equivalencies": [
      {"stat": "Boss Damage", "quantity": 40, "finalDamagePercent": 3.628}
    ],
    "lines": "Boss Damage: 40 = 3.628% final damage",
    "rawText": "..."
  }
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


LINE_RE = re.compile(r"^(?P<stat>.+?)\s+(?P<quantity>\d{1,4})\s+(?P<damage>\d+(?:[.,]\d+)?)\s*%?$")

STAT_ALIASES = {
    "ALLSTAT": "All Stat%",
    "ALLSTATS": "All Stat%",
    "ALLSTAT%": "All Stat%",
    "ALLSTATS%": "All Stat%",
    "ANSTAT": "All Stat%",
    "ANSTAT%": "All Stat%",
    "ATTACKS": "Attack%",
    "ATTACK%S": "Attack%",
    "ATTACK": "Attack",
    "ATTACK%": "Attack%",
    "BOSSDAMAGE": "Boss Damage",
    "CRITICALDMG": "Critical Dmg",
    "DEX": "DEX",
    "DEX%": "DEX%",
    "IGNOREDFF300": "Ignore Def(300)",
    "IGNOREDFF380": "Ignore Def(380)",
    "IGNOREDEF300": "Ignore Def(300)",
    "IGNOREDEF380": "Ignore Def(380)",
    "STR": "STR",
    "STR%": "STR%",
}


def main() -> int:
    if len(sys.argv) != 3:
        print(json.dumps({"error": "usage: extract_stat_equivalencies.py <image-path> <tesseract-command>"}))
        return 2

    image_path = Path(sys.argv[1])
    tesseract_command = sys.argv[2]
    if not image_path.exists():
        print(json.dumps({"error": f"image not found: {image_path}"}))
        return 2

    result = extract_stat_equivalencies(image_path, tesseract_command)
    print(json.dumps(result))
    return 0


def extract_stat_equivalencies(image_path: Path, tesseract_command: str) -> dict[str, object]:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
        preprocessed_path = Path(temp_file.name)

    try:
        preprocess_image(image_path, preprocessed_path)
        raw_text = run_tesseract(preprocessed_path, tesseract_command)
    finally:
        preprocessed_path.unlink(missing_ok=True)

    equivalencies = []
    for line in raw_text.splitlines():
        parsed = parse_line(line)
        if parsed is not None:
            equivalencies.append(parsed)

    return {
        "equivalencies": dedupe(equivalencies),
        "lines": format_lines(dedupe(equivalencies)),
        "rawText": raw_text.strip(),
    }


def preprocess_image(image_path: Path, output_path: Path) -> None:
    image = Image.open(image_path).convert("RGB")
    rgb = np.asarray(image)
    luminance = (
        0.299 * rgb[:, :, 0].astype(np.float32)
        + 0.587 * rgb[:, :, 1].astype(np.float32)
        + 0.114 * rgb[:, :, 2].astype(np.float32)
    )
    median_luminance = float(np.median(luminance))

    # Keep the table text and discard most grid/header chrome. Dark mode uses
    # bright text; light mode uses dark text, so choose the threshold from the
    # image's overall luminance.
    if median_luminance < 128:
        text_mask = (rgb[:, :, 0] > 150) & (rgb[:, :, 1] > 150) & (rgb[:, :, 2] > 150)
    else:
        text_mask = (rgb[:, :, 0] < 105) & (rgb[:, :, 1] < 105) & (rgb[:, :, 2] < 105)

    output = np.full(rgb.shape, 255, dtype=np.uint8)
    output[text_mask] = 0

    preprocessed = Image.fromarray(output)
    preprocessed = preprocessed.resize((image.width * 3, image.height * 3), Image.Resampling.LANCZOS)
    preprocessed = preprocessed.filter(ImageFilter.MinFilter(3))
    preprocessed.save(output_path)


def run_tesseract(image_path: Path, tesseract_command: str) -> str:
    command = [tesseract_command, str(image_path), "stdout", "--psm", "6", "-l", "eng"]
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return completed.stdout


def parse_line(line: str) -> dict[str, object] | None:
    normalized = normalize_spacing(line)
    if not normalized or "final" in normalized.lower():
        return None

    match = LINE_RE.match(normalized)
    if not match:
        return None

    stat = normalize_stat(match.group("stat"))
    if stat is None:
        return None

    return {
        "stat": stat,
        "quantity": int(match.group("quantity")),
        "finalDamagePercent": float(match.group("damage").replace(",", ".")),
    }


def normalize_spacing(line: str) -> str:
    normalized = line.strip()
    normalized = normalized.replace("|", " ")
    normalized = normalized.replace("‘", "")
    normalized = normalized.replace("’", "")
    normalized = normalized.replace("by%", "by %")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def normalize_stat(value: str) -> str | None:
    compact = re.sub(r"[^A-Za-z0-9%]", "", value).upper()
    if compact.startswith("NOTAFFECTEDBY%"):
        stat = compact.removeprefix("NOTAFFECTEDBY%")
        if stat in {"STR", "DEX", "INT", "LUK"}:
            return f"Not Affected by % {stat}"

    return STAT_ALIASES.get(compact)


def dedupe(equivalencies: list[dict[str, object]]) -> list[dict[str, object]]:
    seen: set[str] = set()
    deduped = []
    for equivalency in equivalencies:
        key = str(equivalency["stat"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(equivalency)
    return deduped


def format_lines(equivalencies: list[dict[str, object]]) -> str:
    return "\n".join(
        f"{item['stat']}: {item['quantity']} = {item['finalDamagePercent']:.3f}% final damage"
        for item in equivalencies
    )


if __name__ == "__main__":
    raise SystemExit(main())
