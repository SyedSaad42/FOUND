import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import type { NearbyUser } from '../hooks/useNearbyUsers';
import { formatDistance, bearingToCardinal, calcBearing } from '../utils/geo';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_H * 0.45;

interface NearbyTrackerProps {
  users: Array<NearbyUser & { distance: number }>;
  userLat: number;
  userLng: number;
  onTrackUser: (userId: string) => void;
  visible: boolean;
  onClose: () => void;
}

export default function NearbyTracker({
  users,
  userLat,
  userLng,
  onTrackUser,
  visible,
  onClose,
}: NearbyTrackerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleUserPress = (userId: string) => {
    onTrackUser(userId);
    onClose();
  };

  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  const sorted = [...users].sort((a, b) => a.distance - b.distance);

  return (
    <>
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: panelTranslateY }] },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Panel header */}
        <TouchableOpacity style={styles.panelHeader} onPress={onClose}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelTitle}>Nearby Players</Text>
          <Text style={styles.panelClose}>✕</Text>
        </TouchableOpacity>

        {/* User list */}
        <ScrollView
          style={styles.userList}
          showsVerticalScrollIndicator={false}
        >
          {sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👀</Text>
              <Text style={styles.emptyText}>No one nearby yet</Text>
              <Text style={styles.emptyHint}>Players within 1km will appear here</Text>
            </View>
          ) : (
            sorted.map((user) => {
              const bearing  = calcBearing(userLat, userLng, user.lat, user.lng);
              const cardinal = bearingToCardinal(bearing);
              const dist     = formatDistance(user.distance);

              return (
                <TouchableOpacity
                  key={user.userId}
                  style={styles.userRow}
                  onPress={() => handleUserPress(user.userId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarEmoji}>🔥</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>Player</Text>
                    <Text style={styles.userMeta}>{dist} · {cardinal}</Text>
                  </View>
                  <View style={styles.userArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {visible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 39,
  },

  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#301F1A',           // ✅ changed from rgba(14,14,30,0.97)
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 40,
    borderTopWidth: 1.5,
    borderColor: 'rgba(189, 44, 61, 0.3)', // ✅ matched to app crimson
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  panelHandle: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    left: '45%',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  panelTitle: {
    fontFamily: 'Unbounded-Regular',       // ✅ changed
    color: '#ffffff',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  panelClose: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
    padding: 4,
  },

  userList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(189, 44, 61, 0.15)',  // ✅ matched to crimson
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(189, 44, 61, 0.3)',        // ✅ matched to crimson
  },
  userAvatarEmoji: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  userMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    marginTop: 2,
  },
  userArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(189, 44, 61, 0.15)',  // ✅ matched to crimson
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#BD2C3D',                             // ✅ matched to crimson
    fontSize: 16,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: 'Unbounded-Regular',              // ✅ changed
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  emptyHint: {
    fontFamily: 'InstrumentSans',                 // ✅ changed
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});