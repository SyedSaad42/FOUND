import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserProfile {
  name: string;
  age: string;
  height: string;
  email: string;
  avatar: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: '',
  height: '',
  email: '',
  avatar: 'sheep',
};

/**
 * Reads and writes the user's profile from Firestore.
 *
 * - Loads profile from `profiles/{userId}` on mount
 * - `saveProfile()` writes updates back to Firestore
 */
export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time profile listener — keeps every useProfile instance in sync
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'profiles', userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name ?? '',
            age: data.age ?? '',
            height: data.height ?? '',
            email: data.email ?? '',
            avatar: data.avatar ?? 'sheep',
          });
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('[useProfile] Listener error:', err);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const saveProfile = async (updated: UserProfile) => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'profiles', userId), {
        ...updated,
        updatedAt: serverTimestamp(),
      });
      setProfile(updated);
    } catch (err) {
      console.warn('[useProfile] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return { profile, isLoading, isSaving, saveProfile };
}
