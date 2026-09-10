#!/usr/bin/env python3
"""Prepare MapleStory equipment screenshots for Tesseract OCR.

The raw screenshots include a translucent tooltip over a busy game scene. This
script crops to the tooltip area, upscales the small UI font, and increases
contrast so Tesseract sees the equipment text instead of the background.

Usage:
  preprocess_equipment_ocr.py <input-image> <output-image>
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


STAR_BAND_HEIGHT = 45


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: preprocess_equipment_ocr.py <input-image> <output-image>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    if not input_path.exists():
        print(f"image not found: {input_path}", file=sys.stderr)
        return 2

    preprocess(input_path, output_path)
    return 0


def preprocess(input_path: Path, output_path: Path) -> None:
    image = Image.open(input_path).convert("RGB")

    # Equipment tooltips are left-aligned in our paste workflow. Cropping a
    # little tighter removes background UI and improves line segmentation.
    width, height = image.size
    tooltip_width = min(width, 330)
    cropped = image.crop((0, 0, tooltip_width, height))
    mask_star_band(cropped)

    scale = 3
    upscaled = cropped.resize((cropped.width * scale, cropped.height * scale), Image.Resampling.LANCZOS)
    gray = ImageOps.grayscale(upscaled)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    gray = ImageEnhance.Contrast(gray).enhance(1.8)
    gray = gray.filter(ImageFilter.SHARPEN)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    gray.save(output_path)


def mask_star_band(image: Image.Image) -> None:
    """Remove bright Star Force graphics before OCR.

    Stars are already counted by the dedicated CV script. Leaving them visible
    causes Tesseract to hallucinate punctuation and random characters before the
    item name.
    """
    if image.height < STAR_BAND_HEIGHT + 20:
        return

    pixels = image.load()
    for y in range(min(STAR_BAND_HEIGHT, image.height)):
        for x in range(image.width):
            red, green, blue = pixels[x, y]
            is_star_pixel = red >= 170 and green >= 145 and blue <= 90
            is_sparkle_pixel = red >= 180 and green >= 170 and blue >= 120
            if is_star_pixel or is_sparkle_pixel:
                pixels[x, y] = (35, 48, 58)


if __name__ == "__main__":
    raise SystemExit(main())
