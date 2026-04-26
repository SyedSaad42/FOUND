import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useProfile } from '../hooks/useProfile';

const { height: SCREEN_H } = Dimensions.get('window');

// Avatar image map — keys match profile.avatar values
const AVATAR_IMAGES: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  hamster: require('../../assets/user-avatar-pig.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

const heartImg = require('../../assets/heart.png');

interface HeartReceivedScreenProps {
  /** Firestore match document ID */
  matchId: string;
  /** The user who sent the heart */
  fromUserId: string;
  /** When the match expires (epoch ms) */
  expiresAt: number;
  /** Called to dismiss this screen */
  onClose: () => void;
  /** Called when the user accepts the heart */
  onAccept?: () => void;
}

/**
 * Shown to the user who received a heart.
 *
 * - Red background with sender name, avatar + heart, countdown
 * - "Accept?" button writes status: 'accepted' to match doc
 * - Auto-closes when timer expires or sender backs out
 */
export default function HeartReceivedScreen({
  matchId,
  fromUserId,
  expiresAt,
  onClose,
  onAccept,
}: HeartReceivedScreenProps) {
  const { profile: senderProfile } = useProfile(fromUserId);
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  );

  // ── Countdown timer ──
  useEffect(() => {
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
  }, []);

  // ── Listen for match status changes (sender backed out) ──
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      const data = snap.data();
      if (data?.status === 'cancelled') {
        onClose();
      }
    });
    return () => unsubscribe();
  }, [matchId]);

  const handleAccept = async () => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { status: 'accepted' });
    } catch (err) {
      console.warn('[HeartReceivedScreen] Failed to accept match:', err);
    }
    if (onAccept) {
      onAccept();
    } else {
      onClose();
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.overlay}>
      {/* Title */}
      <Text style={styles.title}>
        {senderProfile.name || 'Someone'} just sent{'\n'}you a heart.
      </Text>

      {/* Avatar + heart combo */}
      <View style={styles.avatarArea}>
        <Image
          source={AVATAR_IMAGES[senderProfile.avatar] ?? AVATAR_IMAGES.sheep}
          style={styles.avatarImage}
        />
        <Image source={heartImg} style={styles.heartOverlay} />
      </View>

      {/* Accept button */}
      <TouchableOpacity
        style={styles.acceptBtn}
        onPress={handleAccept}
        activeOpacity={0.8}
      >
        <Text style={styles.acceptText}>Accept?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C0392B',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 30,
  },
  avatarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  avatarImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  heartOverlay: {
    position: 'absolute',
    top: -10,
    right: -30,
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  acceptBtn: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    backgroundColor: '#2C1810',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
