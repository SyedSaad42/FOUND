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
  /** Users outside the interaction radius but within 1km */
  users: Array<NearbyUser & { distance: number }>;
  /** Current user's latitude */
  userLat: number;
  /** Current user's longitude */
  userLng: number;
  /** Called when the user selects someone to track */
  onTrackUser: (userId: string) => void;
  /** Whether the panel is visible */
  visible: boolean;
  /** Called to close the panel */
  onClose: () => void;
}

/**
 * Pokemon Go-style "Nearby" tracker bar.
 *
 * - Collapsed: Small pill in bottom-right with count
 * - Expanded: Slide-up panel listing users with distance + direction
 * - Tapping a user starts directional tracking
 */
export default function NearbyTracker({
  users,
  userLat,
  userLng,
  onTrackUser,
  visible,
  onClose,
}: NearbyTrackerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate panel in/out based on visible prop
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

  // Sort by distance (closest first)
  const sorted = [...users].sort((a, b) => a.distance - b.distance);

  return (
    <>
      {/* ── Expanded panel (slide-up) ── */}
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
              const bearing = calcBearing(userLat, userLng, user.lat, user.lng);
              const cardinal = bearingToCardinal(bearing);
              const dist = formatDistance(user.distance);

              return (
                <TouchableOpacity
                  key={user.userId}
                  style={styles.userRow}
                  onPress={() => handleUserPress(user.userId)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarEmoji}>🔥</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>Player</Text>
                    <Text style={styles.userMeta}>
                      {dist} · {cardinal}
                    </Text>
                  </View>

                  {/* Direction arrow */}
                  <View style={styles.userArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {/* ── Backdrop when expanded ── */}
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
  // ── Backdrop ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 39,
  },

  // ── Expanded panel ──
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: 'rgba(14, 14, 30, 0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 40,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 64, 129, 0.3)',
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
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  panelClose: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
    padding: 4,
  },

  // ── User list ──
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
    backgroundColor: 'rgba(255, 64, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 64, 129, 0.3)',
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
    backgroundColor: 'rgba(255, 64, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#ff4081',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Empty state ──
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 6,
  },
});
