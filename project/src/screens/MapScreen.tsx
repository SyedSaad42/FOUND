import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Map,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { useUserLocation } from '../hooks/useUserLocation';
import { useBroadcastLocation } from '../hooks/useBroadcastLocation';
import { useNearbyUsers } from '../hooks/useNearbyUsers';
import { useMatchNotifications } from '../hooks/useMatchNotifications';
import { haversineDistance } from '../utils/geo';
import RadiusCircle from '../components/RadiusCircle';
import NearbyUserMarkers from '../components/NearbyUserMarkers';
import NearbyTracker from '../components/NearbyTracker';
import DirectionArrow from '../components/DirectionArrow';
import MatchPopup from '../components/MatchPopup';
import CatchScreen from './CatchScreen';
import ProfileScreen from './ProfileScreen';
import { useProfile } from '../hooks/useProfile';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
const FOLLOW_ZOOM_LEVEL = 17;
const RADIUS_METERS = 50;
const TRACKER_MAX_METERS = 1000; // 1km max range for tracker

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
 * - Users within 50m appear on the map as tappable markers → catch screen
 * - Users 50m–1km appear in the "Nearby Tracker" bar (bottom-right)
 * - Tapping a tracked user shows a directional arrow overlay
 */
export default function MapScreen({ userId }: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);
  const { coords, error } = useUserLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [trackedUserId, setTrackedUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Load current user's profile for the avatar button
  const { profile } = useProfile(userId);

  const handleUserPress = useCallback((tappedUserId: string) => {
    setSelectedUserId(tappedUserId);
  }, []);

  const handleCatchClose = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const handleTrackUser = useCallback((uid: string) => {
    setTrackedUserId(uid);
  }, []);

  const handleStopTracking = useCallback(() => {
    setTrackedUserId(null);
  }, []);

  // All hooks must be called before any early returns (Rules of Hooks)
  const userCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : [0, 0];

  // ── Firebase hooks ──
  useBroadcastLocation(userId, coords);
  const allNearbyUsers = useNearbyUsers(userId);

  // ── Match notifications ──
  const { pendingMatch, dismissMatch } = useMatchNotifications(userId);

  // ── Split users by distance ──
  const { withinRadius, outsideRadius } = useMemo(() => {
    if (!coords) return { withinRadius: [], outsideRadius: [] };

    const within: typeof allNearbyUsers = [];
    const outside: Array<(typeof allNearbyUsers)[0] & { distance: number }> = [];

    for (const user of allNearbyUsers) {
      const dist = haversineDistance(
        coords.latitude,
        coords.longitude,
        user.lat,
        user.lng,
      );

      if (dist <= RADIUS_METERS) {
        within.push(user);
      } else if (dist <= TRACKER_MAX_METERS) {
        outside.push({ ...user, distance: dist });
      }
      // Users > 1km are ignored
    }

    return { withinRadius: within, outsideRadius: outside };
  }, [coords?.latitude, coords?.longitude, allNearbyUsers]);

  // ── Find the tracked user's data (for the direction arrow) ──
  const trackedUser = useMemo(() => {
    if (!trackedUserId) return null;
    return outsideRadius.find((u) => u.userId === trackedUserId) ?? null;
  }, [trackedUserId, outsideRadius]);

  // Auto-clear tracking if user enters radius or goes offline
  const effectiveTrackedUser = trackedUser;
  if (trackedUserId && !trackedUser) {
    // User moved into radius or disconnected — stop tracking
    // (Can't call setState in render, so we'll handle in a useCallback)
  }

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

        {/* Users WITHIN radius — tappable markers on map */}
        <NearbyUserMarkers users={withinRadius} onUserPress={handleUserPress} />

        {/* Current user avatar */}
        <Marker lngLat={userCenter}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <Image
              source={require('../../assets/user-avatar.png')}
              style={styles.avatarImage}
            />
          </View>
        </Marker>
      </Map>

      {/* Users within radius count */}
      {withinRadius.length > 0 && (
        <View style={styles.userCountBadge}>
          <Text style={styles.userCountText}>
            {withinRadius.length} in range
          </Text>
        </View>
      )}

      {/* Pokemon Go-style nearby tracker (bottom-right) */}
      <NearbyTracker
        users={outsideRadius}
        userLat={coords.latitude}
        userLng={coords.longitude}
        onTrackUser={handleTrackUser}
      />

      {/* Profile Button (bottom-left) */}
      <View style={styles.profileBtnContainer}>
        <TouchableOpacity
          style={styles.profileBtn}
          activeOpacity={0.8}
          onPress={() => setShowProfile(true)}
        >
          <Text style={styles.profileBtnEmoji}>{profile.avatar}</Text>
        </TouchableOpacity>
      </View>

      {/* Directional arrow overlay */}
      {effectiveTrackedUser && coords && (
        <DirectionArrow
          userLat={coords.latitude}
          userLng={coords.longitude}
          userHeading={coords.heading}
          targetLat={effectiveTrackedUser.lat}
          targetLng={effectiveTrackedUser.lng}
          distance={effectiveTrackedUser.distance}
          onDismiss={handleStopTracking}
        />
      )}

      {/* Pokemon Go-style catch screen */}
      {selectedUserId && (
        <CatchScreen
          targetUserId={selectedUserId}
          currentUserId={userId}
          onClose={handleCatchClose}
        />
      )}

      {/* Match notification popup */}
      {pendingMatch && (
        <MatchPopup onDismiss={dismissMatch} />
      )}

      {/* Profile Edit Screen */}
      {showProfile && (
        <ProfileScreen
          userId={userId}
          onClose={() => setShowProfile(false)}
        />
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

  // ── In-range users badge ──
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

  // ── Profile Button ──
  profileBtnContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    zIndex: 30,
  },
  profileBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 20, 40, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileBtnEmoji: {
    fontSize: 28,
  },

  // ── User avatar on map ──
  avatarContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  avatarImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
});
