import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { SearchBar } from '../components/SearchBar';
import { UserResultRow } from '../components/UserResultRow';
import { ENVELOPE_STYLES, type EnvelopeStyle, type User } from '../types';
import { addressLabel, searchUsers } from '../utils';

const GIFTS = [
  { id: '', label: 'No gift' },
  { id: '🎁 Gift Card', label: '🎁 Gift Card' },
  { id: '🌟 Sticker Pack', label: '🌟 Sticker Pack' },
  { id: '☕ Coffee Voucher', label: '☕ Coffee Voucher' },
  { id: '🎵 Song Dedication', label: '🎵 Song Dedication' },
];

type Step = 'recipient' | 'compose' | 'confirm';

export function SendMailScreen({
  onSent,
  presetRecipientId,
}: {
  onSent: (envelopeId: string) => void;
  presetRecipientId?: string | null;
}) {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const sendEnvelope = useStore((s) => s.sendEnvelope);
  const me = users[currentUserId];

  const [step, setStep] = useState<Step>(presetRecipientId ? 'compose' : 'recipient');
  const [recipient, setRecipient] = useState<User | null>(presetRecipientId ? users[presetRecipientId] ?? null : null);
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<EnvelopeStyle>('classic');
  const [message, setMessage] = useState('');
  const [gift, setGift] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  const results = useMemo(() => searchUsers(users, query, currentUserId), [users, query, currentUserId]);

  const handleImage = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (!recipient) return;
    setSending(true);
    const id = sendEnvelope({ recipientId: recipient.id, message, style, imageDataUrl, gift: gift || undefined });
    setSending(false);
    onSent(id);
  };

  if (!me) return null;

  return (
    <div className="sheet-layer">
      <div className="top-bar">
        <h2>Send Mail</h2>
      </div>
      <div className="scroll-area">
        {step === 'recipient' && (
          <>
            <p className="muted" style={{ marginTop: 4 }}>Who do you want to send an envelope to?</p>
            <SearchBar value={query} onChange={setQuery} autoFocus />
            <div className="search-results">
              {results.length === 0 && query && <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>No matches found.</p>}
              {results.map((u) => (
                <UserResultRow
                  key={u.id}
                  user={u}
                  onClick={() => {
                    setRecipient(u);
                    setStep('compose');
                  }}
                />
              ))}
            </div>
          </>
        )}

        {step === 'compose' && recipient && (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span className="address-chip">To: {recipient.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('recipient')}>Change</button>
            </div>

            <div className="section-title">Envelope Style</div>
            <div className="envelope-style-grid">
              {ENVELOPE_STYLES.map((s) => (
                <button
                  key={s}
                  className={`envelope-swatch style-${s} ${style === s ? 'selected' : ''}`}
                  onClick={() => setStyle(s)}
                  aria-label={s}
                />
              ))}
            </div>

            <div className="section-title">Message</div>
            <textarea
              rows={5}
              placeholder="Write something nice…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="section-title">Optional Photo</div>
            <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null)} />
            {imageDataUrl && (
              <img src={imageDataUrl} alt="attachment preview" style={{ marginTop: 10, maxWidth: '100%', borderRadius: 12 }} />
            )}

            <div className="section-title">Optional Digital Gift</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GIFTS.map((g) => (
                <button
                  key={g.id}
                  className={`btn btn-sm ${gift === g.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGift(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={() => setStep('confirm')}>
              Review Envelope
            </button>
          </>
        )}

        {step === 'confirm' && recipient && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className={`envelope-mini style-${style}`} style={{ width: 90, height: 64, margin: '0 auto 14px' }} />
              <h3 style={{ margin: '0 0 6px' }}>Send this envelope to {recipient.username}?</h3>
              <div className="route-line" style={{ marginTop: 10 }}>
                <span>{addressLabel(me.addressId)}</span>
                <span>→</span>
                <span>{addressLabel(recipient.addressId)}</span>
              </div>
              {message && <p className="muted" style={{ marginTop: 14, fontStyle: 'italic' }}>&ldquo;{message}&rdquo;</p>}
              {gift && <div className="reader-gift" style={{ marginTop: 10 }}>{gift}</div>}
            </div>
            <button className="btn btn-primary btn-block" disabled={sending} onClick={handleSend}>
              {sending ? 'Sending…' : 'Send Envelope'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setStep('compose')}>Edit</button>
          </div>
        )}
      </div>
    </div>
  );
}
