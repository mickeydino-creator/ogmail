import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { WORLD } from '../world/generateWorld';
import { computeDurations, progressWithin } from '../engine/deliveryEngine';
import { pathLength, routeFromFactory, routeToFactory, samplePath } from '../world/routing';

const EMERGE_DIST = 55; // world units the truck visibly "emerges" from the exit gate

function Truck({ x, y, angle, style }: { x: number; y: number; angle: number; style: 'pickup' | 'drive' }) {
  // Positioning transform lives on the outer <g>; the bob animation (which sets a CSS
  // `transform`) lives on an inner <g> so it doesn't clobber the outer translate/rotate.
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <g className={`truck ${style === 'pickup' ? 'truck-idle' : 'truck-driving'}`}>
        <rect x={-10} y={-6} width={20} height={12} rx={2.5} className="truck-body" />
        <rect x={4} y={-5} width={7} height={10} rx={1.5} className="truck-cab" />
        <circle cx={-5} cy={6} r={2.4} className="truck-wheel" />
        <circle cx={6.5} cy={6} r={2.4} className="truck-wheel" />
        <rect x={-8} y={-3.5} width={5} height={4} rx={0.8} className="truck-envelope" />
      </g>
    </g>
  );
}

export function TrucksLayer() {
  const envelopes = useStore((s) => s.envelopes);
  const users = useStore((s) => s.users);
  const [now, setNow] = useState(() => Date.now());
  const rafRef = useRef<number | null>(null);

  const activeEnvelopes = Object.values(envelopes).filter(
    (e) => e.status !== 'CREATED' && e.status !== 'DELIVERED' && e.status !== 'PROCESSING',
  );

  useEffect(() => {
    if (activeEnvelopes.length === 0) return;
    const loop = () => {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnvelopes.length]);

  return (
    <g className="trucks-layer">
      {activeEnvelopes.map((env) => {
        const sender = users[env.senderId];
        const recipient = users[env.recipientId];
        if (!sender || !recipient) return null;
        const senderAddr = WORLD.addressById.get(sender.addressId);
        const recipientAddr = WORLD.addressById.get(recipient.addressId);
        if (!senderAddr || !recipientAddr) return null;
        const durations = computeDurations(sender.addressId, recipient.addressId);
        const progress = progressWithin(env, durations, now);

        if (env.status === 'PICKUP') {
          return <Truck key={env.id} x={senderAddr.doorPos.x + 16} y={senderAddr.doorPos.y + 4} angle={0} style="pickup" />;
        }
        if (env.status === 'TO_FACTORY') {
          const pts = routeToFactory(senderAddr);
          const { pos, angle } = samplePath(pts, progress);
          return <Truck key={env.id} x={pos.x} y={pos.y} angle={angle} style="drive" />;
        }
        if (env.status === 'LEAVING_FACTORY' || env.status === 'TO_RECIPIENT') {
          const pts = routeFromFactory(recipientAddr);
          const total = pathLength(pts);
          const emergeFrac = total > 0 ? Math.min(0.35, EMERGE_DIST / total) : 0.1;
          const t = env.status === 'LEAVING_FACTORY' ? progress * emergeFrac : emergeFrac + progress * (1 - emergeFrac);
          const { pos, angle } = samplePath(pts, t);
          return <Truck key={env.id} x={pos.x} y={pos.y} angle={angle} style="drive" />;
        }
        return null;
      })}
    </g>
  );
}
