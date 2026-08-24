import { memo, useMemo } from 'react';
import { CELL, GRID_N, ROAD_WIDTH, WORLD } from '../world/generateWorld';
import type { AddressUnit, Biome, Block, Neighborhood } from '../types';

interface VisibleRect { x: number; y: number; w: number; h: number }

function intersects(a: VisibleRect, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hashIndex(id: string, salt: string, mod: number) {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function MailboxGlyph({ x, y, isMine, hasUnread }: { x: number; y: number; isMine: boolean; hasUnread: boolean }) {
  // The bob/unread animation applies a CSS `transform`, which would override an SVG
  // positional `transform` attribute on the same element — so positioning lives on this
  // outer <g> and the animated class lives on an inner <g> with no transform attribute.
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={hasUnread ? 'mailbox unread' : 'mailbox'}>
        <rect x={-3.5} y={-2} width={7} height={9} rx={1.5} className={isMine ? 'mailbox-body mine' : 'mailbox-body'} />
        <rect x={-1} y={-9} width={2} height={7} className="mailbox-post" />
        <rect x={-3.2} y={-4.6} width={6.4} height={1.6} className={hasUnread ? 'mailbox-flag up' : 'mailbox-flag'} />
        {hasUnread && <circle cx={0} cy={-2.5} r={7} className="mailbox-glow" />}
      </g>
    </g>
  );
}

const ROOF_PALETTE = ['#e2685a', '#d98c46', '#4f8f6d', '#5a7fc0', '#c05a86', '#3f9e97'];
const HOUSE_W = 46;
const HOUSE_H = 56;

/** A house drawn top-down (bird's-eye), the way the rest of the map reads. */
function HouseGlyph({
  addr, isMine, hasUnread, highlighted, onSelect,
}: {
  addr: AddressUnit; isMine: boolean; hasUnread: boolean; highlighted: boolean;
  onSelect?: (addr: AddressUnit, point: { x: number; y: number }) => void;
}) {
  const sizeJitter = 0.85 + (hashIndex(addr.id, 'size', 30) / 30) * 0.3;
  const w = HOUSE_W * sizeJitter;
  const h = HOUSE_H * sizeJitter;
  const x = addr.pos.x - w / 2;
  const y = addr.pos.y - h / 2;
  const roofFill = ROOF_PALETTE[hashIndex(addr.id, 'roof', ROOF_PALETTE.length)];
  const chimneySide = hashIndex(addr.id, 'chimney', 2) === 0 ? 0.24 : 0.72;
  const chimneyEnd = hashIndex(addr.id, 'chimneyEnd', 2) === 0 ? 0.22 : 0.78;
  const chimneyX = x + w * chimneySide;
  const chimneyY = y + h * chimneyEnd;
  const ridgeX = x + w / 2;
  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect?.(addr, { x: e.clientX, y: e.clientY }); }}
      className={isMine ? 'house mine' : 'house'}
      style={{ cursor: onSelect ? 'pointer' : undefined }}
    >
      {highlighted && <circle cx={addr.pos.x} cy={addr.pos.y} r={Math.max(w, h) * 0.95} className="select-ring" />}
      <line x1={addr.doorPos.x} y1={addr.doorPos.y} x2={addr.pos.x} y2={addr.pos.y} className="driveway" />
      <ellipse cx={x + w / 2 + w * 0.06} cy={y + h / 2 + h * 0.1} rx={w * 0.62} ry={h * 0.58} className="bld-shadow" />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.14} className={isMine ? 'bld-roof mine' : 'bld-roof'} style={isMine ? undefined : { fill: roofFill }} />
      <rect x={ridgeX} y={y + h * 0.08} width={w / 2} height={h * 0.84} className="bld-roof-shade" />
      <line x1={ridgeX} y1={y + h * 0.08} x2={ridgeX} y2={y + h * 0.92} className="bld-roof-ridge" />
      <rect x={x + w * 0.08} y={y + h * 0.42} width={w * 0.84} height={h * 0.02} className="bld-roof-ridge cross" />
      <rect x={chimneyX - w * 0.07} y={chimneyY - h * 0.07} width={w * 0.14} height={h * 0.14} rx={1} className="bld-chimney" />
      <circle cx={x + w * 0.14} cy={y + h * 0.86} r={w * 0.1} className="bld-bush" />
      <circle cx={x + w * 0.86} cy={y + h * 0.86} r={w * 0.08} className="bld-bush" />
      <MailboxGlyph x={addr.doorPos.x} y={addr.doorPos.y} isMine={isMine} hasUnread={hasUnread} />
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="transparent" />
    </g>
  );
}

