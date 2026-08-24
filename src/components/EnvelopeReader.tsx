import { useEffect, useState } from 'react';
import type { Envelope, User } from '../types';
import { addressLabel, formatDate } from '../utils';

export function EnvelopeReader({
  envelope,
  sender,
  onClose,
}: {
  envelope: Envelope;
  sender: User | undefined;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="reader-backdrop" onClick={onClose}>
      <div className="reader-envelope" onClick={(e) => e.stopPropagation()}>
        <div className={`reader-shell style-${envelope.style}`}>
          <button className="icon-btn reader-close" onClick={onClose}>✕</button>
          <div className={`reader-flap style-${envelope.style} ${open ? 'open' : ''}`} />
          <div className={`reader-letter ${open ? 'show' : ''}`}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{sender?.username ?? 'Unknown sender'}</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              {sender ? addressLabel(sender.addressId) : ''} · {formatDate(envelope.createdAt)}
            </div>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{envelope.message || <span className="muted">(no message)</span>}</p>
            {envelope.imageDataUrl && <img src={envelope.imageDataUrl} alt="attachment" />}
            {envelope.gift && <div className="reader-gift">{envelope.gift}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
