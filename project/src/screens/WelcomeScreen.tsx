import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const heartIcon = require('../../assets/logo.png');

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Found</Text>
        <Text style={styles.subtitle}>Catch to match!</Text>

        <View style={styles.heartWrapper}>
          <Image source={heartIcon} style={styles.heartImage} />
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={onStart}
        >
          <Text style={styles.startBtnText}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#E63946',
    letterSpacing: 0.3,
    marginBottom: 40,
  },
  heartWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  heartImage: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  startBtn: {
    width: 200,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#2B2B2B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
