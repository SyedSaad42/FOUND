import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import type { NearbyUser } from '../hooks/useNearbyUsers';
import { haversineDistance } from '../utils/geo';

interface NearbyUserMarkersProps {
  users: NearbyUser[];
  /** Current user's position as [lng, lat] for distance calculation */
  userCenter: [number, number];
  onUserPress?: (userId: string) => void;
}

/**
 * Renders each nearby user as an individual Marker with a tappable
 * magenta dot. Uses Marker components (not CircleLayers) so that
 * each user dot is a native pressable React Native view.
 */
export default function NearbyUserMarkers({ users, userCenter, onUserPress }: NearbyUserMarkersProps) {
  if (users.length === 0) return null;

  return (
    <>
      {users.map((user) => {
        const dist = haversineDistance(
          userCenter[1], userCenter[0],
          user.lat, user.lng,
        );
        const distLabel = dist < 1000
          ? `${Math.round(dist)}m away`
          : `${(dist / 1000).toFixed(1)}km away`;

        return (
          <Marker
            key={user.userId}
            lngLat={[user.lng, user.lat]}
          >
            <TouchableOpacity
              style={styles.touchArea}
              activeOpacity={0.7}
              onPress={() => onUserPress?.(user.userId)}
            >
              {/* Distance label */}
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>{distLabel}</Text>
              </View>

              {/* Speech bubble status */}
              {!!user.status && (
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText} numberOfLines={1}>{user.status}</Text>
                  <View style={styles.bubbleTail} />
                </View>
              )}

              <View style={styles.outerRing} />
              <View style={styles.innerDot}>
                <Text style={styles.avatarEmoji}>{user.avatar ?? '🔥'}</Text>
              </View>
            </TouchableOpacity>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    width: 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Status Bubble ──
  bubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  bubbleText: {
    color: '#0a0a1a',
    fontSize: 11,
    fontWeight: '600',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },

  outerRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 64, 129, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 64, 129, 0.6)',
  },
  innerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff4081',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 14,
  },

  // ── Distance label ──
  distancePill: {
    backgroundColor: 'rgba(48, 31, 26, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  distanceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
