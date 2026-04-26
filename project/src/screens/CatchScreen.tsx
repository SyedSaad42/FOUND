import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useProfile } from '../hooks/useProfile';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const HEART_TIMEOUT_SECONDS = 90;

// Full user avatar images
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  hamster: require('../../assets/user-avatar-pig.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

const heartImg = require('../../assets/heart.png');
const heartCircleImg = require('../../assets/heart-circle.png');
const catchBg = require('../../assets/catchbg.png');
const backBtnImg = require('../../assets/backbutton.png');

interface CatchScreenProps {
  /** The tapped user's ID */
  targetUserId: string;
  /** The tapped user's avatar key (e.g. 'sheep', 'beaver') */
  targetAvatar: string;
  /** The current user's ID (to record who sent the catch) */
  currentUserId: string;
  /** Distance to the target user in meters */
  distance: number;
  /** Called when the user dismisses or completes the catch */
  onClose: () => void;
}

type CatchState = 'idle' | 'throwing' | 'catching' | 'caught' | 'sent';

/**
 * Catch screen — swipe up a heart to "catch" a nearby user.
 *
 * - Warm pink background with target user's avatar
 * - Heart image that the user swipes up to throw
 * - On hit: heart-circle appears under avatar, then transitions to red "sent" screen
 * - Sent screen: 90s countdown, "Back out?" button, listens for acceptance
 */
export default function CatchScreen({ targetUserId, targetAvatar, currentUserId, distance, onClose }: CatchScreenProps) {
  const [state, setState] = useState<CatchState>('idle');
  const { profile: targetProfile } = useProfile(targetUserId);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(HEART_TIMEOUT_SECONDS);

  // ── Animated values ──
  const heartY = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const charBounce = useRef(new Animated.Value(0)).current;
  const catchShake = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const caughtHeartOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // ── Fade in ──
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Avatar idle bounce ──
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(charBounce, {
          toValue: -8,
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

  // ── Countdown timer (active in 'sent' state) ──
  useEffect(() => {
    if (state !== 'sent') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  // ── Listen for match status changes (acceptance / cancellation) ──
  useEffect(() => {
    if (!matchId) return;
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      const data = snap.data();
      if (data?.status === 'accepted') {
        onClose();
      }
    });
    return () => unsubscribe();
  }, [matchId]);

  // ── Swipe-up gesture ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => state === 'idle',
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -10 && state === 'idle',
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -50 && state === 'idle') {
          throwHeart();
        }
      },
    }),
  ).current;

  const throwHeart = () => {
    setState('throwing');

    Animated.parallel([
      Animated.timing(heartY, {
        toValue: -SCREEN_H * 0.35,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0.4,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState('catching');
      heartOpacity.setValue(0);

      // Shake avatar
      Animated.sequence([
        Animated.delay(200),
        ...Array(3)
          .fill(null)
          .flatMap(() => [
            Animated.timing(catchShake, {
              toValue: 10,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(catchShake, {
              toValue: -10,
              duration: 80,
              useNativeDriver: true,
            }),
          ]),
        Animated.timing(catchShake, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ]).start(() => {
        setState('caught');

        // Show heart-circle under avatar briefly
        Animated.parallel([
          Animated.timing(circleOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(caughtHeartOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // After brief display, write match and transition to sent screen
          setTimeout(() => {
            addDoc(collection(db, 'matches'), {
              fromUserId: currentUserId,
              toUserId: targetUserId,
              status: 'pending',
              expiresAt: Timestamp.fromDate(
                new Date(Date.now() + HEART_TIMEOUT_SECONDS * 1000),
              ),
              createdAt: serverTimestamp(),
            })
              .then((ref) => {
                setMatchId(ref.id);
                setState('sent');
              })
              .catch((err) => {
                console.warn('[CatchScreen] Failed to write match:', err);
                onClose();
              });
          }, 800);
        });
      });
    });
  };

  const handleTapThrow = () => {
    if (state === 'idle') throwHeart();
  };

  const handleBackOut = async () => {
    if (matchId) {
      try {
        await updateDoc(doc(db, 'matches', matchId), { status: 'cancelled' });
      } catch (err) {
        console.warn('[CatchScreen] Failed to cancel match:', err);
      }
    }
    onClose();
  };

  // ── SENT STATE: Red waiting screen ──────────────────
  if (state === 'sent') {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
      <View style={sentStyles.overlay}>
        <Text style={sentStyles.title}>
          You winked at{'\n'}{targetProfile.name || 'Player'}!
        </Text>
        <Image source={heartImg} style={sentStyles.heartImage} />
        <Text style={sentStyles.timerText}>
          They have {timeString}s{'\n'}left to respond.
        </Text>
        <TouchableOpacity
          style={sentStyles.backOutBtn}
          onPress={handleBackOut}
          activeOpacity={0.8}
        >
          <Text style={sentStyles.backOutText}>Back out?</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── CATCH STATES: idle / throwing / catching / caught ──
  return (
    <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
      <ImageBackground source={catchBg} style={styles.bgImage} resizeMode="cover">
        {/* Decorative circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />

        {/* Top bar: pin + distance */}
        <View style={styles.topBar}>
          <Text style={styles.locationPin}>📍</Text>
          <View style={styles.distancePill}>
            <Text style={styles.distanceText}>{Math.round(distance)}m away</Text>
          </View>
        </View>

        {/* Instruction text */}
        {state === 'idle' && (
          <Text style={styles.instructionText}>
            Swipe up to{'\n'}send a heart!
          </Text>
        )}

        {/* Avatar area */}
        <View style={styles.avatarArea}>
          <Animated.View style={[styles.heartCircleWrapper, { opacity: circleOpacity }]}>
            <Image source={heartCircleImg} style={styles.heartCircleImage} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                { translateY: charBounce },
                { translateX: catchShake },
              ],
            }}
          >
            <Image
              source={AVATAR_IMAGES[targetAvatar] ?? AVATAR_IMAGES.sheep}
              style={styles.avatarImage}
            />
          </Animated.View>
          <Animated.View style={[styles.caughtHeart, { opacity: caughtHeartOpacity }]}>
            <Image source={heartImg} style={styles.caughtHeartImage} />
          </Animated.View>
        </View>

        {/* Throwable heart */}
        {state !== 'caught' && (
          <Animated.View
            style={[
              styles.heartContainer,
              {
                transform: [
                  { translateY: heartY },
                  { scale: heartScale },
                ],
                opacity: heartOpacity,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity onPress={handleTapThrow} activeOpacity={0.8}>
              {state === 'idle' && (
                <Text style={styles.swipeArrow}>↑</Text>
              )}
              <Image source={heartImg} style={styles.heartImage} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <Image source={backBtnImg} style={styles.backIcon} />
          </TouchableOpacity>

          <View style={styles.targetInfo}>
            <Text style={styles.targetName}>
              {targetProfile.name || 'Player'}
            </Text>
            <View style={styles.pillRow}>
              {!!targetProfile.gender && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{targetProfile.gender}</Text>
                </View>
              )}
              {!!targetProfile.age && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{targetProfile.age}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

// ────────────────────────────────────────────
// Catch screen styles
// ────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  bgImage: {
    flex: 1,
    alignItems: 'center',
  },

  // ── Top bar ──
  topBar: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
    zIndex: 110,
  },
  locationPin: {
    fontSize: 24,
    marginBottom: 4,
  },
  distancePill: {
    backgroundColor: '#3B2020',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  distanceText: {
    fontFamily: 'InstrumentSans-Regular',
    color: '#ffffff',
    fontSize: 15,
  },

  // ── Instruction ──
  instructionText: {
    position: 'absolute',
    top: SCREEN_H * 0.18,
    fontFamily: 'Unbounded-Medium',
    color: '#3B2020',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 34,
  },

  // ── Avatar area ──
  avatarArea: {
    position: 'absolute',
    top: SCREEN_H * 0.40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  heartCircleWrapper: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  heartCircleImage: {
    width: 220,
    height: 60,
    resizeMode: 'contain',
  },
  caughtHeart: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  caughtHeartImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },

  // ── Throwable heart ──
  heartContainer: {
    position: 'absolute',
    bottom: SCREEN_H * 0.10,
    alignItems: 'center',
  },
  heartImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  swipeArrow: {
    color: 'rgba(192, 57, 43, 0.5)',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: -6,
  },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  targetInfo: {
    alignItems: 'flex-end',
  },
  targetName: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#3B2020',
    fontSize: 28,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    backgroundColor: '#C0392B',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: {
    fontFamily: 'InstrumentSans-Regular',
    color: '#ffffff',
    fontSize: 14,
  },
  circleTopRight: {
    position: 'absolute',
    bottom: -180,
    right: -180,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 247, 236, 0.3)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -180,
    left: -180,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 247, 236, 0.3)',
  },
});

// ────────────────────────────────────────────
// Sent (waiting) screen styles
// ────────────────────────────────────────────
const sentStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#BD2C3D',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 30,
  },
  heartImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  timerText: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  backOutBtn: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    backgroundColor: '#2C1810',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  backOutText: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
