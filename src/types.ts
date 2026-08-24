export type BuildingKind = 'house' | 'apartment' | 'shop' | 'park' | 'factory';

export interface Point {
  x: number;
  y: number;
}

export interface AddressUnit {
  id: string; // unique address id, e.g. "district-3-block-5-house-12"
  label: string; // human readable, e.g. "Oak Street 482"
  districtLabel: string; // "District 03 · Block 05"
  blockId: string;
  kind: BuildingKind;
  pos: Point; // house/mailbox anchor in world coords
  doorPos: Point; // slightly offset for door/mailbox visuals
  roadNode: Point; // nearest road graph node for pathing
}

export interface Block {
  id: string;
  row: number;
  col: number;
  kind: BuildingKind;
  bounds: { x: number; y: number; w: number; h: number };
  streetName: string;
}

export interface User {
  id: string;
  username: string;
  addressId: string;
  createdAt: number;
  isNpc?: boolean;
}

export type DeliveryStatus =
  | 'CREATED'
  | 'PICKUP'
  | 'TO_FACTORY'
  | 'PROCESSING'
  | 'LEAVING_FACTORY'
  | 'TO_RECIPIENT'
  | 'DELIVERED';

export const ENVELOPE_STYLES = ['classic', 'kraft', 'rose', 'sky', 'sunshine', 'mint'] as const;
export type EnvelopeStyle = (typeof ENVELOPE_STYLES)[number];

/** As stored in the `envelopes` table. Delivery status is never persisted — it's a
 * pure function of `createdAt` (see engine/deliveryEngine.ts), so it's automatically
 * consistent across every device/tab watching the same row, and needs no writes. */
export interface EnvelopeRow {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  imageDataUrl?: string;
  gift?: string;
  style: EnvelopeStyle;
  createdAt: number;
  read: boolean;
}

/** An EnvelopeRow plus its derived delivery status, recomputed on every tick. */
export interface Envelope extends EnvelopeRow {
  status: DeliveryStatus;
  statusChangedAt: number;
}

export interface DeliveryTimings {
  PICKUP: number;
  TO_FACTORY: number;
  PROCESSING: number;
  LEAVING_FACTORY: number;
  TO_RECIPIENT: number;
}
