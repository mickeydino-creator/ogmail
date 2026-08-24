import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Envelope, EnvelopeStyle, User } from '../types';
import { WORLD } from '../world/generateWorld';
import { NPC_USERNAMES } from '../world/npcNames';
import { loadState, saveState } from './persist';
import { advanceEnvelope, computeDurations } from '../engine/deliveryEngine';

export interface AppNotification {
  id: string;
  envelopeId: string;
  text: string;
  createdAt: number;
  read: boolean;
}

interface PersistedShape {
  currentUserId: string;
  users: Record<string, User>;
  envelopes: Record<string, Envelope>;
  notifications: AppNotification[];
}

interface StoreState extends PersistedShape {
  hydrated: boolean;
  init: () => void;
  tick: () => void;
  sendEnvelope: (input: {
    recipientId: string;
    message: string;
    style: EnvelopeStyle;
    imageDataUrl?: string;
    gift?: string;
  }) => string;
  markRead: (envelopeId: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

function seedNpcUsers(): Record<string, User> {
  const users: Record<string, User> = {};
  const houseAddresses = WORLD.addresses.filter((a) => a.kind === 'house');
  // Spread NPCs evenly across the whole grid (rather than clustering near the start)
  // so their homes land in distinct, well-separated neighborhoods.
  const span = houseAddresses.length / NPC_USERNAMES.length;
  NPC_USERNAMES.forEach((name, i) => {
    const idx = Math.floor((i + 0.5) * span) % houseAddresses.length;
    const addr = houseAddresses[idx];
    const id = `npc-${i}`;
    users[id] = {
      id,
      username: name,
      addressId: addr.id,
      createdAt: Date.now() - i * 86400000,
      sentCount: 0,
      receivedCount: 0,
      isNpc: true,
    };
  });
  return users;
}

function persistNow(state: StoreState) {
  saveState<PersistedShape>({
    currentUserId: state.currentUserId,
    users: state.users,
    envelopes: state.envelopes,
    notifications: state.notifications,
  });
}

export const useStore = create<StoreState>((set, get) => ({
  currentUserId: '',
  users: {},
  envelopes: {},
  notifications: [],
  hydrated: false,

  init: () => {
    const existing = loadState<PersistedShape>();
    if (existing && existing.currentUserId && existing.users[existing.currentUserId]) {
      set({ ...existing, hydrated: true });
      return;
    }
    const npcs = seedNpcUsers();
    const houseAddresses = WORLD.addresses.filter((a) => a.kind === 'house');
    const homeAddr = houseAddresses[7];
    const meId = 'me';
    const me: User = {
      id: meId,
      username: 'bills',
      addressId: homeAddr.id,
      createdAt: Date.now(),
      sentCount: 0,
      receivedCount: 0,
    };
    const state: PersistedShape = {
      currentUserId: meId,
      users: { [meId]: me, ...npcs },
      envelopes: {},
      notifications: [],
    };
    saveState(state);
    set({ ...state, hydrated: true });
  },

  tick: () => {
    const now = Date.now();
    const { envelopes, users, notifications, currentUserId } = get();
    let changedEnvelopes = false;
    let changedUsers = false;
    const nextEnvelopes = { ...envelopes };
    const nextUsers = { ...users };
    const newNotifications: AppNotification[] = [];

    for (const env of Object.values(envelopes)) {
      if (env.status === 'DELIVERED') continue;
      const sender = users[env.senderId];
      const recipient = users[env.recipientId];
      if (!sender || !recipient) continue;
      const durations = computeDurations(sender.addressId, recipient.addressId);
      const advanced = advanceEnvelope(env, durations, now);
      if (advanced !== env) {
        nextEnvelopes[env.id] = advanced;
        changedEnvelopes = true;
        if (advanced.status === 'DELIVERED') {
          nextUsers[recipient.id] = { ...recipient, receivedCount: recipient.receivedCount + 1 };
          changedUsers = true;
          if (recipient.id === currentUserId) {
            newNotifications.push({
              id: nanoid(),
              envelopeId: env.id,
              text: `${sender.username} sent you mail — it just arrived in your mailbox.`,
              createdAt: now,
              read: false,
            });
          }
        }
      }
    }

    if (!changedEnvelopes && newNotifications.length === 0) return;
    const nextState = {
      envelopes: nextEnvelopes,
      users: changedUsers ? nextUsers : users,
      notifications: newNotifications.length ? [...newNotifications, ...notifications] : notifications,
    };
    set(nextState);
    persistNow({ ...get(), ...nextState });
  },

  sendEnvelope: ({ recipientId, message, style, imageDataUrl, gift }) => {
    const state = get();
    const sender = state.users[state.currentUserId];
    if (!sender) return '';
    const id = nanoid();
    const now = Date.now();
    const envelope: Envelope = {
      id,
      senderId: sender.id,
      recipientId,
      message,
      imageDataUrl,
      gift,
      style,
      createdAt: now,
      status: 'CREATED',
      statusChangedAt: now,
      read: false,
      seenByRecipientNotification: false,
    };
    const envelopes = { ...state.envelopes, [id]: envelope };
    const users = {
      ...state.users,
      [sender.id]: { ...sender, sentCount: sender.sentCount + 1 },
    };
    set({ envelopes, users });
    persistNow({ ...state, envelopes, users });
    return id;
  },

  markRead: (envelopeId: string) => {
    const state = get();
    const env = state.envelopes[envelopeId];
    if (!env || env.read) return;
    const envelopes = { ...state.envelopes, [envelopeId]: { ...env, read: true } };
    set({ envelopes });
    persistNow({ ...state, envelopes });
  },

  dismissNotification: (id: string) => {
    const state = get();
    const notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    set({ notifications });
    persistNow({ ...state, notifications });
  },

  clearAllNotifications: () => {
    const state = get();
    const notifications = state.notifications.map((n) => ({ ...n, read: true }));
    set({ notifications });
    persistNow({ ...state, notifications });
  },
}));
