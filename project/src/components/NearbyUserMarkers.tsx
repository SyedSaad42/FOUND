import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import type { NearbyUser } from '../hooks/useNearbyUsers';

interface NearbyUserMarkersProps {
  users: NearbyUser[];
  onUserPress?: (userId: string) => void;
}

/**
 * Renders each nearby user as an individual Marker with a tappable
 * magenta dot. Uses Marker components (not CircleLayers) so that
 * each user dot is a native pressable React Native view.
 */
export default function NearbyUserMarkers({ users, onUserPress }: NearbyUserMarkersProps) {
  if (users.length === 0) return null;

  return (
    <>
      {users.map((user) => (
        <Marker
          key={user.userId}
          lngLat={[user.lng, user.lat]}
        >
          <TouchableOpacity
            style={styles.touchArea}
            activeOpacity={0.7}
            onPress={() => onUserPress?.(user.userId)}
          >
            <View style={styles.outerRing} />
            <View style={styles.innerDot} />
          </TouchableOpacity>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 64, 129, 0.15)',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 64, 129, 0.6)',
  },
  innerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4081',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 8,
  },
});
