import React, { useState, useEffect, useMemo } from 'react';
import { circle } from '@turf/circle';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

interface RadiusCircleProps {
  /** Center coordinate as [longitude, latitude] */
  center: [number, number];
  /** Radius in meters */
  radiusMeters?: number;
}

// ────────────────────────────────────────────
// Animation config
// ────────────────────────────────────────────
const PULSE_TICK_MS = 50;    // 20fps — smooth enough, battery-friendly
const PULSE_SPEED = 0.018;   // 0→1 takes ~2.8 seconds per cycle

/**
 * Pokemon Go-style radius circle with a radiating pulse ring.
 *
 * - Static outer ring marks the 50m interaction zone
 * - An animated ring expands outward from center to full radius, fading as it grows
 * - Both move with the user's live GPS position
 */
export default function RadiusCircle({
  center,
  radiusMeters = 50,
}: RadiusCircleProps) {
  const radiusKm = radiusMeters / 1000;
  const [pulse, setPulse] = useState(0); // 0 → 1 then resets

  // ── Pulse animation loop ──
  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => {
        const next = p + PULSE_SPEED;
        return next >= 1 ? 0 : next;
      });
    }, PULSE_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  // ── Main radius circle (static boundary) ──
  const mainCircle = useMemo(
    () =>
      circle(center, radiusKm, {
        steps: 80,
        units: 'kilometers' as const,
      }),
    [center[0], center[1], radiusKm],
  );

  // ── Expanding pulse ring ──
  const pulseRadiusKm = radiusKm * pulse;
  const pulseCircle = useMemo(() => {
    if (pulseRadiusKm < 0.0001) return null;
    return circle(center, pulseRadiusKm, {
      steps: 64,
      units: 'kilometers' as const,
    });
  }, [center[0], center[1], pulseRadiusKm]);

  // Fade out as the pulse expands
  const pulseFillOpacity = 0.12 * (1 - pulse);
  const pulseLineOpacity = 0.7 * (1 - pulse);
  const pulseLineWidth = 1.5 + pulse * 1.5; // Gets thicker as it grows

  return (
    <>
      {/* ── Static radius zone ── */}
      <GeoJSONSource id="radiusSource" data={mainCircle}>
        {/* Translucent fill */}
        <Layer
          id="radiusFill"
          type="fill"
          paint={{
            'fill-color': '#E2817B',
            'fill-opacity': 0.06,
          }}
        />
        {/* Soft border */}
        <Layer
          id="radiusBorder"
          type="line"
          paint={{
            'line-color': '#E2817B',
            'line-width': 1.5,
            'line-opacity': 0.35,
          }}
        />
      </GeoJSONSource>

      {/* ── Radiating pulse ring ── */}
      {pulseCircle && (
        <GeoJSONSource id="pulseSource" data={pulseCircle}>
          {/* Fading fill as it expands */}
          <Layer
            id="pulseFill"
            type="fill"
            paint={{
              'fill-color': '#E2817B',
              'fill-opacity': pulseFillOpacity,
            }}
          />
          {/* Glowing expanding border */}
          <Layer
            id="pulseBorder"
            type="line"
            paint={{
              'line-color': '#E2817B',
              'line-width': pulseLineWidth,
              'line-opacity': pulseLineOpacity,
              'line-blur': 4,
            }}
          />
        </GeoJSONSource>
      )}
    </>
  );
}
