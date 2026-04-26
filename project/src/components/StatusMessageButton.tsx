import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { playMessageInVoice } from '../utils/tts';

interface StatusMessageButtonProps {
  currentMessage: string;
  onMessageChange: (message: string) => void;
  visible: boolean;
  onClose: () => void;
  avatar?: string;
}

export default function StatusMessageButton({
  currentMessage,
  onMessageChange,
  visible,
  onClose,
  avatar,
}: StatusMessageButtonProps) {
  const [draft,      setDraft]      = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  React.useEffect(() => {
    if (visible) setDraft(currentMessage);
  }, [visible]);

  const confirm = async () => {
    const message = draft.trim();
    onMessageChange(message);
    onClose();
    if (message) {
      setIsSpeaking(true);
      await playMessageInVoice(message, avatar);
      setIsSpeaking(false);
    }
  };

  const cancel = () => onClose();

  const clear = () => {
    onMessageChange('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cancel}
    >
      <Pressable style={styles.overlay} onPress={cancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            <Text style={styles.title}>Your Status</Text>
            <Text style={styles.subtitle}>
              Appears as a speech bubble above your character
            </Text>

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="e.g. Looking to connect! 👋"
              placeholderTextColor="rgba(255,255,255,0.25)"
              maxLength={40}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirm}
              selectionColor="#BD2C3D"
            />
            <Text style={styles.charCount}>{draft.length}/40</Text>

            <View style={styles.actions}>
              {currentMessage ? (
                <TouchableOpacity style={styles.clearButton} onPress={clear}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelButton} onPress={cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.setButton, !draft.trim() && styles.setButtonDisabled]}
                onPress={confirm}
                disabled={!draft.trim()}
              >
                <Text style={styles.setText}>Set</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#301F1A',                    // ✅ matched to app color
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(189, 44, 61, 0.3)',         // ✅ crimson border
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 44,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Unbounded-Regular',               // ✅ changed
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'InstrumentSans',                  // ✅ changed
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',     // ✅ matched to app inputs
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(189, 44, 61, 0.3)',         // ✅ crimson border
    color: '#ffffff',
    fontFamily: 'InstrumentSans',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  charCount: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: 'rgba(189, 44, 61, 0.12)',   // ✅ crimson tint
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(189, 44, 61, 0.3)',
  },
  clearText: {
    fontFamily: 'InstrumentSans',
    color: '#BD2C3D',                              // ✅ crimson
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'InstrumentSans',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '600',
  },
  setButton: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#BD2C3D',                    // ✅ crimson
    alignItems: 'center',
  },
  setButtonDisabled: {
    opacity: 0.35,
  },
  setText: {
    fontFamily: 'Unbounded-Regular',               // ✅ changed
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});