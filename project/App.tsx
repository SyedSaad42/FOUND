import React from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import MapScreen from './src/screens/MapScreen';
// 1. You need the Provider wrapper
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const { userId, isLoading, error } = useAuth();

  // 2. We define a helper so we can wrap the whole thing in the Provider below
  const renderUI = () => {
    if (isLoading) {
      return (
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </SafeAreaView>
      );
    }

    if (error || !userId) {
      return (
        <SafeAreaView style={styles.centered}>
          <Text style={styles.errorText}>⚠️ {error ?? 'Authentication failed.'}</Text>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
        <MapScreen userId={userId} />
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaProvider>
      {renderUI()}
    </SafeAreaProvider>
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