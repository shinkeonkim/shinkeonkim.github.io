import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'public/animations';

function migrate(v2) {
  const stepDurations = (v2.steps ?? []).map((s) => s.duration ?? 800);
  const stepStarts = [0];
  for (let i = 0; i < stepDurations.length; i += 1) stepStarts.push(stepStarts[i] + stepDurations[i]);
  const totalDuration = stepStarts[stepStarts.length - 1];

  const initiallyHidden = new Set(v2.initiallyHidden ?? []);

  const v3Elements = (v2.elements ?? []).map((el) => {
    const base = { ...el };
    const trackMap = new Map();
    let currentVisible = !initiallyHidden.has(el.id);
    const appearances = [];
    let openStart = currentVisible ? 0 : null;

    for (let i = 0; i < (v2.steps ?? []).length; i += 1) {
      const step = v2.steps[i];
      const kf = step.keyframes?.[el.id];
      if (!kf) continue;
      const stepEnd = stepStarts[i + 1];
      for (const [prop, value] of Object.entries(kf)) {
        if (prop === 'visible') {
          const want = value === true;
          if (want !== currentVisible) {
            if (want) {
              openStart = stepStarts[i];
            } else {
              if (openStart !== null) appearances.push({ start: openStart, end: stepEnd, entryDuration: 300, exitDuration: 300 });
              openStart = null;
            }
            currentVisible = want;
          }
        } else if (value !== null) {
          if (!trackMap.has(prop)) trackMap.set(prop, []);
          trackMap.get(prop).push({ time: stepEnd, value });
        }
      }
    }
    if (openStart !== null) {
      appearances.push({ start: openStart, end: totalDuration, entryDuration: 300, exitDuration: 300 });
    }
    if (appearances.length === 0 && !initiallyHidden.has(el.id)) {
      appearances.push({ start: 0, end: totalDuration, entryDuration: 300, exitDuration: 300 });
    }

    const tracks = [];
    for (const [property, kfs] of trackMap) {
      kfs.sort((a, b) => a.time - b.time);
      const dedup = [];
      for (const kf of kfs) {
        const last = dedup[dedup.length - 1];
        if (!last || last.time !== kf.time) dedup.push(kf);
        else last.value = kf.value;
      }
      tracks.push({ property, keyframes: dedup });
    }
    base.appearances = appearances;
    base.tracks = tracks;
    return base;
  });

  const chapters = (v2.steps ?? []).map((s, i) => ({
    id: s.id,
    time: stepStarts[i],
    label: s.label ?? '',
    subtitle: s.subtitle ?? '',
  }));

  const effects = [];
  let effIdx = 0;
  for (let i = 0; i < (v2.steps ?? []).length; i += 1) {
    const step = v2.steps[i];
    for (const e of step.effects ?? []) {
      effIdx += 1;
      const triggerTime = stepStarts[i] + (e.delay ?? 0);
      effects.push({
        ...e,
        id: `eff-${effIdx}`,
        time: triggerTime,
        duration: e.duration ?? 500,
      });
    }
  }

  return {
    version: 3,
    id: v2.id,
    title: v2.title ?? '',
    description: v2.description ?? '',
    category: v2.category ?? 'general',
    tags: v2.tags ?? [],
    duration: totalDuration || 5000,
    canvas: v2.canvas ?? { width: 800, height: 500, background: 'transparent' },
    elements: v3Elements,
    chapters,
    effects,
    settings: {
      loop: v2.settings?.loop ?? true,
      autoplay: v2.settings?.autoplay ?? true,
      showCaption: v2.settings?.showCaption ?? false,
      showChapterList: v2.settings?.showStepList ?? false,
    },
    updatedAt: v2.updatedAt,
  };
}

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));
  let migrated = 0, skipped = 0;
  for (const f of files) {
    const path = join(DIR, f);
    const raw = await readFile(path, 'utf8');
    const data = JSON.parse(raw);
    if (data.version === 3) { skipped += 1; continue; }
    const v3 = migrate(data);
    await writeFile(path, JSON.stringify(v3, null, 2));
    migrated += 1;
    console.log(`  migrated ${f}: ${v3.elements.length} elements, ${v3.chapters.length} chapters, ${v3.effects.length} effects, duration ${v3.duration}ms`);
  }
  console.log(`\n${migrated} migrated, ${skipped} already v3`);
}

main().catch((e) => { console.error(e); process.exit(1); });
