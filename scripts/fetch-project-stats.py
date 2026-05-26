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
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
import typer
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECTS_DIR = REPO_ROOT / "src" / "content" / "projects"
CACHE_PATH = REPO_ROOT / "src" / "data" / "project-stats.json"
ETAG_PATH = REPO_ROOT / "src" / "data" / ".project-stats-etags.json"
GITHUB_API = "https://api.github.com"
GH_URL_RE = re.compile(r"^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$")

STATS_WARMUP_SECONDS = 30
WARMUP_PACING_SECONDS = 0.4


def parse_repo_url(url: str) -> tuple[str, str] | None:
    m = GH_URL_RE.match(url.strip())
    if not m:
        return None
    return m.group(1), m.group(2)


def normalize_repo(r: object) -> dict | None:
    """Mirror src/content.config.ts projects.repos preprocess: bare string -> {url}."""
    if isinstance(r, str):
        return {"url": r, "track": True}
    if isinstance(r, dict):
        out = dict(r)
        out.setdefault("track", True)
        return out
    return None


def load_projects() -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    if not PROJECTS_DIR.exists():
        return out
    paths = sorted(
        {*PROJECTS_DIR.glob("**/*.md"), *PROJECTS_DIR.glob("**/*.mdx")}
    )
    for path in paths:
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
        repos_raw = fm.get("repos", []) or []
        fm["repos"] = [r for r in (normalize_repo(x) for x in repos_raw) if r is not None]
        project_id = path.stem
        out.append((project_id, fm))
    return out