function NeighborhoodStreet({ n }: { n: Neighborhood }) {
  return (
    <g>
      <line x1={n.junction.x} y1={n.junction.y} x2={n.tip.x} y2={n.tip.y} className="local-sidewalk" />
      <line x1={n.junction.x} y1={n.junction.y} x2={n.tip.x} y2={n.tip.y} className="local-asphalt" />
    </g>
  );
}

function ApartmentGlyph({ addr, n }: { addr: AddressUnit; n: Neighborhood }) {
  const w = 88;
  const h = 108;
  const x = addr.pos.x - w / 2;
  const y = addr.pos.y - h / 2;
  const rows = 5;
  const cols = 3;
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + w * (0.14 + c * 0.28)}
          y={y + h * (0.1 + r * 0.16)}
          width={w * 0.16}
          height={h * 0.09}
          className={(r + c) % 3 === 0 ? 'bld-window lit' : 'bld-window'}
        />,
      );
    }
  }
  return (
    <g>
      <NeighborhoodStreet n={n} />
      <line x1={addr.doorPos.x} y1={addr.doorPos.y} x2={addr.pos.x} y2={addr.pos.y} className="driveway" />
      <ellipse cx={addr.pos.x + w * 0.05} cy={addr.pos.y + h * 0.08} rx={w * 0.58} ry={h * 0.54} className="bld-shadow" />
      <rect x={x} y={y} width={w} height={h} rx={6} className="bld-apartment" />
      {windows}
      <rect x={x + w * 0.42} y={y + h - h * 0.14} width={w * 0.16} height={h * 0.14} className="bld-door" />
    </g>
  );
}

function ShopRow({ bounds, seed }: { bounds: Block['bounds']; seed: number }) {
  const shops = 3;
  const colors = ['#ffb4a2', '#a2d2ff', '#caffbf', '#ffd6a5'];
  const rand = seededRand(seed);
  const w = bounds.w * 0.5 / shops;
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const startX = cx - (w * shops) / 2;
  const items = [];
  for (let i = 0; i < shops; i++) {
    items.push(
      <g key={i}>
        <rect x={startX + i * w + 4} y={cy - bounds.h * 0.12} width={w - 8} height={bounds.h * 0.22} rx={4}
          fill={colors[Math.floor(rand() * colors.length)]} className="bld-shop" />
        <rect x={startX + i * w + 4} y={cy - bounds.h * 0.16} width={w - 8} height={bounds.h * 0.06}
          className="shop-awning" />
      </g>,
    );
  }
  return <g>{items}</g>;
}

function ParkGlyph({ bounds, seed }: { bounds: Block['bounds']; seed: number }) {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const rx = ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
      const ry = ((Math.sin(seed * 39.34 + i * 12.9) * 12345.678) % 1 + 1) % 1;
      arr.push({
        x: bounds.x + bounds.w * (0.12 + rx * 0.76),
        y: bounds.y + bounds.h * (0.12 + ry * 0.76),
        delay: i * 0.3,
      });
    }
    return arr;
  }, [bounds, seed]);
  return (
    <g>
      <path
        d={`M ${bounds.x + bounds.w * 0.1} ${bounds.y + bounds.h * 0.5} Q ${bounds.x + bounds.w * 0.5} ${bounds.y + bounds.h * 0.2} ${bounds.x + bounds.w * 0.9} ${bounds.y + bounds.h * 0.5}`}
        className="park-path"
      />
      {trees.map((t, i) => (
        <g key={i} className="tree-sway" style={{ transformOrigin: `${t.x}px ${t.y}px`, animationDelay: `${t.delay}s` }}>
          <circle cx={t.x} cy={t.y} r={9} className="tree-leaf" />
          <rect x={t.x - 1.5} y={t.y + 6} width={3} height={7} className="tree-trunk" />
        </g>
      ))}
    </g>
  );
}

