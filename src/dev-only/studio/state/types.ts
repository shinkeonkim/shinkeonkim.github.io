import type { AnimationDef } from '@/entities/animation/engine/schema';

export type Selection =
  | { kind: 'none' }
  | { kind: 'element'; elementId: string }
  | { kind: 'elements'; elementIds: string[] }
  | { kind: 'chapter'; chapterId: string }
  | { kind: 'effect'; effectId: string };

export interface InternalState {
  def: AnimationDef | null;
  dirty: boolean;
  selection: Selection;
  currentTime: number;
  isDraft: boolean;
}

export type HistoryKind =
  | 'meta'
  | 'canvas'
  | 'settings'
  | 'add'
  | 'delete'
  | 'move'
  | 'style'
  | 'rotate'
  | 'resize'
  | 'reorder'
  | 'track'
  | 'appearance'
  | 'chapter'
  | 'effect'
  | 'group'
  | 'other';

export interface HistoryEntry {
  snap: string;
  label: string;
  kind: HistoryKind;
  timestamp: number;
}

export type Listener = () => void;
