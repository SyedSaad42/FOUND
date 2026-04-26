import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

// ─── Config ───────────────────────────────────────────────────────────
// Replace with your machine's LAN IP when running FastAPI locally.
// Example: 'http://192.168.1.42:8000'
const API_BASE = 'http://10.85.93.109:8000';

const { width: W, height: H } = Dimensions.get('window');

// ─── Brand Tokens ─────────────────────────────────────────────────────
const C = {
  crimson:  '#BD2C3D',
  blush:    '#E2817B',
  cream:    '#FFF7EC',
  espresso: '#301F1A',
  dark:     '#1A0F0D',
};

// ─────────────────────────────────────────────────────────────────────
//  SHARED DECORATIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────

function FloatingHeart({ delay, x, size }: { delay: number; x: number; size: number }) {
  const y       = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      y.setValue(0);
      opacity.setValue(0);
      rotate.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.55, duration: 600,  delay, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,    duration: 1400, delay: 1800, useNativeDriver: true }),
        ]),
        Animated.timing(y,      { toValue: -H * 0.5, duration: 4000, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1,         duration: 4000, delay, useNativeDriver: true }),
      ]).start(() => setTimeout(loop, Math.random() * 2000 + 500));
    };
    const t = setTimeout(loop, delay);
    return () => clearTimeout(t);
  }, []);

  const rot = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '12deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        bottom: 60,
        left: x,
        fontSize: size,
        color: C.blush,
        opacity,
        transform: [{ translateY: y }, { rotate: rot }],
      }}
    >
      {'♥'}
    </Animated.Text>
  );
}

function GlowRing() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.32, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.18, duration: 2200, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: H * 0.5 - 260,
        width: 520,
        height: 520,
        borderRadius: 260,
        backgroundColor: 'rgba(189,44,61,0.14)',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function ShimmerText({ children, style }: { children: string; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2800, useNativeDriver: false })
    ).start();
  }, []);

  const color = anim.interpolate({
    inputRange:  [0, 0.33, 0.66, 1],
    outputRange: [C.cream, C.blush, C.crimson, C.cream],
  });

  return <Animated.Text style={[style, { color }]}>{children}</Animated.Text>;
}

function DotLoader() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5, height: 5, borderRadius: 3,
            backgroundColor: C.crimson,
            opacity: d,
          }}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  RESULT CARDS
// ─────────────────────────────────────────────────────────────────────

