import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { Camera, useCameraDevice, CameraPermissionStatus} from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useProfile } from '../hooks/useProfile';

const AVATAR_OPTIONS = [
  { key: 'sheep',    label: 'Sheep',    image: require('../../assets/sheep.png') },
  { key: 'hamster',  label: 'Hamster',  image: require('../../assets/hamster.png') },
  { key: 'bear',     label: 'Bear',     image: require('../../assets/bear.png') },
  { key: 'cat',      label: 'Cat',      image: require('../../assets/cat.png') },
  { key: 'platypus', label: 'Platypus', image: require('../../assets/platypus.png') },
  { key: 'sloth',    label: 'Sloth',    image: require('../../assets/sloth.png') },
] as const;

const AVATAR_FULL: Record<string, any> = {
  sheep:    require('../../assets/user-avatar.png'),
  hamster:  require('../../assets/user-avatar-pig.png'),
  bear:     require('../../assets/user-avatar-bear.png'),
  cat:      require('../../assets/user-avatar-cat.png'),
  platypus: require('../../assets/user-avatar-beaver.png'),
  sloth:    require('../../assets/user-avatar-sloth.png'),
};

interface ProfileScreenProps {
  userId: string;
  onClose: () => void;
}

export default function ProfileScreen({ userId, onClose }: ProfileScreenProps) {
  const { profile, isLoading, isSaving, saveProfile } = useProfile(userId);

  const [name,         setName]         = useState('');
  const [age,          setAge]          = useState('');
  const [gender,       setGender]       = useState('');
  const [height,       setHeight]       = useState('');
  const [email,        setEmail]        = useState('');
  const [avatar,       setAvatar]       = useState('sheep');
  const [isIdVerified,    setIsIdVerified]    = useState(false);
  const [isVerifyingId,   setIsVerifyingId]   = useState(false);
  const [cameraOpen,      setCameraOpen]      = useState(false);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>('not-determined');

  // ✅ v4 API
  const device    = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  // Populate fields once loaded
  useEffect(() => {
    if (!isLoading) {
      setName(profile.name);
      setAge(profile.age);
      setGender(profile.gender);
      setHeight(profile.height);
      setEmail(profile.email);
      setAvatar(profile.avatar);
      setIsIdVerified(profile.idVerified ?? false);
    }
  }, [isLoading]);

  // ── Google Cloud Vision API ────────────────────────────────────────
  const verifyIdWithVision = async (imageBase64: string): Promise<boolean> => {
    try {
      const VISION_API_KEY = 'YOUR_GOOGLE_CLOUD_VISION_API_KEY';

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64 },
                features: [
                  { type: 'DOCUMENT_TEXT_DETECTION' },
                  { type: 'FACE_DETECTION' },
                ],
              },
            ],
          }),
        }
      );

      const textResponse = await response.text();
      const result = textResponse ? JSON.parse(textResponse) : null;

      if (!response.ok) {
        const errorMessage = result?.error?.message || response.statusText || 'Vision API failed';
        throw new Error(errorMessage);
      }

      const responseData   = result?.responses?.[0] ?? {};
      const fullText       = responseData.fullTextAnnotation?.text
                          ?? responseData.textAnnotations?.[0]?.description
                          ?? '';
      const faceCount      = responseData.faceAnnotations?.length ?? 0;
      const normalizedText = String(fullText).toLowerCase();
      const hasText        = normalizedText.length > 20;
      const hasIdKeywords  = /id|license|passport|driver|dob|date of birth|issued|expiry|name|address|birth/i.test(normalizedText);
      const hasFace        = faceCount > 0;

      console.debug('Vision text length:', normalizedText.length, 'faces:', faceCount);

      return hasText && (hasFace || hasIdKeywords);
    } catch (error) {
      console.error('Vision API error:', error);
      throw error;
    }
  };

  // ── Request camera permission & open camera ────────────────────────
  const handleVerifyId = async () => {
  if (isIdVerified) return;

  try {
    setIsVerifyingId(true);

    // Check current permission first
    const currentStatus = await Camera.getCameraPermissionStatus();

    let finalStatus: CameraPermissionStatus = currentStatus;

    // Only request if not already granted
    if (currentStatus !== 'granted') {
      finalStatus = await Camera.requestCameraPermission();
    }

    setCameraPermission(finalStatus);

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please go to Settings and allow camera access for this app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: () => {} },
        ]
      );
      return;
    }

    // Small delay to ensure permission is registered
    await new Promise(resolve => setTimeout(resolve, 300));
    setCameraOpen(true);

  } catch (error) {
    console.error('ID verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to open camera.';
    Alert.alert('Error', message);
  } finally {
    setIsVerifyingId(false);
  }
};

  // ── Capture photo from camera & verify ─────────────────────────────
  const handleCapturePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Camera Error', 'Camera not ready yet. Please try again.');
      return;
    }

    try {
      setIsVerifyingId(true);
      const photo = await cameraRef.current.takePhoto();
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      
      const imageBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert('Processing', 'Scanning your ID...');

      const isVerified = await verifyIdWithVision(imageBase64);
      setCameraOpen(false);

      if (isVerified) {
        setIsIdVerified(true);
        Alert.alert('Success!', 'Your ID has been verified and approved.');
      } else {
        Alert.alert(
          'Verification Failed',
          'Could not detect valid ID information. Please try again with a clear photo.'
        );
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      const message = error instanceof Error ? error.message : 'Failed to capture ID. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsVerifyingId(false);
    }
  };

  // ── Save profile ───────────────────────────────────────────────────
  const handleSave = async () => {
    await saveProfile({ name, age, gender, height, email, avatar, idVerified: isIdVerified });
    onClose();
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00e5ff" />
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
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

          {/* Name */}
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

          {/* Age */}
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

          {/* Gender */}
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

          {/* Email */}
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

          {/* ID Verification */}
          <View style={styles.idVerificationSection}>
            <TouchableOpacity
              style={[
                styles.idVerifyBtn,
                isIdVerified && styles.idVerifyBtnVerified,
              ]}
              onPress={handleVerifyId}
              disabled={isVerifyingId || isIdVerified}
            >
              {isVerifyingId ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.idVerifyBtnIcon}>
                    {isIdVerified ? '✓' : '🪪'}
                  </Text>
                  <Text style={styles.idVerifyBtnText}>
                    {isIdVerified ? 'ID Verified' : 'Authenticate ID'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.idVerifyHint}>
              {isIdVerified
                ? 'Your identity has been verified with Google Cloud Vision'
                : 'Scan your ID to verify your identity'}
            </Text>
          </View>

          <View style={{ height: 40 }} />

          {/* Camera Modal */}
          <Modal visible={cameraOpen} animationType="slide" transparent>
            <View style={styles.cameraModalOverlay}>
              <View style={styles.cameraModalContent}>
                {device ? (
                  <Camera
                    ref={cameraRef}
                    style={styles.cameraPreview}
                    device={device}
                    isActive={cameraOpen}
                    photo={true}
                  />
                ) : (
                  <View style={styles.cameraLoading}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.cameraLoadingText}>Loading camera…</Text>
                  </View>
                )}
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.cameraActionBtn}
                    onPress={() => setCameraOpen(true)}
                    disabled={isVerifyingId}
                  >
                    <Text style={styles.cameraActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cameraActionBtn}
                    onPress={handleCapturePhoto}
                    disabled={isVerifyingId}
                  >
                    {isVerifyingId
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.cameraActionText}>Capture</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  idVerificationSection: {
    marginTop: 28,
    marginBottom: 20,
    alignItems: 'center',
  },
  idVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(189, 44, 61, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(189, 44, 61, 0.4)',
    marginBottom: 12,
    width: '100%',
  },
  idVerifyBtnVerified: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  idVerifyBtnIcon: {
    fontSize: 20,
  },
  idVerifyBtnText: {
    fontFamily: 'Unbounded-SemiBold',
    color: '#ffffff',
    fontSize: 16,
  },
  idVerifyHint: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
  },
  cameraModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  cameraPreview: {
    width: '100%',
    flex: 1,
  },
  cameraLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  cameraControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  cameraActionBtn: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(189, 44, 61, 0.9)',
    alignItems: 'center',
  },
  cameraActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Unbounded-SemiBold',
  },
});