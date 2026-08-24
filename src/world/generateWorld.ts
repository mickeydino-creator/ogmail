import { mulberry32 } from './rng';
import type { AddressUnit, Biome, Block, BuildingKind, Neighborhood, Point } from '../types';

// The arterial grid is the only rigid structure in the world — a sparse network of
// long through-roads. Everything else (neighborhoods, houses, biomes) is scattered
// organically inside the open land between those roads, so the map never reads as a
// grid of uniform city blocks.
export const GRID_N = 9; // arterial lines per axis
export const CELL = 900; // world units between arterial lines
export const ROAD_WIDTH = 34;
export const WORLD_SIZE = GRID_N * CELL;
export const FACTORY_ROW = Math.floor(GRID_N / 2);
export const FACTORY_COL = Math.floor(GRID_N / 2);

const BIOMES: Biome[] = ['grass', 'forest', 'desert', 'coastal'];
const BIOME_REGION_CELLS = 3; // biomes span roughly this many cells in each direction

const STREET_BASE_NAMES = [
  'Oak', 'Pine', 'Maple', 'Cedar', 'Willow', 'Birch', 'Elm', 'Aspen',
  'Harbor', 'Meadow', 'Sunset', 'River', 'Hilltop', 'Lantern', 'Cypress', 'Dune',
];
const STREET_SUFFIXES = ['Street', 'Avenue', 'Road', 'Lane', 'Way', 'Boulevard'];

export interface WorldData {
  blocks: Block[];
  addresses: AddressUnit[];
  addressById: Map<string, AddressUnit>;
  factory: {
    bounds: { x: number; y: number; w: number; h: number };
    entrance: Point; // south side
    exit: Point; // north side (opposite)
  };
}

function streetNameFor(row: number, col: number, rand: () => number) {
  const base = STREET_BASE_NAMES[Math.floor(rand() * STREET_BASE_NAMES.length)];
  const suffix = STREET_SUFFIXES[(row + col) % STREET_SUFFIXES.length];
  return `${base} ${suffix}`;
}

export function arterialNode(row: number, col: number): Point {
  return { x: col * CELL, y: row * CELL };
}

function cellBiome(row: number, col: number): Biome {
  const sr = Math.floor(row / BIOME_REGION_CELLS);
  const sc = Math.floor(col / BIOME_REGION_CELLS);
  const rand = mulberry32(sr * 7919 + sc * 104729 + 42);
  return BIOMES[Math.floor(rand() * BIOMES.length)];
}

interface CellPlan {
  kind: BuildingKind;
  neighborhoodCount: number;
}

function planCell(rand: () => number, cityDist: number): CellPlan {
  if (cityDist < 1) return { kind: 'house', neighborhoodCount: 3 + Math.floor(rand() * 2) };
  if (cityDist < 2.2) {
    if (rand() < 0.12) return { kind: 'apartment', neighborhoodCount: 0 };
    if (rand() < 0.1) return { kind: 'shop', neighborhoodCount: 0 };
    return { kind: 'house', neighborhoodCount: 2 + Math.floor(rand() * 2) };
  }
  if (cityDist < 3.6) {
    if (rand() < 0.4) return { kind: 'house', neighborhoodCount: 1 + Math.floor(rand() * 2) };
    if (rand() < 0.12) return { kind: 'park', neighborhoodCount: 0 };
    return { kind: 'wild', neighborhoodCount: 0 };
  }
  if (rand() < 0.15) return { kind: 'house', neighborhoodCount: 1 };
  if (rand() < 0.06) return { kind: 'park', neighborhoodCount: 0 };
  return { kind: 'wild', neighborhoodCount: 0 };
}

const EDGES = ['N', 'S', 'E', 'W'] as const;
type Edge = (typeof EDGES)[number];

function buildNeighborhood(
  rand: () => number,
  bounds: { x: number; y: number; w: number; h: number },
  row: number,
  col: number,
  edge: Edge,
  id: string,
): { neighborhood: Neighborhood; approachRow: number; approachCol: number } {
  const t = 0.18 + rand() * 0.64;
  let junction: Point;
  let dir: Point;
  let approach: [number, number, number, number]; // [rowA,colA,rowB,colB] — the two corners this edge connects

  switch (edge) {
    case 'N':
      junction = { x: bounds.x + bounds.w * t, y: bounds.y };
      dir = { x: 0, y: 1 };
      approach = [row, col, row, col + 1];
      break;
    case 'S':
      junction = { x: bounds.x + bounds.w * t, y: bounds.y + bounds.h };
      dir = { x: 0, y: -1 };
      approach = [row + 1, col, row + 1, col + 1];
      break;
    case 'W':
      junction = { x: bounds.x, y: bounds.y + bounds.h * t };
      dir = { x: 1, y: 0 };
      approach = [row, col, row + 1, col];
      break;
    default:
      junction = { x: bounds.x + bounds.w, y: bounds.y + bounds.h * t };
      dir = { x: -1, y: 0 };
      approach = [row, col + 1, row + 1, col + 1];
  }

  const length = 150 + rand() * 150;
  const tip = { x: junction.x + dir.x * length, y: junction.y + dir.y * length };
  const perp = { x: -dir.y, y: dir.x };
  const [rowA, colA, rowB, colB] = approach;
  const [approachRow, approachCol] = t < 0.5 ? [rowA, colA] : [rowB, colB];

  return { neighborhood: { id, junction, tip, dir, perp, length }, approachRow, approachCol };
}

