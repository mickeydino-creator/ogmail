import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '../types';

export interface Camera {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.08;
const MAX_SCALE = 3.2;
const DRAG_THRESHOLD_PX = 6;

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
  const dragState = useRef<{ x: number; y: number; pointerId: number; startX: number; startY: number; captured: boolean } | null>(
    null,
  );
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
        // Capture is deliberately NOT taken here — only once real dragging is detected
        // (see onPointerMove). Capturing immediately would redirect the resulting click
        // event to this container instead of whatever was actually tapped (a house, the
        // factory, etc.), silently breaking every tap-to-select interaction on the map.
        dragState.current = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, captured: false };
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        pinchState.current = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          scale: cameraRef.current.scale,
        };
        el.setPointerCapture(e.pointerId);
      }
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
        if (!dragState.current.captured) {
          const totalDist = Math.hypot(e.clientX - dragState.current.startX, e.clientY - dragState.current.startY);
          if (totalDist > DRAG_THRESHOLD_PX) {
            el.setPointerCapture(e.pointerId);
            dragState.current.captured = true;
          }
        }
        dragState.current = { ...dragState.current, x: e.clientX, y: e.clientY };
        panBy(dx, dy);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
      if (activePointers.size < 2) pinchState.current = null;
      if (activePointers.size === 1) {
        // Continuing a pan after lifting one finger of a pinch — already mid-gesture,
        // so there's no tap to protect and capture can be taken immediately.
        const [[id, p]] = activePointers;
        if (!el.hasPointerCapture(id)) el.setPointerCapture(id);
        dragState.current = { x: p.x, y: p.y, startX: p.x, startY: p.y, pointerId: id, captured: true };
      }
      // Release capture so the resulting click event targets whatever is actually under
      // the pointer (a house, the factory, etc.) instead of being redirected to this
      // container — otherwise taps on map elements would never fire their onClick.
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
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

  return { camera, flyTo, zoomAt, panBy, setCamera, cancelFlight: cancelAnim };
}
