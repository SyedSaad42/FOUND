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

const AVATAR_IMAGES: Record<string, any> = {
  sheep:    require('../../assets/user-avatar.png'),
  hamster:  require('../../assets/user-avatar-pig.png'),
  bear:     require('../../assets/user-avatar-bear.png'),
  cat:      require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth:    require('../../assets/user-avatar-sloth.png'),
};

const heartImg = require('../../assets/heart.png');

interface HeartReceivedScreenProps {
  matchId: string;
  fromUserId: string;
  expiresAt: number;
  onClose: () => void;
  onAccept?: () => void;
}

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

  // ── Listen for match status changes ──
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      const data = snap.data();
      if (data?.status === 'cancelled') onClose();
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

  const minutes   = Math.floor(timeLeft / 60);
  const seconds   = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.overlay}>

      {/* Title */}
      <Text style={styles.title}>
        {senderProfile.name || 'Someone'} just{'\n'}winked at you! 😉
      </Text>

      {/* Avatar + heart combo */}
      <View style={styles.avatarArea}>
        <Image
          source={AVATAR_IMAGES[senderProfile.avatar] ?? AVATAR_IMAGES.sheep}
          style={styles.avatarImage}
        />
        <Image source={heartImg} style={styles.heartOverlay} />
      </View>

      {/* Timer */}
      <Text style={styles.timer}>{timeString}</Text>

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
    backgroundColor: '#BD2C3D',            // ✅ changed from #C0392B
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontFamily: 'Unbounded-SemiBold',      // ✅ changed
    color: '#ffffff',
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 30,
  },
  avatarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  timer: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 40,
    letterSpacing: 1,
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
    fontFamily: 'InstrumentSans-Medium',   // ✅ changed
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
});