import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
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
import { useProfile } from '../hooks/useProfile';
import { haversineDistance } from '../utils/geo';

import RadiusCircle from '../components/RadiusCircle';
import NearbyUserMarkers from '../components/NearbyUserMarkers';
import MatchPopup from '../components/MatchPopup';
import CatchScreen from './CatchScreen';
import ProfileScreen from './ProfileScreen';
import NearbyTracker from '../components/NearbyTracker';
import StatusMessageButton from '../components/StatusMessageButton';
import DirectionArrow from '../components/DirectionArrow';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
const FOLLOW_ZOOM_LEVEL = 17;
const RADIUS_METERS = 50;
const TRACKING_RANGE_METERS = 1000;

// CARTO Dark Matter — free, no API key required
const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Avatar image map — keys match profile.avatar values
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  beaver: require('../../assets/user-avatar-beaver.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  pig: require('../../assets/user-avatar-pig.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────
interface MapScreenProps {
  userId: string;
}

/**
 * MapScreen — the core game-like view.
 */
export default function MapScreen({ userId }: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);

  // ── States ──
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [trackedUserId, setTrackedUserId] = useState<string | null>(null);

  // ── Location ──
  const { coords, error } = useUserLocation();
  const userCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : [0, 0];

  // ── Profile ──
  const { profile } = useProfile(userId);

  // ── Firebase hooks ──
  useBroadcastLocation(userId, coords, statusMessage, profile.avatar);
  const allOnlineUsers = useNearbyUsers(userId);

  // ── Compute Distances & Filter ──
  const { interactionUsers, trackerUsers } = useMemo(() => {
    const interaction: typeof allOnlineUsers = [];
    const tracker: Array<(typeof allOnlineUsers)[0] & { distance: number }> = [];

    if (!coords) return { interactionUsers: interaction, trackerUsers: tracker };

    allOnlineUsers.forEach((u) => {
      const dist = haversineDistance(coords.latitude, coords.longitude, u.lat, u.lng);
      if (dist <= RADIUS_METERS) {
        interaction.push(u);
      } else if (dist <= TRACKING_RANGE_METERS) {
        tracker.push({ ...u, distance: dist });
      }
    });

    return { interactionUsers: interaction, trackerUsers: tracker };
  }, [allOnlineUsers, coords?.latitude, coords?.longitude]);

  // ── Match notifications ──
  const { pendingMatch, dismissMatch } = useMatchNotifications(userId);

  // ── Handlers ──
  const handleUserPress = useCallback((tappedUserId: string) => {
    setSelectedUserId(tappedUserId);
  }, []);

  const handleCatchClose = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const handleTrackUser = (uid: string) => {
    setTrackedUserId(uid);
  };

  const trackedUser = useMemo(() =>
    trackerUsers.find(u => u.userId === trackedUserId),
    [trackerUsers, trackedUserId]
  );

  // Clear tracking if user goes out of range or offline
  useEffect(() => {
    if (trackedUserId && !trackedUser) {
      setTrackedUserId(null);
    }
  }, [trackedUser, trackedUserId]);

  // ── Permission denied state ──────────────────
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorIcon}>📍</Text>
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorMessage}>{error}</Text>
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

        {/* Only users within the 50m radius are "catchable" dots */}
        <NearbyUserMarkers users={interactionUsers} onUserPress={handleUserPress} />

        {/* Current user avatar */}
        <Marker lngLat={userCenter}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <Image
              source={AVATAR_IMAGES[profile.avatar] ?? AVATAR_IMAGES.sheep}
              style={styles.avatarImage}
            />
          </View>
        </Marker>
      </Map>

      {/* Top Profile Bar */}
      <TouchableOpacity
        style={styles.profileTab}
        onPress={() => setShowProfile(true)}
      >
        <View style={styles.profileAvatar}>
          <Image
            source={AVATAR_IMAGES[profile.avatar] ?? AVATAR_IMAGES.sheep}
            style={styles.profileAvatarImage}
          />
        </View>
        <Text style={styles.profileName}>{profile.name || 'Set Profile'}</Text>
      </TouchableOpacity>

      {/* Status Message Button */}
      <StatusMessageButton
        currentMessage={statusMessage}
        onMessageChange={setStatusMessage}
      />

      {/* Nearby Tracker (for users 50m - 1km away) */}
      <NearbyTracker
        users={trackerUsers}
        userLat={coords.latitude}
        userLng={coords.longitude}
        onTrackUser={handleTrackUser}
      />

      {/* Directional Arrow (when tracking someone) */}
      {trackedUser && (
        <DirectionArrow
          userLat={coords.latitude}
          userLng={coords.longitude}
          userHeading={coords.heading}
          targetLat={trackedUser.lat}
          targetLng={trackedUser.lng}
          distance={trackedUser.distance}
          onDismiss={() => setTrackedUserId(null)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileScreen userId={userId} onClose={() => setShowProfile(false)} />
      )}

      {/* Catch Screen Overlay */}
      {selectedUserId && (
        <CatchScreen
          targetUserId={selectedUserId}
          currentUserId={userId}
          onClose={handleCatchClose}
        />
      )}

      {/* Match Notification Popup */}
      {pendingMatch && (
        <MatchPopup onDismiss={dismissMatch} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  map: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  errorMessage: { color: '#ff6b6b', fontSize: 15, textAlign: 'center' },
  loadingText: { color: '#00e5ff', fontSize: 16, marginTop: 16 },

  // Profile Tab
  profileTab: {
    position: 'absolute',
    top: 50,
    left: 16,
    maxWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    paddingRight: 16,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    zIndex: 20,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00e5ff22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  profileAvatarImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  profileName: { color: '#fff', fontWeight: '600', fontSize: 14 },

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
