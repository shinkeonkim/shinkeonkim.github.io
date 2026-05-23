#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "PyYAML>=6",
#   "typer>=0.12",
# ]
# ///
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

import typer
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT = REPO_ROOT / "_posts"
TARGET_ROOT = REPO_ROOT / "src" / "content" / "posts"

DROP_KEYS = {"layout", "math", "categories"}
FILENAME_DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-")
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
HEADING_RE = re.compile(r"^#{1,6}\s")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)|<img\s[^>]*>", re.IGNORECASE)
CSS_BATTLE_NUM_RE = re.compile(r"css-battle-(\d+)", re.IGNORECASE)
MENTORING_NUM_RE = re.compile(r"mentoring-(\d+)", re.IGNORECASE)
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>[\s\S]*?</style>", re.IGNORECASE)
SCRIPT_BLOCK_RE = re.compile(r"<script[^>]*>[\s\S]*?</script>", re.IGNORECASE)
URL_ONLY_RE = re.compile(r"^(?:https?://\S+|/\S+|[\w.-]+\.\w+/\S*)$")


def derive_series(item: "MigrationItem") -> tuple[str, int] | None:
    name = item.source.stem
    if item.dest_dir == "css-battle":
        match = CSS_BATTLE_NUM_RE.search(name)
        if match:
            return "CSS Battle", int(match.group(1))
    if item.dest_dir == "mentoring":
        match = MENTORING_NUM_RE.search(name)
        if match:
            return "소프트웨어 특기자 멘토링", int(match.group(1))
    return None


@dataclass(frozen=True)
class MigrationItem:
    source: Path
    dest_dir: str
    dest_name: str | None = None


def plan() -> list[MigrationItem]:
    items: list[MigrationItem] = []

    for folder in ("css-battle", "TIL", "mentoring"):
        src = LEGACY_ROOT / folder
        for path in sorted(src.glob("*.md")):
            items.append(MigrationItem(path, folder))

    for filename in (
        "2020-01-01-goodbye-2019.md",
        "2021-12-09-goodbye-2021.md",
        "2022-10-30-goodbye-2022.md",
    ):
        items.append(MigrationItem(LEGACY_ROOT / filename, "my-life"))

    for filename in (
        "2021-09-21-python-spread-operator.md",
        "2021-10-01-detect-intersection-two-circle.md",
    ):
        items.append(MigrationItem(LEGACY_ROOT / filename, ""))

    return items


def split_frontmatter(raw: str) -> tuple[dict, str]:
    if not raw.startswith("---"):
        return {}, raw
    closing = raw.find("\n---", 3)
    if closing < 0:
        return {}, raw
    fm_text = raw[3:closing].strip("\n")
    body_start = closing + len("\n---")
    if body_start < len(raw) and raw[body_start] == "\n":
        body_start += 1
    body = raw[body_start:]
    try:
        data = yaml.safe_load(fm_text) or {}
        if not isinstance(data, dict):
            data = {}
    except yaml.YAMLError:
        data = {}
    return data, body


def derive_date(item: MigrationItem, existing: object) -> str | None:
    if isinstance(existing, str) and existing.strip():
        return existing.strip()
    if existing is not None and not isinstance(existing, str):
        return str(existing)
    match = FILENAME_DATE_RE.match(item.source.name)
    if match:
        return match.group(1)
    return None


