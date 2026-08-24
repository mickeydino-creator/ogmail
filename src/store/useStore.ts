import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Envelope, EnvelopeRow, EnvelopeStyle, User } from '../types';
import { WORLD } from '../world/generateWorld';
import { supabase } from '../lib/supabaseClient';
import { computeDurations, deriveEnvelope } from '../engine/deliveryEngine';

export interface AppNotification {
  id: string;
  envelopeId: string;
  text: string;
  createdAt: number;
  read: boolean;
}

type Status = 'loading' | 'needs-username' | 'ready' | 'error';

interface ProfileRow {
  id: string;
  username: string;
  address_id: string;
  created_at: string;
}

interface EnvelopeDbRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  image_data_url: string | null;
  gift: string | null;
  style: string;
  created_at: string;
  read: boolean;
}

function rowFromDb(row: EnvelopeDbRow): EnvelopeRow {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    message: row.message,
    imageDataUrl: row.image_data_url ?? undefined,
    gift: row.gift ?? undefined,
    style: row.style as EnvelopeStyle,
    createdAt: new Date(row.created_at).getTime(),
    read: row.read,
  };
}

function userFromProfile(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    addressId: row.address_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

interface StoreState {
  status: Status;
  errorMessage: string | null;
  currentUserId: string;
  users: Record<string, User>;
  envelopeRows: Record<string, EnvelopeRow>;
  envelopes: Record<string, Envelope>;
  notifications: AppNotification[];

  init: () => Promise<void>;
  createProfile: (username: string) => Promise<{ ok: boolean; error?: string }>;
  tick: () => void;
  sendEnvelope: (input: {
    recipientId: string;
    message: string;
    style: EnvelopeStyle;
    imageDataUrl?: string;
    gift?: string;
  }) => Promise<string | null>;
  markRead: (envelopeId: string) => void;
  dismissNotification: (id: string) => void;
}

function pickUnusedAddress(takenAddressIds: Set<string>): string | null {
  const houseAddresses = WORLD.addresses.filter((a) => a.kind === 'house');
  const start = Math.floor(Math.random() * houseAddresses.length);
  for (let i = 0; i < houseAddresses.length; i++) {
    const addr = houseAddresses[(start + i) % houseAddresses.length];
    if (!takenAddressIds.has(addr.id)) return addr.id;
  }
  return null;
}

async function fetchDirectory(): Promise<Record<string, User>> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  const users: Record<string, User> = {};
  for (const row of (data ?? []) as ProfileRow[]) {
    users[row.id] = userFromProfile(row);
  }
  return users;
}

async function fetchMyEnvelopes(userId: string): Promise<Record<string, EnvelopeRow>> {
  const { data, error } = await supabase
    .from('envelopes')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error) throw error;
  const rows: Record<string, EnvelopeRow> = {};
  for (const row of (data ?? []) as EnvelopeDbRow[]) {
    rows[row.id] = rowFromDb(row);
  }
  return rows;
}

export const useStore = create<StoreState>((set, get) => ({
  status: 'loading',
  errorMessage: null,
  currentUserId: '',
  users: {},
  envelopeRows: {},
  envelopes: {},
  notifications: [],

  init: async () => {
    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        ({ data: sessionData } = await supabase.auth.getSession());
      }
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('Could not establish a session.');

      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw profileError;

      const users = await fetchDirectory();

      if (!myProfile) {
        set({ status: 'needs-username', currentUserId: userId, users });
        return;
      }
      users[myProfile.id] = userFromProfile(myProfile as ProfileRow);

      const envelopeRows = await fetchMyEnvelopes(userId);
      set({ status: 'ready', currentUserId: userId, users, envelopeRows });
      get().tick();

      supabase
        .channel(`envelopes-inbox-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'envelopes', filter: `recipient_id=eq.${userId}` },
          (payload) => {
            const row = rowFromDb(payload.new as EnvelopeDbRow);
            set((state) => ({ envelopeRows: { ...state.envelopeRows, [row.id]: row } }));
          },
        )
        .subscribe();
    } catch (err) {
      set({ status: 'error', errorMessage: err instanceof Error ? err.message : String(err) });
    }
  },

  createProfile: async (username: string) => {
    const trimmed = username.trim();
    if (trimmed.length < 2) return { ok: false, error: 'Username must be at least 2 characters.' };

    const { currentUserId, users } = get();
    const takenAddresses = new Set(Object.values(users).map((u) => u.addressId));
    const addressId = pickUnusedAddress(takenAddresses);
    if (!addressId) return { ok: false, error: 'The city is full! No addresses left.' };

    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: currentUserId, username: trimmed, address_id: addressId })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'That username is taken — try another.' };
      return { ok: false, error: error.message };
    }

    const me = userFromProfile(data as ProfileRow);
    const envelopeRows = await fetchMyEnvelopes(currentUserId);
    set((state) => ({
      status: 'ready',
      users: { ...state.users, [me.id]: me },
      envelopeRows,
    }));
    get().tick();
    return { ok: true };
  },

  tick: () => {
    const { envelopeRows, users, envelopes: prevEnvelopes, notifications, currentUserId } = get();
    const now = Date.now();
    const nextEnvelopes: Record<string, Envelope> = {};
    const newNotifications: AppNotification[] = [];

    for (const row of Object.values(envelopeRows)) {
      const sender = users[row.senderId];
      const recipient = users[row.recipientId];
      if (!sender || !recipient) continue;
      const durations = computeDurations(sender.addressId, recipient.addressId);
      const derived = deriveEnvelope(row, durations, now);
      nextEnvelopes[row.id] = derived;

      const prev = prevEnvelopes[row.id];
      if (derived.status === 'DELIVERED' && prev?.status !== 'DELIVERED' && recipient.id === currentUserId) {
        newNotifications.push({
          id: nanoid(),
          envelopeId: row.id,
          text: `${sender.username} sent you mail — it just arrived in your mailbox.`,
          createdAt: now,
          read: false,
        });
      }
    }

    set({
      envelopes: nextEnvelopes,
      notifications: newNotifications.length ? [...newNotifications, ...notifications] : notifications,
    });
  },

  sendEnvelope: async ({ recipientId, message, style, imageDataUrl, gift }) => {
    const { currentUserId } = get();
    const { data, error } = await supabase
      .from('envelopes')
      .insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        message,
        style,
        image_data_url: imageDataUrl ?? null,
        gift: gift ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error('Failed to send envelope', error);
      return null;
    }
    const row = rowFromDb(data as EnvelopeDbRow);
    set((state) => ({ envelopeRows: { ...state.envelopeRows, [row.id]: row } }));
    get().tick();
    return row.id;
  },

  markRead: (envelopeId: string) => {
    const state = get();
    const row = state.envelopeRows[envelopeId];
    if (!row || row.read) return;
    set({ envelopeRows: { ...state.envelopeRows, [envelopeId]: { ...row, read: true } } });
    supabase.from('envelopes').update({ read: true }).eq('id', envelopeId).then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to mark envelope read', error);
      }
    });
  },

  dismissNotification: (id: string) => {
    set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },
}));
