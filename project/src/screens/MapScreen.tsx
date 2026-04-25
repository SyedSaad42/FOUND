import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { useUserLocation } from '../hooks/useUserLocation';
import { useBroadcastLocation } from '../hooks/useBroadcastLocation';
import { useNearbyUsers } from '../hooks/useNearbyUsers';
import RadiusCircle from '../components/RadiusCircle';
import NearbyUserMarkers from '../components/NearbyUserMarkers';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
const FOLLOW_ZOOM_LEVEL = 17;
const RADIUS_METERS = 50;

// CARTO Dark Matter — free, no API key required
const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────
interface MapScreenProps {
  userId: string;
}

/**
 * MapScreen — the core game-like view.
 *
 * Shows the current user on the map with a radius circle and broadcasts
 * their location to Firestore. Listens for nearby users and renders
 * them as magenta dots.
 */
export default function MapScreen({ userId }: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);
  const { coords, error } = useUserLocation();

  // All hooks must be called before any early returns (Rules of Hooks)
  const userCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : [0, 0];

  const userPointGeoJSON = useMemo(
    () => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: userCenter,
      },
      properties: {},
    }),
    [userCenter[0], userCenter[1]],
  );

  // ── Firebase hooks ──
  // Broadcast this user's location to Firestore
  useBroadcastLocation(userId, coords);

  // Listen for other online users
  const nearbyUsers = useNearbyUsers(userId);

  // ── Permission denied state ──────────────────
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorIcon}>📍</Text>
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>
          Please enable location permissions in your device settings.
        </Text>
      </View>
    );
  }

  // ── Loading state ────────────────────────────
  if (!coords) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={styles.loadingText}>Locating you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={DARK_STYLE_URL}
        logo={false}
        attribution={false}
        compass={false}
        scaleBar={false}
      >
        {/* Camera starts at user's location and follows with smooth animation */}
        <Camera
          initialViewState={{
            center: userCenter,
            zoom: FOLLOW_ZOOM_LEVEL,
            pitch: 45,
          }}
          trackUserLocation="heading"
          zoom={FOLLOW_ZOOM_LEVEL}
          pitch={45}
          easing="fly"
          duration={1000}
        />

        {/* Pokemon Go-style radius circle with radiating pulse */}
        <RadiusCircle center={userCenter} radiusMeters={RADIUS_METERS} />

        {/* Other online users — magenta dots */}
        <NearbyUserMarkers users={nearbyUsers} />

        {/* Current user dot — cyan with white border */}
        <GeoJSONSource id="userDotSource" data={userPointGeoJSON}>
          <Layer
            id="userDotGlow"
            type="circle"
            paint={{
              'circle-radius': 18,
              'circle-color': 'rgba(0, 229, 255, 0.12)',
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(0, 229, 255, 0.5)',
            }}
          />
          <Layer
            id="userDotCore"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': '#00e5ff',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Online users count badge */}
      {nearbyUsers.length > 0 && (
        <View style={styles.userCountBadge}>
          <Text style={styles.userCountText}>
            {nearbyUsers.length} nearby
          </Text>
        </View>
      )}
    </View>
  );
}

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },

  map: {
    flex: 1,
  },

  // ── Centered fallback screens ──
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // ── Error state ──
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorHint: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Loading state ──
  loadingText: {
    color: '#00e5ff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // ── Nearby users badge ──
  userCountBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 64, 129, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userCountText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
