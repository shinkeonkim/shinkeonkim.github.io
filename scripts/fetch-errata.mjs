#!/usr/bin/env bun
// Collects errata:<collection>:<slug> labeled issues from the site repo and
// writes a per-doc map to src/data/errata.json for the errata UI to consume.
//
// Runs at prebuild time. Requires GITHUB_TOKEN (repo scope) OR
// GH_TOKEN. Without a token this script exits 0 with an empty map so
// dev / CI without secrets still builds cleanly.
//
// Rate limit note: GitHub's REST /repos/:o/:r/issues returns up to 100
// items per page. The paginated fetch consumes 1 authenticated request
// per 100 issues; the 5000/hour quota is plenty of headroom.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_FILE = join(REPO_ROOT, 'src/data/errata.json');
const REPO_SLUG = 'shinkeonkim/shinkeonkim.github.io';
const LABEL_RE = /^errata:(posts|wiki|notes):(.+)$/;
const PAGE_SIZE = 100;

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';

async function keepExisting(reason) {
  console.warn(`[errata] ${reason}, keeping existing ${OUT_FILE} if present`);
  try {
    await readFile(OUT_FILE, 'utf-8');
    return;
  } catch {
    await mkdir(dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, '{}\n');
  }
}

async function main() {
  if (!token) {
    await keepExisting('no GITHUB_TOKEN / GH_TOKEN available');
    return;
  }

  const out = {};
  let page = 1;
  let totalIssues = 0;
  let matched = 0;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${REPO_SLUG}/issues`);
    url.searchParams.set('state', 'all');
    url.searchParams.set('per_page', String(PAGE_SIZE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('labels', 'errata');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'fetch-errata',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[errata] HTTP ${res.status}: ${text.slice(0, 200)}`);
      await keepExisting('API request failed');
      return;
    }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    totalIssues += items.length;

    for (const issue of items) {
      if (issue.pull_request) continue;
      const labels = (issue.labels ?? [])
        .map((l) => (typeof l === 'string' ? l : l.name))
        .filter(Boolean);
      const errataLabel = labels.find((l) => LABEL_RE.test(l));
      if (!errataLabel) continue;
      const match = errataLabel.match(LABEL_RE);
      if (!match) continue;
      const collection = match[1];
      const slug = match[2];
      const key = `${collection}:${slug}`;

      let list = out[key];
      if (!list) {
        list = [];
        out[key] = list;
      }
      list.push({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        createdAt: issue.created_at,
        closedAt: issue.closed_at ?? undefined,
        url: issue.html_url,
        author: issue.user?.login ?? 'unknown',
        labels,
        excerpt: typeof issue.body === 'string' ? issue.body.slice(0, 200) : undefined,
      });
      matched++;
    }

    if (items.length < PAGE_SIZE) break;
    page++;
  }

  for (const list of Object.values(out)) {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(out) + '\n');
  console.log(
    `[errata] ${matched} errata issues across ${Object.keys(out).length} docs (scanned ${totalIssues}) -> src/data/errata.json`,
  );
}

main().catch(async (err) => {
  console.error('[errata] fatal:', err);
  await keepExisting('unhandled error');
});
