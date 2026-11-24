import { parseVoiceCommand } from './voiceCommand';

const set = (weight: number | null, reps: number | null, save = false) => ({ kind: 'logSet', weight, reps, save });

describe('parseVoiceCommand', () => {
  it('parses "80 by 8" into weight 80, reps 8', () => {
    expect(parseVoiceCommand('80 by 8')).toEqual(set(80, 8));
  });

  it('accepts the usual separators and mishearings', () => {
    expect(parseVoiceCommand('80 x 8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80x8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80 × 8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80 times 8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80 buy 8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80 for 8')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80 4 8')).toEqual(set(80, 8));
  });

  it('uses unit words to tell weight from reps, in any order', () => {
    expect(parseVoiceCommand('80 kg 8 reps')).toEqual(set(80, 8));
    expect(parseVoiceCommand('80kg for 8 reps')).toEqual(set(80, 8));
    expect(parseVoiceCommand('8 reps at 80 kilos')).toEqual(set(80, 8));
    expect(parseVoiceCommand('10 reps with 60')).toEqual(set(60, 10));
    expect(parseVoiceCommand('12 reps')).toEqual(set(null, 12));
    expect(parseVoiceCommand('100 kilos')).toEqual(set(100, null));
  });

  it('parses number words ("eighty by eight")', () => {
    expect(parseVoiceCommand('eighty by eight')).toEqual(set(80, 8));
    expect(parseVoiceCommand('eighty two by twelve')).toEqual(set(82, 12));
    expect(parseVoiceCommand('one hundred and five kilos for three reps')).toEqual(set(105, 3));
    expect(parseVoiceCommand('a hundred by five')).toEqual(set(100, 5));
  });

  it('handles decimals and halves', () => {
    expect(parseVoiceCommand('82.5 by 6')).toEqual(set(82.5, 6));
    expect(parseVoiceCommand('82 point 5 by 6')).toEqual(set(82.5, 6));
    expect(parseVoiceCommand('eighty two and a half by six')).toEqual(set(82.5, 6));
    expect(parseVoiceCommand('22,5 by 10')).toEqual(set(22.5, 10));
  });

  it('does not merge two separate number words', () => {
    expect(parseVoiceCommand('eight ten')).toEqual(set(8, 10));
  });

  it('picks up "save" to log hands-free', () => {
    expect(parseVoiceCommand('80 by 8 save')).toEqual(set(80, 8, true));
    expect(parseVoiceCommand('Save.')).toEqual({ kind: 'save' });
  });

  it('recognises "same as last"', () => {
    expect(parseVoiceCommand('same as last')).toEqual({ kind: 'repeatLast', save: false });
    expect(parseVoiceCommand('same again and save')).toEqual({ kind: 'repeatLast', save: true });
    expect(parseVoiceCommand('repeat')).toEqual({ kind: 'repeatLast', save: false });
  });

  it('recognises cancel', () => {
    expect(parseVoiceCommand('cancel')).toEqual({ kind: 'cancel' });
    expect(parseVoiceCommand('never mind')).toEqual({ kind: 'cancel' });
  });

  it('returns unknown for gibberish or a lone number', () => {
    expect(parseVoiceCommand('what is the weather')).toEqual({ kind: 'unknown', text: 'what is the weather' });
    expect(parseVoiceCommand('80')).toEqual({ kind: 'unknown', text: '80' });
    expect(parseVoiceCommand('')).toEqual({ kind: 'unknown', text: '' });
  });

  it('rejects out of range values', () => {
    expect(parseVoiceCommand('20000 by 5').kind).toBe('unknown');
  });
});
