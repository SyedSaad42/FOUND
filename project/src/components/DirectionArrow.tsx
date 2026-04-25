import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { calcBearing, formatDistance } from '../utils/geo';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ARROW_SIZE = 60;

interface DirectionArrowProps {
  /** Current user's latitude */
  userLat: number;
  /** Current user's longitude */
  userLng: number;
  /** Current user's compass heading (degrees, 0=N) */
  userHeading: number | null;
  /** Target user's latitude */
  targetLat: number;
  /** Target user's longitude */
  targetLng: number;
  /** Distance to target in meters */
  distance: number;
  /** Called when user dismisses the arrow */
  onDismiss: () => void;
}

/**
 * Full-screen directional arrow overlay.
 *
 * Shows a large arrow pointing from the user toward the tracked user.
 * The arrow rotates in real-time as the user moves/turns.
 * Displays distance below the arrow.
 */
export default function DirectionArrow({
  userLat,
  userLng,
  userHeading,
  targetLat,
  targetLng,
  distance,
  onDismiss,
}: DirectionArrowProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Gentle pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 0.95,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Calculate the arrow rotation
  // Bearing: absolute direction from user to target (0=N)
  // Heading: direction the phone is facing (0=N)
  // Arrow rotation = bearing - heading (relative to phone orientation)
  const bearing = calcBearing(userLat, userLng, targetLat, targetLng);
  const heading = userHeading ?? 0;
  const rotation = bearing - heading;

  const dist = formatDistance(distance);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeIn }]}
      pointerEvents="box-none"
    >
      {/* Arrow container — centered on screen */}
      <View style={styles.arrowContainer}>
        <Animated.View
          style={[
            styles.arrowWrapper,
            {
              transform: [
                { rotate: `${rotation}deg` },
                { scale: pulseScale },
              ],
            },
          ]}
        >
          {/* Arrow shape */}
          <View style={styles.arrowHead} />
          <View style={styles.arrowStem} />
        </Animated.View>

        {/* Distance label */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{dist} away</Text>
        </View>
      </View>

      {/* Dismiss button */}
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
        <Text style={styles.dismissText}>✕ Stop Tracking</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ARROW_SIZE * 2,
    height: ARROW_SIZE * 2,
  },

  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ff4081',
    // Drop shadow
    elevation: 10,
  },

  arrowStem: {
    width: 12,
    height: 24,
    backgroundColor: '#ff4081',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -2,
    elevation: 10,
  },

  distanceBadge: {
    marginTop: 20,
    backgroundColor: 'rgba(14, 14, 30, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 64, 129, 0.4)',
  },
  distanceText: {
    color: '#ff80ab',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  dismissBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(14, 14, 30, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
