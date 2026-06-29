#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from collections import Counter


def metric(d):
    elements = d.get('elements', [])
    type_counts = Counter(e.get('type') for e in elements)

    visual_shape = (type_counts.get('circle', 0)
                    + type_counts.get('line', 0)
                    + type_counts.get('arrow', 0)
                    + type_counts.get('path', 0)
                    + type_counts.get('polygon', 0))

    data_rect = sum(
        1 for e in elements
        if e.get('type') == 'rect'
        and e.get('label') is not None
        and e.get('width', 999) < 200
    )

    tracks_count = sum(len(e.get('tracks', [])) for e in elements)

    return {
        'total': len(elements),
        'visual_shape': visual_shape,
        'data_rect': data_rect,
        'tracks': tracks_count,
        'effects': len(d.get('effects', [])),
        'chapters': len(d.get('chapters', [])),
        'duration': d.get('duration', 0),
        'type_counts': dict(type_counts),
    }


def flags(m):
    out = []
    if m['visual_shape'] + m['data_rect'] == 0:
        out.append('SCAFFOLD_ONLY')
    if m['total'] < 10:
        out.append('TOO_FEW_ELEMENTS')
    if m['tracks'] == 0 and m['effects'] <= 2:
        out.append('STATIC')
    if m['duration'] < 6000:
        out.append('SHORT')
    if m['chapters'] == 0:
        out.append('NO_CHAPTERS')
    return out


def main():
    root = Path(__file__).resolve().parent.parent
    files = sorted((root / 'public/animations').glob('*.json'))

    report = []
    for f in files:
        try:
            d = json.loads(f.read_text())
        except Exception as e:
            print(f"ERROR {f}: {e}", file=sys.stderr)
            continue
        m = metric(d)
        flg = flags(m)
        report.append({'slug': f.stem, 'metric': m, 'flags': flg})

    flagged = [r for r in report if r['flags']]
    pass_count = len(report) - len(flagged)
    severe = [r for r in flagged if 'SCAFFOLD_ONLY' in r['flags']]

    print(f"Total: {len(report)}")
    print(f"  PASS (no flags): {pass_count}")
    print(f"  FLAGGED: {len(flagged)}")
    print(f"  SCAFFOLD_ONLY (most severe): {len(severe)}")
    print()
    print("=== FLAG DISTRIBUTION ===")
    flag_counts = Counter()
    for r in flagged:
        for f in r['flags']:
            flag_counts[f] += 1
    for flag, cnt in flag_counts.most_common():
        print(f"  {flag:<25} {cnt}")
    print()

    if '--report' in sys.argv:
        print()
        print("=== SCAFFOLD_ONLY (need deep review/rebuild) ===")
        for r in sorted(severe, key=lambda r: r['metric']['total']):
            print(f"  {r['slug']:<35} total={r['metric']['total']:3} "
                  f"vis={r['metric']['visual_shape']} data_rect={r['metric']['data_rect']} "
                  f"tracks={r['metric']['tracks']}")
        print()
        print("=== OTHER FLAGGED (less severe) ===")
        other = [r for r in flagged if 'SCAFFOLD_ONLY' not in r['flags']]
        for r in sorted(other, key=lambda r: r['metric']['total']):
            print(f"  {r['slug']:<35} flags={','.join(r['flags']):<35} "
                  f"total={r['metric']['total']:3}")

    if '--write' in sys.argv:
        out_path = root / '.private' / 'animation-score-report.json'
        out_path.write_text(json.dumps(
            {'pass_count': pass_count,
             'flagged_count': len(flagged),
             'scaffold_only_count': len(severe),
             'flag_distribution': dict(flag_counts),
             'flagged': flagged},
            indent=2, ensure_ascii=False))
        print(f"\nWrote {out_path}")


if __name__ == '__main__':
    main()
