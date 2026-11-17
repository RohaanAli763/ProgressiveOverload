import { buildCommitMap, getContributionColor, toLocalDateStr } from './commits';

describe('toLocalDateStr', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('getContributionColor', () => {
  it('maps counts to the 5 contribution levels', () => {
    expect(getContributionColor(0)).toBe('#161b22');
    expect(getContributionColor(1)).toBe('#0e4429');
    expect(getContributionColor(2)).toBe('#006d32');
    expect(getContributionColor(3)).toBe('#26a641');
    expect(getContributionColor(4)).toBe('#39d353');
    expect(getContributionColor(10)).toBe('#39d353');
  });
});

describe('buildCommitMap', () => {
  it('returns an empty map for no logs', () => {
    expect(buildCommitMap([])).toEqual({});
  });

  it('counts logs per local day', () => {
    const a = new Date(2026, 4, 10, 9, 0).toISOString();
    const b = new Date(2026, 4, 10, 18, 30).toISOString();
    const c = new Date(2026, 4, 11, 8, 0).toISOString();
    expect(buildCommitMap([{ logged_at: a }, { logged_at: b }, { logged_at: c }])).toEqual({
      '2026-05-10': 2,
      '2026-05-11': 1,
    });
  });
});
