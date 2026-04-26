import React, { useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { useAuth } from './src/hooks/useAuth';
import MapScreen from './src/screens/MapScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

// ────────────────────────────────────────────
// App Root
// ────────────────────────────────────────────
export default function App() {
  const { userId, isLoading, error } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [fontsLoaded] = useFonts({
    'Unbounded': require('./assets/Unbounded-VariableFont_wght.ttf'),
    'Unbounded-ExtraBold': require('./assets/Unbounded-ExtraBold.ttf'),
    'Unbounded-SemiBold': require('./assets/Unbounded-SemiBold.ttf'),
    'Unbounded-Medium': require('./assets/Unbounded-Medium.ttf'),
    'InstrumentSerif': require('./assets/InstrumentSerif-Regular.ttf'),
    'InstrumentSans': require('./assets/InstrumentSans-Regular.ttf'),
  });

  // ── Font / Auth loading state ──
  if (isLoading || !fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  // ── Auth error state ──
  if (error || !userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠️ {error ?? 'Authentication failed.'}</Text>
      </View>
    );
  }

  if (showWelcome) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF5F0" />
        <WelcomeScreen onStart={() => setShowWelcome(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      <MapScreen userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#00e5ff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 15,
    textAlign: 'center',
  },
});
