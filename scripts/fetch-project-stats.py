#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx>=0.27",
#   "PyYAML>=6",
#   "typer>=0.12",
# ]
# ///
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import httpx
import typer
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECTS_DIR = REPO_ROOT / "src" / "content" / "projects"
CACHE_PATH = REPO_ROOT / "src" / "data" / "project-stats.json"
GITHUB_API = "https://api.github.com"
GH_URL_RE = re.compile(r"^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$")


def parse_repo_url(url: str) -> tuple[str, str] | None:
    m = GH_URL_RE.match(url.strip())
    if not m:
        return None
    return m.group(1), m.group(2)


def load_projects() -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    if not PROJECTS_DIR.exists():
        return out
    for path in sorted(PROJECTS_DIR.glob("**/*.md")):
        raw = path.read_text(encoding="utf-8")
        if not raw.startswith("---"):
            continue
        end = raw.find("\n---", 3)
        if end < 0:
            continue
        fm = yaml.safe_load(raw[3:end]) or {}
        if not isinstance(fm, dict):
            continue
        if fm.get("draft"):
            continue
        project_id = path.stem
        out.append((project_id, fm))
    return out


def load_cache() -> dict:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_cache(data: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def is_fresh(entry: dict, max_age_hours: int) -> bool:
    fetched = entry.get("fetchedAt")
    if not isinstance(fetched, str):
        return False
    try:
        ts = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
    except ValueError:
        return False
    age = datetime.now(timezone.utc) - ts
    return age.total_seconds() < max_age_hours * 3600


def github_headers(token: str | None) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "shinkeonkim-blog-stats-fetch",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_repo_stats(
    client: httpx.Client,
    owner: str,
    repo: str,
    username: str,
) -> dict:
    repo_info_url = f"{GITHUB_API}/repos/{owner}/{repo}"
    info_res = client.get(repo_info_url)
    info_res.raise_for_status()
    info = info_res.json()

    total_commits_url = f"{GITHUB_API}/repos/{owner}/{repo}/commits"
    total_res = client.get(total_commits_url, params={"per_page": 1})
    total_res.raise_for_status()
    total_commits = parse_link_last_page(total_res.headers.get("link"))

    my_commits_res = client.get(total_commits_url, params={"per_page": 1, "author": username})
    my_commits_res.raise_for_status()
    my_commits = parse_link_last_page(my_commits_res.headers.get("link"))
    if my_commits == 0 and my_commits_res.json():
        my_commits = len(my_commits_res.json())

    additions = 0
    deletions = 0
    first_commit_date: str | None = None
    last_commit_date: str | None = None
    contrib_url = f"{GITHUB_API}/repos/{owner}/{repo}/stats/contributors"
    contrib_res = client.get(contrib_url)
    if contrib_res.status_code == 200:
        contrib_data = contrib_res.json()
        if isinstance(contrib_data, list):
            for c in contrib_data:
                if c.get("author", {}).get("login", "").lower() != username.lower():
                    continue
                weeks = c.get("weeks", [])
                for w in weeks:
                    additions += w.get("a", 0)
                    deletions += w.get("d", 0)
                    if w.get("c", 0) > 0:
                        w_date = datetime.fromtimestamp(w["w"], tz=timezone.utc).isoformat()
                        if first_commit_date is None or w_date < first_commit_date:
                            first_commit_date = w_date
                        if last_commit_date is None or w_date > last_commit_date:
                            last_commit_date = w_date

    return {
        "url": f"https://github.com/{owner}/{repo}",
        "owner": owner,
        "repo": repo,
        "totalCommits": total_commits,
        "myCommits": my_commits,
        "additions": additions,
        "deletions": deletions,
        "firstCommitDate": first_commit_date,
        "lastCommitDate": last_commit_date,
        "stars": info.get("stargazers_count"),
        "forks": info.get("forks_count"),
        "language": info.get("language"),
    }


def parse_link_last_page(header: str | None) -> int:
    if not header:
        return 0
    for chunk in header.split(","):
        if 'rel="last"' in chunk:
            m = re.search(r"[?&]page=(\d+)", chunk)
            if m:
                return int(m.group(1))
    return 0


def main(
    username: str = typer.Option(
        ...,
        "--user",
        envvar="GITHUB_USERNAME",
        help="자신의 GitHub username (myCommits 계산용)",
    ),
    token: str | None = typer.Option(
        None,
        "--token",
        envvar="GITHUB_TOKEN",
        help="GitHub PAT (rate limit 회피용, 선택)",
    ),
    max_age_hours: int = typer.Option(
        24 * 7,
        "--max-age",
        help="이 시간보다 신선한 캐시는 건너뜀 (시간 단위)",
    ),
    force: bool = typer.Option(False, "--force", help="캐시 무시하고 강제 갱신"),
) -> None:
    projects = load_projects()
    if not projects:
        typer.echo("no projects found", err=True)
        return
    cache = load_cache()
    headers = github_headers(token)
    with httpx.Client(headers=headers, timeout=30.0) as client:
        for project_id, fm in projects:
            existing = cache.get(project_id)
            if not force and existing and is_fresh(existing, max_age_hours):
                typer.echo(f"skip (fresh): {project_id}")
                continue
            repos = [r for r in fm.get("repos", []) if r.get("track", True)]
            if not repos:
                typer.echo(f"skip (no tracked repos): {project_id}")
                continue
            repo_stats: list[dict] = []
            for r in repos:
                parsed = parse_repo_url(r["url"])
                if not parsed:
                    typer.echo(f"  invalid url: {r['url']}", err=True)
                    continue
                owner, repo = parsed
                try:
                    stat = fetch_repo_stats(client, owner, repo, username)
                    repo_stats.append(stat)
                    typer.echo(
                        f"  {owner}/{repo}: my {stat['myCommits']} / total {stat['totalCommits']}"
                    )
                except httpx.HTTPStatusError as e:
                    typer.echo(
                        f"  {owner}/{repo}: HTTP {e.response.status_code} {e.response.text[:120]}",
                        err=True,
                    )
                    repo_stats.append(
                        {
                            "url": r["url"],
                            "owner": owner,
                            "repo": repo,
                            "totalCommits": 0,
                            "myCommits": 0,
                            "additions": 0,
                            "deletions": 0,
                            "error": f"HTTP {e.response.status_code}",
                        }
                    )
            cache[project_id] = {
                "repos": repo_stats,
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
            }
    save_cache(cache)
    typer.echo(f"wrote {CACHE_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    sys.exit(typer.run(main) or 0)
