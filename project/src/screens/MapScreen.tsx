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
import * as Location from 'expo-location';
import { useUserLocation } from '../hooks/useUserLocation';
import { useBroadcastLocation } from '../hooks/useBroadcastLocation';
import { useNearbyUsers } from '../hooks/useNearbyUsers';
import { useMatchNotifications } from '../hooks/useMatchNotifications';
import { useAutoPlayNearbyStatus } from '../hooks/useAutoPlayNearbyStatus';
import { useProfile } from '../hooks/useProfile';
import { haversineDistance } from '../utils/geo';

import RadiusCircle from '../components/RadiusCircle';
import NearbyUserMarkers from '../components/NearbyUserMarkers';
import HeartReceivedScreen from './HeartReceivedScreen';
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

// Avatar image map — keys match profile.avatar values (used for map markers)
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  hamster: require('../../assets/user-avatar-pig.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

// 3D avatar images — used for profile display (bottom bar, etc.)
const AVATAR_3D: Record<string, any> = {
  sheep: require('../../assets/sheep.png'),
  hamster: require('../../assets/hamster.png'),
  bear: require('../../assets/bear.png'),
  cat: require('../../assets/cat.png'),
  platypus: require('../../assets/platypus.png'),
  sloth: require('../../assets/sloth.png'),
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
  const [locationName, setLocationName] = useState('');

  // ── Location ──
  const { coords, error } = useUserLocation();
  const userCenter: [number, number] = coords
    ? [coords.longitude, coords.latitude]
    : [0, 0];

  // ── Profile ──
  const { profile } = useProfile(userId);

  // ── Reverse geocode to get location name ──
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    }).then((results) => {
      if (cancelled || results.length === 0) return;
      const r = results[0];
      const parts = [
        r.name,
        r.street,
        r.city,
        r.region,
        r.postalCode,
        r.country,
      ].filter(Boolean);
      setLocationName(parts.join(', '));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [coords?.latitude, coords?.longitude]);

  // ── Firebase hooks ──
  useBroadcastLocation(userId, coords, statusMessage, profile.avatar, profile.name);
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

  // ── Auto-play nearby users' status messages via TTS ──
  useAutoPlayNearbyStatus(interactionUsers);

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

        {/* Nearby users rendered first so current user marker appears on top */}
        <NearbyUserMarkers users={interactionUsers} onUserPress={handleUserPress} />

        {/* Current user marker with status bubble + "You" label */}
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
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>You</Text>
            </View>
          </View>
        </Marker>

        {/* Current user glow (stays as Layer for smooth movement) */}
        <GeoJSONSource id="userDotSource" data={userPointGeoJSON}>
          <Layer
            id="userDotGlow"
            type="circle"
            paint={{
              'circle-radius': 22,
              'circle-color': 'rgba(226, 129, 123, 0.15)',
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Brown tint overlay */}
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* Top location tab */}
      {!!locationName && (
        <View style={styles.locationTab}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            Currently at {locationName}
          </Text>
        </View>
      )}

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Left: Profile — avatar stacked above name row */}
        <TouchableOpacity
          style={styles.bottomProfile}
          activeOpacity={0.8}
          onPress={() => setShowProfile(true)}
        >
          <Image
            source={AVATAR_3D[profile.avatar] ?? AVATAR_3D.sheep}
            style={styles.bottomAvatarImage}
          />
          <View style={styles.bottomNameRow}>
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

        {/* Right: Action buttons in a rounded box */}
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
            <Text style={styles.bottomActionLabel}>Nearby people</Text>
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
            <Text style={styles.bottomActionLabel}>Note</Text>
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
          distance={(() => {
            const u = interactionUsers.find((u) => u.userId === selectedUserId);
            return u ? haversineDistance(coords.latitude, coords.longitude, u.lat, u.lng) : 0;
          })()}
          onClose={handleCatchClose}
        />
      )}

      {/* Heart Received Screen */}
      {pendingMatch && (
        <HeartReceivedScreen
          matchId={pendingMatch.matchId}
          fromUserId={pendingMatch.fromUserId}
          expiresAt={pendingMatch.expiresAt}
          onClose={dismissMatch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#301F1A',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(48, 31, 26, 0.25)',
    zIndex: 1,
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
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  bottomAvatarImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  bottomNameRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  bottomProfileName: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 22,
  },
  bottomPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomPill: {
    backgroundColor: 'rgba(189, 44, 61, 0.46)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bottomPillText: {
    fontFamily: 'InstrumentSans',
    color: '#ffffff',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 18,
    backgroundColor: 'rgba(189, 44, 61, 0.46)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bottomActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#ffffff',
    marginBottom: 2,
  },
  bottomActionLabel: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Top Location Tab ──
  locationTab: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(189, 44, 61, 0.46)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '85%',
    zIndex: 20,
  },
  locationPin: {
    fontSize: 18,
    marginRight: 8,
  },
  locationText: {
    fontFamily: 'InstrumentSerif',
    color: '#ffffff',
    fontSize: 13,
    flexShrink: 1,
  },

  // ── User Marker & Bubble ──
  youPill: {
    backgroundColor: 'rgba(189, 44, 61, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  youPillText: {
    fontFamily: 'InstrumentSans',
    color: '#ffffff',
    fontSize: 14,
  },
  userMarkerContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarImage: {
    width: 64,
    height: 64,
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
