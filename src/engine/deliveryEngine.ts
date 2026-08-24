import type { DeliveryStatus, EnvelopeRow, Envelope } from '../types';
import { pathLength } from '../world/routing';
import { routeFromFactory, routeToFactory } from '../world/routing';
import { WORLD } from '../world/generateWorld';

const TIMED_STATUSES: Exclude<DeliveryStatus, 'CREATED' | 'DELIVERED'>[] = [
  'PICKUP',
  'TO_FACTORY',
  'PROCESSING',
  'LEAVING_FACTORY',
  'TO_RECIPIENT',
];

const BASE_PICKUP_MS = 1500;
const BASE_PROCESSING_MS = 2000;
const BASE_LEAVING_MS = 1400;
const MIN_DRIVE_MS = 6000;
const MAX_DRIVE_MS = 14000;
const DRIVE_SPEED_UNITS_PER_MS = 0.5;

function driveDurationMs(distance: number): number {
  return Math.min(MAX_DRIVE_MS, Math.max(MIN_DRIVE_MS, distance / DRIVE_SPEED_UNITS_PER_MS));
}

export interface Durations {
  PICKUP: number;
  TO_FACTORY: number;
  PROCESSING: number;
  LEAVING_FACTORY: number;
  TO_RECIPIENT: number;
}

export function computeDurations(senderAddressId: string, recipientAddressId: string): Durations {
  const senderAddr = WORLD.addressById.get(senderAddressId);
  const recipientAddr = WORLD.addressById.get(recipientAddressId);
  const toFactoryDist = senderAddr ? pathLength(routeToFactory(senderAddr)) : 1000;
  const toRecipientDist = recipientAddr ? pathLength(routeFromFactory(recipientAddr)) : 1000;
  return {
    PICKUP: BASE_PICKUP_MS,
    TO_FACTORY: driveDurationMs(toFactoryDist),
    PROCESSING: BASE_PROCESSING_MS,
    LEAVING_FACTORY: BASE_LEAVING_MS,
    TO_RECIPIENT: driveDurationMs(toRecipientDist),
  };
}

/**
 * Delivery status is never stored — it's derived purely from `createdAt` plus the
 * route-dependent durations, by walking through each timed status in order and
 * seeing how far into the total journey `now` falls. Because it only depends on
 * data every client already has (the row's createdAt, and the deterministic world
 * map), this is automatically consistent across every device watching the same
 * envelope, and naturally "recovers" correctly after any amount of time offline.
 */
export function deriveEnvelope(row: EnvelopeRow, durations: Durations, now: number): Envelope {
  let cursor = row.createdAt;
  for (const status of TIMED_STATUSES) {
    const dur = durations[status];
    if (now < cursor + dur) {
      return { ...row, status, statusChangedAt: cursor };
    }
    cursor += dur;
  }
  return { ...row, status: 'DELIVERED', statusChangedAt: cursor };
}

/** Progress in [0,1] within the current status, for smooth animation via rAF. */
export function progressWithin(envelope: Envelope, durations: Durations, now: number): number {
  if (envelope.status === 'CREATED' || envelope.status === 'DELIVERED') return 1;
  const dur = durations[envelope.status];
  if (dur <= 0) return 1;
  return Math.max(0, Math.min(1, (now - envelope.statusChangedAt) / dur));
}
