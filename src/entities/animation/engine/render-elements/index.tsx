import type {
  AnimationElement,
  AnimationEffect,
  SnapshotMap,
} from '../schema';
import { RenderCircle, RenderRect } from './shapes';
import { RenderArrow, RenderLine, resolveArrowCoords } from './arrows';
import { RenderImage, RenderPath, RenderPolygon, RenderText } from './text-image';
import { RenderCode } from './code';
import { FlowParticle } from './flow-particle';

export interface RenderProps {
  baseType: AnimationElement['type'];
  state: Record<string, unknown>;
  snap: SnapshotMap;
  elementMap: Map<string, AnimationElement>;
  effect: AnimationEffect | undefined;
  currentTime: number;
}

export function RenderElement({ baseType, state, snap, elementMap, effect, currentTime }: RenderProps): React.ReactElement | null {
  if (baseType === 'rect') return <RenderRect state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'circle') return <RenderCircle state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'line') return <RenderLine state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'arrow') return <RenderArrow state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'text') return <RenderText state={state} />;
  if (baseType === 'image') return <RenderImage state={state} />;
  if (baseType === 'path') return <RenderPath state={state} />;
  if (baseType === 'polygon') return <RenderPolygon state={state} />;
  if (baseType === 'code') return <RenderCode state={state} effect={effect} currentTime={currentTime} />;
  return null;
}

export { FlowParticle, resolveArrowCoords };
