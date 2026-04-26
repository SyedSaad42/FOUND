import { useEffect, useRef } from 'react';
import type { NearbyUser } from './useNearbyUsers';
import { playMessageInVoice } from '../utils/tts';

/**
 * Automatically plays the TTS voice message when a nearby user
 * with a status enters the interaction radius or changes their message.
 *
 * - Tracks which (userId + status) combos have already been played
 * - Only fires for users in the `interactionUsers` list (within 50m)
 * - Debounces so messages don't pile up
 */
export function useAutoPlayNearbyStatus(interactionUsers: NearbyUser[]) {
  // Map of userId → last status that was played
  const playedRef = useRef<Map<string, string>>(new Map());
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    interactionUsers.forEach((user) => {
      if (!user.status) return;

      const lastPlayed = playedRef.current.get(user.userId);

      // Skip if we already played this exact message for this user
      if (lastPlayed === user.status) return;

      // Mark as played immediately to avoid duplicates
      playedRef.current.set(user.userId, user.status);

      // Queue playback so messages don't overlap
      queueRef.current = queueRef.current.then(() =>
        playMessageInVoice(user.status!, user.avatar).catch(() => {}),
      );
    });

    // Clean up users who left the interaction zone
    const activeIds = new Set(interactionUsers.map((u) => u.userId));
    for (const id of playedRef.current.keys()) {
      if (!activeIds.has(id)) {
        playedRef.current.delete(id);
      }
    }
  }, [interactionUsers]);
}
