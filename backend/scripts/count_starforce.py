#!/usr/bin/env python3
"""Count likely MapleStory Star Force stars in an equipment tooltip image.

This is intentionally dependency-light: Pillow + NumPy only. It looks for
gold/yellow connected components in the upper half of the screenshot and counts
star-sized blobs arranged on a horizontal row.

Output is JSON:
  {"starForce": 17, "confidence": 0.82, "candidates": 17}
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: count_starforce.py <image-path>"}))
        return 2

    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(json.dumps({"error": f"image not found: {image_path}"}))
        return 2

    result = count_starforce(image_path)
    print(json.dumps(result))
    return 0


def count_starforce(image_path: Path) -> dict[str, object]:
    image = Image.open(image_path).convert("RGB")
    width, height = image.size

    # Maple equipment tooltips put Star Force near the top. Keep enough vertical
    # room for screenshots that include surrounding UI, but avoid unrelated text.
    crop_height = max(1, int(height * 0.45))
    crop = image.crop((0, 0, width, crop_height))
    rgb = np.asarray(crop)

    filled_mask = gold_mask(rgb)
    filled_components = connected_components(filled_mask)
    filled_candidates = filter_star_candidates(filled_components, width, crop_height)
    rows = star_rows(filled_candidates)
    star_rows_to_count = rows[:2]

    all_star_mask = filled_mask | gray_star_mask(rgb)
    all_components = connected_components(all_star_mask)
    all_candidates = filter_star_candidates(all_components, width, crop_height)
    capacity_rows = star_rows(all_candidates)

    count = sum(len(row) for row in star_rows_to_count)
    confidence = confidence_for(star_rows_to_count, filled_candidates)

    return {
        "starForce": count,
        "totalStarSlots": sum(len(row) for row in capacity_rows[:2]),
        "confidence": confidence,
        "candidates": len(filled_candidates),
        "components": len(filled_components),
    }


def gold_mask(rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)

    # Filled MapleStory Star Force stars are saturated yellow/gold. These bounds
    # are intentionally broad for compression/scaling variance.
    return (
        (red >= 170)
        & (green >= 120)
        & (green <= 245)
        & (blue <= 115)
        & ((red - blue) >= 80)
        & ((green - blue) >= 50)
    )


def gray_star_mask(rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    max_channel = np.maximum(red, np.maximum(green, blue))
    min_channel = np.minimum(red, np.minimum(green, blue))

    # Empty Star Force stars are usually dim gray outlines. Keep this narrow
    # enough to avoid most tooltip body text and borders.
    return (
        (max_channel >= 75)
        & (max_channel <= 170)
        & ((max_channel - min_channel) <= 28)
        & (red >= 70)
        & (green >= 70)
        & (blue >= 70)
    )


def connected_components(mask: np.ndarray) -> list[dict[str, float]]:
    visited = np.zeros(mask.shape, dtype=bool)
    height, width = mask.shape
    components: list[dict[str, float]] = []

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or visited[y, x]:
                continue

            pixels = flood_fill(mask, visited, x, y)
            xs = [pixel[0] for pixel in pixels]
            ys = [pixel[1] for pixel in pixels]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            box_width = max_x - min_x + 1
            box_height = max_y - min_y + 1
            area = len(pixels)

            components.append(
                {
                    "x": (min_x + max_x) / 2,
                    "y": (min_y + max_y) / 2,
                    "min_x": min_x,
                    "max_x": max_x,
                    "min_y": min_y,
                    "max_y": max_y,
                    "width": box_width,
                    "height": box_height,
                    "area": area,
                    "fill": area / float(box_width * box_height),
                }
            )

    return components


def flood_fill(mask: np.ndarray, visited: np.ndarray, start_x: int, start_y: int) -> list[tuple[int, int]]:
    height, width = mask.shape
    queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
    visited[start_y, start_x] = True
    pixels: list[tuple[int, int]] = []

    while queue:
        x, y = queue.popleft()
        pixels.append((x, y))

        for next_x in (x - 1, x, x + 1):
            for next_y in (y - 1, y, y + 1):
                if next_x == x and next_y == y:
                    continue
                if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                    continue
                if visited[next_y, next_x] or not mask[next_y, next_x]:
                    continue
                visited[next_y, next_x] = True
                queue.append((next_x, next_y))

    return pixels


def filter_star_candidates(
    components: list[dict[str, float]], image_width: int, image_height: int
) -> list[dict[str, float]]:
    min_dimension = max(5, image_width * 0.008)
    max_dimension = max(18, image_width * 0.075)
    min_area = max(15, image_width * image_height * 0.000015)
    max_area = image_width * image_height * 0.01

    candidates = []
    for component in components:
        component_width = component["width"]
        component_height = component["height"]
        aspect = component_width / max(component_height, 1)

        if not (min_dimension <= component_width <= max_dimension):
            continue
        if not (min_dimension <= component_height <= max_dimension):
            continue
        if not (0.55 <= aspect <= 1.65):
            continue
        if not (min_area <= component["area"] <= max_area):
            continue
        if component["fill"] > 0.85:
            # Solid rectangles and UI bars are not stars.
            continue

        candidates.append(component)

    return sorted(candidates, key=lambda item: (item["y"], item["x"]))


def best_star_row(candidates: list[dict[str, float]]) -> list[dict[str, float]]:
    if not candidates:
        return []

    best: list[dict[str, float]] = []
    for seed in candidates:
        median_height = max(seed["height"], 1)
        tolerance = max(8, median_height * 0.65)
        row = [candidate for candidate in candidates if abs(candidate["y"] - seed["y"]) <= tolerance]
        row = sorted(row, key=lambda item: item["x"])
        row = merge_near_duplicates(row)

        if len(row) > len(best):
            best = row

    return best


def star_rows(candidates: list[dict[str, float]]) -> list[list[dict[str, float]]]:
    rows: list[list[dict[str, float]]] = []
    for seed in candidates:
        median_height = max(seed["height"], 1)
        tolerance = max(8, median_height * 0.65)
        row = [candidate for candidate in candidates if abs(candidate["y"] - seed["y"]) <= tolerance]
        row = merge_near_duplicates(sorted(row, key=lambda item: item["x"]))
        if len(row) < 3 or not has_regular_spacing(row):
            continue
        if any(rows_overlap(row, existing) for existing in rows):
            continue
        rows.append(row)

    return sorted(rows, key=lambda row: median([item["y"] for item in row]))


def merge_near_duplicates(row: list[dict[str, float]]) -> list[dict[str, float]]:
    if not row:
        return []

    merged = [row[0]]
    for candidate in row[1:]:
        previous = merged[-1]
        min_spacing = max(4, min(previous["width"], candidate["width"]) * 0.55)
        if abs(candidate["x"] - previous["x"]) < min_spacing:
            # Same star split into multiple components; keep the larger one.
            if candidate["area"] > previous["area"]:
                merged[-1] = candidate
        else:
            merged.append(candidate)

    return merged


def has_regular_spacing(row: list[dict[str, float]]) -> bool:
    if len(row) < 3:
        return False

    spacings = [row[index + 1]["x"] - row[index]["x"] for index in range(len(row) - 1)]
    positive_spacings = [spacing for spacing in spacings if spacing > 0]
    if len(positive_spacings) < 2:
        return False

    median_spacing = median(positive_spacings)
    if median_spacing < 6:
        return False

    close_spacings = [spacing for spacing in positive_spacings if median_spacing * 0.45 <= spacing <= median_spacing * 1.75]
    return len(close_spacings) >= max(2, int(len(positive_spacings) * 0.65))


def rows_overlap(left: list[dict[str, float]], right: list[dict[str, float]]) -> bool:
    left_y = median([item["y"] for item in left])
    right_y = median([item["y"] for item in right])
    height = max(median([item["height"] for item in left]), median([item["height"] for item in right]), 1)
    return abs(left_y - right_y) <= max(8, height * 0.65)


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def confidence_for(rows: list[list[dict[str, float]]], candidates: list[dict[str, float]]) -> float:
    if not rows:
        return 0.0

    count = sum(len(row) for row in rows)
    row_score = min(count / 25.0, 1.0)
    noise_score = count / max(len(candidates), 1)
    return round((row_score * 0.65) + (noise_score * 0.35), 3)


if __name__ == "__main__":
    raise SystemExit(main())
