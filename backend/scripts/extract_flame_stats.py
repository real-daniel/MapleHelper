#!/usr/bin/env python3
"""Extract likely flame stats from MapleStory equipment tooltip images.

This uses Tesseract TSV word boxes for line locations, then samples pixels in
each stat line. The important distinction is color: Star Force components are
yellow, while flame components are green/cyan.

Output is JSON:
  {"flameStats": "STR: +51\nMagic Attack: +3", "lines": 2}
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image


STAT_ALIASES = {
    "STR": "STR",
    "DEX": "DEX",
    "INT": "INT",
    "LUK": "LUK",
    "ALSTATS": "All Stats",
    "ALLSTAT": "All Stats",
    "ALLSTATS": "All Stats",
    "ALLSTATS%": "All Stats",
    "MAXHP": "Max HP",
    "MAXH": "Max HP",
    "MACH P": "Max HP",
    "MACHP": "Max HP",
    "MACH": "Max HP",
    "MAXMP": "Max MP",
    "WAX": "Max MP",
    "ATTACKPOWER": "Attack Power",
    "MAGICATT": "Magic Attack",
    "MAGICATTACK": "Magic Attack",
    "DEFENSE": "Defense",
    "SPEED": "Speed",
    "JUMP": "Jump",
}

VALUE_RE = re.compile(r"[+\-]?\d{1,5}%?")


def main() -> int:
    if len(sys.argv) != 3:
        print(json.dumps({"error": "usage: extract_flame_stats.py <image-path> <tesseract-command>"}))
        return 2

    image_path = Path(sys.argv[1])
    tesseract_command = sys.argv[2]
    if not image_path.exists():
        print(json.dumps({"error": f"image not found: {image_path}"}))
        return 2

    result = extract_flame_stats(image_path, tesseract_command)
    print(json.dumps(result))
    return 0


def extract_flame_stats(image_path: Path, tesseract_command: str) -> dict[str, object]:
    image = Image.open(image_path).convert("RGB")
    words = tesseract_words(image_path, tesseract_command)

    extracted: list[str] = []
    for line in grouped_lines(words):
        stat = stat_name(line["text"])
        if stat is None:
            continue

        values = values_after_total(line["text"])
        if not values:
            continue

        line_box = line["box"]
        if not has_green_text(image, line_box):
            continue

        # Maple tooltips put flame contribution as the green right-most
        # parenthetical component. Color decides whether a component is flame;
        # the text only provides the value.
        flame_value = normalize_value(values[-1])
        if is_zero(flame_value):
            continue

        extracted.append(f"{stat}: {flame_value}")

    return {"flameStats": "\n".join(dedupe(extracted)), "lines": len(extracted)}


def tesseract_words(image_path: Path, tesseract_command: str) -> list[dict[str, object]]:
    command = [tesseract_command, str(image_path), "stdout", "--psm", "6", "tsv"]
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    rows = csv.DictReader(completed.stdout.splitlines(), delimiter="\t")
    words: list[dict[str, object]] = []
    for row in rows:
        text = row.get("text", "").strip()
        if not text:
            continue

        try:
            words.append(
                {
                    "key": (row["block_num"], row["par_num"], row["line_num"]),
                    "text": text,
                    "left": int(row["left"]),
                    "top": int(row["top"]),
                    "width": int(row["width"]),
                    "height": int(row["height"]),
                }
            )
        except (KeyError, ValueError):
            continue

    return words


def grouped_lines(words: list[dict[str, object]]) -> list[dict[str, object]]:
    groups: dict[tuple[str, str, str], list[dict[str, object]]] = defaultdict(list)
    for word in words:
        groups[word["key"]].append(word)

    lines: list[dict[str, object]] = []
    for group_words in groups.values():
        ordered = sorted(group_words, key=lambda word: word["left"])
        left = min(word["left"] for word in ordered)
        top = min(word["top"] for word in ordered)
        right = max(word["left"] + word["width"] for word in ordered)
        bottom = max(word["top"] + word["height"] for word in ordered)
        lines.append(
            {
                "text": " ".join(str(word["text"]) for word in ordered),
                "box": (left, top, right - left, bottom - top),
                "top": top,
            }
        )

    return sorted(lines, key=lambda line: line["top"])


def stat_name(line: str) -> str | None:
    compact = re.sub(r"[^A-Za-z%]", "", line).upper()
    for alias, normalized in sorted(STAT_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if compact.startswith(alias):
            return normalized
    return None


def values_after_total(line: str) -> list[str]:
    values = VALUE_RE.findall(line.replace("#", "+"))
    if len(values) <= 1:
        return []
    return values[1:]


def has_green_text(image: Image.Image, box: tuple[int, int, int, int]) -> bool:
    left, top, width, height = box
    image_width, image_height = image.size
    x0 = max(0, left)
    y0 = max(0, top - 2)
    x1 = min(image_width, left + width)
    y1 = min(image_height, top + height + 2)
    if x1 <= x0 or y1 <= y0:
        return False

    rgb = np.asarray(image.crop((x0, y0, x1, y1))).astype(np.int16)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]

    green_mask = (
        (green >= 150)
        & (blue >= 90)
        & (red <= 90)
        & ((green - red) >= 80)
        & ((blue - red) >= 50)
    )

    return int(green_mask.sum()) >= 8


def normalize_value(value: str) -> str:
    normalized = value.replace(" ", "")
    if not normalized.startswith(("+", "-")):
        normalized = "+" + normalized
    return normalized


def is_zero(value: str) -> bool:
    return value.replace("+", "").replace("-", "").replace("%", "").strip("0") == ""


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


if __name__ == "__main__":
    raise SystemExit(main())