function ResponseCard({ message, onBack }: { message: string; onBack: () => void }) {
  const slideY  = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.responseCard, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={styles.responseCardLine} />

      <View style={styles.responseHeader}>
        <View style={styles.responseAvatar}>
          <Text style={styles.avatarEmoji}>{'🔮'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.responseName}>{'Gemma'}</Text>
          <Text style={styles.responseTitle}>{'Love Guru · Dare Found'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{'LIVE'}</Text>
        </View>
      </View>

      <Text style={styles.responseText}>{message}</Text>
      <Text style={styles.responseTimestamp}>{'Just now · ♥ Generated for you'}</Text>

      <TouchableOpacity onPress={onBack} style={styles.ghostBtn} activeOpacity={0.7}>
        <Text style={styles.ghostBtnText}>{'← Try again'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ErrorCard({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <View style={[styles.responseCard, { borderColor: 'rgba(189,44,61,0.4)', alignItems: 'center' }]}>
      <Text style={styles.errorHeart}>{'♥'}</Text>
      <Text style={styles.errorTitle}>{'Signal lost'}</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={[styles.meetBtn, { marginTop: 20 }]} activeOpacity={0.85}>
        <Text style={styles.meetBtnText}>{'Try again ♥'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} style={styles.ghostBtn} activeOpacity={0.7}>
        <Text style={styles.ghostBtnText}>{'← Cancel'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  CAMERA OVERLAY
// ─────────────────────────────────────────────────────────────────────

function CameraOverlay({
  onStop,
  onCancel,
}: {
  onStop: (videoPath: string) => void;
  onCancel: () => void;
}) {
  const devices = useCameraDevices();
  const device = devices?.[0] ?? null;
  const cameraRef = useRef<any>(null);

  const [isReady,    setIsReady]    = useState(false);
  const [recording,  setRecording]  = useState(false);
  const [elapsed,    setElapsed]    = useState(0);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in camera view
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Pulse recording dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (device && !recording) {
      setIsReady(true);
      const timeout = setTimeout(startRecording, 800);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [device]);

  const startRecording = async () => {
    if (!cameraRef.current || recording) return;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    cameraRef.current.startRecording({
      onRecordingFinished: (video: { path: string }) => {
        if (timerRef.current) clearInterval(timerRef.current);
        onStop(video.path);
      },
      onRecordingError: (err: { message: string }) => {
        if (timerRef.current) clearInterval(timerRef.current);
        Alert.alert('Recording failed', err.message);
        onCancel();
      },
    });
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !recording) return;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await cameraRef.current.stopRecording();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!device) {
    return (
      <View style={camStyles.container}>
        <ActivityIndicator color={C.cream} size="large" />
        <Text style={camStyles.waitText}>{'Finding camera…'}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[camStyles.container, { opacity: fadeIn }]}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
       
        
      />

      {/* Vignette overlay */}
      <View style={camStyles.vignette} pointerEvents="none" />

      {/* Top HUD */}
      <View style={camStyles.hud}>
        {recording && (
          <View style={camStyles.recPill}>
            <Animated.View style={[camStyles.recDot, { opacity: pulseAnim }]} />
            <Text style={camStyles.recTime}>{fmt(elapsed)}</Text>
          </View>
        )}
        {!recording && isReady && (
          <View style={camStyles.recPill}>
            <ActivityIndicator size="small" color={C.cream} />
            <Text style={[camStyles.recTime, { marginLeft: 8 }]}>{'Starting…'}</Text>
          </View>
        )}
      </View>

      {/* Hint text */}
      <View style={camStyles.hintRow} pointerEvents="none">
        <Text style={camStyles.hintText}>
          {'Gemma is watching your vibe ♥'}
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={camStyles.controls}>
        <TouchableOpacity onPress={onCancel} style={camStyles.cancelBtn} activeOpacity={0.7}>
          <Text style={camStyles.cancelText}>{'✕  Cancel'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={stopRecording}
          disabled={!recording}
          style={[camStyles.stopBtn, !recording && { opacity: 0.35 }]}
          activeOpacity={0.85}
        >
          <View style={camStyles.stopIcon} />
          <Text style={camStyles.stopText}>{'Stop & Dare'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  PROCESSING SCREEN
// ─────────────────────────────────────────────────────────────────────

function ProcessingScreen({ status }: { status: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 0.95, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={procStyles.container}>
      <GlowRing />
      <Animated.View style={[procStyles.orb, { transform: [{ scale: pulseScale }] }]}>
        <Animated.Text style={[procStyles.orbEmoji, { transform: [{ rotate }] }]}>{'🔮'}</Animated.Text>
      </Animated.View>
      <Text style={procStyles.title}>{'Reading your vibe…'}</Text>
      <Text style={procStyles.subtitle}>{status}</Text>
      <DotLoader />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────

type AppState = 'idle' | 'camera' | 'processing' | 'success' | 'error';

export default function MeetGemmaPage({ onClose }: { onClose?: () => void } = {}) {
  const [appState,      setAppState]      = useState<AppState>('idle');
  const [dare,          setDare]          = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [processStatus, setProcessStatus] = useState('Extracting frames…');

  const { hasPermission: hasCam,  requestPermission: requestCam  } = useCameraPermission();
  const { hasPermission: hasMic,  requestPermission: requestMic  } = useMicrophonePermission();

  // Entrance animations
  const labelOp    = useRef(new Animated.Value(0)).current;
  const headlineY  = useRef(new Animated.Value(28)).current;
  const headlineOp = useRef(new Animated.Value(0)).current;
  const subY       = useRef(new Animated.Value(20)).current;
  const subOp      = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(0.88)).current;
  const btnOp      = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(160, [
      Animated.timing(labelOp,    { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(headlineY,  { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(headlineOp, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subY,  { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(subOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(btnOp,    { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Button press → request permissions → open camera ────────────
  const handleMeetGemma = async () => {
    Animated.sequence([
      Animated.spring(pressScale, { toValue: 0.94, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true }),
    ]).start();

    if (!hasCam) {
      const granted = await requestCam();
      if (!granted) {
        Alert.alert('Camera needed', 'Allow camera access so Gemma can see your vibe.');
        return;
      }
    }
    if (!hasMic) {
      // Request mic even though we don't record audio — VisionCamera requires it
      await requestMic();
    }

    setAppState('camera');
  };

  // ── Video ready → extract frames → POST to FastAPI → stream dare ─
const handleVideoReady = async (videoPath: string) => {
  setAppState('processing');
  setDare('');
  setErrorMsg('');

  try {
    const normalizedPath = videoPath.startsWith('file://')
      ? videoPath
      : `file://${videoPath}`;

    setProcessStatus('Extracting frames…');
    const timestamps = [500, 1000, 2000, 3000, 4000, 5000, 6000, 7000];
    const frames: string[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(normalizedPath, {
          time: timestamps[i],
          quality: 0.7,
        });
        const uri = result?.uri ?? null;
        if (uri) {
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (b64 && b64.length > 0) {
            frames.push(b64);
            console.log(`Frame ${i} captured, length: ${b64.length}`);
          }
        }
      } catch (err) {
        console.warn(`Frame ${i} failed:`, err);
      }
    }

    if (frames.length === 0) {
      throw new Error('Could not extract any frames from video.');
    }

    console.log(`Sending ${frames.length} frames to API...`);
    setProcessStatus('Asking Gemma…');

    const response = await fetch(`${API_BASE}/analyze-frames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames, context: '' }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Server ${response.status}: ${body || response.statusText}`);
    }

    // React Native doesn't support response.body.getReader()
    // so we read the full SSE response as text at once
    const fullText = await response.text();
    console.log('Full response received, length:', fullText.length);

    let accumulated = '';

    for (const line of fullText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') break;
      if (!payload) continue;

      try {
        const parsed = JSON.parse(payload);

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (parsed.text) {
          accumulated += parsed.text;
        }
      } catch (parseErr) {
        console.warn('Parse error on line:', trimmed, parseErr);
      }
    }

    if (accumulated.length === 0) {
      throw new Error('No response received from Gemma.');
    }

    console.log('Dare generated:', accumulated);
    setDare(accumulated);
    setAppState('success');

  } catch (err: any) {
    console.error('[MeetGemma]', err);
    setErrorMsg(err?.message ?? 'Something went wrong generating your dare.');
    setAppState('error');
  }
};
  const handleReset = () => {
    setAppState('idle');
    setDare('');
    setErrorMsg('');
    setProcessStatus('Extracting frames…');
  };

  // ── Heart config ────────────────────────────────────────────────
  const hearts = [
    { delay: 0,    x: W * 0.07, size: 18 },
    { delay: 1400, x: W * 0.18, size: 11 },
    { delay: 600,  x: W * 0.35, size: 14 },
    { delay: 2200, x: W * 0.55, size: 9  },
    { delay: 900,  x: W * 0.70, size: 16 },
    { delay: 1800, x: W * 0.83, size: 12 },
    { delay: 300,  x: W * 0.92, size: 10 },
  ];

  // ── Full-screen states ──────────────────────────────────────────
  if (appState === 'camera') {
    return (
      <CameraOverlay
        onStop={handleVideoReady}
        onCancel={handleReset}
      />
    );
  }

  if (appState === 'processing') {
    return <ProcessingScreen status={processStatus} />;
  }

  // ── Main landing + result states ────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.espresso} />

      {/* Close button */}
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      )}

      <GlowRing />
      <View style={styles.arcOuter} pointerEvents="none" />
      <View style={styles.arcInner} pointerEvents="none" />
      {hearts.map((h, i) => <FloatingHeart key={i} {...h} />)}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Label */}
        <Animated.Text style={[styles.label, { opacity: labelOp }]}>
          {'Ready?'}
        </Animated.Text>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: labelOp }]} />

        {/* Headline */}
        <Animated.View style={{ opacity: headlineOp, transform: [{ translateY: headlineY }], marginBottom: 18 }}>
          <Text style={styles.headline}>
            {'Your heart is '}
            <ShimmerText style={styles.headline}>{'out there.'}</ShimmerText>
          </Text>
        </Animated.View>

        {/* Subtext */}
        <Animated.Text style={[styles.subtext, { opacity: subOp, transform: [{ translateY: subY }] }]}>
          {'Gemma reads your vibe and crafts a dare just for you.'}
        </Animated.Text>

        {/* Idle — CTA button */}
        {appState === 'idle' && (
          <Animated.View style={{ opacity: btnOp, transform: [{ scale: Animated.multiply(btnScale, pressScale) }] }}>
            <TouchableOpacity
              onPress={handleMeetGemma}
              activeOpacity={1}
              style={styles.meetBtn}
            >
              <Text style={styles.meetBtnText}>{'Ask Gemma ♥'}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Success — dare card */}
        {appState === 'success' && dare.length > 0 && (
          <ResponseCard message={dare} onBack={handleReset} />
        )}

        {/* Error */}
        {appState === 'error' && (
          <ErrorCard
            message={errorMsg}
            onRetry={() => setAppState('camera')}
            onBack={handleReset}
          />
        )}
      </ScrollView>

      <Text style={styles.footer}>{'FOUND · CATCH TO MATCH'}</Text>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.espresso,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 100,
    padding: 8,
  },
  closeBtnText: {
    color: C.cream,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  scroll: {
    flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
  paddingTop: 20,
  paddingBottom: 100,
  },
  arcOuter: {
    position: 'absolute',
    alignSelf: 'center',
    top: H * 0.5 - 320,
    width: 640,
    height: 640,
    borderRadius: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,247,236,0.04)',
  },
  arcInner: {
    position: 'absolute',
    alignSelf: 'center',
    top: H * 0.5 - 220,
    width: 440,
    height: 440,
    borderRadius: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,247,236,0.03)',
  },
  label: {
    fontFamily: 'Unbounded-Bold',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.5,
    color: C.blush,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: C.crimson,
    borderRadius: 2,
    marginBottom: 22,
  },
  headline: {
  fontFamily: 'Unbounded-Black',
  fontSize: 28,        // was 34
  fontWeight: '900',
  color: C.cream,
  letterSpacing: -1.5, // was -2
  lineHeight: 36,      // was 42
  textAlign: 'center',
},
  subtext: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: 'rgba(255,247,236,0.5)',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 44,
    paddingHorizontal: 8,
  },
  meetBtn: {
    backgroundColor: C.cream,
    paddingHorizontal: 52,
    paddingVertical: 20,
    borderRadius: 60,
    shadowColor: C.crimson,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 28,
    elevation: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 240,
  },
  meetBtnText: {
    fontFamily: 'Unbounded-ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    color: C.crimson,
    letterSpacing: 0.3,
  },
  responseCard: {
    backgroundColor: 'rgba(255,247,236,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(226,129,123,0.22)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  responseCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: C.crimson,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    opacity: 0.7,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  responseAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarEmoji: { fontSize: 22 },
  responseName: {
    fontFamily: 'Unbounded-ExtraBold',
    color: C.cream,
    fontSize: 13,
    fontWeight: '800',
  },
  responseTitle: {
    color: C.blush,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,247,236,0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,247,236,0.12)',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: C.cream,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  responseText: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: 'rgba(255,247,236,0.82)',
    fontSize: 15,
    lineHeight: 26,
    marginTop: 16,
  },
  responseTimestamp: {
    color: 'rgba(255,247,236,0.22)',
    fontSize: 10,
    marginTop: 16,
    letterSpacing: 0.5,
    fontFamily: 'Unbounded-Regular',
  },
  ghostBtn: {
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(226,129,123,0.3)',
  },
  ghostBtnText: {
    color: 'rgba(255,247,236,0.45)',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Unbounded-Bold',
    letterSpacing: 1,
  },
  errorHeart: {
    color: C.blush,
    fontSize: 28,
    marginBottom: 10,
  },
  errorTitle: {
    fontFamily: 'Unbounded-ExtraBold',
    color: C.cream,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorMsg: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: 'rgba(255,247,236,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,247,236,0.18)',
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: 'Unbounded-Bold',
    fontWeight: '700',
    paddingBottom: 20,
  },
});

const camStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulated vignette via nested views in production — keep simple here
    borderWidth: 0,
  },
  hud: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0, right: 0,
    alignItems: 'center',
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recDot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: C.crimson,
  },
  recTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'Unbounded-Bold',
  },
  hintRow: {
    position: 'absolute',
    bottom: 160,
    left: 0, right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,247,236,0.45)',
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: 'Georgia',
    letterSpacing: 0.3,
  },
  controls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 52 : 32,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 28,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Unbounded-Bold',
    letterSpacing: 0.5,
  },
  stopBtn: {
    flex: 1,
    backgroundColor: C.cream,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.crimson,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  stopIcon: {
    width: 13, height: 13,
    borderRadius: 2,
    backgroundColor: C.crimson,
  },
  stopText: {
    color: C.crimson,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Unbounded-ExtraBold',
    letterSpacing: 0.3,
  },
  waitText: {
    color: C.cream,
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
});

const procStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  orb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(189,44,61,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,129,123,0.25)',
  },
  orbEmoji: {
    fontSize: 52,
  },
  title: {
    fontFamily: 'Unbounded-ExtraBold',
    color: C.cream,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: 'rgba(255,247,236,0.45)',
    fontSize: 14,
  },
});