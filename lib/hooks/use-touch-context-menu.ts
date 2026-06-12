"use client";

import { useCallback, useEffect, useRef } from "react";

const LONG_PRESS_DELAY_MS = 550;
const MOVE_TOLERANCE_PX = 10;

export function useTouchContextMenu(
  onOpen: (position: { x: number; y: number }) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;

      clearTimer();
      firedRef.current = false;
      startRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onOpen({ x: event.clientX, y: event.clientY });
        navigator.vibrate?.(20);
      }, LONG_PRESS_DELAY_MS);
    },
    [clearTimer, onOpen],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (
        Math.abs(event.clientX - startRef.current.x) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - startRef.current.y) > MOVE_TOLERANCE_PX
      ) {
        clearTimer();
      }
    },
    [clearTimer],
  );

  const finish = useCallback(
    (event: React.PointerEvent) => {
      clearTimer();
      if (firedRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [clearTimer],
  );

  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (!firedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    window.setTimeout(() => {
      firedRef.current = false;
    }, 0);
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onClickCapture,
  };
}
