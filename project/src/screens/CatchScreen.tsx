import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Avatar image map — keys match profile.avatar values
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  beaver: require('../../assets/user-avatar-beaver.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  pig: require('../../assets/user-avatar-pig.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

interface CatchScreenProps {
  /** The tapped user's ID */
  targetUserId: string;
  /** The tapped user's avatar key (e.g. 'sheep', 'beaver') */
  targetAvatar: string;
  /** The current user's ID (to record who sent the catch) */
  currentUserId: string;
  /** Called when the user dismisses or completes the catch */
  onClose: () => void;
}

type CatchState = 'idle' | 'throwing' | 'catching' | 'caught';

/**
 * Pokemon Go-style "catch" screen.
 *
 * - Shows a Charmander character with a gentle idle bounce
 * - A heart "ball" at the bottom that the user swipes up to throw
 * - Throw animation → heart flies toward Charmander
 * - Catch animation → heart shrinks + shakes → "Caught!" message
 */
export default function CatchScreen({ targetUserId, targetAvatar, currentUserId, onClose }: CatchScreenProps) {
  const [state, setState] = useState<CatchState>('idle');

  // ── Animated values ──
  const heartY = useRef(new Animated.Value(0)).current;
  const heartX = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const charBounce = useRef(new Animated.Value(0)).current;
  const catchShake = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // ── Fade in background ──
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Charmander idle bounce ──
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(charBounce, {
          toValue: -10,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(charBounce, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  // ── Swipe-up gesture for the heart ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => state === 'idle',
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -10 && state === 'idle',
      onPanResponderRelease: (_, gs) => {
        // Only trigger throw if swiped upward
        if (gs.dy < -50 && state === 'idle') {
          throwHeart();
        }
      },
    }),
  ).current;

  const throwHeart = () => {
    setState('throwing');

    // Heart flies upward toward the Charmander
    Animated.parallel([
      Animated.timing(heartY, {
        toValue: -SCREEN_H * 0.4,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0.5,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Heart reached the Charmander — start catch sequence
      setState('catching');
      heartOpacity.setValue(0);

      // Shake animation (Charmander wiggles)
      Animated.sequence([
        Animated.delay(300),
        ...Array(3)
          .fill(null)
          .flatMap(() => [
            Animated.timing(catchShake, {
              toValue: 12,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(catchShake, {
              toValue: -12,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        Animated.timing(catchShake, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]).start(() => {
        // Caught! Write match to Firestore
        setState('caught');

        // Record the match so the other user gets notified
        addDoc(collection(db, 'matches'), {
          fromUserId: currentUserId,
          toUserId: targetUserId,
          createdAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('[CatchScreen] Failed to write match:', err);
        });

        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          // Auto-close after a moment
          setTimeout(onClose, 1500);
        });
      });
    });
  };

  const handleTapThrow = () => {
    if (state === 'idle') {
      throwHeart();
    }
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      {/* Encounter label */}
      <View style={styles.encounterLabel}>
        <Text style={styles.encounterText}>A wild match appeared!</Text>
      </View>

      {/* Charmander character */}
      <Animated.View
        style={[
          styles.characterContainer,
          {
            transform: [
              { translateY: charBounce },
              { translateX: catchShake },
            ],
          },
        ]}
      >
        <Image source={AVATAR_IMAGES[targetAvatar] ?? AVATAR_IMAGES.sheep} style={styles.characterImage} />
      </Animated.View>

      {/* Heart "pokeball" */}
      {state !== 'caught' && (
        <Animated.View
          style={[
            styles.heartContainer,
            {
              transform: [
                { translateY: heartY },
                { translateX: heartX },
                { scale: heartScale },
              ],
              opacity: heartOpacity,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity onPress={handleTapThrow} activeOpacity={0.8}>
            <Text style={styles.heartEmoji}>💖</Text>
            {state === 'idle' && (
              <Text style={styles.swipeHint}>Swipe up or tap!</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Catch success message */}
      <Animated.View
        style={[styles.successContainer, { opacity: successOpacity }]}
      >
        <Text style={styles.successEmoji}>💕</Text>
        <Text style={styles.successText}>It's a match!</Text>
        <Text style={styles.successSubtext}>You caught their attention!</Text>
      </Animated.View>

      {/* Sparkle particles background */}
      {Array.from({ length: 20 }).map((_, i) => (
        <SparkleParticle key={i} index={i} />
      ))}
    </Animated.View>
  );
}

// ── Sparkle particle component ──
function SparkleParticle({ index }: { index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const left = Math.random() * SCREEN_W;
  const top = Math.random() * SCREEN_H * 0.7;
  const delay = Math.random() * 3000;
  const size = 2 + Math.random() * 4;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ff80ab',
        opacity,
        transform: [{ translateY }],
      }}
      pointerEvents="none"
    />
  );
}

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 110,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },

  encounterLabel: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 64, 129, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 64, 129, 0.4)',
  },
  encounterText: {
    color: '#ff80ab',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  characterContainer: {
    marginTop: -80,
  },
  characterImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },

  heartContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 64,
    textAlign: 'center',
  },
  swipeHint: {
    color: 'rgba(255, 128, 171, 0.6)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },

  successContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  successText: {
    color: '#ff4081',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  successSubtext: {
    color: '#ff80ab',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
  },
});
