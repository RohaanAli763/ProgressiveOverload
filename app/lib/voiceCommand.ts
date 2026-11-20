// Pure parser for spoken set entries, e.g. "eighty by eight", "80 kg 8 reps", "same as last".
export type VoiceCommand =
  | { kind: 'logSet'; weight: number; reps: number }
  | { kind: 'repeatLast' }
  | { kind: 'unknown'; text: string };

// TODO: implement
export function parseVoiceCommand(text: string): VoiceCommand {
  return { kind: 'unknown', text };
}
