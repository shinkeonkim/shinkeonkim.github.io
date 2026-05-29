export type AssetParamSpec =
  | { kind: 'number'; name: string; label: string; default: number; min?: number; max?: number; step?: number; help?: string }
  | { kind: 'string'; name: string; label: string; default: string; placeholder?: string; help?: string }
  | { kind: 'select'; name: string; label: string; default: string; options: readonly { value: string; label?: string }[]; help?: string }
  | { kind: 'color'; name: string; label: string; default: string; help?: string }
  | { kind: 'boolean'; name: string; label: string; default: boolean; help?: string }
  | { kind: 'string-list'; name: string; label: string; default: readonly string[]; separator?: string; placeholder?: string; help?: string }
  | { kind: 'point'; name: string; label: string; default: { x: number; y: number }; help?: string }
  | { kind: 'group'; name: string; label: string; fields: readonly AssetParamSpec[]; collapsed?: boolean };

import type { AssetParam } from './assets';

export type AnyAssetParam = AssetParam | AssetParamSpec;

export function isSpec(p: AnyAssetParam): p is AssetParamSpec {
  return 'kind' in p;
}

export function toSpec(p: AnyAssetParam): AssetParamSpec {
  if (isSpec(p)) return p;
  if (p.type === 'number') {
    return {
      kind: 'number',
      name: p.name,
      label: p.label,
      default: typeof p.default === 'number' ? p.default : Number(p.default ?? 0),
      min: p.min,
      max: p.max,
    };
  }
  if (p.type === 'string-array') {
    const def = typeof p.default === 'string'
      ? p.default.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(p.default) ? p.default.map(String) : [];
    return {
      kind: 'string-list',
      name: p.name,
      label: p.label,
      default: def,
      placeholder: p.placeholder,
    };
  }
  return {
    kind: 'string',
    name: p.name,
    label: p.label,
    default: typeof p.default === 'string' ? p.default : String(p.default ?? ''),
    placeholder: p.placeholder,
  };
}

export function flattenSpecs(specs: readonly AssetParamSpec[]): AssetParamSpec[] {
  const out: AssetParamSpec[] = [];
  for (const s of specs) {
    if (s.kind === 'group') {
      out.push(...flattenSpecs(s.fields));
    } else {
      out.push(s);
    }
  }
  return out;
}
