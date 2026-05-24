#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "Pillow>=10",
#   "typer>=0.12",
# ]
# ///
from __future__ import annotations

import sys
from pathlib import Path

import typer
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = REPO_ROOT / "src" / "avatar.png"
PUBLIC = REPO_ROOT / "public"

SIZES_PNG = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon-96x96.png": 96,
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}
ICO_SIZES = (16, 32, 48, 64)


def resize(img: Image.Image, size: int) -> Image.Image:
    resized = img.copy()
    resized.thumbnail((size, size), Image.LANCZOS)
    if resized.size != (size, size):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        x = (size - resized.size[0]) // 2
        y = (size - resized.size[1]) // 2
        canvas.paste(resized, (x, y))
        return canvas
    return resized


def main(
    source: Path = typer.Option(
        DEFAULT_SOURCE,
        "--source",
        help="Source avatar PNG (square, transparent OK).",
        exists=True,
        dir_okay=False,
        resolve_path=True,
    ),
    public_dir: Path = typer.Option(
        PUBLIC,
        "--out",
        help="Output directory (defaults to ./public).",
        file_okay=False,
        resolve_path=True,
    ),
) -> None:
    img = Image.open(source).convert("RGBA")
    public_dir.mkdir(parents=True, exist_ok=True)

    for name, size in SIZES_PNG.items():
        out = public_dir / name
        resized = resize(img, size)
        resized.save(out, format="PNG", optimize=True)
        typer.echo(f"  wrote {out.relative_to(REPO_ROOT)} ({size}x{size})")

    ico_layers = [resize(img, s) for s in ICO_SIZES]
    ico_path = public_dir / "favicon.ico"
    ico_layers[0].save(ico_path, format="ICO", sizes=[(s, s) for s in ICO_SIZES])
    typer.echo(f"  wrote {ico_path.relative_to(REPO_ROOT)} (sizes={ICO_SIZES})")


if __name__ == "__main__":
    sys.exit(typer.run(main) or 0)
