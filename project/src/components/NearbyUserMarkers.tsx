import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import type { NearbyUser } from '../hooks/useNearbyUsers';
import { playMessageInVoice } from '../utils/tts';

// Avatar image map — keys match profile.avatar values
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  hamster: require('../../assets/user-avatar-pig.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

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

  const handlePress = (user: NearbyUser) => {
    if (user.status) {
      playMessageInVoice(user.status, user.avatar);
    }
    onUserPress?.(user.userId);
  };

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
            onPress={() => handlePress(user)}
          >
            {/* Speech bubble status */}
            {!!user.status && (
              <View style={styles.bubble}>
                <Text style={styles.bubbleText} numberOfLines={1}>{user.status}</Text>
                <View style={styles.bubbleTail} />
              </View>
            )}

            <Image
              source={AVATAR_IMAGES[user.avatar ?? 'sheep'] ?? AVATAR_IMAGES.sheep}
              style={styles.avatarImage}
            />
            {!!user.name && (
              <View style={styles.namePill}>
                <Text style={styles.namePillText} numberOfLines={1}>{user.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Marker>
      ))}
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

  avatarImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  namePill: {
    backgroundColor: 'rgba(189, 44, 61, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  namePillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});