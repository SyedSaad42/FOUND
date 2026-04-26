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
  GeoJSONSource,
  Layer,
  Marker,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { useUserLocation } from '../hooks/useUserLocation';
import { useBroadcastLocation } from '../hooks/useBroadcastLocation';
import { useNearbyUsers } from '../hooks/useNearbyUsers';
import { useMatchNotifications } from '../hooks/useMatchNotifications';
import { useProfile } from '../hooks/useProfile';
import { useAutoPlayNearbyStatus } from '../hooks/useAutoPlayNearbyStatus';
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
  const [showLeaveNote, setShowLeaveNote] = useState(false);
  const [showNearby, setShowNearby] = useState(false);

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

  // ── Auto-play TTS when a nearby user's status changes ──
  useAutoPlayNearbyStatus(allOnlineUsers);

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

        {/* Current user marker with status bubble */}
        <Marker id="currentUserMarker" lngLat={userCenter} anchor="center">
          <View style={styles.userMarkerContainer}>
            {!!statusMessage && (
              <View style={styles.bubble}>
                <Text style={styles.bubbleText} numberOfLines={1}>
                  {statusMessage}
                </Text>
                <View style={styles.bubbleTail} />
              </View>
            )}
            <Image
              source={AVATAR_IMAGES[profile.avatar] ?? AVATAR_IMAGES.sheep}
              style={styles.userAvatarImage}
            />
          </View>
        </Marker>

        {/* Current user glow (stays as Layer for smooth movement) */}
        <GeoJSONSource id="userDotSource" data={userPointGeoJSON}>
          <Layer
            id="userDotGlow"
            type="circle"
            paint={{
              'circle-radius': 22,
              'circle-color': 'rgba(0, 229, 255, 0.15)',
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Left: Profile info */}
        <TouchableOpacity
          style={styles.bottomProfile}
          activeOpacity={0.8}
          onPress={() => setShowProfile(true)}
        >
          <View style={styles.bottomAvatarCircle}>
            <Image
              source={AVATAR_IMAGES[profile.avatar] ?? AVATAR_IMAGES.sheep}
              style={styles.bottomAvatarImage}
            />
          </View>
          <View style={styles.bottomProfileInfo}>
            <Text style={styles.bottomProfileName} numberOfLines={1}>
              {profile.name || 'Set Profile'}
            </Text>
            <View style={styles.bottomPillRow}>
              {!!profile.gender && (
                <View style={styles.bottomPill}>
                  <Text style={styles.bottomPillText}>{profile.gender}</Text>
                </View>
              )}
              {!!profile.age && (
                <View style={styles.bottomPill}>
                  <Text style={styles.bottomPillText}>{profile.age}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Action buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.bottomActionBtn}
            activeOpacity={0.7}
            onPress={() => setShowNearby(true)}
          >
            <Image
              source={require('../../assets/nearby-people.png')}
              style={styles.bottomActionIcon}
            />
            <Text style={styles.bottomActionLabel}>Nearby{`\n`}people</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomActionBtn}
            activeOpacity={0.7}
            onPress={() => setShowLeaveNote(true)}
          >
            <Image
              source={require('../../assets/leave-note.png')}
              style={styles.bottomActionIcon}
            />
            <Text style={styles.bottomActionLabel}>Leave{`\n`}note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nearby Tracker (for users 50m - 1km away) */}
      <NearbyTracker
        users={trackerUsers}
        userLat={coords.latitude}
        userLng={coords.longitude}
        onTrackUser={handleTrackUser}
        visible={showNearby}
        onClose={() => setShowNearby(false)}
      />

      {/* Leave Note Modal */}
      <StatusMessageButton
        currentMessage={statusMessage}
        onMessageChange={setStatusMessage}
        visible={showLeaveNote}
        onClose={() => setShowLeaveNote(false)}
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
          targetAvatar={interactionUsers.find((u) => u.userId === selectedUserId)?.avatar ?? 'sheep'}
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

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 12,
    zIndex: 20,
  },
  bottomProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bottomAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 30, 50, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  bottomAvatarImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  bottomProfileInfo: {
    flexShrink: 1,
  },
  bottomProfileName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bottomPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomPill: {
    backgroundColor: 'rgba(200, 80, 100, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bottomPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  bottomActionIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  bottomActionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── User Marker & Bubble ──
  userMarkerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  bubble: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 120,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  bubbleText: {
    color: '#0a0a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
});
