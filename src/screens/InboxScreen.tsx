import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { EnvelopeReader } from '../components/EnvelopeReader';
import type { Envelope } from '../types';
import { addressLabel, formatDate } from '../utils';

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Preparing…',
  PICKUP: 'Picked up',
  TO_FACTORY: 'Heading to factory',
  PROCESSING: 'Processing at factory',
  LEAVING_FACTORY: 'Leaving factory',
  TO_RECIPIENT: 'Out for delivery',
  DELIVERED: 'Delivered ✓',
};

export function InboxScreen() {
  const users = useStore((s) => s.users);
  const envelopes = useStore((s) => s.envelopes);
  const currentUserId = useStore((s) => s.currentUserId);
  const markRead = useStore((s) => s.markRead);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [openEnvelope, setOpenEnvelope] = useState<Envelope | null>(null);

  const received = useMemo(
    () => Object.values(envelopes).filter((e) => e.recipientId === currentUserId && e.status === 'DELIVERED')
      .sort((a, b) => b.statusChangedAt - a.statusChangedAt),
    [envelopes, currentUserId],
  );
  const sent = useMemo(
    () => Object.values(envelopes).filter((e) => e.senderId === currentUserId)
      .sort((a, b) => b.createdAt - a.createdAt),
    [envelopes, currentUserId],
  );

  const list = tab === 'received' ? received : sent;

  return (
    <div className="sheet-layer">
      <div className="top-bar">
        <h2>Mailbox</h2>
      </div>
      <div className="scroll-area">
        <div style={{ display: 'flex', gap: 8, margin: '4px 0 14px' }}>
          <button className={`btn btn-sm ${tab === 'received' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('received')}>
            Received {received.filter((e) => !e.read).length > 0 ? `(${received.filter((e) => !e.read).length})` : ''}
          </button>
          <button className={`btn btn-sm ${tab === 'sent' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('sent')}>
            Sent
          </button>
        </div>

        {list.length === 0 && (
          <div className="center-empty">
            <div style={{ fontSize: 40 }}>📭</div>
            <p>{tab === 'received' ? 'No mail yet. Ask a friend to send you an envelope!' : "You haven't sent any envelopes yet."}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((env) => {
            const otherId = tab === 'received' ? env.senderId : env.recipientId;
            const other = users[otherId];
            return (
              <div
                key={env.id}
                className={`envelope-card style-${env.style} ${tab === 'received' && !env.read ? 'unread' : ''}`}
                onClick={() => {
                  if (tab === 'received') {
                    setOpenEnvelope(env);
                    markRead(env.id);
                  }
                }}
              >
                <div className={`envelope-mini style-${env.style}`} />
                <div className="envelope-card-body">
                  <p className="envelope-card-title">{other?.username ?? 'Unknown'}</p>
                  <p className="envelope-card-sub">
                    {other ? addressLabel(other.addressId) : ''}
                    {tab === 'sent' && ` · ${STATUS_LABEL[env.status]}`}
                  </p>
                </div>
                <span className="envelope-card-date">{formatDate(env.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {openEnvelope && (
        <EnvelopeReader envelope={openEnvelope} sender={users[openEnvelope.senderId]} onClose={() => setOpenEnvelope(null)} />
      )}
    </div>
  );
}
