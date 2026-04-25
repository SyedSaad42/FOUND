import { initializeApp } from 'firebase/app';
// @ts-ignore — getReactNativePersistence exists at runtime; TS can't resolve the RN entry point
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────
// Firebase Configuration
// ────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyA6zV_rAsI0z4mkFGjRSvYp2ZlqwwdaEO4',
  authDomain: 'pokedat.firebaseapp.com',
  projectId: 'pokedat',
  storageBucket: 'pokedat.firebasestorage.app',
  messagingSenderId: '936614858894',
  appId: '1:936614858894:web:3db874ffc44862098f39df',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence (stays signed in across restarts)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