/** Base terrain for a cell, colored and decorated by biome. `full` renders dense
 * decoration (used for empty wild land); a light touch is used everywhere else so it
 * doesn't clutter houses/streets sitting on top of it. */
function BiomeGround({ bounds, biome, seed, full }: { bounds: Block['bounds']; biome: Biome; seed: number; full: boolean }) {
  const rand = seededRand(seed);
  const count = full ? 10 : 2;
  const items = useMemo(() => {
    const arr: { x: number; y: number; variant: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: bounds.x + bounds.w * (0.08 + rand() * 0.84),
        y: bounds.y + bounds.h * (0.08 + rand() * 0.84),
        variant: Math.floor(rand() * 3),
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, seed, full]);

  return (
    <g>
      <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} rx={10} className={`biome-ground biome-${biome}`} />
      {biome === 'forest' && items.map((t, i) => (
        <g key={i} className="tree-sway" style={{ transformOrigin: `${t.x}px ${t.y}px`, animationDelay: `${i * 0.25}s` }}>
          <circle cx={t.x} cy={t.y} r={7 + t.variant * 1.5} className="tree-leaf dark" />
          <rect x={t.x - 1.3} y={t.y + 5} width={2.6} height={6} className="tree-trunk" />
        </g>
      ))}
      {biome === 'desert' && items.map((t, i) => (
        <g key={i}>
          {t.variant === 0 ? (
            <>
              <rect x={t.x - 2} y={t.y - 10} width={4} height={14} rx={2} className="cactus" />
              <rect x={t.x - 7} y={t.y - 4} width={4} height={8} rx={2} className="cactus" />
            </>
          ) : (
            <circle cx={t.x} cy={t.y} r={3 + t.variant} className="desert-rock" />
          )}
        </g>
      ))}
      {biome === 'coastal' && (
        <path
          d={`M ${bounds.x} ${bounds.y + bounds.h * 0.7} Q ${bounds.x + bounds.w * 0.5} ${bounds.y + bounds.h * 0.55} ${bounds.x + bounds.w} ${bounds.y + bounds.h * 0.72} L ${bounds.x + bounds.w} ${bounds.y + bounds.h} L ${bounds.x} ${bounds.y + bounds.h} Z`}
          className="water-patch"
        />
      )}
      {biome === 'grass' && items.slice(0, full ? 6 : 1).map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={2.4} className="grass-tuft" />
      ))}
    </g>
  );
}

