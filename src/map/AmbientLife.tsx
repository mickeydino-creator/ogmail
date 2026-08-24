import { memo, useMemo } from 'react';
import { CELL, FACTORY_COL, FACTORY_ROW, GRID_N } from '../world/generateWorld';

const CAR_COLORS = ['#ff8a65', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4fc3d9'];

function loopPath(row: number, colStart: number, colEnd: number) {
  const y = row * CELL;
  return `M ${colStart * CELL} ${y} L ${colEnd * CELL} ${y} L ${colEnd * CELL} ${y + CELL} L ${colStart * CELL} ${y + CELL} Z`;
}

function CarGlyph({ color }: { color: string }) {
  return (
    <>
      <ellipse cx={0} cy={2.6} rx={5} ry={1.1} className="ambient-car-shadow" />
      <rect x={-4.6} y={-2.4} width={9.2} height={4.8} rx={1.6} fill={color} className="ambient-car-body" />
      <rect x={-1.6} y={-4.1} width={4.6} height={2.4} rx={0.9} fill={color} className="ambient-car-cab" />
      <rect x={-0.9} y={-3.6} width={2.2} height={1.5} rx={0.3} className="ambient-car-glass" />
      <circle cx={-2.7} cy={2.2} r={1.15} className="ambient-car-wheel" />
      <circle cx={2.9} cy={2.2} r={1.15} className="ambient-car-wheel" />
    </>
  );
}

export const AmbientLife = memo(function AmbientLife() {
  const loops = useMemo(() => {
    const arr: { id: string; d: string; dur: number; color: string; delay: number }[] = [];
    const rows = [FACTORY_ROW - 4, FACTORY_ROW - 2, FACTORY_ROW + 2, FACTORY_ROW + 4, 1, GRID_N - 2];
    rows.forEach((row, i) => {
      const half = i < 4 ? 3 : 5;
      arr.push({
        id: `loop-${i}`,
        d: loopPath(row, Math.max(0, FACTORY_COL - half), Math.min(GRID_N, FACTORY_COL + half)),
        dur: 26 + i * 5,
        color: CAR_COLORS[i % CAR_COLORS.length],
        delay: i * 1.7,
      });
    });
    return arr;
  }, []);

  const walkers = useMemo(() => {
    const arr: { id: string; d: string; dur: number; delay: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const row = FACTORY_ROW - 2 + i;
      arr.push({
        id: `walk-${i}`,
        d: `M ${(FACTORY_COL - 2) * CELL + 20} ${row * CELL + 10} L ${(FACTORY_COL + 2) * CELL - 20} ${row * CELL + 10}`,
        dur: 14 + i * 3,
        delay: i * 2,
      });
    }
    return arr;
  }, []);

  return (
    <g className="ambient-life" pointerEvents="none">
      {loops.map((loop) => (
        <g key={loop.id}>
          <path id={loop.id} d={loop.d} fill="none" stroke="none" />
          <g className="ambient-car">
            <animateMotion dur={`${loop.dur}s`} begin={`${loop.delay}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${loop.id}`} />
            </animateMotion>
            <CarGlyph color={loop.color} />
          </g>
        </g>
      ))}
      {walkers.map((w) => (
        <g key={w.id}>
          <path id={w.id} d={w.d} fill="none" stroke="none" />
          <circle r={2.2} className="ambient-walker">
            <animateMotion dur={`${w.dur}s`} begin={`${w.delay}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  );
});
