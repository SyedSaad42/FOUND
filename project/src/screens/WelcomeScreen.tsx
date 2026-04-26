import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const heartIcon = require('../../assets/hearticon.png');

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wink!</Text>
        <Text style={styles.subtitle}>Catch to match</Text>

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
    fontFamily: 'Unbounded-ExtraBold',
    fontSize: 44,
    color: '#1a1a1a',
    letterSpacing: -1,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'Unbounded-Medium',      // ✅ changed from InstrumentSerif
    fontSize: 22,
    color: '#C0392B',
    letterSpacing: 0.3,
    marginBottom: 30,
  },
  heartWrapper: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  heartImage: {
    width: 250,
    height: 250,
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
    fontFamily: 'InstrumentSans-SemiBold', // ✅ changed from Unbounded
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});