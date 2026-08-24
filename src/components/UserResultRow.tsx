import type { User } from '../types';
import { addressLabel, avatarColorFor, initialsFor } from '../utils';

export function UserResultRow({
  user,
  action,
  onAction,
  onClick,
}: {
  user: User;
  action?: string;
  onAction?: (user: User) => void;
  onClick?: (user: User) => void;
}) {
  return (
    <div className="search-result-row" onClick={() => onClick?.(user)} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="avatar" style={{ background: avatarColorFor(user.id) }}>
        {initialsFor(user.username)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>{user.username}</div>
        <div className="muted" style={{ fontSize: 12.5 }}>{addressLabel(user.addressId)}</div>
      </div>
      {action && (
        <button
          className="btn btn-primary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onAction?.(user);
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
