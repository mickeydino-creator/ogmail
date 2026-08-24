export function SearchBar({
  value,
  onChange,
  placeholder = 'Search username or address…',
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="search-bar">
      <span>🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        type="text"
      />
      {value && (
        <button className="icon-btn" style={{ width: 26, height: 26, fontSize: 12 }} onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}
