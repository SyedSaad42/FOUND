import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  avatar: '🔥',
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

  // Load profile on mount
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', userId));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name ?? '',
            age: data.age ?? '',
            height: data.height ?? '',
            email: data.email ?? '',
            avatar: data.avatar ?? '🔥',
          });
        }
      } catch (err) {
        console.warn('[useProfile] Load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
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
