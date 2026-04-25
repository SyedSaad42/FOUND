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
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ─── Brand Tokens ────────────────────────────────────────────────────
const C = {
  crimson:  '#BD2C3D',
  blush:    '#E2817B',
  cream:    '#FFF7EC',
  espresso: '#301F1A',
};

// ─── Floating Heart Particle ─────────────────────────────────────────
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
          Animated.timing(opacity, { toValue: 0.55, duration: 600, delay, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,    duration: 1400, delay: 1800, useNativeDriver: true }),
        ]),
        Animated.timing(y,      { toValue: -H * 0.5, duration: 4000, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1,        duration: 4000, delay, useNativeDriver: true }),
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

// ─── Pulsing Glow Ring ────────────────────────────────────────────────
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

// ─── Shimmer Text ─────────────────────────────────────────────────────
function ShimmerText({ children, style }: { children: string; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2800, useNativeDriver: false })
    ).start();
  }, []);

  const color = anim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [C.cream, C.blush, C.crimson, C.cream],
  });

  return <Animated.Text style={[style, { color }]}>{children}</Animated.Text>;
}

// ─── Dot Loader ───────────────────────────────────────────────────────
function DotLoader() {
  const d0 = useRef(new Animated.Value(0.3)).current;
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const dots = [d0, d1, d2];

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
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
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

// ─── Response Card ────────────────────────────────────────────────────
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
          <Text style={styles.responseTitle}>{'Love Guru · Found'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{'LIVE'}</Text>
        </View>
      </View>

      <Text style={styles.responseText}>{message}</Text>
      <Text style={styles.responseTimestamp}>{'Just now · ♥ Found'}</Text>

      <TouchableOpacity onPress={onBack} style={styles.ghostBtn} activeOpacity={0.7}>
        <Text style={styles.ghostBtnText}>{'← Back'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Error Card ───────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────
type ApiState = 'idle' | 'loading' | 'success' | 'error';

export default function MeetGemmaPage() {
  const [apiState,   setApiState]   = useState<ApiState>('idle');
  const [apiMessage, setApiMessage] = useState('');

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

  const callApi = async () => {
    if (apiState === 'loading') return;

    Animated.sequence([
      Animated.spring(pressScale, { toValue: 0.94, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true }),
    ]).start();

    setApiState('loading');
    setApiMessage('');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:
            "You are Gemma, a warm and insightful love guru from the Found dating app. Your tagline is 'Catch to match.' When someone taps 'Meet Gemma', greet them with a short, magnetic, slightly mystical welcome message (2-3 sentences max). Make them feel seen. Use the Found app's energy — heartfelt, direct, no fluff. End with a single question to understand what kind of connection they're looking for.",
          messages: [
            { role: 'user', content: "I just tapped 'Meet Gemma' on the Found app. Greet me." },
          ],
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const data = await res.json();
      const text = data?.content?.[0]?.text ?? "Hey love — I felt you tap. Let's find your heart.";
      setApiMessage(text);
      setApiState('success');
    } catch (err) {
      console.error(err);
      setApiMessage('Something interrupted our connection. Try again?');
      setApiState('error');
    }
  };

  const handleReset = () => {
    setApiState('idle');
    setApiMessage('');
  };

  const hearts = [
    { delay: 0,    x: W * 0.07, size: 18 },
    { delay: 1400, x: W * 0.18, size: 11 },
    { delay: 600,  x: W * 0.35, size: 14 },
    { delay: 2200, x: W * 0.55, size: 9  },
    { delay: 900,  x: W * 0.70, size: 16 },
    { delay: 1800, x: W * 0.83, size: 12 },
    { delay: 300,  x: W * 0.92, size: 10 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.espresso} />

      <GlowRing />

      {/* Decorative arcs */}
      <View style={styles.arcOuter} pointerEvents="none" />
      <View style={styles.arcInner} pointerEvents="none" />

      {/* Floating hearts */}
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
          {'Gemma will help you send it to the right person.'}
        </Animated.Text>

        {/* Button / States */}
        {(apiState === 'idle' || apiState === 'loading') && (
          <Animated.View style={{ opacity: btnOp, transform: [{ scale: Animated.multiply(btnScale, pressScale) }] }}>
            <TouchableOpacity
              onPress={callApi}
              activeOpacity={1}
              disabled={apiState === 'loading'}
              style={[styles.meetBtn, apiState === 'loading' && { opacity: 0.88 }]}
            >
              {apiState === 'loading' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color={C.crimson} />
                  <Text style={styles.meetBtnText}>{'Reaching Gemma'}</Text>
                  <DotLoader />
                </View>
              ) : (
                <Text style={styles.meetBtnText}>{'Meet Gemma ♥'}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {apiState === 'success' && (
          <ResponseCard message={apiMessage} onBack={handleReset} />
        )}

        {apiState === 'error' && (
          <ErrorCard message={apiMessage} onRetry={callApi} onBack={handleReset} />
        )}
      </ScrollView>

      <Text style={styles.footer}>{'FOUND · CATCH TO MATCH'}</Text>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.espresso,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
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
    fontFamily: 'Unbounded',
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
    fontFamily: 'Unbounded',
    fontSize: 34,
    fontWeight: '900',
    color: C.cream,
    letterSpacing: -2,
    lineHeight: 42,
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
    fontFamily: 'Unbounded',
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
  avatarEmoji: {
    fontSize: 22,
  },
  responseName: {
    fontFamily: 'Unbounded',
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
    fontFamily: 'Unbounded',
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
    fontFamily: 'Unbounded',
    letterSpacing: 1,
  },

  errorHeart: {
    color: C.blush,
    fontSize: 28,
    marginBottom: 10,
  },
  errorTitle: {
    fontFamily: 'Unbounded',
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
    fontFamily: 'Unbounded',
    fontWeight: '700',
    paddingBottom: 20,
  },
});