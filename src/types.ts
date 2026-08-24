export type BuildingKind = 'house' | 'apartment' | 'shop' | 'park' | 'factory' | 'wild';
export type Biome = 'grass' | 'forest' | 'desert' | 'coastal';

export interface Point {
  x: number;
  y: number;
}

/** A short local street branching off the arterial grid, with houses along it. */
export interface Neighborhood {
  id: string;
  junction: Point; // where this street meets the arterial road
  tip: Point;
  dir: Point; // unit vector pointing inward from the arterial edge
  perp: Point; // unit vector perpendicular to dir (which side houses sit on)
  length: number;
}

export interface AddressUnit {
  id: string; // unique address id, e.g. "n3-h5"
  label: string; // human readable, e.g. "Oak Street 482"
  districtLabel: string; // neighborhood/city label shown in the UI
  blockId: string;
  kind: BuildingKind;
  pos: Point; // house/building position in world coords
  doorPos: Point; // mailbox position, just off the local street
  junction: Point; // where this address's local street meets the arterial road
  approachRow: number; // arterial grid intersection to route through
  approachCol: number;
}

export interface Block {
  id: string;
  row: number;
  col: number;
  kind: BuildingKind;
  biome: Biome;
  bounds: { x: number; y: number; w: number; h: number };
  streetName: string;
  neighborhoods: Neighborhood[];
  isCityCore: boolean;
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
