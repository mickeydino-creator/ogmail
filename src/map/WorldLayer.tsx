import { memo, useMemo } from 'react';
import { CELL, GRID_N, ROAD_WIDTH, WORLD } from '../world/generateWorld';
import type { AddressUnit, Block } from '../types';

interface VisibleRect { x: number; y: number; w: number; h: number }

function intersects(a: VisibleRect, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

const WALL_PALETTE = ['#fbead0', '#f8dfe1', '#dceee1', '#dde6f7', '#f5e8d6', '#eee0f6', '#e3f0f6'];
const ROOF_PALETTE = ['#e2685a', '#d98c46', '#4f8f6d', '#5a7fc0', '#c05a86', '#3f9e97'];

function hashIndex(id: string, salt: string, mod: number) {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function WindowGlyph({ x, y, w, h, lit }: { x: number; y: number; w: number; h: number; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} className={lit ? 'bld-window lit' : 'bld-window'} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} className="bld-window-mullion" />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} className="bld-window-mullion" />
    </g>
  );
}

function HouseGlyph({
  x, y, w, h, lit, addr, isMine, hasUnread, highlighted, onSelect,
}: {
  x: number; y: number; w: number; h: number; lit: boolean;
  addr: AddressUnit; isMine: boolean; hasUnread: boolean; highlighted: boolean;
  onSelect?: (addr: AddressUnit) => void;
}) {
  const roofH = h * 0.42;
  const wallFill = WALL_PALETTE[hashIndex(addr.id, 'wall', WALL_PALETTE.length)];
  const roofFill = ROOF_PALETTE[hashIndex(addr.id, 'roof', ROOF_PALETTE.length)];
  const chimneySide = hashIndex(addr.id, 'chimney', 2) === 0 ? 0.24 : 0.7;
  const chimneyX = x + w * chimneySide;
  const chimneyTopY = y + roofH * 0.32;
  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect?.(addr); }}
      className={isMine ? 'house mine' : 'house'}
      style={{ cursor: onSelect ? 'pointer' : undefined }}
    >
      {highlighted && <circle cx={x + w / 2} cy={y + h / 2} r={Math.max(w, h) * 0.95} className="select-ring" />}
      <ellipse cx={x + w / 2} cy={y + h + h * 0.06} rx={w * 0.56} ry={h * 0.09} className="bld-shadow" />
      <rect x={chimneyX - w * 0.045} y={chimneyTopY} width={w * 0.09} height={roofH * 0.55} className="bld-chimney" />
      <rect x={chimneyX - w * 0.06} y={chimneyTopY - h * 0.02} width={w * 0.12} height={h * 0.04} className="bld-chimney-cap" />
      <rect x={x} y={y + roofH} width={w} height={h - roofH} rx={2} className="bld-wall" style={isMine ? undefined : { fill: wallFill }} />
      <polygon
        points={`${x - 2},${y + roofH} ${x + w / 2},${y} ${x + w + 2},${y + roofH}`}
        className={isMine ? 'bld-roof mine' : 'bld-roof'}
        style={isMine ? undefined : { fill: roofFill }}
      />
      <line x1={x - 2} y1={y + roofH} x2={x + w + 2} y2={y + roofH} className="bld-roof-trim" />
      <rect x={x + w * 0.28} y={y + h - h * 0.34} width={w * 0.16} height={h * 0.3} rx={0.6} className="bld-door" />
      <circle cx={x + w * 0.4} cy={y + h - h * 0.18} r={0.9} className="bld-doorknob" />
      <WindowGlyph x={x + w * 0.58} y={y + roofH + h * 0.12} w={w * 0.22} h={h * 0.16} lit={lit} />
      <circle cx={x + w * 0.1} cy={y + h - h * 0.06} r={w * 0.09} className="bld-bush" />
      <circle cx={x + w * 0.9} cy={y + h - h * 0.05} r={w * 0.07} className="bld-bush" />
      <MailboxGlyph x={addr.doorPos.x} y={addr.doorPos.y} isMine={isMine} hasUnread={hasUnread} />
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="transparent" />
    </g>
  );
}

function ApartmentGlyph({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
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
      <rect x={x} y={y} width={w} height={h} rx={6} className="bld-apartment" />
      {windows}
      <rect x={x + w * 0.42} y={y + h - h * 0.14} width={w * 0.16} height={h * 0.14} className="bld-door" />
    </g>
  );
}

function ShopRow({ bounds }: { bounds: Block['bounds'] }) {
  const shops = 3;
  const colors = ['#ffb4a2', '#a2d2ff', '#caffbf', '#ffd6a5'];
  const items = [];
  const w = bounds.w / shops;
  for (let i = 0; i < shops; i++) {
    items.push(
      <g key={i}>
        <rect x={bounds.x + i * w + 4} y={bounds.y + bounds.h * 0.35} width={w - 8} height={bounds.h * 0.55} rx={4}
          fill={colors[i % colors.length]} className="bld-shop" />
        <rect x={bounds.x + i * w + 4} y={bounds.y + bounds.h * 0.3} width={w - 8} height={bounds.h * 0.12}
          className="shop-awning" />
      </g>,
    );
  }
  return <g>{items}</g>;
}

function ParkGlyph({ bounds, seed }: { bounds: Block['bounds']; seed: number }) {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
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
      <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} rx={10} className="park-ground" />
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
  onSelectAddress?: (addr: AddressUnit) => void;
}

function BlockView({ block, ctx }: { block: Block; ctx: BlockRenderCtx }) {
  const { bounds, kind } = block;
  if (kind === 'factory') return <FactoryGlyph />;
  if (kind === 'park') return <ParkGlyph bounds={bounds} seed={block.row * 31 + block.col} />;
  if (kind === 'shop') return <ShopRow bounds={bounds} />;
  if (kind === 'apartment') {
    return <ApartmentGlyph x={bounds.x} y={bounds.y} w={bounds.w} h={bounds.h} />;
  }
  // house neighborhood
  const addrs = WORLD.addresses.filter((a) => a.blockId === block.id);
  const houseW = bounds.w / 4.6;
  const houseH = bounds.h / 3.6;
  return (
    <g>
      <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} rx={8} className="lot-ground" />
      {addrs.map((a, i) => (
        <HouseGlyph
          key={a.id}
          x={a.pos.x - houseW / 2}
          y={a.pos.y - houseH / 2}
          w={houseW}
          h={houseH}
          lit={i % 5 === 0}
          addr={a}
          isMine={a.id === ctx.myAddressId}
          hasUnread={ctx.unreadAddressIds.has(a.id)}
          highlighted={a.id === ctx.highlightedAddressId}
          onSelect={ctx.onSelectAddress}
        />
      ))}
    </g>
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
