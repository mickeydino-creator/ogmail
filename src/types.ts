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
  sentCount: number;
  receivedCount: number;
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

export interface Envelope {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  imageDataUrl?: string;
  gift?: string;
  style: EnvelopeStyle;
  createdAt: number;
  status: DeliveryStatus;
  statusChangedAt: number;
  read: boolean;
  seenByRecipientNotification: boolean;
}

export interface DeliveryTimings {
  PICKUP: number;
  TO_FACTORY: number;
  PROCESSING: number;
  LEAVING_FACTORY: number;
  TO_RECIPIENT: number;
}
