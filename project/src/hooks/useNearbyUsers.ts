import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface NearbyUser {
  userId: string;
  lat: number;
  lng: number;
  heading: number | null;
  status?: string;
  avatar?: string;
}

// Users who haven't updated in this long are considered stale
const STALE_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Listens for other online users' locations from Firestore in real-time.
 *
 * - Listens to the entire `locations` collection via onSnapshot
 * - Filters out the current user, offline users, and stale entries client-side
 * - Returns an array of NearbyUser objects
 */
export function useNearbyUsers(currentUserId: string | null): NearbyUser[] {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    // Listen to ALL location documents (filter client-side for reliability)
    const locationsRef = collection(db, 'locations');

    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const now = Date.now();
        const users: NearbyUser[] = [];

        snapshot.forEach((doc) => {
          // Skip the current user
          if (doc.id === currentUserId) return;

          const data = doc.data();

          // Skip offline users
          if (data.isOnline !== true) return;

          // Skip stale users (no recent update)
          const lastUpdated = data.lastUpdated as Timestamp | null;
          if (lastUpdated) {
            const updatedMs = lastUpdated.toMillis();
            if (now - updatedMs > STALE_TIMEOUT_MS) return;
          }

          // Valid nearby user
          if (typeof data.lat === 'number' && typeof data.lng === 'number') {
            users.push({
              userId: doc.id,
              lat: data.lat,
              lng: data.lng,
              heading: data.heading ?? null,
              status: data.status ?? '',
              avatar: data.avatar ?? 'sheep',
            });
          }
        });

        setNearbyUsers(users);
      },
      (err) => {
        console.warn('[NearbyUsers] Listener error:', err);
      },
    );

    return () => unsubscribe();
  }, [currentUserId]);

  return nearbyUsers;
}
