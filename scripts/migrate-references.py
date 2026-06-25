#!/usr/bin/env python3
"""
Migrate inline external references from body "참고/References" sections into
frontmatter `references` field, using source IDs where available.

- Wikilinks ([[Page]]) stay in body (navigation aids).
- BOJ practice problem links (kokoa-lab, acmicpc.net, etc.) are NOT references,
  skip.
- External URLs map to source IDs via SOURCE_MAP; otherwise inline.
- Frontmatter references are deduplicated by (id or url) + note.

Run:
    python3 scripts/migrate-references.py [--dry-run] [--limit N]
"""

import argparse
import re
import sys
import glob
from pathlib import Path
from urllib.parse import unquote


# ----------------------------------------------------------------------
# URL → source ID mapping. Order matters (first match wins).
# ----------------------------------------------------------------------
SOURCE_MAP = [
    # (url_regex, source_id, note_lambda or None)
    (r'solved\.ac/problems/tags/([a-z0-9_]+)', 'solved-ac',
        lambda m, txt: f"tag: {m.group(1)}"),
    (r'solved\.ac', 'solved-ac', None),
    (r'pandas\.pydata\.org', 'pandas-docs', None),
    (r'developer\.mozilla\.org/[a-z\-]+/docs/(.+?)(?:[?#]|$)', 'mdn-web-docs',
        lambda m, txt: m.group(1).replace('_', ' ').rstrip('/')),
    (r'developer\.mozilla\.org', 'mdn-web-docs', None),
    (r'docs\.oracle\.com', 'oracle-jdk-docs', None),
    (r'en\.wikipedia\.org/wiki/([^/?#]+)', 'wikipedia',
        lambda m, txt: unquote(m.group(1)).replace('_', ' ')),
    (r'cp-algorithms\.com/([^?#]+)', 'cp-algorithms',
        lambda m, txt: m.group(1).rstrip('/').rstrip('.html')),
    (r'cp-algorithms\.com', 'cp-algorithms', None),
    (r'koosaga\.com/(\d+)', 'koosaga-blog',
        lambda m, txt: f"post {m.group(1)}"),
    (r'koosaga\.com', 'koosaga-blog', None),
    (r'codeforces\.com/blog/entry/(\d+)', 'codeforces',
        lambda m, txt: f"blog entry {m.group(1)}"),
    (r'codeforces\.com/contest/(\d+)/problem/([A-Z0-9]+)', 'codeforces',
        lambda m, txt: f"contest {m.group(1)} {m.group(2)}"),
    (r'codeforces\.com', 'codeforces', None),
    (r'en\.cppreference\.com/w/cpp/(.+?)(?:[?#]|$)', 'cppreference',
        lambda m, txt: m.group(1).rstrip('/')),
    (r'en\.cppreference\.com', 'cppreference', None),
    (r'docs\.spring\.io', 'spring-docs', None),
    (r'openjdk\.org/jeps/(\d+)', 'openjdk',
        lambda m, txt: f"JEP {m.group(1)}"),
    (r'openjdk\.org/projects/([a-z\-]+)', 'openjdk',
        lambda m, txt: f"project: {m.group(1)}"),
    (r'openjdk\.org', 'openjdk', None),
    (r'docs\.python\.org', 'python-docs', None),
    (r'react\.dev', 'react-docs', None),
    (r'peps\.python\.org/pep-(\d+)', 'python-peps',
        lambda m, txt: f"PEP {int(m.group(1))}"),
    (r'peps\.python\.org', 'python-peps', None),
    (r'usaco\.guide/(\w+)/([\w\-]+)', 'usaco-guide',
        lambda m, txt: f"{m.group(1)}/{m.group(2)}"),
    (r'usaco\.guide', 'usaco-guide', None),
    (r'tc39\.es/proposal-([\w\-]+)', 'tc39-ecma',
        lambda m, txt: f"proposal: {m.group(1)}"),
    (r'tc39\.es/ecma262', 'tc39-ecma',
        lambda m, txt: "ECMA-262 spec"),
    (r'tc39\.es', 'tc39-ecma', None),
    (r'jcp\.org/(?:en/)?jsr/detail\?id=(\d+)', 'jcp',
        lambda m, txt: f"JSR {m.group(1)}"),
    (r'jcp\.org', 'jcp', None),
    (r'mitpress\.mit\.edu', 'mit-press', None),
    (r'html\.spec\.whatwg\.org', 'html-spec', None),
    (r'redis\.io/docs/(?:latest/)?(.+?)(?:[?#]|$)', 'redis-docs',
        lambda m, txt: m.group(1).rstrip('/')),
    (r'redis\.io', 'redis-docs', None),
    (r'valkey\.io', 'valkey-docs', None),
    (r'oi-wiki\.org/(.+?)(?:[?#]|$)', 'oi-wiki',
        lambda m, txt: m.group(1).rstrip('/')),
    (r'oi-wiki\.org', 'oi-wiki', None),
    (r'justicehui\.github\.io', 'jhnah917-blog', None),
    (r'github\.com/justiceHui/SSU-SCCC-Study', 'jhnah917-blog',
        lambda m, txt: "SSU SCCC slides"),
    (r'github\.com/justiceHui/Unknown-To-Wellknown',
        'unknown-to-wellknown', None),
    (r'github\.com/justiceHui', 'jhnah917-blog', None),
    (r'github\.com/infossm', 'infossm-blog', None),
    (r'github\.com/python/cpython/blob/main/Objects/listsort\.txt',
        'python-docs', lambda m, txt: "Timsort 명세 (Tim Peters)"),
    (r'github\.com/python/cpython', 'python-docs', None),
    (r'github\.com/python/peps', 'python-peps', None),
    (r'algoshitpo\.github\.io', 'algoshitpo', None),
    (r'gina65\.tistory\.com', 'gina65-blog', None),
    (r'hyperbolic\.tistory\.com', 'hyperbolic-blog', None),
    (r'dataintensive\.net', 'ddia', None),
]

