import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useCamera } from './useCamera';
import { WorldLayer } from './WorldLayer';
import { AmbientLife } from './AmbientLife';
import { TrucksLayer } from './TrucksLayer';
import { getTruckPose } from './truckPosition';
import { WORLD } from '../world/generateWorld';
import type { AddressUnit, DeliveryStatus } from '../types';
import { useStore } from '../store/useStore';
import { computeDurations, progressWithin } from '../engine/deliveryEngine';

const DRIVING_STATUSES: DeliveryStatus[] = ['TO_FACTORY', 'LEAVING_FACTORY', 'TO_RECIPIENT'];
const FOLLOW_SCALE = 1.3;

export interface MapCanvasHandle {
  flyToAddress: (addressId: string, scale?: number) => void;
  flyToOverview: () => void;
}

interface Props {
  myAddressId: string;
  unreadAddressIds: Set<string>;
  highlightedAddressId?: string;
  onSelectAddress?: (addr: AddressUnit) => void;
  followEnvelopeId?: string | null;
  onDeliveryPhase?: (status: DeliveryStatus | null) => void;
}

const OVERVIEW_SCALE = 0.24;

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { myAddressId, unreadAddressIds, highlightedAddressId, onSelectAddress, followEnvelopeId, onDeliveryPhase },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldCenter = WORLD.factory.bounds;
  const { camera, flyTo, setCamera, cancelFlight } = useCamera(containerRef, {
    scale: OVERVIEW_SCALE,
    tx: 0,
    ty: 0,
  });
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flyToAddress = (addressId: string, scale = 1.4) => {
    const addr = WORLD.addressById.get(addressId);
    if (!addr) return;
    flyTo(addr.pos, scale, 1000);
  };
  const flyToOverview = () => {
    flyTo({ x: worldCenter.x + worldCenter.w / 2, y: worldCenter.y + worldCenter.h / 2 }, OVERVIEW_SCALE, 1000);
  };

  useImperativeHandle(ref, () => ({ flyToAddress, flyToOverview }));

  // Initial framing: center on the player's house once we know container size.
  const framedRef = useRef(false);
  useEffect(() => {
    if (framedRef.current || size.w === 0) return;
    framedRef.current = true;
    flyToAddress(myAddressId, 0.9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, myAddressId]);

  // Cinematic delivery director: moves the camera through the postal journey.
  const envelope = useStore((s) => (followEnvelopeId ? s.envelopes[followEnvelopeId] : undefined));
  const users = useStore((s) => s.users);
  const lastPhaseRef = useRef<DeliveryStatus | null>(null);
  useEffect(() => {
    if (!envelope) {
      if (lastPhaseRef.current !== null) {
        lastPhaseRef.current = null;
        onDeliveryPhase?.(null);
      }
      return;
    }
    if (envelope.status === lastPhaseRef.current) return;
    lastPhaseRef.current = envelope.status;
    onDeliveryPhase?.(envelope.status);
    const sender = users[envelope.senderId];
    const recipient = users[envelope.recipientId];
    const senderAddr = sender ? WORLD.addressById.get(sender.addressId) : undefined;
    const recipientAddr = recipient ? WORLD.addressById.get(recipient.addressId) : undefined;
    // Driving phases (TO_FACTORY / LEAVING_FACTORY / TO_RECIPIENT) are handled by the
    // continuous chase-camera effect below instead of a one-shot flyTo.
    switch (envelope.status) {
      case 'PICKUP':
        if (senderAddr) flyTo(senderAddr.pos, 1.6, 900);
        break;
      case 'PROCESSING':
        flyTo({ x: worldCenter.x + worldCenter.w / 2, y: worldCenter.y + worldCenter.h / 2 }, 1.1, 800);
        break;
      case 'DELIVERED':
        if (recipientAddr) flyTo(recipientAddr.pos, 1.6, 900);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope?.status]);

  // Chase camera: while the truck is actually driving, follow it continuously frame by
  // frame instead of jumping between fixed shots — this is the "track the vehicle" feel.
  useEffect(() => {
    if (!envelope || !DRIVING_STATUSES.includes(envelope.status)) return;
    const sender = users[envelope.senderId];
    const recipient = users[envelope.recipientId];
    const senderAddr = sender ? WORLD.addressById.get(sender.addressId) : undefined;
    const recipientAddr = recipient ? WORLD.addressById.get(recipient.addressId) : undefined;
    if (!sender || !recipient || !senderAddr || !recipientAddr) return;
    const durations = computeDurations(sender.addressId, recipient.addressId);
    cancelFlight();
    let raf: number;
    const loop = () => {
      const now = Date.now();
      const progress = progressWithin(envelope, durations, now);
      const pose = getTruckPose(envelope.status, progress, senderAddr, recipientAddr);
      const el = containerRef.current;
      if (pose && el) {
        const rect = el.getBoundingClientRect();
        const targetTx = rect.width / 2 - pose.pos.x * FOLLOW_SCALE;
        const targetTy = rect.height / 2 - pose.pos.y * FOLLOW_SCALE;
        setCamera((prev) => ({
          scale: prev.scale + (FOLLOW_SCALE - prev.scale) * 0.08,
          tx: prev.tx + (targetTx - prev.tx) * 0.12,
          ty: prev.ty + (targetTy - prev.ty) * 0.12,
        }));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope?.status]);

  const visible = useMemo(() => {
    if (size.w === 0) return { x: -1000, y: -1000, w: 4000, h: 4000 };
    const x = -camera.tx / camera.scale;
    const y = -camera.ty / camera.scale;
    return { x, y, w: size.w / camera.scale, h: size.h / camera.scale };
  }, [camera, size]);

  const ctx = useMemo(
    () => ({ myAddressId, unreadAddressIds, highlightedAddressId, onSelectAddress }),
    [myAddressId, unreadAddressIds, highlightedAddressId, onSelectAddress],
  );

  return (
    <div ref={containerRef} className="map-canvas-container" role="application" aria-label="City map">
      <svg width="100%" height="100%" className="map-svg">
        <g transform={`translate(${camera.tx}, ${camera.ty}) scale(${camera.scale})`}>
          <rect x={-2000} y={-2000} width={20000} height={20000} className="map-bg" />
          <WorldLayer visible={visible} ctx={ctx} />
          <AmbientLife />
          <TrucksLayer />
        </g>
      </svg>
    </div>
  );
});