function housesAlongNeighborhood(rand: () => number, neighborhood: Neighborhood, count: number) {
  const { junction, dir, perp, length } = neighborhood;
  const positions: number[] = [];
  let cursor = 0.14;
  const gap = 0.62 / count;
  for (let i = 0; i < count; i++) {
    cursor += gap * (0.7 + rand() * 0.8);
    if (cursor > 0.93) break;
    positions.push(cursor);
  }
  return positions.map((t) => {
    const side = rand() < 0.5 ? -1 : 1;
    const drivewayLen = 62 + rand() * 46;
    const roadPt = { x: junction.x + dir.x * length * t, y: junction.y + dir.y * length * t };
    const doorPos = { x: roadPt.x + perp.x * 15 * side, y: roadPt.y + perp.y * 15 * side };
    const pos = { x: roadPt.x + perp.x * drivewayLen * side, y: roadPt.y + perp.y * drivewayLen * side };
    return { doorPos, pos };
  });
}

export function generateWorld(): WorldData {
  const blocks: Block[] = [];
  const addresses: AddressUnit[] = [];

  const cityCenters: { row: number; col: number }[] = [];
  const cityRand = mulberry32(2024);
  for (let i = 0; i < 5; i++) {
    cityCenters.push({
      row: 1 + Math.floor(cityRand() * (GRID_N - 2)),
      col: 1 + Math.floor(cityRand() * (GRID_N - 2)),
    });
  }

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
      const biome = cellBiome(row, col);
      const cellSeed = mulberry32(row * 92821 + col * 68917 + 7);

      if (isFactory) {
        blocks.push({ id, row, col, kind: 'factory', biome, bounds, streetName: '', neighborhoods: [], isCityCore: false });
        continue;
      }

      const cityDist = Math.min(...cityCenters.map((c) => Math.hypot(row - c.row, col - c.col)));
      const plan = planCell(cellSeed, cityDist);
      const streetName = streetNameFor(row, col, cellSeed);
      const neighborhoods: Neighborhood[] = [];

      if (plan.kind === 'house') {
        const usedEdges = new Set<Edge>();
        for (let n = 0; n < plan.neighborhoodCount; n++) {
          let edge = EDGES[Math.floor(cellSeed() * EDGES.length)];
          if (usedEdges.size < EDGES.length) {
            while (usedEdges.has(edge)) edge = EDGES[Math.floor(cellSeed() * EDGES.length)];
          }
          usedEdges.add(edge);
          const nId = `${id}-n${n}`;
          const { neighborhood, approachRow, approachCol } = buildNeighborhood(cellSeed, bounds, row, col, edge, nId);
          neighborhoods.push(neighborhood);

          const houseCount = 4 + Math.floor(cellSeed() * 4);
          const spots = housesAlongNeighborhood(cellSeed, neighborhood, houseCount);
          spots.forEach((spot, hIdx) => {
            const number = row * 1000 + col * 20 + n * 40 + hIdx * 2 + 11;
            addresses.push({
              id: `${nId}-h${hIdx}`,
              label: `${streetName} ${number}`,
              districtLabel: `${streetName} · District ${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`,
              blockId: id,
              kind: 'house',
              pos: spot.pos,
              doorPos: spot.doorPos,
              junction: neighborhood.junction,
              approachRow,
              approachCol,
            });
          });
        }
      } else if (plan.kind === 'apartment') {
        const edge = EDGES[Math.floor(cellSeed() * EDGES.length)];
        const nId = `${id}-apt`;
        const { neighborhood, approachRow, approachCol } = buildNeighborhood(cellSeed, bounds, row, col, edge, nId);
        neighborhoods.push(neighborhood);
        const buildingPos = { x: neighborhood.tip.x, y: neighborhood.tip.y };
        const doorPos = {
          x: neighborhood.junction.x + neighborhood.dir.x * neighborhood.length * 0.92,
          y: neighborhood.junction.y + neighborhood.dir.y * neighborhood.length * 0.92,
        };
        const units = 16 + Math.floor(cellSeed() * 14);
        const number = row * 1000 + col * 20 + 11;
        for (let u = 1; u <= units; u++) {
          addresses.push({
            id: `${nId}-u${u}`,
            label: `${streetName} ${number}, Unit ${u}`,
            districtLabel: `${streetName} · District ${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`,
            blockId: id,
            kind: 'apartment',
            pos: buildingPos,
            doorPos,
            junction: neighborhood.junction,
            approachRow,
            approachCol,
          });
        }
      }

      blocks.push({
        id,
        row,
        col,
        kind: plan.kind,
        biome,
        bounds,
        streetName,
        neighborhoods,
        isCityCore: cityDist < 1,
      });
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
    factory,
  };
}

export const WORLD = generateWorld();