# URLs that are PRACTICE / problem links, not references. Skip entirely.
SKIP_URL_PATTERNS = [
    r'github\.com/kokoa-lab/boj-problems',
    r'(?:www\.)?acmicpc\.net/problem',
    r'leetcode\.com/problems',
    r'judge\.yosupo\.jp/problem',
    r'atcoder\.jp/contests/.*/tasks',
    r'codechef\.com/problems',
    r'^https?://oj\.uz/',
    r'loj\.ac/p/',
    r'libreoj\.com',
    r'jutge\.org',
    r'codeforces\.com/contest/\d+/problem/',
    r'codeforces\.com/problemset/problem',
]


def url_to_source(url, link_text):
    """Returns (source_id, note) or (None, None) if no source mapping."""
    for pattern, src_id, note_fn in SOURCE_MAP:
        m = re.search(pattern, url)
        if m:
            note = note_fn(m, link_text) if note_fn else None
            return src_id, note
    return None, None


def should_skip(url):
    return any(re.search(p, url) for p in SKIP_URL_PATTERNS)


# ----------------------------------------------------------------------
# Frontmatter parsing/serialization (intentionally minimal, preserves order)
# ----------------------------------------------------------------------

FRONTMATTER_RE = re.compile(r'^---\n(.*?)\n---\n', re.DOTALL)


def parse_frontmatter(content):
    """Return (frontmatter_dict, frontmatter_text, body)."""
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None, None, content
    fm_text = m.group(1)
    body = content[m.end():]
    try:
        import yaml
        fm = yaml.safe_load(fm_text) or {}
    except Exception:
        return None, fm_text, body
    return fm, fm_text, body


def serialize_references(refs):
    """Serialize references list as YAML, prettily."""
    if not refs:
        return ""
    lines = ["references:"]
    for r in refs:
        if 'id' in r:
            lines.append(f"  - id: {r['id']}")
            if r.get('note'):
                note = r['note'].replace('"', '\\"')
                lines.append(f'    note: "{note}"')
        else:
            title = r.get('title', '').replace('"', '\\"')
            lines.append(f'  - title: "{title}"')
            if r.get('url'):
                lines.append(f'    url: "{r["url"]}"')
            if r.get('author'):
                author = r['author'].replace('"', '\\"')
                lines.append(f'    author: "{author}"')
            if r.get('note'):
                note = r['note'].replace('"', '\\"')
                lines.append(f'    note: "{note}"')
    return '\n'.join(lines)


# ----------------------------------------------------------------------
# Reference section processing
# ----------------------------------------------------------------------

REF_HEADER_RE = re.compile(
    r'^## (?:참고|참고자료|출처|References|Further Reading|관련 자료|'
    r'관련글|관련 글|관련 링크)\s*$', re.MULTILINE)
LINK_RE = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
WIKILINK_RE = re.compile(r'\[\[[^\]]+\]\]')


def extract_external_refs_from_body(body):
    """
    Find the reference section, extract external URLs.
    Returns (new_body, list_of_(text, url) for external refs).

    new_body: same as body but external links removed from ref section
    (wikilinks stay).
    """
    m = REF_HEADER_RE.search(body)
    if not m:
        return body, []
    sec_start = m.start()
    sec_body_start = m.end()
    next_sec = re.search(r'^## ', body[sec_body_start:], re.MULTILINE)
    sec_end = sec_body_start + next_sec.start() if next_sec \
        else len(body)
    section_text = body[sec_body_start:sec_end]

    external = []
    new_lines = []
    for line in section_text.split('\n'):
        # Find external markdown links in this line
        links = LINK_RE.findall(line)
        external_in_line = [
            (text, url) for text, url in links
            if not url.startswith('#') and not url.startswith('/')
            and not url.startswith('.')
            and not should_skip(url)
        ]
        if external_in_line and not WIKILINK_RE.search(line):
            # Pure external bullet line: remove
            for text, url in external_in_line:
                external.append((text, url))
            continue
        # Line has wikilink OR no external: keep, but strip external links
        cleaned_line = line
        if external_in_line:
            # Mixed line: replace external markdown link with link text
            for text, url in external_in_line:
                external.append((text, url))
                # Replace [text](url) with bare text (keeps context)
                cleaned_line = cleaned_line.replace(f'[{text}]({url})', text)
        new_lines.append(cleaned_line)

    new_section = '\n'.join(new_lines)
    new_body = body[:sec_body_start] + new_section + body[sec_end:]
    return new_body, external


