import { useStore } from '../store/useStore';

const BANNER_TEXT: Record<string, string> = {
  CREATED: 'Getting your envelope ready…',
  PICKUP: 'Picking up your envelope…',
  TO_FACTORY: 'Driving to the Central Postal Factory…',
  LEAVING_FACTORY: 'Leaving the factory, sorted and redirected…',
  TO_RECIPIENT: 'On the way to the recipient…',
};

export function DeliveryOverlay({ followEnvelopeId }: { followEnvelopeId: string | null }) {
  const envelope = useStore((s) => (followEnvelopeId ? s.envelopes[followEnvelopeId] : undefined));
  if (!envelope) return null;

  if (envelope.status === 'PROCESSING') {
    return (
      <div className="processing-card">
        <div className="processing-inner">
          <div className="processing-envelope">✉️</div>
          <div className="processing-text">
            Processing mail
            <span className="processing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>
      </div>
    );
  }

  if (envelope.status === 'DELIVERED') {
    return <div className="delivered-toast">Delivered ✓</div>;
  }

  const text = BANNER_TEXT[envelope.status];
  if (!text) return null;

  return (
    <div className="delivery-banner">
      <span className="spin">🚚</span>
      <span>{text}</span>
    </div>
  );
}
