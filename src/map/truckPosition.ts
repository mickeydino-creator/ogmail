import type { AddressUnit, DeliveryStatus, Point } from '../types';
import { pathLength, routeFromFactory, routeToFactory, samplePath } from '../world/routing';

const EMERGE_DIST = 55; // world units the truck visibly "emerges" from the exit gate before driving off

export interface TruckPose {
  pos: Point;
  angle: number;
}

/**
 * Where the delivery truck actually is right now, in world coordinates — shared by
 * the on-map truck sprite (TrucksLayer) and the chase camera (MapCanvas) so they
 * always agree on exactly the same position.
 */
export function getTruckPose(
  status: DeliveryStatus,
  progress: number,
  senderAddr: AddressUnit,
  recipientAddr: AddressUnit,
): TruckPose | null {
  if (status === 'PICKUP') {
    return { pos: { x: senderAddr.doorPos.x + 16, y: senderAddr.doorPos.y + 4 }, angle: 0 };
  }
  if (status === 'TO_FACTORY') {
    return samplePath(routeToFactory(senderAddr), progress);
  }
  if (status === 'LEAVING_FACTORY' || status === 'TO_RECIPIENT') {
    const pts = routeFromFactory(recipientAddr);
    const total = pathLength(pts);
    const emergeFrac = total > 0 ? Math.min(0.35, EMERGE_DIST / total) : 0.1;
    const t = status === 'LEAVING_FACTORY' ? progress * emergeFrac : emergeFrac + progress * (1 - emergeFrac);
    return samplePath(pts, t);
  }
  return null;
}
