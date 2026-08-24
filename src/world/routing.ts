import { CELL, FACTORY_COL, FACTORY_ROW, WORLD } from './generateWorld';
import type { AddressUnit, Point } from '../types';

function nodeAt(row: number, col: number): Point {
  return { x: col * CELL, y: row * CELL };
}

function addressRoadRowCol(addr: AddressUnit): { row: number; col: number } {
  return { row: Math.round(addr.roadNode.y / CELL), col: Math.round(addr.roadNode.x / CELL) };
}

// L-shaped Manhattan path between two grid intersections, following streets.
function gridPath(a: { row: number; col: number }, b: { row: number; col: number }): Point[] {
  const pts: Point[] = [nodeAt(a.row, a.col)];
  if (a.col !== b.col) pts.push(nodeAt(a.row, b.col));
  if (a.row !== b.row) pts.push(nodeAt(b.row, b.col));
  return pts;
}

const factorySouthNode = { row: FACTORY_ROW + 1, col: FACTORY_COL };
const factoryNorthNode = { row: FACTORY_ROW, col: FACTORY_COL };

/** Full waypoint path for driving from a sender's house to the factory entrance. */
export function routeToFactory(from: AddressUnit): Point[] {
  const start = addressRoadRowCol(from);
  const path = gridPath(start, factorySouthNode);
  const southNodePt = nodeAt(factorySouthNode.row, factorySouthNode.col);
  return [from.doorPos, ...path, { x: WORLD.factory.entrance.x, y: southNodePt.y }, WORLD.factory.entrance];
}

/** Full waypoint path for driving from the factory exit to a recipient's mailbox. */
export function routeFromFactory(to: AddressUnit): Point[] {
  const end = addressRoadRowCol(to);
  const northNodePt = nodeAt(factoryNorthNode.row, factoryNorthNode.col);
  const path = gridPath(factoryNorthNode, end);
  return [WORLD.factory.exit, { x: WORLD.factory.exit.x, y: northNodePt.y }, ...path, to.doorPos];
}

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

/** Interpolate a position + heading angle (degrees) along a polyline at t in [0,1]. */
export function samplePath(points: Point[], t: number): { pos: Point; angle: number } {
  if (points.length === 1) return { pos: points[0], angle: 0 };
  const total = pathLength(points);
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (acc + segLen >= target || i === points.length - 1) {
      const segT = segLen === 0 ? 0 : (target - acc) / segLen;
      const x = points[i - 1].x + (points[i].x - points[i - 1].x) * segT;
      const y = points[i - 1].y + (points[i].y - points[i - 1].y) * segT;
      const angle = (Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x) * 180) / Math.PI;
      return { pos: { x, y }, angle };
    }
    acc += segLen;
  }
  return { pos: points[points.length - 1], angle: 0 };
}
