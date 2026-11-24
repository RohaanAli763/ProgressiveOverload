// Screen-reader labels. Visual rows like "2  75 x 8  80  8" are read badly by TalkBack,
// so each row gets one sentence instead.

const spokenWeight = (w: number) => `${w} ${w === 1 ? 'kilogram' : 'kilograms'}`;
const spokenReps = (r: number) => `${r} ${r === 1 ? 'rep' : 'reps'}`;

// "Set 2, 80 kilograms, 8 reps, previous 75 by 8" / "Set 3, not logged yet"
export function setLabel(
  displayNum: number,
  set: { weight: number | null; reps: number | null; previous: string | null },
  done = false
): string {
  const parts = [`Set ${displayNum}`];
  if (set.weight === null && set.reps === null) {
    parts.push('not logged yet');
  } else {
    if (set.weight !== null) parts.push(spokenWeight(set.weight));
    if (set.reps !== null) parts.push(spokenReps(set.reps));
  }
  if (set.previous) parts.push(`previous ${set.previous.replace(/\s*x\s*/i, ' by ')}`);
  if (done) parts.push('done');
  return parts.join(', ');
}
