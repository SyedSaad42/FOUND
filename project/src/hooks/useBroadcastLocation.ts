import { useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { AppState, type AppStateStatus } from 'react-native';
import { db } from '../config/firebase';
import type { UserCoords } from './useUserLocation';

// Minimum time between Firestore writes (milliseconds)
const THROTTLE_MS = 3000;

/**
 * Broadcasts the current user's location to Firestore in real-time.
 *
 * - Writes to `locations/{userId}` whenever coords change
 * - Throttled to max 1 write per 3 seconds (saves Firestore quota)
 * - Sets `isOnline: false` when app goes to background
 * - Deletes the document when the component truly unmounts
 */
export function useBroadcastLocation(
  userId: string | null,
  coords: UserCoords | null,
  status?: string,
  avatar?: string,
  name?: string,
) {
  const lastWriteRef = useRef(0);

  // Store userId in a ref so cleanup can access the latest value
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Write location on coordinate changes ──
  useEffect(() => {
    if (!userId || !coords) return;

    const now = Date.now();
    if (now - lastWriteRef.current < THROTTLE_MS) return;

    lastWriteRef.current = now;

    const docRef = doc(db, 'locations', userId);
    setDoc(
      docRef,
      {
        lat: coords.latitude,
        lng: coords.longitude,
        heading: coords.heading,
        isOnline: true,
        status: status ?? '',
        avatar: avatar ?? 'sheep',
        name: name ?? '',
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    ).catch((err) => {
      console.warn('[BroadcastLocation] Write failed:', err);
    });
  }, [userId, coords?.latitude, coords?.longitude, status, avatar, name]);

  // ── Handle app state changes (background/foreground) ──
  useEffect(() => {
    if (!userId) return;

    const handleAppState = (nextState: AppStateStatus) => {
      const docRef = doc(db, 'locations', userId);
      if (nextState === 'active') {
        setDoc(docRef, { isOnline: true, lastUpdated: serverTimestamp() }, { merge: true }).catch(
          () => {},
        );
      } else {
        setDoc(docRef, { isOnline: false, lastUpdated: serverTimestamp() }, { merge: true }).catch(
          () => {},
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [userId]);

  // ── Cleanup on TRUE unmount only ──
  useEffect(() => {
    return () => {
      const uid = userIdRef.current;
      if (uid) {
        const docRef = doc(db, 'locations', uid);
        setDoc(docRef, { isOnline: false, lastUpdated: serverTimestamp() }, { merge: true }).catch(
          () => {},
        );
      }
    };
  }, []); // Empty deps = only runs cleanup on unmount
}
