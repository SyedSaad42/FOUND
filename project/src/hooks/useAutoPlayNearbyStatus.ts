import { useEffect, useRef } from 'react';
import type { NearbyUser } from './useNearbyUsers';
import { playMessageInVoice } from '../utils/tts';

/**
 * Watches nearby users for status changes and automatically plays them
 * via ElevenLabs TTS.
 *
 * - Skips the initial snapshot so existing statuses don't all play at once
 * - Only plays when a user's status changes to a NEW non-empty value
 * - Queues messages so they don't overlap
 */
export function useAutoPlayNearbyStatus(users: NearbyUser[]) {
  // Map of userId -> last known status
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  useEffect(() => {
    // On first render, seed the map with current statuses without playing
    if (!initializedRef.current) {
      const map = new Map<string, string>();
      users.forEach((u) => {
        map.set(u.userId, u.status ?? '');
      });
      prevStatusRef.current = map;
      initializedRef.current = true;
      return;
    }

    // Detect status changes
    const prev = prevStatusRef.current;
    const next = new Map<string, string>();

    users.forEach((u) => {
      const newStatus = u.status ?? '';
      const oldStatus = prev.get(u.userId) ?? '';
      next.set(u.userId, newStatus);

      // Only play if status changed to a non-empty value
      if (newStatus && newStatus !== oldStatus) {
        queueRef.current.push(newStatus);
      }
    });

    prevStatusRef.current = next;

    // Process the queue
    processQueue();
  }, [users]);

  async function processQueue() {
    if (playingRef.current) return;
    if (queueRef.current.length === 0) return;

    playingRef.current = true;

    while (queueRef.current.length > 0) {
      const message = queueRef.current.shift()!;
      try {
        await playMessageInVoice(message);
      } catch (err) {
        console.warn('[AutoPlayStatus] TTS failed:', err);
      }
    }

    playingRef.current = false;
  }
}
