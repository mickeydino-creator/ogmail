export type Tab = 'map' | 'mail' | 'inbox' | 'profile';

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: 'MAP', icon: '🗺️' },
  { id: 'mail', label: 'MAIL', icon: '✉️' },
  { id: 'inbox', label: 'INBOX', icon: '📬' },
  { id: 'profile', label: 'PROFILE', icon: '👤' },
];

export function BottomNav({ tab, onChange, unread }: { tab: Tab; onChange: (t: Tab) => void; unread: number }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-btn ${tab === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.id === 'inbox' && unread > 0 && <span className="nav-dot" />}
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
