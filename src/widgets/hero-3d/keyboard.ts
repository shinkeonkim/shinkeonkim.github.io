import * as THREE from 'three';
import {
  FUNCTION_ROW_Z_SCALE,
  KEY_BASE_Y,
  KEY_DEPTH,
  KEY_GAP,
  KEY_THICKNESS,
  KEY_U,
  KEYBOARD_ROWS,
  ROW_DEPTH_GAP,
  ROW_U,
} from './theme';

export interface KeyboardBuild {
  keys: THREE.Mesh[];
  keyGeometries: THREE.BufferGeometry[];
  keyOffsets: number[];
  backEdge: number;
}

export function buildKeyboard(
  laptop: THREE.Group,
  keyMaterial: THREE.MeshStandardMaterial,
): KeyboardBuild {
  const keys: THREE.Mesh[] = [];
  const keyGeometries: THREE.BufferGeometry[] = [];
  const keyOffsets: number[] = [];

  const rowDepths = KEYBOARD_ROWS.map((r) =>
    r[0]?.shortRow ? KEY_DEPTH * FUNCTION_ROW_Z_SCALE : KEY_DEPTH,
  );
  const rowOffsetX = -((ROW_U * KEY_U + (ROW_U - 1) * KEY_GAP) / 2);
  const keyboardBackZ = -0.85;
  let backEdge = keyboardBackZ;

  KEYBOARD_ROWS.forEach((rowDef, rowIndex) => {
    const depth = rowDepths[rowIndex];
    const rowCenterZ = backEdge + depth / 2;
    const rowUnits = rowDef.reduce((sum, k) => sum + k.width, 0);
    const padU = (ROW_U - rowUnits) / 2;
    let cursorX = rowOffsetX + padU * (KEY_U + KEY_GAP);
    rowDef.forEach((keyDef) => {
      const keyW = keyDef.width * KEY_U;
      const geo = new THREE.BoxGeometry(keyW * 0.92, KEY_THICKNESS, depth * 0.88);
      keyGeometries.push(geo);
      const key = new THREE.Mesh(geo, keyMaterial);
      key.position.set(cursorX + keyW / 2, KEY_BASE_Y, rowCenterZ);
      laptop.add(key);
      keys.push(key);
      keyOffsets.push(Math.random() * Math.PI * 2);
      cursorX += keyW + KEY_GAP;
    });
    backEdge += depth + ROW_DEPTH_GAP;
  });

  return { keys, keyGeometries, keyOffsets, backEdge };
}
