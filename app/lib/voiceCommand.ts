// Pure parser for spoken set entries, e.g. "80 by 8", "eighty kilos for eight reps",
// "82 and a half by 6", "same as last, save". The speech recognizer usually returns digits,
// but number words and common mishearings ("buy"/"bye" for "by", "4" for "for") are handled too.

export type VoiceCommand =
  | { kind: 'logSet'; weight: number | null; reps: number | null; save: boolean }
  | { kind: 'repeatLast'; save: boolean }
  | { kind: 'save' }
  | { kind: 'cancel' }
  | { kind: 'unknown'; text: string };

export const VOICE_HELP = 'Say weight and reps, like "80 by 8". Add "save" to log it.';

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const WEIGHT_WORDS = new Set(['kg', 'kgs', 'k', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes']);
const REP_WORDS = new Set(['rep', 'reps', 'repetition', 'repetitions']);

const isDigits = (t: string | undefined) => !!t && /^\d+(\.\d+)?$/.test(t);
const isNumberWord = (t: string | undefined) => !!t && (t in UNITS || t in TEENS || t in TENS || t === 'hundred');

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/×/g, ' x ')
    .replace(/(\d),(\d)/g, '$1.$2') // "82,5" spoken-locale decimals
    .replace(/(\d)([a-z])/g, '$1 $2') // "80kg", "80x8"
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\.(?!\d)/g, ' ') // keep "82.5", drop sentence dots ("Save.")
    .replace(/(^|[^\d])\./g, '$1 ')
    .split(/\s+/)
    .filter(Boolean);
}

// Reads one number starting at tokens[i]. Returns null if there is none.
function readNumber(tokens: string[], i: number): { value: number; next: number } | null {
  let value: number;
  let j = i;

  if (isDigits(tokens[j])) {
    value = parseFloat(tokens[j]);
    j++;
  } else if (isNumberWord(tokens[j])) {
    // Words: "eighty two", "one hundred and five". A unit may follow tens or hundred,
    // but not another unit ("eight ten" is two numbers, not 18).
    let total = 0;
    let last: 'none' | 'unit' | 'teen' | 'tens' | 'hundred' = 'none';
    while (j < tokens.length) {
      const t = tokens[j];
      if (t === 'and' && last === 'hundred' && isNumberWord(tokens[j + 1]) && tokens[j + 1] !== 'hundred') {
        j++;
        continue;
      }
      if (t in UNITS && (last === 'none' || last === 'tens' || last === 'hundred')) {
        total += UNITS[t];
        last = 'unit';
      } else if (t in TEENS && (last === 'none' || last === 'hundred')) {
        total += TEENS[t];
        last = 'teen';
      } else if (t in TENS && (last === 'none' || last === 'hundred')) {
        total += TENS[t];
        last = 'tens';
      } else if (t === 'hundred' && last !== 'hundred') {
        total = (total || 1) * 100;
        last = 'hundred';
      } else {
        break;
      }
      j++;
    }
    value = total;
  } else {
    return null;
  }

  // "point five" / "point 5"
  if (tokens[j] === 'point') {
    const d = tokens[j + 1];
    const digit = isDigits(d) ? d : d && d in UNITS ? String(UNITS[d]) : null;
    if (digit !== null) {
      value = parseFloat(`${Math.trunc(value)}.${digit.replace('.', '')}`);
      j += 2;
    }
  }
  // "and a half" / "and half"
  if (tokens[j] === 'and' && tokens[j + 1] === 'a' && tokens[j + 2] === 'half') {
    value += 0.5;
    j += 3;
  } else if (tokens[j] === 'and' && tokens[j + 1] === 'half') {
    value += 0.5;
    j += 2;
  }
  return { value, next: j };
}

export function parseVoiceCommand(text: string): VoiceCommand {
  const tokens = tokenize(text);
  const joined = ` ${tokens.join(' ')} `;
  const save = /\s(save|saved|log it|done|confirm)\s/.test(joined);

  type Num = { value: number; tag: 'weight' | 'reps' | null };
  const nums: Num[] = [];
  for (let i = 0; i < tokens.length; ) {
    const n = readNumber(tokens, i);
    if (!n) {
      i++;
      continue;
    }
    const after = tokens[n.next];
    const tag = after && WEIGHT_WORDS.has(after) ? 'weight' : after && REP_WORDS.has(after) ? 'reps' : null;
    nums.push({ value: n.value, tag });
    i = n.next;
  }

  if (nums.length > 0) {
    let weight = nums.find((n) => n.tag === 'weight')?.value ?? null;
    let reps = nums.find((n) => n.tag === 'reps')?.value ?? null;
    let free = nums.filter((n) => n.tag === null).map((n) => n.value);

    // "80 for 8" heard as "80 4 8"
    if (weight === null && reps === null && free.length === 3 && free[1] === 4) free = [free[0], free[2]];

    if (weight === null && reps === null) {
      if (free.length < 2) return { kind: 'unknown', text };
      [weight, reps] = free;
    } else if (weight === null && free.length > 0) {
      weight = free[0];
    } else if (reps === null && free.length > 0) {
      reps = free[0];
    }

    if (weight !== null && (weight < 0 || weight > 9999)) return { kind: 'unknown', text };
    if (reps !== null) {
      reps = Math.round(reps);
      if (reps < 0 || reps > 999) return { kind: 'unknown', text };
    }
    return { kind: 'logSet', weight, reps, save };
  }

  if (/\s(same|repeat|again)\s/.test(joined)) return { kind: 'repeatLast', save };
  if (save) return { kind: 'save' };
  if (/\s(cancel|nevermind|close)\s/.test(joined) || /\snever mind\s/.test(joined)) return { kind: 'cancel' };
  return { kind: 'unknown', text };
}
