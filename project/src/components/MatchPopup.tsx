import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

interface MatchPopupProps {
  onDismiss: () => void;
}

/**
 * "You got a match!" popup that appears when another user catches you.
 *
 * Features a slide-in animation with sparkle effects and auto-dismisses
 * after 4 seconds, or the user can tap to dismiss early.
 */
export default function MatchPopup({ onDismiss }: MatchPopupProps) {
  const slideY = useRef(new Animated.Value(-200)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Heart pulse animation (delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 400);

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      dismissWithAnimation();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const dismissWithAnimation = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY: slideY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={dismissWithAnimation}
      >
        {/* Glowing background */}
        <View style={styles.glowBg} />

        {/* Heart icon */}
        <Animated.Text
          style={[
            styles.heartIcon,
            { transform: [{ scale: heartScale }] },
          ]}
        >
          💘
        </Animated.Text>

        {/* Text */}
        <Text style={styles.title}>You got a match!</Text>
        <Text style={styles.subtitle}>Someone caught your attention 💕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  card: {
    width: SCREEN_W - 40,
    backgroundColor: 'rgba(20, 10, 30, 0.95)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff4081',
    // Android shadow
    elevation: 20,
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 64, 129, 0.08)',
  },
  heartIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: '#ff4081',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    color: '#ff80ab',
    fontSize: 15,
    fontWeight: '500',
  },
});
