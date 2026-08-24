import type { User } from './types';
import { WORLD } from './world/generateWorld';

const AVATAR_COLORS = ['#5b6df8', '#ff8a65', '#34c774', '#ba68c8', '#ffb347', '#4fc3d9', '#ef5a6f'];

export function avatarColorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initialsFor(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function addressLabel(addressId: string): string {
  return WORLD.addressById.get(addressId)?.label ?? 'Unknown address';
}

export function districtLabel(addressId: string): string {
  return WORLD.addressById.get(addressId)?.districtLabel ?? '';
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function searchUsers(users: Record<string, User>, query: string, excludeId?: string): User[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Object.values(users)
    .filter((u) => u.id !== excludeId)
    .filter((u) => u.username.toLowerCase().includes(q) || addressLabel(u.addressId).toLowerCase().includes(q))
    .slice(0, 20);
}
