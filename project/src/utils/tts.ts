// Lazy-load native modules to avoid crash in Expo Go
let FileSystem: typeof import('expo-file-system') | null = null;
let Audio: typeof import('expo-av').Audio | null = null;
let Speech: typeof import('expo-speech') | null = null;
try {
  FileSystem = require('expo-file-system');
  Audio = require('expo-av').Audio;
} catch (e) {
  // expo-av unavailable
}
try {
  Speech = require('expo-speech');
} catch (e) {
  // expo-speech unavailable
}

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam (Global Premade)

/**
 * Speaks text using the device's built-in speech engine (works everywhere).
 */
function fallbackSpeak(text: string): Promise<void> {
  if (!Speech) {
    console.warn('[tts] No speech engine available');
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: resolve,
      onError: () => resolve(),
    });
  });
}

/**
 * Takes text, sends it to ElevenLabs, and plays the resulting audio.
 * Falls back to device TTS if native audio modules are unavailable.
 */
export async function playMessageInVoice(text: string) {
  if (!text.trim()) return;

  // Fallback: use device speech if expo-av isn't available or no API key
  if (!FileSystem || !Audio || !ELEVENLABS_API_KEY) {
    return fallbackSpeak(text);
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs API error:', await response.text());
      return fallbackSpeak(text);
    }

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise<void>((resolve, reject) => {
      reader.onload = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const fileUri = `${FileSystem!.cacheDirectory}message_voice.mp3`;

        await FileSystem!.writeAsStringAsync(fileUri, base64Audio, {
          encoding: FileSystem!.EncodingType.Base64,
        });

        const { sound } = await Audio!.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      };
      reader.onerror = () => fallbackSpeak(text).then(reject);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to play voice message, using fallback:', error);
    return fallbackSpeak(text);
  }
}
