import type { ExerciseSet } from '../screens/Home';

// Screen-reader labels. Visual rows like "12 x 8" are read badly by TalkBack.
// TODO: implement, e.g. "Set 2, 80 kilograms, 8 reps, previous 75 by 8"
export function setLabel(_set: ExerciseSet): string {
  return '';
}
