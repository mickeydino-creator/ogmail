import { mulberry32 } from './rng';
import type { AddressUnit, Block, BuildingKind, Point } from '../types';

export const GRID_N = 13; // NxN block grid
export const CELL = 300; // world units per block cell
export const ROAD_WIDTH = 34;
export const WORLD_SIZE = GRID_N * CELL;
export const FACTORY_ROW = Math.floor(GRID_N / 2);
export const FACTORY_COL = Math.floor(GRID_N / 2);

const STREET_BASE_NAMES = [
  'Oak', 'Pine', 'Maple', 'Cedar', 'Willow', 'Birch', 'Elm', 'Aspen',
  'Harbor', 'Meadow', 'Sunset', 'River', 'Hilltop', 'Lantern',
];
const STREET_SUFFIXES = ['Street', 'Avenue', 'Road', 'Lane', 'Way', 'Boulevard'];

export interface WorldData {
  blocks: Block[];
  addresses: AddressUnit[];
  addressById: Map<string, AddressUnit>;
  roadNodes: Point[]; // flat list, indexable by row*(GRID_N+1)+col
  factory: {
    bounds: { x: number; y: number; w: number; h: number };
    entrance: Point; // south side
    exit: Point; // north side (opposite)
  };
}

function streetNameForRow(row: number): string {
  const base = STREET_BASE_NAMES[row % STREET_BASE_NAMES.length];
  const suffix = STREET_SUFFIXES[Math.floor(row / STREET_BASE_NAMES.length) % STREET_SUFFIXES.length];
  return `${base} ${suffix}`;
}

export function roadNode(row: number, col: number): Point {
  return { x: col * CELL, y: row * CELL };
}

function pickKind(rand: () => number): BuildingKind {
  const r = rand();
  if (r < 0.08) return 'park';
  if (r < 0.18) return 'shop';
  if (r < 0.33) return 'apartment';
  return 'house';
}

export function generateWorld(): WorldData {
  const rand = mulberry32(1337);
  const blocks: Block[] = [];
  const addresses: AddressUnit[] = [];

  for (let row = 0; row < GRID_N; row++) {
    for (let col = 0; col < GRID_N; col++) {
      const isFactory = row === FACTORY_ROW && col === FACTORY_COL;
      const id = `b-${row}-${col}`;
      const bounds = {
        x: col * CELL + ROAD_WIDTH / 2,
        y: row * CELL + ROAD_WIDTH / 2,
        w: CELL - ROAD_WIDTH,
        h: CELL - ROAD_WIDTH,
      };
      const kind: BuildingKind = isFactory ? 'factory' : pickKind(rand);
      const streetName = streetNameForRow(row);
      blocks.push({ id, row, col, kind, bounds, streetName });

      if (isFactory) continue;

      const rn = roadNode(row, col);

      if (kind === 'house') {
        const cols = 4;
        const rows = 3;
        const padX = bounds.w * 0.08;
        const padY = bounds.h * 0.08;
        const cellW = (bounds.w - padX * 2) / cols;
        const cellH = (bounds.h - padY * 2) / rows;
        let n = 0;
        for (let ry = 0; ry < rows; ry++) {
          for (let rx = 0; rx < cols; rx++) {
            n++;
            const cx = bounds.x + padX + cellW * (rx + 0.5);
            const cy = bounds.y + padY + cellH * (ry + 0.5);
            const number = row * 1000 + col * 20 + n * 2 + 11;
            const addrId = `${id}-h${n}`;
            addresses.push({
              id: addrId,
              label: `${streetName} ${number}`,
              districtLabel: `District ${String(row).padStart(2, '0')} · Block ${String(col).padStart(2, '0')}`,
              blockId: id,
              kind: 'house',
              pos: { x: cx, y: cy },
              doorPos: { x: cx, y: cy + cellH * 0.32 },
              roadNode: rn,
            });
          }
        }
      } else if (kind === 'apartment') {
        const units = 16 + Math.floor(rand() * 8);
        const cx = bounds.x + bounds.w / 2;
        const cy = bounds.y + bounds.h / 2;
        const number = row * 1000 + col * 20 + 11;
        for (let u = 1; u <= units; u++) {
          const addrId = `${id}-u${u}`;
          addresses.push({
            id: addrId,
            label: `${streetName} ${number}, Unit ${u}`,
            districtLabel: `District ${String(row).padStart(2, '0')} · Block ${String(col).padStart(2, '0')}`,
            blockId: id,
            kind: 'apartment',
            pos: { x: cx, y: cy },
            doorPos: { x: bounds.x + bounds.w * 0.5, y: bounds.y + bounds.h * 0.92 },
            roadNode: rn,
          });
        }
      }
    }
  }

  const roadNodes: Point[] = [];
  for (let row = 0; row <= GRID_N; row++) {
    for (let col = 0; col <= GRID_N; col++) {
      roadNodes.push(roadNode(row, col));
    }
  }

  const factoryBounds = {
    x: FACTORY_COL * CELL + ROAD_WIDTH / 2,
    y: FACTORY_ROW * CELL + ROAD_WIDTH / 2,
    w: CELL - ROAD_WIDTH,
    h: CELL - ROAD_WIDTH,
  };

  const factory = {
    bounds: factoryBounds,
    entrance: { x: factoryBounds.x + factoryBounds.w / 2, y: factoryBounds.y + factoryBounds.h },
    exit: { x: factoryBounds.x + factoryBounds.w / 2, y: factoryBounds.y },
  };

  return {
    blocks,
    addresses,
    addressById: new Map(addresses.map((a) => [a.id, a])),
    roadNodes,
    factory,
  };
}

export const WORLD = generateWorld();