def strip_inline_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = WIKILINK_RE.sub(lambda m: (m.group(2) or m.group(1)).strip(), text)
    text = MD_LINK_RE.sub(r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    return text


def is_skippable_paragraph(raw: str) -> bool:
    text = raw.strip()
    if not text:
        return True
    if MD_LINK_RE.fullmatch(text):
        return True
    inner = MD_LINK_RE.sub(r"\1", text).strip()
    if URL_ONLY_RE.match(inner):
        return True
    return False


def synthesize_description(body: str, max_len: int = 140) -> str:
    cleaned_body = SCRIPT_BLOCK_RE.sub("", STYLE_BLOCK_RE.sub("", body))
    in_fence = False
    raw_paragraphs: list[str] = []
    current: list[str] = []

    def push() -> None:
        if current:
            raw_paragraphs.append(" ".join(current).strip())
            current.clear()

    for line in cleaned_body.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            push()
            continue
        if in_fence:
            continue
        if not stripped:
            push()
            continue
        if HEADING_RE.match(stripped):
            push()
            continue
        if IMAGE_RE.search(stripped):
            cleaned = IMAGE_RE.sub("", stripped).strip()
            if not cleaned:
                continue
            stripped = cleaned
        if stripped.startswith(">"):
            stripped = stripped.lstrip("> ").strip()
            if not stripped:
                continue
        current.append(stripped)
    push()

    for raw_p in raw_paragraphs:
        if is_skippable_paragraph(raw_p):
            continue
        cleaned = strip_inline_html(raw_p)
        text = re.sub(r"\s+", " ", cleaned).strip()
        if not text:
            continue
        if len(text) > max_len:
            truncated = text[:max_len].rsplit(" ", 1)[0]
            if not truncated:
                truncated = text[:max_len]
            text = truncated.rstrip(",.;:") + "…"
        return text
    return ""


def build_astro_frontmatter(data: dict, item: MigrationItem) -> dict:
    out: dict = {}
    title = data.get("title")
    if isinstance(title, str):
        out["title"] = title.strip()
    if "description" in data and isinstance(data["description"], str) and data["description"].strip():
        out["description"] = data["description"].strip()
    date_value = derive_date(item, data.get("date"))
    if date_value:
        out["date"] = date_value
    if "updated" in data and data["updated"]:
        out["updated"] = data["updated"]
    tags = data.get("tags")
    if isinstance(tags, list):
        cleaned = [str(t).strip() for t in tags if str(t).strip()]
        if cleaned:
            out["tags"] = cleaned
    elif isinstance(tags, str) and tags.strip():
        out["tags"] = [tags.strip()]
    series = derive_series(item)
    if series and "series" not in data:
        out["series"] = series[0]
        out["seriesOrder"] = series[1]
    for key, value in data.items():
        if key in DROP_KEYS or key in {"title", "description", "date", "updated", "tags", "series", "seriesOrder"}:
            continue
        out[key] = value
    if "series" in data and isinstance(data["series"], str):
        out["series"] = data["series"]
    if "seriesOrder" in data:
        out["seriesOrder"] = data["seriesOrder"]
    return out


def serialize_frontmatter(fm: dict) -> str:
    text = yaml.safe_dump(
        fm,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
        width=10_000,
    )
    return text.strip("\n")


def migrate(item: MigrationItem, dry_run: bool) -> tuple[Path, bool]:
    raw = item.source.read_text(encoding="utf-8")
    fm, body = split_frontmatter(raw)
    new_fm = build_astro_frontmatter(fm, item)
    if not new_fm.get("description"):
        synthesized = synthesize_description(body)
        if synthesized:
            new_fm["description"] = synthesized
    ordered: dict = {}
    for key in ("title", "description", "date", "updated", "tags", "series", "seriesOrder"):
        if key in new_fm:
            ordered[key] = new_fm[key]
    for key, value in new_fm.items():
        if key not in ordered:
            ordered[key] = value

    dest_dir = TARGET_ROOT / item.dest_dir if item.dest_dir else TARGET_ROOT
    dest_name = item.dest_name or item.source.name
    dest_path = dest_dir / dest_name

    output = "---\n" + serialize_frontmatter(ordered) + "\n---\n\n" + body.lstrip("\n")
    output = output.rstrip("\n") + "\n"

    if not dry_run:
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path.write_text(output, encoding="utf-8")
    return dest_path, True


def main(
    dry_run: bool = typer.Option(False, "--dry-run", help="Show planned changes only"),
) -> None:
    items = plan()
    missing = [item for item in items if not item.source.exists()]
    if missing:
        for m in missing:
            typer.echo(f"missing source: {m.source}", err=True)
        raise typer.Exit(2)

    for item in items:
        dest, _ = migrate(item, dry_run)
        action = "would write" if dry_run else "wrote"
        relative_src = item.source.relative_to(REPO_ROOT)
        relative_dest = dest.relative_to(REPO_ROOT)
        typer.echo(f"{action}: {relative_src} -> {relative_dest}")

    typer.echo(f"{'dry-run' if dry_run else 'done'}: {len(items)} files")


if __name__ == "__main__":
    sys.exit(typer.run(main) or 0)
