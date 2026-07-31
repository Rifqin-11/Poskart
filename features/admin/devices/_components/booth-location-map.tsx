"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import { cn } from "@/lib/utils";

type GeocodedLocation = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type GeocodeState = {
  location: string;
  coordinates: GeocodedLocation | null;
  error: string | null;
};

export function BoothLocationMap({
  location,
  className,
}: {
  location: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [geocodeState, setGeocodeState] = useState<GeocodeState | null>(null);
  const normalizedLocation = location?.trim() ?? "";
  const currentState =
    geocodeState?.location === normalizedLocation ? geocodeState : null;
  const coordinates = currentState?.coordinates ?? null;
  const loading = Boolean(normalizedLocation) && currentState === null;
  const error = normalizedLocation
    ? currentState?.error ?? null
    : "Location not configured";

  useEffect(() => {
    if (!normalizedLocation) return;

    const controller = new AbortController();

    void fetch(
      `/api/admin/devices/geocode?q=${encodeURIComponent(normalizedLocation)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (GeocodedLocation & { error?: string })
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error || "Location not found");
        }
        setGeocodeState({
          location: normalizedLocation,
          coordinates: payload,
          error: null,
        });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setGeocodeState({
          location: normalizedLocation,
          coordinates: null,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Location not found",
        });
      });

    return () => controller.abort();
  }, [normalizedLocation]);

  useEffect(() => {
    if (!coordinates || !containerRef.current) return;

    let cancelled = false;

    void import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;

      mapRef.current?.remove();

      const center: [number, number] = [
        coordinates.latitude,
        coordinates.longitude,
      ];
      const map = leaflet.map(containerRef.current, {
        attributionControl: true,
        scrollWheelZoom: false,
        zoomControl: false,
      });
      map.setView(center, 15);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);
      leaflet
        .marker(center, {
          icon: leaflet.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;background:#00357B;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,53,123,0.4)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
        .addTo(map);

      mapRef.current = map;

      // Primary invalidate after paint
      requestAnimationFrame(() => {
        map.invalidateSize();
      });

      // ResizeObserver fallback — fires whenever the container actually gets its final size
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          map.invalidateSize();
        });
        ro.observe(containerRef.current);
        // Disconnect after first meaningful resize to avoid repeated calls
        const onceResize = () => {
          ro.disconnect();
        };
        map.once("resize", onceResize);
      }

      // Belt-and-suspenders timeout fallback
      const t = setTimeout(() => {
        map.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(t);
      };
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coordinates, location]);

  return (
    <div
      className={cn(
        "poskart-booth-map relative min-h-40 overflow-hidden bg-[#eaf0f8]",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label={`Map of ${location}`}
      />
      {loading ? (
        <div className="absolute inset-0 z-[400] grid place-items-center bg-[#eef3f9] text-zinc-500">
          <div className="text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-[#00357B]" />
            <p className="mt-2 text-xs font-medium">Finding location...</p>
          </div>
        </div>
      ) : error ? (
        <div className="absolute inset-0 z-[400] grid place-items-center bg-[#eef3f9] px-6 text-center">
          <div>
            <MapPin className="mx-auto size-5 text-zinc-400" />
            <p className="mt-2 text-xs font-medium text-zinc-600">{error}</p>
            <p className="mt-1 text-[10px] text-zinc-400">
              Use a more specific city or venue name.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
