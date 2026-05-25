#!/usr/bin/env bun
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '../src/dev-only/studio/icon-data.ts');
const API = 'https://api.iconify.design';

async function getCollection(prefix) {
  const res = await fetch(`${API}/collection?prefix=${prefix}`);
  if (!res.ok) throw new Error(`${prefix}: HTTP ${res.status}`);
  return res.json();
}

function iconifyUrl(prefix, name, color) {
  const base = `${API}/${prefix}/${name}.svg`;
  return color ? `${base}?color=%23${color}` : base;
}

function titleCase(s) {
  return s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const COLOR_PRIMARY = '6366f1';
const COLOR_ACCENT = COLOR_PRIMARY;

const groups = [];
function group(category, title, entries) {
  groups.push({ category, title, entries });
}

async function build() {
  console.log('Fetching iconify collections...');
  const [logos, mdi, tabler, lucide, devicon, simpleicons, cryptoColor, materialSymbols] = await Promise.all([
    getCollection('logos'),
    getCollection('mdi'),
    getCollection('tabler'),
    getCollection('lucide'),
    getCollection('devicon'),
    getCollection('simple-icons'),
    getCollection('cryptocurrency-color'),
    getCollection('material-symbols'),
  ]);

  const logoNames = new Set(logos.uncategorized ?? []);
  const mdiNames = new Set();
  for (const [, ids] of Object.entries(mdi.categories ?? {})) {
    for (const id of ids) mdiNames.add(id);
  }
  for (const id of mdi.uncategorized ?? []) mdiNames.add(id);

  const tablerNames = new Set();
  for (const [, ids] of Object.entries(tabler.categories ?? {})) {
    for (const id of ids) tablerNames.add(id);
  }
  for (const id of tabler.uncategorized ?? []) tablerNames.add(id);

  const lucideNames = new Set();
  for (const [, ids] of Object.entries(lucide.categories ?? {})) {
    for (const id of ids) lucideNames.add(id);
  }
  for (const id of lucide.uncategorized ?? []) lucideNames.add(id);

  const deviconNames = new Set();
  for (const [, ids] of Object.entries(devicon.categories ?? {})) {
    for (const id of ids) deviconNames.add(id);
  }
  for (const id of devicon.uncategorized ?? []) deviconNames.add(id);

  const cryptoNames = new Set(cryptoColor.uncategorized ?? []);

  const matSymNames = new Set();
  for (const [, ids] of Object.entries(materialSymbols.categories ?? {})) {
    for (const id of ids) matSymNames.add(id);
  }
  for (const id of materialSymbols.uncategorized ?? []) matSymNames.add(id);

  const siNames = new Set(simpleicons.uncategorized ?? []);

  console.log(`Collections loaded: logos=${logoNames.size}, mdi=${mdiNames.size}, tabler=${tablerNames.size}, lucide=${lucideNames.size}, devicon=${deviconNames.size}, simple-icons=${siNames.size}, crypto=${cryptoNames.size}, material-symbols=${matSymNames.size}`);

  group('aws', 'AWS', Array.from(logoNames)
    .filter((n) => n.startsWith('aws-') || n === 'aws')
    .map((id) => ({ id: `aws_${id}`, title: titleCase(id.replace(/^aws-?/, '') || 'AWS'), src: iconifyUrl('logos', id) }))
  );

  const gcpKeep = (n) => (n.startsWith('google-cloud') || n === 'google-cloud' || /^google-(bigquery|firestore|firebase|kubernetes|maps|drive|analytics|ads|gmail|meet|workspace|developers|domains)/.test(n));
  group('gcp', 'GCP', Array.from(logoNames)
    .filter(gcpKeep)
    .map((id) => ({ id: `gcp_${id}`, title: titleCase(id), src: iconifyUrl('logos', id) }))
  );

  group('azure', 'Azure / Microsoft', Array.from(logoNames)
    .filter((n) => n.startsWith('microsoft-') || n === 'microsoft-azure' || n === 'microsoft' || n === 'azure')
    .map((id) => ({ id: `az_${id}`, title: titleCase(id), src: iconifyUrl('logos', id) }))
  );

  const cloudPrefixes = ['cloudflare', 'vercel', 'netlify', 'digital-ocean', 'heroku', 'fly', 'render', 'firebase', 'supabase', 'planetscale', 'fastly', 'linode', 'rackspace', 'akamai', 'datadog', 'new-relic', 'mailgun', 'sendgrid', 'twilio', 'stripe', 'shopify', 'cloud9', 'oracle', 'rocky-linux', 'ibm', 'alibaba'];
  group('cloud', 'Cloud / Services', cloudPrefixes
    .flatMap((p) => Array.from(logoNames).filter((n) => n === p || n === `${p}-icon`))
    .map((id) => ({ id: `cloud_${id}`, title: titleCase(id.replace(/-icon$/, '')), src: iconifyUrl('logos', id) }))
  );

  const dbNames = ['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'sqlite', 'elasticsearch', 'cassandra', 'couchdb', 'neo4j', 'influxdb', 'rabbitmq', 'kafka', 'snowflake', 'rocksdb', 'leveldb', 'cockroach', 'planetscale', 'supabase', 'dynamodb', 'cloudant', 'realm', 'firebase', 'amazonaws', 'meilisearch', 'pinecone', 'qdrant', 'turso', 'memgraph', 'aerospike', 'arangodb', 'opensearch', 'vitess', 'trino', 'presto', 'duckdb', 'clickhouse', 'singlestore'];
  const dbEntries = [];
  for (const slug of dbNames) {
    const inLogos = [`${slug}`, `${slug}-icon`].find((n) => logoNames.has(n));
    if (inLogos) {
      dbEntries.push({ id: `db_${slug}`, title: titleCase(slug), src: iconifyUrl('logos', inLogos) });
    } else if (siNames.has(slug)) {
      dbEntries.push({ id: `db_${slug}`, title: titleCase(slug), src: `https://cdn.simpleicons.org/${slug}/${COLOR_ACCENT}` });
    }
  }
  group('database', 'Database / Storage', dbEntries);

  const langSlugs = ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'ruby', 'kotlin', 'swift', 'csharp', 'cplusplus', 'c', 'php', 'elixir', 'erlang', 'scala', 'haskell', 'clojure', 'dart', 'lua', 'r', 'julia', 'crystal', 'nim', 'zig', 'ocaml', 'fsharp', 'perl', 'powershell', 'bash', 'gdscript', 'solidity'];
  const langEntries = [];
  for (const slug of langSlugs) {
    if (deviconNames.has(slug)) {
      langEntries.push({ id: `lang_${slug}`, title: titleCase(slug), src: iconifyUrl('devicon', slug) });
    } else if (siNames.has(slug)) {
      langEntries.push({ id: `lang_${slug}`, title: titleCase(slug), src: `https://cdn.simpleicons.org/${slug}/${COLOR_ACCENT}` });
    } else if (logoNames.has(slug) || logoNames.has(`${slug}-icon`)) {
      const id = logoNames.has(slug) ? slug : `${slug}-icon`;
      langEntries.push({ id: `lang_${slug}`, title: titleCase(slug), src: iconifyUrl('logos', id) });
    }
  }
  group('language', 'Programming Languages', langEntries);

  const feSlugs = ['react', 'vuejs', 'svelte', 'angular', 'nextjs', 'nuxt', 'remix', 'solidjs', 'astro', 'qwik', 'preact', 'lit', 'ember', 'jquery', 'backbone', 'alpinejs', 'htmx', 'tailwindcss', 'bootstrap', 'materialui', 'chakraui', 'mui', 'bulma', 'sass', 'less', 'stylus', 'styled-components', 'emotion', 'redux', 'mobx', 'zustand', 'jotai', 'recoil', 'pinia', 'tanstack-query', 'react-query', 'react-router', 'react-native', 'electron', 'tauri', 'flutter', 'ionic', 'capacitor', 'expo', 'storybook', 'vite', 'webpack', 'rollup', 'parcel', 'esbuild', 'turborepo', 'nx', 'prettier', 'eslint', 'babel'];
  const feEntries = [];
  for (const slug of feSlugs) {
    const cand = [slug, `${slug}-icon`, slug.replace(/-/g, '')];
    const fl = cand.find((n) => logoNames.has(n));
    if (fl) {
      feEntries.push({ id: `fe_${slug}`, title: titleCase(slug), src: iconifyUrl('logos', fl) });
    } else if (deviconNames.has(slug)) {
      feEntries.push({ id: `fe_${slug}`, title: titleCase(slug), src: iconifyUrl('devicon', slug) });
    } else if (siNames.has(slug)) {
      feEntries.push({ id: `fe_${slug}`, title: titleCase(slug), src: `https://cdn.simpleicons.org/${slug}/${COLOR_ACCENT}` });
    }
  }
  group('frontend', 'Frontend Frameworks', feEntries);

  const beSlugs = ['nodejs', 'deno', 'bun', 'django', 'flask', 'fastapi', 'rails', 'spring', 'laravel', 'symfony', 'express', 'nestjs', 'koa', 'fastify', 'phoenix', 'gin', 'echo', 'fiber', 'actix', 'rocket', 'graphql', 'apollo', 'grpc', 'oauth', 'jwt', 'redis', 'rabbitmq', 'memcached', 'nginx', 'apache', 'caddy', 'envoy', 'traefik', 'jenkins', 'gitlab', 'github', 'githubactions', 'circleci', 'travisci', 'codecov', 'sonarqube', 'sentry', 'kibana', 'grafana', 'prometheus', 'opentelemetry', 'jaeger'];
  const beEntries = [];
  for (const slug of beSlugs) {
    const cand = [slug, `${slug}-icon`];
    const fl = cand.find((n) => logoNames.has(n));
    if (fl) {
      beEntries.push({ id: `be_${slug}`, title: titleCase(slug), src: iconifyUrl('logos', fl) });
    } else if (deviconNames.has(slug)) {
      beEntries.push({ id: `be_${slug}`, title: titleCase(slug), src: iconifyUrl('devicon', slug) });
    } else if (siNames.has(slug)) {
      beEntries.push({ id: `be_${slug}`, title: titleCase(slug), src: `https://cdn.simpleicons.org/${slug}/${COLOR_ACCENT}` });
    }
  }
  group('backend', 'Backend / Infra', beEntries);

  const toolSlugs = ['docker', 'docker-icon', 'kubernetes', 'helm', 'terraform', 'terraform-icon', 'ansible', 'puppet', 'chef', 'vagrant', 'consul', 'vault', 'nomad', 'packer', 'gitlab', 'github', 'githubactions', 'github-icon', 'github-actions', 'github-copilot', 'git', 'git-icon', 'mercurial', 'subversion', 'jira', 'confluence', 'slack', 'discord', 'telegram', 'figma', 'sketch', 'invision', 'zeplin', 'storybook', 'postman', 'insomnia', 'httpie', 'curl', 'wireshark', 'wireshark-icon', 'visual-studio', 'visual-studio-code', 'sublimetext', 'atom', 'intellij-idea', 'webstorm', 'pycharm', 'phpstorm', 'goland', 'rider', 'datagrip', 'rubymine', 'vim', 'neovim', 'emacs', 'nano'];
  const toolEntries = [];
  const seenTool = new Set();
  for (const slug of toolSlugs) {
    if (seenTool.has(slug)) continue;
    if (logoNames.has(slug)) {
      const baseSlug = slug.replace(/-icon$/, '');
      if (seenTool.has(baseSlug)) continue;
      seenTool.add(baseSlug);
      toolEntries.push({ id: `tool_${baseSlug}`, title: titleCase(baseSlug), src: iconifyUrl('logos', slug) });
    }
  }
  group('tool', 'Dev Tools', toolEntries);

  function mdiPick(names) {
    return names.filter((n) => mdiNames.has(n)).map((n) => ({ id: `mdi_${n}`, title: titleCase(n), src: iconifyUrl('mdi', n, COLOR_ACCENT) }));
  }

  group('network', 'Network / Infrastructure', mdiPick([
    'router-wireless', 'router-network', 'router', 'server', 'server-network', 'server-network-off', 'server-security', 'cloud', 'cloud-outline', 'cloud-circle', 'cloud-search', 'cloud-sync', 'cloud-upload', 'cloud-download', 'cloud-print', 'web', 'web-box', 'cellphone', 'cellphone-cog', 'wifi', 'wifi-strength-4', 'lan', 'lan-connect', 'lan-disconnect', 'ethernet', 'ethernet-cable', 'vpn', 'firewall', 'shield-network', 'security-network', 'monitor-dashboard', 'switch', 'access-point', 'access-point-network', 'satellite-uplink', 'antenna', 'load-balancer', 'gauge', 'speedometer', 'tower-beach', 'wifi-router', 'broadcast', 'pulse', 'serial-port', 'usb-port', 'transmission-tower', 'satellite', 'satellite-variant', 'rss', 'web-clock', 'web-cancel', 'dns', 'dns-outline', 'database-import', 'database-export', 'database-network', 'database-search', 'database-clock', 'database-cog', 'database-edit', 'database-eye', 'database-lock', 'database-minus', 'database-off', 'database-outline', 'database-plus', 'database-refresh', 'database-remove', 'database-settings', 'database-sync', 'cloud-question', 'cloud-tags', 'cloud-key', 'cloud-lock'
  ]));

  group('erd', 'ERD / Schema', mdiPick([
    'table', 'table-large', 'table-search', 'table-plus', 'table-minus', 'table-edit', 'table-cog', 'table-row', 'table-column', 'table-merge-cells', 'table-split-cell', 'table-heart', 'key', 'key-variant', 'key-outline', 'key-link', 'key-arrow-right', 'key-chain', 'key-chain-variant', 'relation-many-to-many', 'relation-many-to-one', 'relation-many-to-zero-or-one', 'relation-many-to-zero-or-many', 'relation-one-to-many', 'relation-one-to-one', 'relation-one-to-zero-or-many', 'relation-one-to-zero-or-one', 'relation-only-one-to-many', 'relation-only-one-to-one', 'relation-only-one-to-zero-or-one', 'relation-zero-or-one-to-one', 'relation-zero-or-many-to-many', 'relation-zero-or-many-to-one', 'relation-zero-or-many-to-zero-or-many', 'relation-zero-or-many-to-zero-or-one', 'relation-zero-or-one-to-many', 'relation-zero-or-one-to-zero-or-many', 'relation-zero-or-one-to-zero-or-one', 'eye', 'eye-off', 'magnify', 'database', 'database-outline', 'box', 'box-cutter', 'cube-outline', 'cube'
  ]));

  group('arrow', 'Arrows', mdiPick([
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-bold', 'arrow-down-bold', 'arrow-left-bold', 'arrow-right-bold', 'arrow-top-left', 'arrow-top-right', 'arrow-bottom-left', 'arrow-bottom-right', 'arrow-up-thin', 'arrow-down-thin', 'arrow-left-thin', 'arrow-right-thin', 'arrow-decision', 'arrow-decision-auto', 'arrow-collapse', 'arrow-expand', 'arrow-all', 'arrow-left-right', 'arrow-up-down', 'arrow-left-right-bold', 'arrow-up-down-bold', 'arrow-right-thick', 'arrow-left-thick', 'arrow-up-thick', 'arrow-down-thick', 'arrow-u-down-left', 'arrow-u-down-right', 'arrow-u-left-top', 'arrow-u-right-top', 'arrow-u-up-left', 'arrow-u-up-right', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-double-up', 'chevron-double-down', 'chevron-double-left', 'chevron-double-right', 'menu-up', 'menu-down', 'menu-left', 'menu-right', 'triangle', 'triangle-outline'
  ]));

  group('document', 'Documents / Files', mdiPick([
    'file', 'file-outline', 'file-multiple', 'file-multiple-outline', 'file-document', 'file-document-outline', 'file-document-edit', 'file-image', 'file-image-outline', 'file-video', 'file-video-outline', 'file-music', 'file-music-outline', 'file-pdf-box', 'file-word', 'file-excel', 'file-powerpoint', 'file-archive', 'file-archive-outline', 'file-cog', 'file-cog-outline', 'file-key', 'file-key-outline', 'file-lock', 'file-lock-outline', 'file-search', 'file-search-outline', 'file-plus', 'file-plus-outline', 'file-remove', 'file-remove-outline', 'file-edit', 'file-edit-outline', 'file-eye', 'file-eye-outline', 'file-export', 'file-export-outline', 'file-import', 'file-import-outline', 'file-send', 'file-send-outline', 'file-sync', 'file-sync-outline', 'file-tree', 'file-tree-outline', 'folder', 'folder-outline', 'folder-open', 'folder-open-outline', 'folder-multiple', 'folder-multiple-outline', 'folder-plus', 'folder-plus-outline', 'folder-remove', 'folder-remove-outline', 'folder-cog', 'folder-key', 'folder-lock', 'folder-search', 'folder-network', 'folder-upload', 'folder-download', 'folder-edit', 'folder-zip', 'folder-zip-outline', 'archive', 'archive-outline'
  ]));

  group('device', 'Devices / Hardware', mdiPick([
    'laptop', 'desktop-classic', 'monitor', 'monitor-multiple', 'monitor-dashboard', 'cellphone', 'cellphone-android', 'cellphone-iphone', 'tablet', 'tablet-ipad', 'tablet-android', 'watch', 'watch-variant', 'television', 'television-classic', 'cast', 'printer', 'scanner', 'fax', 'phone', 'phone-classic', 'phone-incoming', 'phone-outgoing', 'phone-missed', 'phone-hangup', 'phone-in-talk', 'phone-paused', 'phone-forward', 'phone-log', 'voicemail', 'headphones', 'headset', 'microphone', 'microphone-off', 'speaker', 'speaker-bluetooth', 'speaker-wireless', 'bluetooth', 'bluetooth-connect', 'usb', 'usb-flash-drive', 'sd', 'memory', 'cpu-64-bit', 'cpu-32-bit', 'gpu', 'harddisk', 'database', 'server', 'wifi', 'router', 'access-point', 'remote', 'remote-tv', 'keyboard', 'mouse', 'mouse-variant', 'gamepad', 'gamepad-variant', 'controller-classic', 'joystick', 'projector', 'projector-screen', 'camera', 'camera-iris', 'webcam', 'gauge', 'thermometer', 'fingerprint', 'face-recognition'
  ]));

  group('communication', 'Communication / Social', mdiPick([
    'email', 'email-outline', 'email-multiple', 'email-multiple-outline', 'email-open', 'email-open-outline', 'email-fast', 'email-fast-outline', 'email-edit', 'email-edit-outline', 'email-search', 'email-search-outline', 'email-send', 'email-receive', 'email-newsletter', 'message', 'message-outline', 'message-text', 'message-text-outline', 'message-bulleted', 'message-bulleted-off', 'message-reply', 'message-reply-outline', 'message-reply-text', 'message-reply-text-outline', 'message-arrow-left', 'message-arrow-right', 'forum', 'forum-outline', 'chat', 'chat-outline', 'chat-plus', 'chat-plus-outline', 'chat-remove', 'chat-remove-outline', 'chat-question', 'chat-question-outline', 'chat-alert', 'chat-alert-outline', 'comment', 'comment-outline', 'comment-multiple', 'comment-multiple-outline', 'comment-text', 'comment-text-outline', 'send', 'send-outline', 'send-circle', 'send-circle-outline', 'send-check', 'send-check-outline', 'send-clock', 'send-clock-outline', 'inbox', 'inbox-outline', 'inbox-multiple', 'inbox-multiple-outline', 'inbox-arrow-down', 'inbox-arrow-down-outline', 'inbox-arrow-up', 'inbox-arrow-up-outline', 'outbox', 'outbox-outline', 'bell', 'bell-outline', 'bell-off', 'bell-off-outline', 'bell-plus', 'bell-plus-outline', 'bell-ring', 'bell-ring-outline', 'bell-badge', 'bell-badge-outline'
  ]));

  group('action', 'Actions / UI', mdiPick([
    'plus', 'plus-box', 'plus-box-outline', 'plus-circle', 'plus-circle-outline', 'minus', 'minus-box', 'minus-box-outline', 'minus-circle', 'minus-circle-outline', 'close', 'close-box', 'close-box-outline', 'close-circle', 'close-circle-outline', 'close-thick', 'check', 'check-bold', 'check-circle', 'check-circle-outline', 'check-decagram', 'check-network', 'check-network-outline', 'check-underline', 'check-all', 'pencil', 'pencil-outline', 'pencil-box', 'pencil-box-outline', 'delete', 'delete-outline', 'delete-empty', 'delete-empty-outline', 'delete-forever', 'delete-forever-outline', 'delete-sweep', 'delete-sweep-outline', 'trash-can', 'trash-can-outline', 'restore', 'undo', 'undo-variant', 'redo', 'redo-variant', 'refresh', 'reload', 'sync', 'sync-alert', 'sync-circle', 'sync-off', 'autorenew', 'cached', 'history', 'clock', 'clock-outline', 'clock-fast', 'clock-time-four', 'timer', 'timer-outline', 'timer-sand', 'timer-sand-complete', 'timer-pause', 'timer-pause-outline', 'timer-play', 'timer-play-outline', 'timer-stop', 'timer-stop-outline', 'magnify', 'magnify-plus', 'magnify-plus-outline', 'magnify-minus', 'magnify-minus-outline', 'magnify-close', 'filter', 'filter-outline', 'filter-variant', 'filter-variant-remove', 'sort', 'sort-ascending', 'sort-descending', 'sort-alphabetical-ascending', 'sort-alphabetical-descending', 'sort-numeric-ascending', 'sort-numeric-descending', 'eye', 'eye-outline', 'eye-off', 'eye-off-outline', 'lock', 'lock-outline', 'lock-open', 'lock-open-outline', 'shield', 'shield-outline', 'shield-check', 'shield-lock', 'shield-key', 'shield-account', 'cog', 'cog-outline', 'wrench', 'wrench-outline', 'hammer', 'palette', 'palette-outline', 'palette-swatch', 'palette-swatch-outline', 'brush', 'brush-variant', 'home', 'home-outline', 'star', 'star-outline', 'heart', 'heart-outline', 'bookmark', 'bookmark-outline', 'flag', 'flag-outline', 'tag', 'tag-outline', 'label', 'label-outline'
  ]));

  group('chart', 'Charts / Data', mdiPick([
    'chart-line', 'chart-line-variant', 'chart-line-stacked', 'chart-bar', 'chart-bar-stacked', 'chart-pie', 'chart-donut', 'chart-donut-variant', 'chart-arc', 'chart-bubble', 'chart-scatter-plot', 'chart-areaspline', 'chart-areaspline-variant', 'chart-multiline', 'chart-histogram', 'chart-gantt', 'chart-timeline', 'chart-timeline-variant', 'chart-bell-curve', 'chart-bell-curve-cumulative', 'chart-box', 'chart-box-outline', 'chart-box-plus-outline', 'chart-snakey', 'chart-snakey-variant', 'chart-tree', 'finance', 'trending-up', 'trending-down', 'trending-neutral', 'gauge', 'gauge-empty', 'gauge-full', 'gauge-low', 'speedometer', 'speedometer-medium', 'speedometer-slow', 'view-dashboard', 'view-dashboard-outline', 'view-dashboard-variant', 'view-dashboard-edit', 'monitor-dashboard', 'poll', 'tally-mark-1', 'tally-mark-2', 'tally-mark-3', 'tally-mark-4', 'tally-mark-5', 'numeric', 'numeric-0-box', 'numeric-1-box', 'numeric-2-box', 'numeric-3-box'
  ]));

  group('shape', 'Shapes / Markers', mdiPick([
    'circle', 'circle-outline', 'circle-double', 'circle-half', 'circle-half-full', 'circle-medium', 'circle-small', 'square', 'square-outline', 'rhombus', 'rhombus-outline', 'triangle', 'triangle-outline', 'star', 'star-outline', 'star-four-points', 'star-four-points-outline', 'star-three-points', 'star-three-points-outline', 'pentagon', 'pentagon-outline', 'hexagon', 'hexagon-outline', 'hexagon-multiple', 'hexagon-multiple-outline', 'octagon', 'octagon-outline', 'decagram', 'decagram-outline', 'octagram', 'octagram-outline', 'shape', 'shape-outline', 'shape-square-plus', 'shape-rectangle-plus', 'shape-circle-plus', 'shape-polygon-plus', 'cards', 'cards-outline', 'card', 'card-outline', 'cube', 'cube-outline', 'cube-send', 'cube-scan', 'tray', 'tray-full', 'tray-arrow-down', 'tray-arrow-up', 'inbox', 'package', 'package-variant', 'gift', 'puzzle', 'puzzle-outline', 'lightbulb', 'lightbulb-outline', 'lightbulb-on', 'lightbulb-on-outline', 'flash', 'flash-outline', 'fire', 'fire-circle', 'flower', 'flower-outline', 'leaf', 'tree', 'cloud', 'weather-cloudy', 'weather-night', 'weather-sunny', 'compass', 'compass-outline', 'map', 'map-outline', 'map-marker', 'map-marker-outline', 'pin', 'pin-outline', 'crosshairs', 'crosshairs-gps', 'target', 'bullseye-arrow'
  ]));

  group('user', 'People / Avatars', mdiPick([
    'account', 'account-outline', 'account-circle', 'account-circle-outline', 'account-box', 'account-box-outline', 'account-multiple', 'account-multiple-outline', 'account-group', 'account-group-outline', 'account-plus', 'account-plus-outline', 'account-minus', 'account-minus-outline', 'account-remove', 'account-remove-outline', 'account-edit', 'account-edit-outline', 'account-check', 'account-check-outline', 'account-cancel', 'account-cancel-outline', 'account-key', 'account-key-outline', 'account-lock', 'account-lock-outline', 'account-cog', 'account-cog-outline', 'account-search', 'account-search-outline', 'account-star', 'account-star-outline', 'account-heart', 'account-heart-outline', 'account-tie', 'account-tie-outline', 'account-tie-hat', 'account-hard-hat', 'face-man', 'face-man-outline', 'face-woman', 'face-woman-outline', 'face-agent', 'incognito', 'guard', 'human', 'human-male', 'human-female', 'human-greeting', 'human-male-female', 'human-handsup', 'human-male-board', 'baby', 'baby-face', 'wheelchair-accessibility'
  ]));

  group('media', 'Media / Playback', mdiPick([
    'play', 'play-outline', 'play-circle', 'play-circle-outline', 'play-box', 'play-box-outline', 'play-network', 'pause', 'pause-circle', 'pause-circle-outline', 'pause-octagon', 'pause-octagon-outline', 'stop', 'stop-circle', 'stop-circle-outline', 'skip-previous', 'skip-previous-outline', 'skip-next', 'skip-next-outline', 'skip-backward', 'skip-backward-outline', 'skip-forward', 'skip-forward-outline', 'rewind', 'rewind-outline', 'fast-forward', 'fast-forward-outline', 'shuffle', 'shuffle-variant', 'shuffle-disabled', 'repeat', 'repeat-off', 'repeat-once', 'repeat-variant', 'volume-high', 'volume-medium', 'volume-low', 'volume-off', 'volume-mute', 'volume-plus', 'volume-minus', 'music', 'music-note', 'music-note-eighth', 'music-note-half', 'music-note-quarter', 'music-note-whole', 'movie', 'movie-outline', 'movie-open', 'movie-open-outline', 'video', 'video-outline', 'video-plus', 'video-plus-outline', 'video-image', 'video-input-component', 'video-input-hdmi', 'image', 'image-outline', 'image-multiple', 'image-multiple-outline', 'image-album', 'image-area', 'image-broken'
  ]));

  group('finance', 'Finance / Commerce', mdiPick([
    'currency-usd', 'currency-eur', 'currency-gbp', 'currency-jpy', 'currency-cny', 'currency-krw', 'currency-rub', 'currency-inr', 'currency-bdt', 'currency-bid', 'currency-ngn', 'cash', 'cash-multiple', 'cash-100', 'cash-check', 'cash-fast', 'cash-lock', 'cash-marker', 'cash-minus', 'cash-plus', 'cash-refund', 'cash-register', 'cash-remove', 'credit-card', 'credit-card-outline', 'credit-card-multiple', 'credit-card-multiple-outline', 'credit-card-check', 'credit-card-check-outline', 'credit-card-edit', 'credit-card-edit-outline', 'credit-card-fast', 'credit-card-fast-outline', 'credit-card-lock', 'credit-card-lock-outline', 'credit-card-minus', 'credit-card-minus-outline', 'credit-card-plus', 'credit-card-plus-outline', 'credit-card-refresh', 'credit-card-refresh-outline', 'credit-card-refund', 'credit-card-refund-outline', 'credit-card-remove', 'credit-card-remove-outline', 'credit-card-scan', 'credit-card-scan-outline', 'credit-card-search', 'credit-card-search-outline', 'credit-card-settings', 'credit-card-settings-outline', 'credit-card-sync', 'credit-card-sync-outline', 'credit-card-wireless', 'credit-card-wireless-outline', 'wallet', 'wallet-outline', 'wallet-bifold', 'wallet-bifold-outline', 'wallet-giftcard', 'wallet-membership', 'wallet-plus', 'wallet-plus-outline', 'wallet-travel', 'bank', 'bank-outline', 'bank-circle', 'bank-check', 'bank-minus', 'bank-plus', 'bank-remove', 'bank-transfer', 'bank-transfer-in', 'bank-transfer-out', 'shopping', 'shopping-outline', 'shopping-music', 'shopping-search', 'shopping-search-outline', 'cart', 'cart-outline', 'cart-arrow-up', 'cart-arrow-down', 'cart-check', 'cart-heart', 'cart-minus', 'cart-off', 'cart-plus', 'cart-remove', 'gift', 'gift-outline', 'gift-open', 'gift-open-outline'
  ]));

  // crypto - take all from cryptocurrency-color (CC0)
  group('crypto', 'Cryptocurrency', Array.from(cryptoNames)
    .slice(0, 100)
    .map((n) => ({ id: `crypto_${n}`, title: titleCase(n), src: iconifyUrl('cryptocurrency-color', n) }))
  );

  // Material symbols - additional general icons
  const matSymGeneral = ['add', 'remove', 'check', 'close', 'star', 'favorite', 'search', 'menu', 'home', 'settings', 'logout', 'login', 'person', 'people', 'group', 'work', 'school', 'science', 'biotech', 'engineering', 'precision-manufacturing', 'rocket-launch', 'flight', 'directions-car', 'directions-bus', 'directions-bike', 'train', 'subway', 'two-wheeler', 'pedal-bike', 'directions-walk', 'directions-run', 'sports-soccer', 'sports-basketball', 'sports-baseball', 'sports-tennis', 'fitness-center', 'restaurant', 'local-cafe', 'local-bar', 'lunch-dining', 'fastfood', 'icecream', 'cake', 'cookie', 'food-bank', 'kitchen', 'shopping-bag', 'shopping-cart', 'storefront', 'store', 'local-grocery-store', 'local-mall', 'local-pharmacy', 'medical-services', 'local-hospital', 'vaccines', 'medication', 'spa', 'hotel', 'apartment', 'house', 'cottage', 'cabin', 'villa', 'factory', 'corporate-fare', 'business', 'location-city', 'public', 'place', 'pin-drop', 'my-location', 'gps-fixed', 'gps-not-fixed', 'navigation', 'directions', 'route', 'map', 'satellite', 'language', 'translate', 'g-translate', 'sign-language', 'accessibility', 'accessible', 'hearing', 'visibility', 'visibility-off', 'remove-red-eye', 'preview', 'recommend', 'thumb-up', 'thumb-down', 'forum', 'chat', 'sms', 'email', 'mail', 'mark-email-unread', 'mark-email-read', 'mark-as-unread', 'drafts', 'inbox', 'send', 'reply', 'reply-all', 'forward', 'attach-file', 'attach-email', 'attach-money', 'attachment', 'link', 'link-off', 'open-in-new', 'open-in-browser', 'launch', 'exit-to-app', 'download', 'download-for-offline', 'cloud-download', 'upload', 'cloud-upload', 'backup', 'restore', 'sync', 'sync-alt', 'sync-disabled', 'cached', 'history', 'update', 'schedule', 'event', 'event-available', 'event-busy', 'event-note', 'today', 'date-range', 'calendar-month', 'calendar-today', 'calendar-view-day', 'calendar-view-week', 'calendar-view-month'];
  group('symbol', 'Material Symbols', matSymGeneral
    .filter((n) => matSymNames.has(n))
    .map((n) => ({ id: `sym_${n}`, title: titleCase(n), src: iconifyUrl('material-symbols', n, COLOR_ACCENT) }))
  );

  // Tabler - general modern UI
  const tablerGeneral = ['adjustments', 'air-conditioning', 'alarm', 'alert-circle', 'alert-triangle', 'align-center', 'align-justified', 'align-left', 'align-right', 'analyze', 'anchor', 'antenna-bars-5', 'apps', 'archive', 'arrow-back-up', 'arrow-forward-up', 'arrow-narrow-down', 'arrow-narrow-left', 'arrow-narrow-right', 'arrow-narrow-up', 'at', 'atom', 'award', 'baby-carriage', 'backhoe', 'backpack', 'badge', 'baguette', 'ball-baseball', 'ball-basketball', 'ball-football', 'ball-tennis', 'balloon', 'ban', 'bandage', 'barbell', 'barcode', 'barrier-block', 'basket', 'bath', 'battery-3', 'beach', 'bed', 'beer', 'bell', 'bike', 'binary', 'biohazard', 'bleach', 'blender', 'blockquote', 'bluetooth', 'bold', 'bone', 'book', 'book-2', 'bookmark', 'border-all', 'bottle', 'bow', 'bowl', 'box', 'box-multiple', 'brain', 'brand-twitter', 'brand-facebook', 'brand-instagram', 'brand-linkedin', 'brand-youtube', 'brand-github', 'brand-gitlab', 'brand-google', 'brand-google-drive', 'brand-google-maps', 'brand-google-play', 'brand-apple', 'brand-android', 'brand-windows', 'brand-chrome', 'brand-firefox', 'brand-safari', 'brand-edge', 'brand-opera', 'brand-discord', 'brand-slack', 'brand-telegram', 'brand-whatsapp', 'brand-reddit', 'brand-tiktok', 'brand-snapchat', 'brand-pinterest', 'brand-spotify', 'brand-twitch', 'brand-vimeo', 'brand-airbnb', 'brand-paypal', 'brand-visa', 'brand-mastercard', 'brand-stripe', 'briefcase', 'browser', 'browser-check', 'browser-x', 'brush', 'bucket', 'bug', 'building', 'building-arch', 'building-bank', 'building-bridge', 'building-castle', 'building-church', 'building-community', 'building-factory', 'building-hospital', 'building-skyscraper', 'building-store', 'building-warehouse', 'bulb', 'bus', 'businessplan', 'cake', 'calculator', 'calendar', 'calendar-event', 'calendar-time', 'camera', 'camera-off', 'campfire', 'candle', 'candy', 'cane', 'cannabis', 'capture', 'car', 'caravan', 'cardboards', 'cards', 'cash', 'cast', 'category', 'ceiling-light', 'cell', 'certificate', 'chair-director', 'chalkboard', 'charging-pile', 'chart-arcs', 'chart-area', 'chart-bar', 'chart-bubble', 'chart-candle', 'chart-donut', 'chart-dots', 'chart-infographic', 'chart-line', 'chart-pie', 'check', 'checkbox', 'checklist', 'checks', 'chef-hat', 'cherry', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up'];
  group('tabler', 'Tabler UI', tablerGeneral
    .filter((n) => tablerNames.has(n))
    .map((n) => ({ id: `tabler_${n}`, title: titleCase(n.replace(/^brand-/, '')), src: iconifyUrl('tabler', n, COLOR_ACCENT) }))
  );

  // Lucide - modern minimal icons
  const lucideGeneral = ['activity', 'air-vent', 'airplay', 'alarm-clock', 'alert-circle', 'align-center', 'anchor', 'aperture', 'archive', 'arrow-big-down', 'arrow-big-left', 'arrow-big-right', 'arrow-big-up', 'arrow-down-circle', 'arrow-down-left', 'arrow-down-right', 'arrow-left-circle', 'arrow-right-circle', 'arrow-up-circle', 'arrow-up-left', 'arrow-up-right', 'at-sign', 'atom', 'award', 'axe', 'backpack', 'baggage-claim', 'banknote', 'bar-chart', 'battery', 'beaker', 'bed-double', 'beef', 'bell', 'bike', 'binary', 'biohazard', 'bluetooth', 'bold', 'bomb', 'book', 'book-open', 'bookmark', 'box', 'box-select', 'briefcase', 'brush', 'bug', 'building', 'bus', 'cable', 'cake', 'calculator', 'calendar', 'camera', 'candlestick-chart', 'car', 'caravan', 'carrot', 'cast', 'check', 'check-circle', 'check-square', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chrome', 'church', 'circle', 'clipboard', 'clipboard-check', 'clock', 'cloud', 'cloud-cog', 'cloud-drizzle', 'cloud-fog', 'cloud-hail', 'cloud-lightning', 'cloud-moon', 'cloud-off', 'cloud-rain', 'cloud-snow', 'cloud-sun', 'cloudy', 'clover', 'club', 'code', 'codepen', 'codesandbox', 'coffee', 'cog', 'coins', 'columns', 'command', 'compass', 'component', 'computer', 'concierge-bell', 'container', 'contact', 'contrast', 'cookie', 'copy', 'copyleft', 'copyright', 'corner-down-left', 'corner-down-right', 'corner-up-left', 'corner-up-right', 'cpu', 'creative-commons', 'credit-card', 'croissant', 'crop', 'crosshair', 'crown', 'cup-soda', 'currency', 'database', 'database-backup', 'database-zap', 'delete', 'diamond', 'dice-1', 'dice-2', 'dice-3', 'dice-4', 'dice-5', 'dice-6', 'disc', 'disc-2', 'disc-3', 'divide', 'dna', 'dog', 'dollar-sign', 'door-closed', 'door-open', 'dot', 'download', 'dribbble', 'droplet', 'drum', 'drumstick', 'dumbbell', 'ear', 'edit', 'egg', 'equal', 'eraser', 'euro', 'expand', 'external-link', 'eye', 'eye-off', 'facebook', 'factory', 'fan', 'fast-forward', 'feather', 'figma', 'file', 'file-archive', 'file-audio', 'file-axis-3-d', 'file-badge', 'file-bar-chart', 'file-box', 'file-check', 'file-clock', 'file-code', 'file-cog', 'file-diff', 'file-digit', 'file-down', 'file-edit', 'file-heart', 'file-image', 'file-input', 'file-json', 'file-key', 'file-lock', 'file-minus', 'file-output', 'file-pen', 'file-plus', 'file-question', 'file-scan', 'file-search', 'file-spreadsheet', 'file-symlink', 'file-terminal', 'file-text', 'file-type', 'file-up', 'file-video', 'file-volume', 'file-warning', 'file-x', 'files', 'film', 'filter', 'fingerprint', 'fire-extinguisher', 'fish', 'flag', 'flag-off', 'flag-triangle-left', 'flag-triangle-right', 'flame', 'flashlight', 'flask-conical', 'flask-round', 'flip-horizontal', 'flip-vertical', 'flower', 'focus', 'folder', 'folder-archive', 'folder-check', 'folder-clock', 'folder-closed', 'folder-cog', 'folder-down', 'folder-edit', 'folder-git', 'folder-heart', 'folder-input', 'folder-kanban', 'folder-key', 'folder-lock', 'folder-minus', 'folder-open', 'folder-output', 'folder-pen', 'folder-plus', 'folder-root', 'folder-search', 'folder-symlink', 'folder-sync', 'folder-tree', 'folder-up', 'folder-x', 'folders', 'footprints', 'forklift', 'forward', 'frame', 'framer', 'frown', 'fuel', 'function-square', 'gamepad', 'gamepad-2', 'gauge', 'gauge-circle', 'gavel', 'gem', 'ghost', 'gift', 'git-branch', 'git-commit', 'git-compare', 'git-fork', 'git-merge', 'git-pull-request', 'github', 'gitlab', 'glasses', 'globe', 'globe-2', 'goal', 'grape', 'grid', 'grip', 'grip-horizontal', 'grip-vertical', 'group', 'hammer', 'hand', 'hand-metal', 'handshake', 'hard-drive', 'hard-hat', 'hash', 'haze', 'hdmi-port', 'heading', 'headphones', 'headset', 'heart', 'heart-handshake', 'heart-pulse', 'help-circle', 'hexagon', 'highlighter', 'history', 'home', 'hop', 'hop-off', 'hotel', 'hourglass', 'ice-cream-2', 'ice-cream', 'image', 'image-minus', 'image-off', 'image-plus', 'import', 'inbox', 'indent', 'indian-rupee', 'infinity', 'info', 'inspect', 'instagram', 'italic', 'iteration-ccw', 'iteration-cw', 'japanese-yen', 'joystick', 'kanban', 'kanban-square', 'key', 'keyboard', 'key-round', 'lamp', 'lamp-ceiling', 'lamp-desk', 'lamp-floor', 'lamp-wall-down', 'lamp-wall-up', 'land-plot', 'landmark', 'languages', 'laptop', 'laptop-2', 'lasso', 'lasso-select', 'laugh', 'layers', 'layout', 'leaf'];
  group('lucide', 'Lucide', lucideGeneral
    .filter((n) => lucideNames.has(n))
    .map((n) => ({ id: `lucide_${n}`, title: titleCase(n), src: iconifyUrl('lucide', n, COLOR_ACCENT) }))
  );

  // Dedup: ensure ids are unique. We prefix per group so collisions across groups are not possible.
  const totalCount = groups.reduce((acc, g) => acc + g.entries.length, 0);
  console.log(`Total icons across ${groups.length} groups: ${totalCount}`);
  for (const g of groups) {
    console.log(`  ${g.category} (${g.title}): ${g.entries.length}`);
  }

  const ts = `// AUTO-GENERATED by scripts/build-studio-icons.mjs - do not edit by hand
// Sources: Iconify (logos CC0, mdi Apache 2.0, tabler MIT, lucide ISC, devicon MIT, material-symbols Apache 2.0, cryptocurrency-color CC0) + simpleicons.org (CC0)
// Total icons: ${totalCount}

import type { IconEntry, IconCategory } from './icon-library-types';

export const ICON_GROUPS: { category: IconCategory; title: string; entries: IconEntry[] }[] = [
${groups.map((g) => `  {
    category: ${JSON.stringify(g.category)},
    title: ${JSON.stringify(g.title)},
    entries: [
${g.entries.map((e) => `      { id: ${JSON.stringify(e.id)}, title: ${JSON.stringify(e.title)}, src: ${JSON.stringify(e.src)}, category: ${JSON.stringify(g.category)} },`).join('\n')}
    ],
  },`).join('\n')}
];

export const ICON_LIBRARY: IconEntry[] = ICON_GROUPS.flatMap((g) => g.entries);
`;
  await writeFile(OUT_FILE, ts, 'utf-8');
  console.log(`Wrote ${OUT_FILE} (${(ts.length / 1024).toFixed(1)}KB)`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
