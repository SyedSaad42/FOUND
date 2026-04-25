import React, { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { NearbyUser } from '../hooks/useNearbyUsers';

interface NearbyUserMarkersProps {
  users: NearbyUser[];
}

/**
 * Renders other users on the map as magenta/pink dots.
 *
 * Uses a single GeoJSONSource with a FeatureCollection containing all
 * nearby users, rendered as native CircleLayers for performance.
 * Styled in magenta to distinguish from the current user's cyan dot.
 */
export default function NearbyUserMarkers({ users }: NearbyUserMarkersProps) {
  // Build a GeoJSON FeatureCollection from all nearby users
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: users.map((user) => ({
        type: 'Feature' as const,
        id: user.userId,
        geometry: {
          type: 'Point' as const,
          coordinates: [user.lng, user.lat],
        },
        properties: {
          userId: user.userId,
        },
      })),
    }),
    [users],
  );

  if (users.length === 0) return null;

  return (
    <GeoJSONSource id="nearbyUsersSource" data={geoJSON}>
      {/* Outer glow ring — magenta */}
      <Layer
        id="nearbyUsersGlow"
        type="circle"
        paint={{
          'circle-radius': 14,
          'circle-color': 'rgba(255, 64, 129, 0.12)',
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255, 64, 129, 0.5)',
        }}
      />
      {/* Inner solid dot — magenta with white border */}
      <Layer
        id="nearbyUsersDot"
        type="circle"
        paint={{
          'circle-radius': 7,
          'circle-color': '#ff4081',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </GeoJSONSource>
  );
}
