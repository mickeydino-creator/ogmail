import { useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas, type MapCanvasHandle } from '../map/MapCanvas';
import { SearchBar } from '../components/SearchBar';
import { useStore } from '../store/useStore';
import type { AddressUnit, DeliveryStatus } from '../types';
import { searchUsers } from '../utils';
import { DeliveryOverlay } from '../components/DeliveryOverlay';
import { HousePopup } from '../components/HousePopup';

export function MapScreen({
  followEnvelopeId,
  onDeliveryPhase,
  onSendTo,
  flyToAddressId,
  onConsumedFlyTo,
}: {
  followEnvelopeId: string | null;
  onDeliveryPhase: (status: DeliveryStatus | null) => void;
  onSendTo: (recipientId: string) => void;
  flyToAddressId?: string | null;
  onConsumedFlyTo?: () => void;
}) {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const envelopes = useStore((s) => s.envelopes);
  const me = users[currentUserId];
  const mapRef = useRef<MapCanvasHandle>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ addr: AddressUnit; point: { x: number; y: number } } | null>(null);

  const results = useMemo(() => searchUsers(users, query, currentUserId), [users, query, currentUserId]);

  const unreadAddressIds = useMemo(() => {
    const set = new Set<string>();
    if (me && Object.values(envelopes).some((e) => e.recipientId === me.id && e.status === 'DELIVERED' && !e.read)) {
      set.add(me.addressId);
    }
    return set;
  }, [envelopes, me]);

  const occupantForAddress = (addr: AddressUnit) => Object.values(users).find((u) => u.addressId === addr.id);

  useEffect(() => {
    if (!flyToAddressId) return;
    mapRef.current?.flyToAddress(flyToAddressId, 1.6);
    onConsumedFlyTo?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToAddressId]);

  if (!me) return null;

  return (
    <div className="map-layer">
      <MapCanvas
        ref={mapRef}
        myAddressId={me.addressId}
        unreadAddressIds={unreadAddressIds}
        highlightedAddressId={selected?.addr.id}
        onSelectAddress={(addr, point) => setSelected({ addr, point })}
        followEnvelopeId={followEnvelopeId}
        onDeliveryPhase={onDeliveryPhase}
      />

      {!followEnvelopeId && (
        <div className="map-fab-row">
          <div style={{ flex: 1 }}>
            {searchOpen ? (
              <SearchBar value={query} onChange={setQuery} autoFocus />
            ) : (
              <button className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start' }} onClick={() => setSearchOpen(true)}>
                🔍 Search address or username…
              </button>
            )}
          </div>
          {searchOpen && (
            <button className="icon-btn" onClick={() => { setSearchOpen(false); setQuery(''); }}>✕</button>
          )}
        </div>
      )}

      {!followEnvelopeId && searchOpen && query && (
        <div className="card" style={{ position: 'absolute', top: 68, left: 12, right: 12, zIndex: 10, maxHeight: '50%', overflowY: 'auto' }}>
          {results.length === 0 && <p className="muted" style={{ margin: 0, textAlign: 'center' }}>No matches.</p>}
          {results.map((u) => (
            <div key={u.id} className="search-result-row" style={{ boxShadow: 'none', marginBottom: 6 }}
              onClick={() => {
                mapRef.current?.flyToAddress(u.addressId, 1.6);
                setSearchOpen(false);
                setQuery('');
              }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{u.username}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onSendTo(u.id); }}>Send Mail</button>
            </div>
          ))}
        </div>
      )}

      <div className="map-zoom-controls">
        <button className="icon-btn" onClick={() => mapRef.current?.flyToAddress(me.addressId, 1.7)}>🏠</button>
      </div>

      {selected && (
        <>
          <div className="popup-backdrop" onClick={() => setSelected(null)} />
          <HousePopup
            addr={selected.addr}
            point={selected.point}
            occupant={occupantForAddress(selected.addr)}
            isMine={selected.addr.id === me.addressId}
            onClose={() => setSelected(null)}
            onSendMail={(userId) => {
              setSelected(null);
              onSendTo(userId);
            }}
          />
        </>
      )}

      <DeliveryOverlay followEnvelopeId={followEnvelopeId} />
    </div>
  );
}
