import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface MatchNotification {
  matchId: string;
  fromUserId: string;
  createdAt: Date | null;
}

/**
 * Listens for incoming match notifications in real-time.
 *
 * When another user "catches" the current user, a document is written
 * to the `matches` collection. This hook listens for new matches
 * where `toUserId == currentUserId` and surfaces them as notifications.
 *
 * Returns the latest unseen match (if any) and a function to dismiss it.
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
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Look for new (unseen) matches
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const matchId = change.doc.id;

            // Skip if already seen
            if (seenMatchIds.current.has(matchId)) return;
            seenMatchIds.current.add(matchId);

            const data = change.doc.data();
            const createdAt = data.createdAt as Timestamp | null;

            setPendingMatch({
              matchId,
              fromUserId: data.fromUserId,
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
