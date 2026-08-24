import { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore';
import { supabaseConfigured } from './lib/supabaseClient';
import { BottomNav, type Tab } from './components/BottomNav';
import { MapScreen } from './screens/MapScreen';
import { SendMailScreen } from './screens/SendMailScreen';
import { InboxScreen } from './screens/InboxScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SetupRequiredScreen } from './screens/SetupRequiredScreen';
import type { DeliveryStatus } from './types';

const DELIVERED_LINGER_MS = 2600;

function App() {
  const init = useStore((s) => s.init);
  const tick = useStore((s) => s.tick);
  const status = useStore((s) => s.status);
  const errorMessage = useStore((s) => s.errorMessage);
  const notifications = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);
  const users = useStore((s) => s.users);
  const envelopes = useStore((s) => s.envelopes);
  const currentUserId = useStore((s) => s.currentUserId);

  const [tab, setTab] = useState<Tab>('map');
  const [followEnvelopeId, setFollowEnvelopeId] = useState<string | null>(null);
  const [deliveryPhase, setDeliveryPhase] = useState<DeliveryStatus | null>(null);
  const [presetRecipientId, setPresetRecipientId] = useState<string | null>(null);
  const [flyToAddressId, setFlyToAddressId] = useState<string | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (supabaseConfigured) init();
  }, [init]);

  useEffect(() => {
    if (status !== 'ready') return;
    const id = window.setInterval(() => tick(), 300);
    return () => window.clearInterval(id);
  }, [tick, status]);

  useEffect(() => {
    if (deliveryPhase === 'DELIVERED') {
      clearTimerRef.current = window.setTimeout(() => {
        setFollowEnvelopeId(null);
        setDeliveryPhase(null);
      }, DELIVERED_LINGER_MS);
    }
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, [deliveryPhase]);

  const me = users[currentUserId];
  const unreadCount = me
    ? Object.values(envelopes).filter((e) => e.recipientId === me.id && e.status === 'DELIVERED' && !e.read).length
    : 0;
  const activeNotification = notifications.find((n) => !n.read);

  if (!supabaseConfigured) return <SetupRequiredScreen />;
  if (status === 'error') return <SetupRequiredScreen errorMessage={errorMessage} />;
  if (status === 'needs-username') return <OnboardingScreen />;
  if (status !== 'ready' || !me) {
    return (
      <div className="app-shell">
        <div className="center-empty" style={{ height: '100%' }}>
          <div style={{ fontSize: 42 }}>🏙️</div>
          <p>Building your city…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-stage">
        <MapScreen
          followEnvelopeId={followEnvelopeId}
          onDeliveryPhase={setDeliveryPhase}
          onSendTo={(recipientId) => {
            setPresetRecipientId(recipientId);
            setTab('mail');
          }}
          flyToAddressId={flyToAddressId}
          onConsumedFlyTo={() => setFlyToAddressId(null)}
        />

        {tab === 'mail' && (
          <SendMailScreen
            presetRecipientId={presetRecipientId}
            onSent={(envelopeId) => {
              setPresetRecipientId(null);
              setFollowEnvelopeId(envelopeId);
              setTab('map');
            }}
          />
        )}
        {tab === 'inbox' && <InboxScreen />}
        {tab === 'profile' && (
          <ProfileScreen
            onViewAddress={() => {
              if (me) setFlyToAddressId(me.addressId);
              setTab('map');
            }}
          />
        )}

        {activeNotification && (
          <div className="notif-toast" onClick={() => { dismissNotification(activeNotification.id); setTab('inbox'); }}>
            <span style={{ fontSize: 20 }}>📬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>New mail arrived!</div>
              <div className="muted" style={{ fontSize: 12 }}>{activeNotification.text}</div>
            </div>
            <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); dismissNotification(activeNotification.id); }}>✕</button>
          </div>
        )}
      </div>

      <BottomNav
        tab={tab}
        onChange={(t) => {
          if (t !== 'mail') setPresetRecipientId(null);
          setTab(t);
        }}
        unread={unreadCount}
      />
    </div>
  );
}

export default App;
