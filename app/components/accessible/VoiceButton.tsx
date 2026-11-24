import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { abortListening, speak, startListening, stopListening } from '../../input/speech';
import { parseVoiceCommand, VOICE_HELP, type VoiceCommand } from '../../lib/voiceCommand';
import { triggerHaptic } from '../../input/haptics';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';

// Tap, say "80 by 8" (optionally "...save"), and the wheels follow. Hands-free for chalky or
// sweaty hands and motor impairments. Every result is shown as text AND spoken back,
// so the user can confirm without looking (and see it if the gym is too loud to hear).
export default function VoiceButton({
  onCommand,
  highContrast,
}: {
  // Applies the command and returns what to say back (e.g. "80 kilos, 8 reps").
  onCommand: (cmd: VoiceCommand) => string;
  highContrast: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState('');
  const [message, setMessage] = useState('Tap the mic and say "80 by 8"');

  // Stop the mic if the sheet closes mid-sentence.
  useEffect(() => () => abortListening(), []);

  const handleFinal = (text: string) => {
    setLive('');
    const cmd = parseVoiceCommand(text);
    if (cmd.kind === 'unknown') {
      triggerHaptic('error');
      setMessage(text ? `Heard "${text}". ${VOICE_HELP}` : VOICE_HELP);
      speak('Sorry, say weight and reps, like 80 by 8.');
      return;
    }
    triggerHaptic('tick');
    const reply = onCommand(cmd);
    setMessage(`Heard "${text}" → ${reply}`);
    speak(reply);
  };

  const toggle = async () => {
    if (listening) {
      stopListening();
      return;
    }
    setLive('');
    setMessage('Listening…');
    const ok = await startListening({
      onPartial: setLive,
      onFinal: handleFinal,
      onError: (msg) => {
        triggerHaptic('error');
        setMessage(msg);
      },
      onEnd: () => setListening(false),
    });
    setListening(ok);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Voice input'}
        accessibilityHint='Say weight and reps, like 80 by 8. Add "save" to log the set.'
        accessibilityState={{ busy: listening }}
        style={({ pressed }) => [
          styles.btn,
          highContrast && styles.btnHC,
          listening && styles.btnListening,
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons name={listening ? 'stop' : 'mic'} size={24} color={listening ? '#ffffff' : '#58a6ff'} />
        <Text style={[styles.btnText, listening && styles.btnTextListening]} numberOfLines={1}>
          {listening ? 'LISTENING… TAP TO STOP' : 'SAY IT'}
        </Text>
      </Pressable>
      <Text
        style={[styles.message, highContrast && styles.messageHC]}
        numberOfLines={2}
        accessibilityLiveRegion="polite"
      >
        {live ? `"${live}"` : message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  btn: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.45)',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnHC: { backgroundColor: '#000000', borderColor: '#79c0ff' },
  btnListening: { backgroundColor: '#da3633', borderColor: '#f85149' },
  btnText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.8 },
  btnTextListening: { color: '#ffffff' },
  message: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_400Regular', textAlign: 'center', lineHeight: 17 },
  messageHC: { color: '#d0d7de' },
  pressed: { opacity: 0.75 },
});
