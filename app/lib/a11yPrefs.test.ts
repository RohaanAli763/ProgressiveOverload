import { defaultPrefs, parsePrefs } from './a11yPrefs';

describe('parsePrefs', () => {
  it('returns defaults when nothing is stored', () => {
    expect(parsePrefs(null)).toEqual(defaultPrefs);
  });

  it('returns defaults for corrupt JSON', () => {
    expect(parsePrefs('{not json')).toEqual(defaultPrefs);
    expect(parsePrefs('42')).toEqual(defaultPrefs);
    expect(parsePrefs('null')).toEqual(defaultPrefs);
  });

  it('keeps valid stored values', () => {
    const stored = JSON.stringify({ highContrast: true, weightStep: 5, haptics: false, leftHanded: true });
    expect(parsePrefs(stored)).toEqual({
      ...defaultPrefs,
      highContrast: true,
      weightStep: 5,
      haptics: false,
      leftHanded: true,
    });
  });

  it('ignores unknown keys, old keys and wrong types', () => {
    const stored = JSON.stringify({ leftHanded: 'yes', weightStep: 3, textScale: 1.5, oneHanded: true });
    expect(parsePrefs(stored)).toEqual(defaultPrefs);
  });

  it('fills missing keys from the given base', () => {
    const base = { ...defaultPrefs, reduceMotion: true };
    expect(parsePrefs(JSON.stringify({ leftHanded: true }), base)).toEqual({ ...base, leftHanded: true });
  });
});
