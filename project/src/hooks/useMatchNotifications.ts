import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Lazy-load expo-notifications to avoid crash when native module is missing (Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[MatchNotifications] Notifications not available:', e);
  Notifications = null;
}

export interface MatchNotification {
  matchId: string;
  fromUserId: string;
  expiresAt: number;   // epoch ms
  createdAt: Date | null;
}

/**
 * Listens for incoming pending match notifications in real-time.
 *
 * When another user "catches" the current user, a document is written
 * to the `matches` collection with status 'pending'. This hook surfaces
 * the latest pending match so the receiver can accept or let it expire.
 */
export function useMatchNotifications(currentUserId: string | null) {
  const [pendingMatch, setPendingMatch] = useState<MatchNotification | null>(null);
  const seenMatchIds = useRef(new Set<string>());

  useEffect(() => {
    if (!currentUserId) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('toUserId', '==', currentUserId),
      where('status', '==', 'pending'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const matchId = change.doc.id;

            // Skip if already seen
            if (seenMatchIds.current.has(matchId)) return;
            seenMatchIds.current.add(matchId);

            const data = change.doc.data();
            const expiresAt = data.expiresAt as Timestamp | null;
            const expiresMs = expiresAt?.toMillis() ?? 0;

            // Skip if already expired
            if (expiresMs <= Date.now()) return;

            const createdAt = data.createdAt as Timestamp | null;

            // Fire a local push notification (skip if native module unavailable)
            if (Notifications) {
              try {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: '💕 Found',
                    body: 'Someone winked at you! Find the culprit!',
                    sound: true,
                  },
                  trigger: null, // immediately
                }).catch((err) =>
                  console.warn('[MatchNotifications] Notification error:', err),
                );
              } catch (e) {
                // Expo Go — no native push support
              }
            }

            setPendingMatch({
              matchId,
              fromUserId: data.fromUserId,
              expiresAt: expiresMs,
              createdAt: createdAt?.toDate() ?? null,
            });
          }
        });
      },
      (err) => {
        console.warn('[MatchNotifications] Listener error:', err);
      },
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const dismissMatch = () => {
    setPendingMatch(null);
  };

  return { pendingMatch, dismissMatch };
}
