import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export interface UserCoords {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

interface UseUserLocationResult {
  coords: UserCoords | null;
  error: string | null;
  permissionGranted: boolean;
}

/**
 * Custom hook that requests foreground location permissions and
 * subscribes to real-time GPS updates via expo-location.
 *
 * Returns the latest coordinates, heading, accuracy, and any error.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Request foreground permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) {
            setError('Location permission was denied. Please enable it in Settings.');
            setPermissionGranted(false);
          }
          return;
        }

        if (isMounted) {
          setPermissionGranted(true);
          setError(null);
        }

        // Get initial position immediately so the map can render right away
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setCoords({
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            heading: initialLocation.coords.heading ?? null,
            accuracy: initialLocation.coords.accuracy ?? null,
          });
        }

        // Start watching position for real-time updates
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,     // Update at most every 1 second
            distanceInterval: 3,    // Or every 3 meters moved
          },
          (location) => {
            if (isMounted) {
              setCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading ?? null,
                accuracy: location.coords.accuracy ?? null,
              });
            }
          }
        );
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'An unknown location error occurred.'
          );
        }
      }
    })();

    // Cleanup: remove the subscription when the component unmounts
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return { coords, error, permissionGranted };
}
