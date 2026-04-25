import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useProfile, type UserProfile } from '../hooks/useProfile';

const AVATAR_OPTIONS = [
  { key: 'sheep', label: 'Sheep', image: require('../../assets/user-avatar.png') },
  { key: 'beaver', label: 'Beaver', image: require('../../assets/user-avatar-beaver.png') },
] as const;

interface ProfileScreenProps {
  userId: string;
  onClose: () => void;
}

/**
 * Profile editing screen.
 *
 * Allows the user to set their name, age, height, email,
 * and pick an avatar emoji. Data persists to Firestore.
 */
export default function ProfileScreen({ userId, onClose }: ProfileScreenProps) {
  const { profile, isLoading, isSaving, saveProfile } = useProfile(userId);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('sheep');

  // Populate fields once loaded
  useEffect(() => {
    if (!isLoading) {
      setName(profile.name);
      setAge(profile.age);
      setHeight(profile.height);
      setEmail(profile.email);
      setAvatar(profile.avatar);
    }
  }, [isLoading]);

  const handleSave = async () => {
    await saveProfile({ name, age, height, email, avatar });
    onClose();
  };

  if (isLoading) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00e5ff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={[styles.headerBtn, styles.saveBtn]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <View style={styles.currentAvatar}>
              <Image
                source={AVATAR_OPTIONS.find((a) => a.key === avatar)?.image ?? AVATAR_OPTIONS[0].image}
                style={styles.currentAvatarImage}
              />
            </View>
            <Text style={styles.avatarLabel}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.avatarOption,
                    avatar === option.key && styles.avatarOptionSelected,
                  ]}
                  onPress={() => setAvatar(option.key)}
                >
                  <Image source={option.image} style={styles.avatarOptionImage} />
                  <Text style={styles.avatarOptionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 22"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Height</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 5'10"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Spacer for keyboard */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 80,
    justifyContent: 'flex-end',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    backgroundColor: '#111128',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerBtn: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    color: '#00e5ff',
  },

  // ── Body ──
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  currentAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  currentAvatarImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  avatarLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  avatarOption: {
    width: 90,
    height: 110,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 10,
  },
  avatarOptionSelected: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  avatarOptionImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  avatarOptionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  // ── Form fields ──
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
