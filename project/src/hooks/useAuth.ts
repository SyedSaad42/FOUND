import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';

interface UseAuthResult {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Handles anonymous Firebase authentication.
 *
 * - Signs in anonymously on first launch
 * - Persists the session across app restarts (via AsyncStorage)
 * - Returns the user object and userId for Firestore operations
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes (fires immediately if already signed in)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Already signed in
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // No user — sign in anonymously
        try {
          const credential = await signInAnonymously(auth);
          setUser(credential.user);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to authenticate.',
          );
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userId: user?.uid ?? null,
    isLoading,
    error,
  };
}
