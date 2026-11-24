import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, type ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';

// Multimodal I/O: voice in (log sets hands-free), speech out (rest timer, voice replies).

type Subscription = { remove: () => void };
let subs: Subscription[] = [];

function clearSubs() {
  subs.forEach((s) => s.remove());
  subs = [];
}

function errorMessage(code: ExpoSpeechRecognitionErrorCode): string {
  switch (code) {
    case 'no-speech':
    case 'speech-timeout':
      return "Didn't catch that. Tap the mic and try again.";
    case 'not-allowed':
      return 'Microphone permission is needed for voice input.';
    case 'network':
      return 'Voice input needs a connection on this phone.';
    case 'busy':
      return 'The microphone is busy. Try again in a moment.';
    case 'language-not-supported':
    case 'service-not-allowed':
      return 'Speech recognition is not available on this phone.';
    default:
      return 'Voice input failed. Try again.';
  }
}

export type ListenHandlers = {
  onPartial: (text: string) => void; // live transcript while speaking
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void; // always called once listening stops
};

// Starts one utterance of speech-to-text. Returns false if it could not start.
export async function startListening(h: ListenHandlers): Promise<boolean> {
  try {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      h.onError(errorMessage('service-not-allowed'));
      return false;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      h.onError(errorMessage('not-allowed'));
      return false;
    }

    clearSubs();
    subs.push(
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        if (e.isFinal) h.onFinal(text);
        else h.onPartial(text);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (e) => {
        if (e.error !== 'aborted') h.onError(errorMessage(e.error));
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        clearSubs();
        h.onEnd();
      })
    );

    Speech.stop().catch(() => {}); // don't transcribe our own voice
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      // Biases recognition towards gym words ("by" instead of "buy", "reps" instead of "wraps").
      contextualStrings: ['by', 'reps', 'kilos', 'kg', 'save', 'same as last', 'and a half', 'cancel'],
    });
    return true;
  } catch (err) {
    console.error('[Speech] startListening failed:', err);
    clearSubs();
    h.onError(errorMessage('unknown'));
    return false;
  }
}

// Stop listening and deliver what was heard so far.
export function stopListening(): void {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.error('[Speech] stopListening failed:', err);
  }
}

// Stop listening and throw the result away (e.g. the sheet closed).
export function abortListening(): void {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // not listening
  }
  clearSubs();
}

// Spoken cue, e.g. "Rest over". Always paired with a visual and haptic cue, never the only signal.
export function speak(text: string): void {
  try {
    Speech.stop().catch(() => {});
    Speech.speak(text, { language: 'en-US' });
  } catch (err) {
    console.error('[Speech] speak failed:', err);
  }
}
