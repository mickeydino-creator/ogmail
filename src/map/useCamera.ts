import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '../types';

export interface Camera {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.18;
const MAX_SCALE = 3.2;

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useCamera(containerRef: React.RefObject<HTMLDivElement | null>, initial: Camera) {
  const [camera, setCamera] = useState<Camera>(initial);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const animRef = useRef<number | null>(null);
  const dragState = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const pinchState = useRef<{ dist: number; scale: number } | null>(null);

  const cancelAnim = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const flyTo = useCallback(
    (worldPoint: Point, targetScale: number, duration = 900) => {
      cancelAnim();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetTx = rect.width / 2 - worldPoint.x * targetScale;
      const targetTy = rect.height / 2 - worldPoint.y * targetScale;
      const start = cameraRef.current;
      const target = { scale: clampScale(targetScale), tx: targetTx, ty: targetTy };
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = easeInOutCubic(t);
        const next = {
          scale: start.scale + (target.scale - start.scale) * e,
          tx: start.tx + (target.tx - start.tx) * e,
          ty: start.ty + (target.ty - start.ty) * e,
        };
        setCamera(next);
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnim, containerRef],
  );

  const zoomAt = useCallback((screenX: number, screenY: number, factor: number) => {
    cancelAnim();
    setCamera((prev) => {
      const nextScale = clampScale(prev.scale * factor);
      const realFactor = nextScale / prev.scale;
      return {
        scale: nextScale,
        tx: screenX - (screenX - prev.tx) * realFactor,
        ty: screenY - (screenY - prev.ty) * realFactor,
      };
    });
  }, [cancelAnim]);

  const panBy = useCallback((dx: number, dy: number) => {
    setCamera((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const activePointers = new Map<number, { x: number; y: number }>();

    const onPointerDown = (e: PointerEvent) => {
      cancelAnim();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 1) {
        dragState.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        pinchState.current = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          scale: cameraRef.current.scale,
        };
      }
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2 && pinchState.current) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const factor = dist / (pinchState.current.dist || 1);
        const rect = el.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const targetScale = clampScale(pinchState.current.scale * factor);
        setCamera((prev) => {
          const realFactor = targetScale / prev.scale;
          return {
            scale: targetScale,
            tx: midX - (midX - prev.tx) * realFactor,
            ty: midY - (midY - prev.ty) * realFactor,
          };
        });
        return;
      }

      if (dragState.current && dragState.current.pointerId === e.pointerId) {
        const dx = e.clientX - dragState.current.x;
        const dy = e.clientY - dragState.current.y;
        dragState.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
        panBy(dx, dy);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
      if (activePointers.size < 2) pinchState.current = null;
      if (activePointers.size === 1) {
        const [[id, p]] = activePointers;
        dragState.current = { x: p.x, y: p.y, pointerId: id };
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.pow(1.0015, -e.deltaY);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [containerRef, cancelAnim, panBy, zoomAt]);

  return { camera, flyTo, zoomAt, panBy, setCamera };
}
