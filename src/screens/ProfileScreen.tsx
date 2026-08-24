import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { addressLabel, avatarColorFor, districtLabel, initialsFor } from '../utils';

export function ProfileScreen({ onViewAddress }: { onViewAddress: () => void }) {
  const users = useStore((s) => s.users);
  const envelopes = useStore((s) => s.envelopes);
  const currentUserId = useStore((s) => s.currentUserId);
  const me = users[currentUserId];

  const { sentCount, receivedCount } = useMemo(() => {
    const all = Object.values(envelopes);
    return {
      sentCount: all.filter((e) => e.senderId === currentUserId).length,
      receivedCount: all.filter((e) => e.recipientId === currentUserId && e.status === 'DELIVERED').length,
    };
  }, [envelopes, currentUserId]);

  if (!me) return null;

  return (
    <div className="sheet-layer">
      <div className="top-bar">
        <h2>Profile</h2>
      </div>
      <div className="scroll-area">
        <div className="profile-header">
          <div className="profile-avatar" style={{ background: avatarColorFor(me.id) }}>
            {initialsFor(me.username)}
          </div>
          <h2 style={{ margin: '4px 0 0' }}>{me.username}</h2>
          <span className="address-chip">📍 {addressLabel(me.addressId)}</span>
          <span className="muted" style={{ fontSize: 12.5 }}>{districtLabel(me.addressId)}</span>
        </div>

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-num">{sentCount}</div>
            <div className="stat-label">SENT</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{receivedCount}</div>
            <div className="stat-label">RECEIVED</div>
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={onViewAddress}>
          📍 View My Address
        </button>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Digital Identity</div>
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13.5 }}>Username</p>
          <p style={{ margin: '0 0 14px', fontWeight: 700 }}>{me.username}</p>
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13.5 }}>Permanent digital address</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{addressLabel(me.addressId)}</p>
        </div>
      </div>
    </div>
  );
}