def load_json_file(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_json_file(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def is_fresh(timestamp: str | None, max_age_hours: int) -> bool:
    if not isinstance(timestamp, str):
        return False
    try:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
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


def _retry_after(res: httpx.Response, default: float) -> float:
    val = res.headers.get("retry-after")
    if val:
        try:
            return float(val)
        except ValueError:
            pass
    reset = res.headers.get("x-ratelimit-reset")
    if reset:
        try:
            return max(default, float(reset) - time.time())
        except ValueError:
            pass
    return default


def gh_get(
    client: httpx.Client,
    url: str,
    *,
    params: dict | None = None,
    extra_headers: dict | None = None,
    retries: int = 5,
    base_delay: float = 60.0,
) -> httpx.Response:
    """GET with backoff on 403/429 (secondary rate limit) and 5xx.

    Default base_delay=60 matches GitHub's documented guidance to wait at least
    one minute before retrying when retry-after is not provided.
    """
    last: httpx.Response | None = None
    for attempt in range(retries):
        res = client.get(url, params=params, headers=extra_headers)
        last = res
        if res.status_code in (403, 429):
            wait = _retry_after(res, base_delay * (2**attempt))
            if attempt < retries - 1:
                time.sleep(min(wait, 300.0))
                continue
        if 500 <= res.status_code < 600 and attempt < retries - 1:
            time.sleep(base_delay * (2**attempt))
            continue
        return res
    assert last is not None
    return last


def gh_get_cached(
    client: httpx.Client,
    etags: dict,
    key: str,
    url: str,
    *,
    params: dict | None = None,
    has_fallback: bool = True,
) -> httpx.Response:
    """GET with If-None-Match. 304 responses don't count against primary rate limit.

    Updates etags[key] when a 200 response carries a new ETag. If 304 arrives
    but the caller has no fallback data, invalidates the stale ETag and refetches
    so the response always carries a usable body when caller cannot reuse cache.
    """
    extra = {}
    if has_fallback and key in etags:
        extra["If-None-Match"] = etags[key]
    res = gh_get(client, url, params=params, extra_headers=extra or None)
    if res.status_code == 304 and not has_fallback:
        etags.pop(key, None)
        res = gh_get(client, url, params=params)
    if res.status_code == 200:
        new_etag = res.headers.get("etag")
        if new_etag:
            etags[key] = new_etag
    return res


def parse_link_last_page(header: str | None) -> int:
    if not header:
        return 0
    for chunk in header.split(","):
        if 'rel="last"' in chunk:
            m = re.search(r"[?&]page=(\d+)", chunk)
            if m:
                return int(m.group(1))
    return 0


def fetch_stats_endpoint(
    client: httpx.Client,
    url: str,
    *,
    retries: int = 3,
    delay: float = 5.0,
) -> object | None:
    """GitHub /stats/* endpoints return 202 while computing. Retry briefly."""
    for attempt in range(retries):
        res = gh_get(client, url)
        if res.status_code == 200:
            try:
                return res.json()
            except ValueError:
                return None
        if res.status_code == 202 and attempt < retries - 1:
            time.sleep(delay)
            continue
        return None
    return None


def warmup_stats(
    client: httpx.Client,
    targets: list[tuple[str, str]],
    pacing_seconds: float = WARMUP_PACING_SECONDS,
) -> None:
    """Phase 1: trigger /stats/contributors and /stats/commit_activity for every repo.

    GitHub returns 202 immediately and begins computing in parallel server-side.
    By the time we revisit each repo in phase 3, stats are typically ready.
    """
    for owner, repo in targets:
        for endpoint in ("stats/contributors", "stats/commit_activity"):
            try:
                client.get(f"{GITHUB_API}/repos/{owner}/{repo}/{endpoint}", timeout=15.0)
            except httpx.HTTPError:
                pass
            if pacing_seconds > 0:
                time.sleep(pacing_seconds)


def fetch_repo_info(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    existing: dict | None,
) -> dict:
    key = f"{owner}/{repo}:info"
    res = gh_get_cached(
        client,
        etags,
        key,
        f"{GITHUB_API}/repos/{owner}/{repo}",
        has_fallback=existing is not None,
    )
    if res.status_code == 304 and existing:
        return {
            "stars": existing.get("stars"),
            "forks": existing.get("forks"),
            "pushedAt": existing.get("pushedAt"),
            "topics": existing.get("topics") or [],
            "license": existing.get("license"),
        }
    res.raise_for_status()
    info = res.json()
    license_info = info.get("license") or {}
    license_id = license_info.get("spdx_id") if isinstance(license_info, dict) else None
    if license_id == "NOASSERTION":
        license_id = None
    return {
        "stars": info.get("stargazers_count"),
        "forks": info.get("forks_count"),
        "pushedAt": info.get("pushed_at"),
        "topics": info.get("topics") or [],
        "license": license_id,
    }


def fetch_commit_totals(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    username: str,
    existing: dict | None,
) -> tuple[int, int]:
    base = f"{GITHUB_API}/repos/{owner}/{repo}/commits"
    has_fallback = existing is not None

    total_key = f"{owner}/{repo}:commits-total"
    total_res = gh_get_cached(
        client, etags, total_key, base, params={"per_page": 1}, has_fallback=has_fallback
    )
    if total_res.status_code == 304 and existing:
        total = int(existing.get("totalCommits", 0) or 0)
    else:
        total_res.raise_for_status()
        total = parse_link_last_page(total_res.headers.get("link"))
        if total == 0 and total_res.json():
            total = len(total_res.json())

    my_key = f"{owner}/{repo}:commits-mine"
    my_res = gh_get_cached(
        client,
        etags,
        my_key,
        base,
        params={"per_page": 1, "author": username},
        has_fallback=has_fallback,
    )
    if my_res.status_code == 304 and existing:
        my = int(existing.get("myCommits", 0) or 0)
    else:
        my_res.raise_for_status()
        my = parse_link_last_page(my_res.headers.get("link"))
        if my == 0 and my_res.json():
            my = len(my_res.json())

    return total, my


def fetch_languages(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    existing: dict | None,
) -> dict[str, int]:
    key = f"{owner}/{repo}:languages"
    res = gh_get_cached(
        client,
        etags,
        key,
        f"{GITHUB_API}/repos/{owner}/{repo}/languages",
        has_fallback=existing is not None,
    )
    if res.status_code == 304 and existing:
        return existing.get("languages") or {}
    if res.status_code != 200:
        return (existing or {}).get("languages") or {}
    data = res.json()
    return data if isinstance(data, dict) else {}


def fetch_top_contributors(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    existing: dict | None,
    limit: int = 10,
) -> list[dict]:
    key = f"{owner}/{repo}:contributors"
    res = gh_get_cached(
        client,
        etags,
        key,
        f"{GITHUB_API}/repos/{owner}/{repo}/contributors",
        params={"per_page": limit, "anon": "false"},
        has_fallback=existing is not None,
    )
    if res.status_code == 304 and existing:
        return existing.get("topContributors") or []
    if res.status_code != 200:
        return (existing or {}).get("topContributors") or []
    data = res.json()
    if not isinstance(data, list):
        return []
    return [
        {
            "login": c.get("login"),
            "avatarUrl": c.get("avatar_url"),
            "htmlUrl": c.get("html_url"),
            "contributions": c.get("contributions", 0),
        }
        for c in data
        if c.get("type") != "Anonymous"
    ]


def fetch_releases(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    existing: dict | None,
    limit: int = 5,
) -> list[dict]:
    key = f"{owner}/{repo}:releases"
    res = gh_get_cached(
        client,
        etags,
        key,
        f"{GITHUB_API}/repos/{owner}/{repo}/releases",
        params={"per_page": limit},
        has_fallback=existing is not None,
    )
    if res.status_code == 304 and existing:
        return existing.get("releases") or []
    if res.status_code != 200:
        return (existing or {}).get("releases") or []
    data = res.json()
    if not isinstance(data, list):
        return []
    return [
        {
            "tag": r.get("tag_name"),
            "name": r.get("name") or r.get("tag_name"),
            "publishedAt": r.get("published_at"),
            "url": r.get("html_url"),
            "prerelease": bool(r.get("prerelease")),
        }
        for r in data
        if not r.get("draft")
    ]


def fetch_contributor_stats(
    client: httpx.Client,
    owner: str,
    repo: str,
    username: str,
    existing: dict | None,
) -> tuple[int, int, str | None, bool]:
    contrib_data = fetch_stats_endpoint(
        client, f"{GITHUB_API}/repos/{owner}/{repo}/stats/contributors"
    )
    if not isinstance(contrib_data, list):
        if existing is not None:
            return (
                int(existing.get("additions", 0) or 0),
                int(existing.get("deletions", 0) or 0),
                existing.get("firstCommitDate"),
                False,
            )
        return 0, 0, None, False
    additions = 0
    deletions = 0
    first_commit_date: str | None = None
    for c in contrib_data:
        if c.get("author", {}).get("login", "").lower() != username.lower():
            continue
        for w in c.get("weeks", []):
            additions += w.get("a", 0)
            deletions += w.get("d", 0)
            if w.get("c", 0) > 0:
                w_date = datetime.fromtimestamp(w["w"], tz=timezone.utc).isoformat()
                if first_commit_date is None or w_date < first_commit_date:
                    first_commit_date = w_date
    return additions, deletions, first_commit_date, True


def fetch_commit_activity(
    client: httpx.Client,
    owner: str,
    repo: str,
    existing: dict | None,
) -> tuple[list[dict], bool]:
    data = fetch_stats_endpoint(
        client, f"{GITHUB_API}/repos/{owner}/{repo}/stats/commit_activity"
    )
    if not isinstance(data, list):
        if existing is not None:
            return existing.get("commitActivity") or [], False
        return [], False
    activity = [
        {"week": w.get("week", 0), "total": w.get("total", 0), "days": w.get("days", [0] * 7)}
        for w in data
    ]
    return activity, True


def fetch_repo_stats(
    client: httpx.Client,
    etags: dict,
    owner: str,
    repo: str,
    username: str,
    existing: dict | None,
    *,
    max_age_stats_hours: int,
    force_stats: bool,
) -> tuple[dict, str]:
    """Fetch full repo stats with totalCommits heuristic + per-repo stats TTL.

    Returns (stat_dict, status) where status is 'fresh-stats' or 'reused-stats' or
    'no-change'. Status is informational for the CLI output only.
    """
    info_dict = fetch_repo_info(client, etags, owner, repo, existing)
    total_commits, my_commits = fetch_commit_totals(
        client, etags, owner, repo, username, existing
    )
    languages = fetch_languages(client, etags, owner, repo, existing)
    top_contributors = fetch_top_contributors(client, etags, owner, repo, existing)
    releases = fetch_releases(client, etags, owner, repo, existing)

    stats_can_reuse = (
        not force_stats
        and existing is not None
        and existing.get("totalCommits") == total_commits
        and total_commits > 0
        and is_fresh(existing.get("_statsFetchedAt"), max_age_stats_hours)
    )

    if stats_can_reuse:
        assert existing is not None
        additions = int(existing.get("additions", 0) or 0)
        deletions = int(existing.get("deletions", 0) or 0)
        first_commit_date = existing.get("firstCommitDate")
        commit_activity = existing.get("commitActivity") or []
        stats_fetched_at = existing.get("_statsFetchedAt")
        status = "reused-stats"
    else:
        additions, deletions, first_commit_date, contrib_ok = fetch_contributor_stats(
            client, owner, repo, username, existing
        )
        commit_activity, activity_ok = fetch_commit_activity(
            client, owner, repo, existing
        )
        if contrib_ok and activity_ok:
            stats_fetched_at = datetime.now(timezone.utc).isoformat()
            status = "fresh-stats"
        else:
            stats_fetched_at = (existing or {}).get("_statsFetchedAt")
            status = "stale-stats" if existing else "no-stats"

    return {
        "url": f"https://github.com/{owner}/{repo}",
        "owner": owner,
        "repo": repo,
        "totalCommits": total_commits,
        "myCommits": my_commits,
        "additions": additions,
        "deletions": deletions,
        "firstCommitDate": first_commit_date,
        "stars": info_dict["stars"],
        "forks": info_dict["forks"],
        "pushedAt": info_dict["pushedAt"],
        "topics": info_dict["topics"],
        "license": info_dict["license"],
        "languages": languages,
        "commitActivity": commit_activity,
        "topContributors": top_contributors,
        "releases": releases,
        "_statsFetchedAt": stats_fetched_at,
    }, status


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
        help="이 시간보다 신선한 프로젝트 캐시는 건너뜀 (시간 단위)",
    ),
    max_age_stats_hours: int = typer.Option(
        24 * 30,
        "--max-age-stats",
        help="/stats/* 데이터 전용 TTL. 이보다 신선하면 totalCommits 변화 없을 때 스킵 (시간 단위)",
    ),
    warmup_seconds: int = typer.Option(
        STATS_WARMUP_SECONDS,
        "--warmup-seconds",
        help="/stats/* 트리거 후 GitHub 계산 대기 시간 (초)",
    ),
    force: bool = typer.Option(False, "--force", help="모든 캐시 무시하고 강제 갱신"),
    force_stats: bool = typer.Option(
        False, "--force-stats", help="/stats/* 캐시만 무시하고 강제 갱신"
    ),
    no_warmup: bool = typer.Option(
        False, "--no-warmup", help="/stats/* pre-warm 단계 건너뛰기 (이미 캐시 데웠을 때)"
    ),
) -> None:
    projects = load_projects()
    if not projects:
        typer.echo("no projects found", err=True)
        return
    cache = load_json_file(CACHE_PATH)
    etags = load_json_file(ETAG_PATH)
    headers = github_headers(token)

    project_plan: list[tuple[str, dict, list[dict], dict | None]] = []
    for project_id, fm in projects:
        existing = cache.get(project_id)
        if not force and existing and is_fresh(existing.get("fetchedAt"), max_age_hours):
            typer.echo(f"skip (fresh): {project_id}")
            continue
        repos = [r for r in fm.get("repos", []) if r.get("track", True)]
        if not repos:
            typer.echo(f"skip (no tracked repos): {project_id}")
            continue
        project_plan.append((project_id, fm, repos, existing))

    if not project_plan:
        typer.echo("nothing to refresh")
        return

    warmup_targets: list[tuple[str, str]] = []
    for project_id, _fm, repos, existing in project_plan:
        existing_by_key = {
            (s.get("owner"), s.get("repo")): s
            for s in (existing or {}).get("repos", [])
        }
        for r in repos:
            parsed = parse_repo_url(r["url"])
            if not parsed:
                continue
            owner, repo = parsed
            existing_stat = existing_by_key.get((owner, repo))
            needs_stats = (
                force
                or force_stats
                or existing_stat is None
                or not is_fresh(
                    existing_stat.get("_statsFetchedAt"), max_age_stats_hours
                )
            )
            if needs_stats:
                warmup_targets.append((owner, repo))

    with httpx.Client(headers=headers, timeout=30.0) as client:
        if warmup_targets and not no_warmup:
            typer.echo(
                f"warmup: triggering /stats/* for {len(warmup_targets)} repos "
                f"({len(warmup_targets) * 2} requests)"
            )
            warmup_stats(client, warmup_targets)
            typer.echo(f"warmup: sleeping {warmup_seconds}s for GitHub to compute")
            time.sleep(warmup_seconds)

        for project_id, _fm, repos, existing in project_plan:
            typer.echo(f"refresh: {project_id}")
            existing_by_key = {
                (s.get("owner"), s.get("repo")): s
                for s in (existing or {}).get("repos", [])
            }
            repo_stats: list[dict] = []
            for r in repos:
                parsed = parse_repo_url(r["url"])
                if not parsed:
                    typer.echo(f"  invalid url: {r['url']}", err=True)
                    continue
                owner, repo = parsed
                existing_stat = existing_by_key.get((owner, repo))
                try:
                    stat, status = fetch_repo_stats(
                        client,
                        etags,
                        owner,
                        repo,
                        username,
                        existing_stat,
                        max_age_stats_hours=max_age_stats_hours,
                        force_stats=force or force_stats,
                    )
                    repo_stats.append(stat)
                    typer.echo(
                        f"  {owner}/{repo}: my {stat['myCommits']} / total "
                        f"{stat['totalCommits']} [{status}]"
                    )
                except httpx.HTTPStatusError as e:
                    body = e.response.text[:120]
                    typer.echo(
                        f"  {owner}/{repo}: HTTP {e.response.status_code} {body}",
                        err=True,
                    )
                    fallback = existing_stat or {
                        "url": r["url"],
                        "owner": owner,
                        "repo": repo,
                        "totalCommits": 0,
                        "myCommits": 0,
                        "additions": 0,
                        "deletions": 0,
                    }
                    repo_stats.append(
                        {**fallback, "error": f"HTTP {e.response.status_code}"}
                    )
            cache[project_id] = {
                "repos": repo_stats,
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
            }
            save_json_file(CACHE_PATH, cache)
            save_json_file(ETAG_PATH, etags)

    typer.echo(f"wrote {CACHE_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    sys.exit(typer.run(main) or 0)
