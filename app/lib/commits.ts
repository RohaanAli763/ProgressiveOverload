/** Returns YYYY-MM-DD using local time so day boundaries are correct. */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getContributionColor(count: number): string {
  if (count === 0) return '#161b22';
  if (count === 1) return '#0e4429'; // Lvl 1
  if (count === 2) return '#006d32'; // Lvl 2
  if (count === 3) return '#26a641'; // Lvl 3
  return '#39d353'; // Lvl 4+ (full green)
}

/** Counts improvement logs per local calendar day (YYYY-MM-DD). */
export function buildCommitMap(logs: { logged_at: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  logs.forEach((log) => {
    const dateStr = toLocalDateStr(new Date(log.logged_at));
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  });
  return counts;
}