def make_reference_from_link(text, url):
    """Given link text and URL, build a reference dict."""
    if should_skip(url):
        return None
    src_id, src_note = url_to_source(url, text)
    if src_id:
        ref = {'id': src_id}
        if src_note:
            ref['note'] = src_note
        else:
            # Use the link text as note if it has content
            stripped = text.strip()
            if stripped and stripped.lower() != url.lower():
                ref['note'] = stripped
        return ref
    # Inline reference
    # Try to extract author from text (e.g., "koosaga, DP 최적화 정리")
    author = None
    title = text.strip()
    return {'title': title, 'url': url}


def ref_dedup_key(ref):
    """Key for deduplication."""
    if 'id' in ref:
        return ('id', ref['id'], ref.get('note', ''))
    return ('url', ref.get('url', ''), ref.get('title', ''))


# ----------------------------------------------------------------------
# Main file processor
# ----------------------------------------------------------------------

def normalize_existing_inline_refs(refs):
    out = []
    for r in refs:
        if 'id' in r:
            out.append(r)
            continue
        url = r.get('url')
        if not url:
            out.append(r)
            continue
        src_id, src_note = url_to_source(url, r.get('title', ''))
        if not src_id:
            out.append(r)
            continue
        new_ref = {'id': src_id}
        note = src_note or r.get('note') or r.get('title')
        if note:
            new_ref['note'] = note
        out.append(new_ref)
    return out


def process_file(path: Path, dry_run=False):
    content = path.read_text(encoding='utf-8')
    fm, fm_text, body = parse_frontmatter(content)
    if fm is None or fm_text is None:
        return False, "no frontmatter"

    raw_existing_refs = fm.get('references') or []
    existing_refs = normalize_existing_inline_refs(raw_existing_refs)
    inline_normalized = existing_refs != raw_existing_refs

    new_body, external_refs = extract_external_refs_from_body(body)
    if not external_refs and not inline_normalized:
        return False, "no changes needed"

    seen = set()
    new_refs = []
    for r in existing_refs:
        k = ref_dedup_key(r)
        if k not in seen:
            seen.add(k)
            new_refs.append(r)

    for text, url in external_refs:
        ref = make_reference_from_link(text, url)
        if ref is None:
            continue
        key = ref_dedup_key(ref)
        if key in seen:
            continue
        seen.add(key)
        new_refs.append(ref)

    if new_refs == raw_existing_refs and new_body == body:
        return False, "no changes needed"

    # Reconstruct frontmatter
    # Strategy: re-serialize references block, keep other keys verbatim.
    fm_lines = fm_text.split('\n')
    # Find existing 'references:' line range
    ref_start = None
    ref_end = None
    for i, line in enumerate(fm_lines):
        if re.match(r'^references:\s*(\[\])?\s*$', line) or \
                line.strip() == 'references:':
            ref_start = i
        elif ref_start is not None and ref_end is None:
            # End when we hit a top-level key or end of list
            if re.match(r'^[a-zA-Z_][\w\-]*:', line):
                ref_end = i
                break
    if ref_end is None and ref_start is not None:
        ref_end = len(fm_lines)
    serialized = serialize_references(new_refs)
    if ref_start is not None:
        new_fm_lines = fm_lines[:ref_start] + [serialized] + fm_lines[ref_end:]
    else:
        new_fm_lines = fm_lines + [serialized]
    new_fm_text = '\n'.join(line for line in new_fm_lines if line is not None)

    new_content = f"---\n{new_fm_text}\n---\n{new_body}"

    if dry_run:
        return True, f"would add {len(new_refs) - len(existing_refs)} refs"

    path.write_text(new_content, encoding='utf-8')
    return True, f"added {len(new_refs) - len(existing_refs)} refs"


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--limit', type=int, default=None)
    p.add_argument('--filter', type=str, default=None,
                   help='Only process files matching this glob pattern')
    args = p.parse_args()

    root = Path(__file__).resolve().parent.parent
    files = []
    for sub in ('wiki', 'posts'):
        for ext in ('.md', '.mdx'):
            files.extend(sorted((root / 'src/content' / sub).rglob(f'*{ext}')))

    if args.filter:
        files = [f for f in files if args.filter in str(f)]
    if args.limit:
        files = files[:args.limit]

    changed = 0
    total = 0
    for f in files:
        try:
            ch, summary = process_file(f, dry_run=args.dry_run)
        except Exception as e:
            print(f"ERROR {f}: {e}", file=sys.stderr)
            continue
        total += 1
        if ch:
            changed += 1
            print(f"  ✓ {f.relative_to(root)}: {summary}")
    print(f"\nProcessed {total}, changed {changed}")


if __name__ == '__main__':
    main()
