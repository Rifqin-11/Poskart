"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";

type Point = { x: number; y: number };

type SingleTouchPan = {
  active: boolean;
  startX: number;
  startY: number;
  startPan: Point;
};

export function useBuilderCanvasNavigation<T extends HTMLElement>({
  surfaceRef,
  surfaceKey,
  enabled = true,
  nodeSelector,
  zoom,
  pan,
  setZoom,
  setPan,
  clampZoom,
}: {
  surfaceRef: RefObject<T | null>;
  surfaceKey: string | number | boolean;
  enabled?: boolean;
  nodeSelector: string;
  zoom: number;
  pan: Point;
  setZoom: Dispatch<SetStateAction<number>>;
  setPan: Dispatch<SetStateAction<Point>>;
  clampZoom: (value: number) => number;
}) {
  const latestZoomRef = useRef(zoom);
  const latestPanRef = useRef(pan);
  const touchStartDistanceRef = useRef(0);
  const touchStartZoomRef = useRef(zoom);
  const touchStartMidpointRef = useRef<Point>({ x: 0, y: 0 });
  const touchStartPanRef = useRef<Point>(pan);
  const singleTouchPanRef = useRef<SingleTouchPan>({
    active: false,
    startX: 0,
    startY: 0,
    startPan: pan,
  });

  useEffect(() => {
    latestZoomRef.current = zoom;
    latestPanRef.current = pan;
  }, [pan, zoom]);

  useEffect(() => {
    if (!enabled) return;

    const surface = surfaceRef.current;
    if (!surface) return;

    const startPinch = (first: Touch, second: Touch) => {
      touchStartDistanceRef.current = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
      touchStartZoomRef.current = latestZoomRef.current;
      touchStartMidpointRef.current = {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      };
      touchStartPanRef.current = { ...latestPanRef.current };
      singleTouchPanRef.current.active = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const factor = event.deltaY < 0 ? 1.08 : 0.93;
        setZoom((value) => clampZoom(value * factor));
        return;
      }

      setPan((value) => ({
        x: value.x - event.deltaX,
        y: value.y - event.deltaY,
      }));
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        startPinch(event.touches[0], event.touches[1]);
        return;
      }

      if (event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest(nodeSelector)) return;

      const touch = event.touches[0];
      singleTouchPanRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startPan: { ...latestPanRef.current },
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        const first = event.touches[0];
        const second = event.touches[1];

        if (touchStartDistanceRef.current <= 0) startPinch(first, second);

        const distance = Math.hypot(
          first.clientX - second.clientX,
          first.clientY - second.clientY,
        );
        setZoom(
          clampZoom(
            touchStartZoomRef.current *
              (distance / touchStartDistanceRef.current),
          ),
        );

        const midpoint = {
          x: (first.clientX + second.clientX) / 2,
          y: (first.clientY + second.clientY) / 2,
        };
        setPan({
          x:
            touchStartPanRef.current.x +
            midpoint.x -
            touchStartMidpointRef.current.x,
          y:
            touchStartPanRef.current.y +
            midpoint.y -
            touchStartMidpointRef.current.y,
        });
        return;
      }

      if (event.touches.length !== 1 || !singleTouchPanRef.current.active) {
        return;
      }

      event.preventDefault();
      const touch = event.touches[0];
      setPan({
        x:
          singleTouchPanRef.current.startPan.x +
          touch.clientX -
          singleTouchPanRef.current.startX,
        y:
          singleTouchPanRef.current.startPan.y +
          touch.clientY -
          singleTouchPanRef.current.startY,
      });
    };

    const handleTouchEnd = (event: TouchEvent) => {
      touchStartDistanceRef.current = 0;
      singleTouchPanRef.current.active = false;

      if (event.touches.length === 1) {
        const touch = event.touches[0];
        singleTouchPanRef.current = {
          active: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startPan: { ...latestPanRef.current },
        };
      }
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    surface.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    surface.addEventListener("touchmove", handleTouchMove, { passive: false });
    surface.addEventListener("touchend", handleTouchEnd, { passive: false });
    surface.addEventListener("touchcancel", handleTouchEnd, {
      passive: false,
    });

    return () => {
      surface.removeEventListener("wheel", handleWheel);
      surface.removeEventListener("touchstart", handleTouchStart);
      surface.removeEventListener("touchmove", handleTouchMove);
      surface.removeEventListener("touchend", handleTouchEnd);
      surface.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [
    clampZoom,
    enabled,
    nodeSelector,
    setPan,
    setZoom,
    surfaceKey,
    surfaceRef,
  ]);
}
