import type { DeliveryStatus, Envelope } from '../types';
import { pathLength } from '../world/routing';
import { routeFromFactory, routeToFactory } from '../world/routing';
import { WORLD } from '../world/generateWorld';

export const STATUS_ORDER: DeliveryStatus[] = [
  'CREATED',
  'PICKUP',
  'TO_FACTORY',
  'PROCESSING',
  'LEAVING_FACTORY',
  'TO_RECIPIENT',
  'DELIVERED',
];

const BASE_PICKUP_MS = 1500;
const BASE_PROCESSING_MS = 2000;
const BASE_LEAVING_MS = 1100;
const MIN_DRIVE_MS = 3200;
const MAX_DRIVE_MS = 6500;
const DRIVE_SPEED_UNITS_PER_MS = 1.1;

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

function durationOf(status: DeliveryStatus, d: Durations): number {
  switch (status) {
    case 'PICKUP': return d.PICKUP;
    case 'TO_FACTORY': return d.TO_FACTORY;
    case 'PROCESSING': return d.PROCESSING;
    case 'LEAVING_FACTORY': return d.LEAVING_FACTORY;
    case 'TO_RECIPIENT': return d.TO_RECIPIENT;
    default: return 0;
  }
}

/**
 * Advances an envelope's status based on elapsed wall-clock time, cascading through
 * multiple states if the app was closed for a while. This is what makes delivery
 * state recoverable across reloads.
 */
export function advanceEnvelope(envelope: Envelope, durations: Durations, now: number): Envelope {
  if (envelope.status === 'DELIVERED') return envelope;
  let status: DeliveryStatus = envelope.status;
  let changedAt = envelope.statusChangedAt;
  // Kick off CREATED -> PICKUP immediately.
  if (status === 'CREATED') {
    status = 'PICKUP';
    changedAt = envelope.statusChangedAt;
  }
  // Cascade through timed states while enough time has elapsed.
  // Guard against infinite loop with a max iteration count.
  for (let i = 0; i < STATUS_ORDER.length; i++) {
    if (status === 'DELIVERED') break;
    const dur = durationOf(status, durations);
    const elapsed = now - changedAt;
    if (elapsed < dur) break;
    const idx = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[idx + 1];
    changedAt = changedAt + dur;
    status = next;
  }
  if (status === envelope.status) return envelope;
  return { ...envelope, status, statusChangedAt: changedAt };
}

/** Progress in [0,1] within the current status, for smooth animation via rAF. */
export function progressWithin(envelope: Envelope, durations: Durations, now: number): number {
  const dur = durationOf(envelope.status, durations);
  if (dur <= 0) return 1;
  return Math.max(0, Math.min(1, (now - envelope.statusChangedAt) / dur));
}
