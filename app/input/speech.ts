// Multimodal I/O: voice in (log sets), speech out (rest timer, screen-reader-free cues).
// TODO: speech-to-text via expo-speech-recognition, text-to-speech via expo-speech (neither installed yet).
export function startListening(_onTranscript: (text: string) => void): void {}
export function stopListening(): void {}
export function speak(_text: string): void {}
