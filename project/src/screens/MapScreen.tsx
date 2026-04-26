import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useMatchNotifications } from '../hooks/useMatchNotifications';
import RadiusCircle from '../components/RadiusCircle';
import NearbyUserMarkers from '../components/NearbyUserMarkers';
import MatchPopup from '../components/MatchPopup';
import CatchScreen from './CatchScreen';
import GuruPage from './GuruPage';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
const FOLLOW_ZOOM_LEVEL = 17;
const RADIUS_METERS = 50;

const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapScreenProps {
  userId: string;
}

export default function MapScreen({ userId }: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);
  const { coords, error } = useUserLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showGuruPage, setShowGuruPage] = useState(false);

  // ── Use safe area insets so button clears home indicator / nav bar ──
  const insets = useSafeAreaInsets();

  const handleUserPress = useCallback((tappedUserId: string) => {
    setSelectedUserId(tappedUserId);
  }, []);

  const handleCatchClose = useCallback(() => {
    setSelectedUserId(null);
  }, []);

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

  useBroadcastLocation(userId, coords);
  const nearbyUsers = useNearbyUsers(userId);
  const { pendingMatch, dismissMatch } = useMatchNotifications(userId);

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

      {/* ── Map fills the whole screen ── */}
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}   // ← absoluteFill so overlays sit on top
        mapStyle={DARK_STYLE_URL}
        logo={false}
        attribution={false}
        compass={false}
        scaleBar={false}
      >
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

        <RadiusCircle center={userCenter} radiusMeters={RADIUS_METERS} />
        <NearbyUserMarkers users={nearbyUsers} onUserPress={handleUserPress} />

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

      {/* ── All overlays live in a separate pointer-events layer ──────
          This view sits above the Map and does NOT block map gestures
          in empty areas (pointerEvents="box-none" passes touches
          through to the map unless a child catches them).           */}
      <View style={styles.overlayLayer} pointerEvents="box-none">

        {/* Nearby users count badge */}
        {nearbyUsers.length > 0 && (
          <View style={styles.userCountBadge}>
            <Text style={styles.userCountText}>
              {nearbyUsers.length} nearby
            </Text>
          </View>
        )}

        {/* Guru button — always visible at bottom */}
        <TouchableOpacity
          style={styles.guruLauncher}
          activeOpacity={0.75}
          onPress={() => setShowGuruPage(true)}
        >
          <Text style={styles.guruLauncherText}>🧙‍♂️ Guru AI</Text>
        </TouchableOpacity>

      </View>

      {/* ── Catch screen (full-screen modal-like overlay) ── */}
      {selectedUserId && (
        <CatchScreen
          targetUserId={selectedUserId}
          currentUserId={userId}
          onClose={handleCatchClose}
        />
      )}

      {/* ── Match notification popup ── */}
      {pendingMatch && (
        <MatchPopup onDismiss={dismissMatch} />
      )}

      {/* ── Guru full-screen overlay ── */}
      {showGuruPage && (
        <View style={styles.guruOverlay}>
          <View
            style={[styles.guruOverlayHeader, { top: insets.top + 12 }]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.8}
              onPress={() => setShowGuruPage(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <GuruPage />
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

  // ── Sits above the map, passes map gestures through in empty space ──
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    // No background — fully transparent
  },

  centeredContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

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

  loadingText: {
    color: '#00e5ff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },

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

  guruLauncher: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Absolutely critical for visibility above map
    elevation: 50,
    zIndex: 9999,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  guruLauncherText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  guruOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 39, 0.97)',
    justifyContent: 'flex-start',
    zIndex: 10000,
    elevation: 25,
  },
  guruOverlayHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});