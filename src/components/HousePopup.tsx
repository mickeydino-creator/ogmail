import type { AddressUnit, User } from '../types';

const POPUP_WIDTH = 220;
const MARGIN = 12;

export function HousePopup({
  addr,
  point,
  occupant,
  isMine,
  onClose,
  onSendMail,
}: {
  addr: AddressUnit;
  point: { x: number; y: number };
  occupant: User | undefined;
  isMine: boolean;
  onClose: () => void;
  onSendMail: (userId: string) => void;
}) {
  // Clamp to the viewport so the popup never spills off-screen, and flip below the
  // house if there isn't room above it.
  const left = Math.max(MARGIN, Math.min(window.innerWidth - POPUP_WIDTH - MARGIN, point.x - POPUP_WIDTH / 2));
  const preferAbove = point.y > 220;
  const arrowOffset = point.x - left;

  const top = preferAbove ? undefined : point.y + 18;
  const bottom = preferAbove ? window.innerHeight - point.y + 18 : undefined;

  return (
    <div
      className={`house-popup ${preferAbove ? 'above' : 'below'}`}
      style={{ left, top, bottom, width: POPUP_WIDTH, ['--arrow-x' as string]: `${arrowOffset}px` }}
    >
      <button className="icon-btn house-popup-close" onClick={onClose}>✕</button>
      <div className="house-popup-title">{addr.label}</div>
      <div className="muted house-popup-sub">
        {occupant ? `Home of ${occupant.username}` : 'Address not yet claimed'}
      </div>
      {occupant && !isMine && (
        <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => onSendMail(occupant.id)}>
          Send Mail
        </button>
      )}
      {isMine && <div className="address-chip" style={{ marginTop: 10 }}>🏠 Your house</div>}
      <span className="house-popup-arrow" />
    </div>
  );
}
