import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { WORLD } from '../world/generateWorld';
import { computeDurations, progressWithin } from '../engine/deliveryEngine';
import { getTruckPose } from './truckPosition';

function Truck({ x, y, angle, style }: { x: number; y: number; angle: number; style: 'pickup' | 'drive' }) {
  // Positioning transform lives on the outer <g>; the bob animation (which sets a CSS
  // `transform`) lives on an inner <g> so it doesn't clobber the outer translate/rotate.
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <ellipse cx={0} cy={8.5} rx={12} ry={2.6} className="truck-shadow" />
      <g className={`truck ${style === 'pickup' ? 'truck-idle' : 'truck-driving'}`}>
        <rect x={-11} y={-6.5} width={22} height={13} rx={3} className="truck-body" />
        <rect x={3.5} y={-9.5} width={8.5} height={13} rx={2.5} className="truck-cab" />
        <rect x={5} y={-7.5} width={5.5} height={4.5} rx={1} className="truck-windshield" />
        <rect x={-9.5} y={-4.5} width={12} height={5} rx={1.2} className="truck-envelope" />
        <rect x={11.5} y={-3.5} width={1.6} height={2.4} rx={0.5} className="truck-light" />
        <circle cx={-6} cy={6.5} r={3.1} className="truck-wheel" />
        <circle cx={-6} cy={6.5} r={1.2} className="truck-hub" />
        <circle cx={7} cy={6.5} r={3.1} className="truck-wheel" />
        <circle cx={7} cy={6.5} r={1.2} className="truck-hub" />
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
        const pose = getTruckPose(env.status, progress, senderAddr, recipientAddr);
        if (!pose) return null;
        return (
          <Truck
            key={env.id}
            x={pose.pos.x}
            y={pose.pos.y}
            angle={pose.angle}
            style={env.status === 'PICKUP' ? 'pickup' : 'drive'}
          />
        );
      })}
    </g>
  );
}