function FactoryGlyph() {
  const b = WORLD.factory.bounds;
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} className="factory-body" />
      <rect x={b.x + b.w * 0.06} y={b.y + b.h * 0.08} width={b.w * 0.88} height={b.h * 0.35} rx={8} className="factory-roofline" />
      {[0.18, 0.38, 0.58, 0.78].map((f, i) => (
        <rect key={i} x={b.x + b.w * f} y={b.y - b.h * 0.16} width={b.w * 0.06} height={b.h * 0.26} rx={3} className="factory-stack" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      <text x={b.x + b.w / 2} y={b.y + b.h * 0.28} textAnchor="middle" className="factory-sign">
        CENTRAL POSTAL FACTORY
      </text>
      {/* Entrance — south side */}
      <rect x={WORLD.factory.entrance.x - 26} y={b.y + b.h - 10} width={52} height={20} rx={4} className="factory-gate entrance" />
      <text x={WORLD.factory.entrance.x} y={b.y + b.h + 26} textAnchor="middle" className="factory-gate-label">ENTRANCE</text>
      {/* Exit — north side (opposite) */}
      <rect x={WORLD.factory.exit.x - 26} y={b.y - 10} width={52} height={20} rx={4} className="factory-gate exit" />
      <text x={WORLD.factory.exit.x} y={b.y - 18} textAnchor="middle" className="factory-gate-label">EXIT</text>
    </g>
  );
}

const ASPHALT_WIDTH = ROAD_WIDTH * 0.74;

function Roads() {
  const sidewalks = [];
  const asphalt = [];
  const centerlines = [];
  const span = GRID_N * CELL;
  for (let i = 0; i <= GRID_N; i++) {
    const isVEdge = i === 0 || i === GRID_N;
    sidewalks.push(
      <line key={`sv${i}`} x1={i * CELL} y1={-40} x2={i * CELL} y2={span + 40} className="road-sidewalk" strokeWidth={ROAD_WIDTH} />,
      <line key={`sh${i}`} x1={-40} y1={i * CELL} x2={span + 40} y2={i * CELL} className="road-sidewalk" strokeWidth={ROAD_WIDTH} />,
    );
    asphalt.push(
      <line key={`av${i}`} x1={i * CELL} y1={-40} x2={i * CELL} y2={span + 40} className="road-asphalt" strokeWidth={ASPHALT_WIDTH} />,
      <line key={`ah${i}`} x1={-40} y1={i * CELL} x2={span + 40} y2={i * CELL} className="road-asphalt" strokeWidth={ASPHALT_WIDTH} />,
    );
    if (!isVEdge) {
      centerlines.push(
        <line key={`cv${i}`} x1={i * CELL} y1={-40} x2={i * CELL} y2={span + 40} className="road-centerline" />,
        <line key={`ch${i}`} x1={-40} y1={i * CELL} x2={span + 40} y2={i * CELL} className="road-centerline" />,
      );
    }
  }
  return (
    <g>
      <g>{sidewalks}</g>
      <g>{asphalt}</g>
      <g>{centerlines}</g>
    </g>
  );
}

interface BlockRenderCtx {
  myAddressId?: string;
  unreadAddressIds: Set<string>;
  highlightedAddressId?: string;
  onSelectAddress?: (addr: AddressUnit, point: { x: number; y: number }) => void;
}

function BlockView({ block, ctx }: { block: Block; ctx: BlockRenderCtx }) {
  const { bounds, kind, biome } = block;
  if (kind === 'factory') return <FactoryGlyph />;

  if (kind === 'wild') {
    return <BiomeGround bounds={bounds} biome={biome} seed={block.row * 92821 + block.col * 68917} full />;
  }

  if (kind === 'park') {
    return (
      <>
        <BiomeGround bounds={bounds} biome={biome} seed={block.row * 92821 + block.col * 68917 + 3} full={false} />
        <ParkGlyph bounds={bounds} seed={block.row * 31 + block.col} />
      </>
    );
  }

  if (kind === 'shop') {
    return (
      <>
        <BiomeGround bounds={bounds} biome={biome} seed={block.row * 92821 + block.col * 68917 + 5} full={false} />
        <ShopRow bounds={bounds} seed={block.row * 31 + block.col + 9} />
      </>
    );
  }

  if (kind === 'apartment') {
    const addrs = WORLD.addresses.filter((a) => a.blockId === block.id);
    const n = block.neighborhoods[0];
    return (
      <>
        <BiomeGround bounds={bounds} biome={biome} seed={block.row * 92821 + block.col * 68917 + 7} full={false} />
        {n && addrs[0] && <ApartmentGlyph addr={addrs[0]} n={n} />}
      </>
    );
  }

  // house neighborhood(s)
  const addrs = WORLD.addresses.filter((a) => a.blockId === block.id);
  return (
    <>
      <BiomeGround bounds={bounds} biome={biome} seed={block.row * 92821 + block.col * 68917 + 11} full={false} />
      {block.neighborhoods.map((n) => (
        <NeighborhoodStreet key={n.id} n={n} />
      ))}
      {addrs.map((a) => (
        <HouseGlyph
          key={a.id}
          addr={a}
          isMine={a.id === ctx.myAddressId}
          hasUnread={ctx.unreadAddressIds.has(a.id)}
          highlighted={a.id === ctx.highlightedAddressId}
          onSelect={ctx.onSelectAddress}
        />
      ))}
    </>
  );
}

export const WorldLayer = memo(function WorldLayer({ visible, ctx }: { visible: VisibleRect; ctx: BlockRenderCtx }) {
  const blocksToRender = useMemo(
    () => WORLD.blocks.filter((b) => intersects(visible, { x: b.bounds.x - 60, y: b.bounds.y - 60, w: b.bounds.w + 120, h: b.bounds.h + 120 })),
    [visible],
  );
  return (
    <>
      <Roads />
      {blocksToRender.map((b) => (
        <BlockView key={b.id} block={b} ctx={ctx} />
      ))}
    </>
  );
});
