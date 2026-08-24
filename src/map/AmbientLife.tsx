import { memo, useMemo } from 'react';
import { CELL, FACTORY_COL, FACTORY_ROW } from '../world/generateWorld';

const CAR_COLORS = ['#ff8a65', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8'];

function loopPath(row: number, colStart: number, colEnd: number) {
  const y = row * CELL;
  return `M ${colStart * CELL} ${y} L ${colEnd * CELL} ${y} L ${colEnd * CELL} ${y + CELL} L ${colStart * CELL} ${y + CELL} Z`;
}

export const AmbientLife = memo(function AmbientLife() {
  const loops = useMemo(() => {
    const arr: { id: string; d: string; dur: number; color: string; delay: number }[] = [];
    const rows = [FACTORY_ROW - 3, FACTORY_ROW - 1, FACTORY_ROW + 2, FACTORY_ROW + 4];
    rows.forEach((row, i) => {
      arr.push({
        id: `loop-${i}`,
        d: loopPath(row, FACTORY_COL - 3, FACTORY_COL + 3),
        dur: 18 + i * 4,
        color: CAR_COLORS[i % CAR_COLORS.length],
        delay: i * 1.3,
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
          <rect x={-4} y={-2.5} width={8} height={5} rx={1.5} fill={loop.color} className="ambient-car">
            <animateMotion dur={`${loop.dur}s`} begin={`${loop.delay}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${loop.id}`} />
            </animateMotion>
          </rect>
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
