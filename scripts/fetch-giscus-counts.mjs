#!/usr/bin/env bun
// Fetches comment/reaction counts per Giscus discussion via the GitHub
// GraphQL API. Writes a slug → counts map to .cache/giscus-counts.json so the
// site can render 💬 N badges without runtime API calls.
//
// Required env: PUBLIC_GISCUS_REPO, PUBLIC_GISCUS_CATEGORY_ID, GITHUB_TOKEN.
// Without GITHUB_TOKEN, the script exits 0 with an empty map (graceful fallback).
//
// Usage: bun scripts/fetch-giscus-counts.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_FILE = join(REPO_ROOT, '.cache', 'giscus-counts.json');
const PAGE_SIZE = 100;

const repo = process.env.PUBLIC_GISCUS_REPO ?? '';
const categoryId = process.env.PUBLIC_GISCUS_CATEGORY_ID ?? '';
const token = process.env.GITHUB_TOKEN ?? '';

async function writeOut(data) {
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  if (!repo || !categoryId || !token) {
    console.warn(
      `[giscus-counts] missing env (repo=${!!repo}, categoryId=${!!categoryId}, token=${!!token}) — writing empty map`,
    );
    await writeOut({ generatedAt: new Date().toISOString(), counts: {} });
    return;
  }

  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    console.error(`[giscus-counts] invalid PUBLIC_GISCUS_REPO format: "${repo}"`);
    process.exit(1);
  }

  const counts = {};
  let cursor = null;
  let totalFetched = 0;

  while (true) {
    const query = `
      query($owner:String!, $name:String!, $categoryId:ID!, $first:Int!, $after:String) {
        repository(owner:$owner, name:$name) {
          discussions(first:$first, after:$after, categoryId:$categoryId) {
            pageInfo { hasNextPage endCursor }
            nodes {
              title
              comments { totalCount }
              reactions { totalCount }
            }
          }
        }
      }
    `;
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'fetch-giscus-counts',
      },
      body: JSON.stringify({
        query,
        variables: { owner, name, categoryId, first: PAGE_SIZE, after: cursor },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[giscus-counts] HTTP ${res.status}: ${text}`);
      process.exit(1);
    }
    const json = await res.json();
    if (json.errors) {
      console.error(`[giscus-counts] GraphQL errors:`, JSON.stringify(json.errors));
      process.exit(1);
    }
    const conn = json.data?.repository?.discussions;
    if (!conn) {
      console.error(`[giscus-counts] no discussions connection in response`);
      break;
    }
    for (const node of conn.nodes ?? []) {
      const slug = node.title;
      counts[slug] = {
        comments: node.comments?.totalCount ?? 0,
        reactions: node.reactions?.totalCount ?? 0,
      };
    }
    totalFetched += conn.nodes?.length ?? 0;
    if (!conn.pageInfo?.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  await writeOut({ generatedAt: new Date().toISOString(), counts });
  console.log(`[giscus-counts] fetched ${totalFetched} discussion(s) → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('[giscus-counts] fatal:', err);
  process.exit(1);
});
