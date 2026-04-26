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
  { key: 'sheep', label: 'Sheep', image: require('../../assets/sheep.png') },
  { key: 'hamster', label: 'Hamster', image: require('../../assets/hamster.png') },
  { key: 'bear', label: 'Bear', image: require('../../assets/bear.png') },
  { key: 'cat', label: 'Cat', image: require('../../assets/cat.png') },
  { key: 'platypus', label: 'Platypus', image: require('../../assets/platypus.png') },
  { key: 'sloth', label: 'Sloth', image: require('../../assets/sloth.png') },
] as const;

const AVATAR_FULL: Record<string, any> = {
  sheep: require('../../assets/user-avatar.png'),
  hamster: require('../../assets/user-avatar-pig.png'),
  bear: require('../../assets/user-avatar-bear.png'),
  cat: require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth: require('../../assets/user-avatar-sloth.png'),
};

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
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('sheep');

  // Populate fields once loaded
  useEffect(() => {
    if (!isLoading) {
      setName(profile.name);
      setAge(profile.age);
      setGender(profile.gender);
      setHeight(profile.height);
      setEmail(profile.email);
      setAvatar(profile.avatar);
    }
  }, [isLoading]);

  const handleSave = async () => {
    await saveProfile({ name, age, gender, height, email, avatar });
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
                source={AVATAR_FULL[avatar] ?? AVATAR_FULL.sheep}
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
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === option && styles.genderOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    backgroundColor: '#2B1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 18,
  },
  headerBtn: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  saveBtn: {
    fontFamily: 'InstrumentSans',
    color: '#ffffff',
    fontSize: 16,
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
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  currentAvatarImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  avatarLabel: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    marginBottom: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 264,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: 'rgba(189, 44, 61, 0.6)',
    backgroundColor: 'rgba(189, 44, 61, 0.15)',
  },
  avatarOptionImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  avatarOptionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },

  // ── Gender picker ──
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genderOptionSelected: {
    borderColor: 'rgba(189, 44, 61, 0.6)',
    backgroundColor: 'rgba(189, 44, 61, 0.15)',
  },
  genderOptionText: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
  genderOptionTextSelected: {
    color: '#ffffff',
  },

  // ── Form fields ──
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'InstrumentSans',
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
