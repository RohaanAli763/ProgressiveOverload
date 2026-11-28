import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ExerciseProgress from './ExerciseProgress';
import { toLocalDateStr } from '../lib/commits';
import { exerciseOverviews, shortDate, weekStats, type SetLog } from '../lib/progress';
import { formatValue } from '../lib/wheel';

// History tab "Progress" card: weekly streak and one row per exercise; a row opens its chart.
export default function ProgressOverview({ logs }: { logs: SetLog[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => exerciseOverviews(logs), [logs]);
  const week = useMemo(
    () => weekStats(logs.map((l) => toLocalDateStr(new Date(l.loggedAt))), new Date()),
    [logs]
  );
  const selectedLogs = useMemo(
    () => (selectedId ? logs.filter((l) => l.exerciseId === selectedId) : []),
    [logs, selectedId]
  );
  const selectedName = rows.find((r) => r.exerciseId === selectedId)?.name ?? null;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Progress
      </Text>

      <View style={styles.weekRow}>
        <View style={styles.weekStat} accessible accessibilityLabel={`${week.daysThisWeek} workout days this week`}>
          <MaterialIcons name="event-available" size={18} color="#58a6ff" />
          <Text style={styles.weekVal}>{week.daysThisWeek}</Text>
          <Text style={styles.weekLabel}>THIS WEEK</Text>
        </View>
        <View style={styles.weekStat} accessible accessibilityLabel={`${week.streakWeeks} week streak`}>
          <MaterialIcons name="local-fire-department" size={18} color="#d29922" />
          <Text style={styles.weekVal}>{week.streakWeeks}</Text>
          <Text style={styles.weekLabel}>WEEK STREAK</Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="show-chart" size={24} color="#8b949e" />
          <Text style={styles.emptyText}>No sets logged yet.</Text>
          <Text style={styles.emptySub}>Save a set in a workout and its progress shows up here.</Text>
        </View>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.exerciseId}
            onPress={() => setSelectedId(r.exerciseId)}
            accessibilityRole="button"
            accessibilityLabel={`${r.name}. Best ${formatValue(r.bestWeight)} kilograms. ${r.trend}. ${r.sessions} sessions.`}
            accessibilityHint="Opens the progress chart"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowName} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.rowTrend} numberOfLines={1}>
                {r.trend} · last {shortDate(r.lastDate)}
              </Text>
            </View>
            <Text style={styles.rowBest}>{formatValue(r.bestWeight)} kg</Text>
            <MaterialIcons name="chevron-right" size={20} color="#8b949e" />
          </Pressable>
        ))
      )}

      <ExerciseProgress name={selectedName} logs={selectedLogs} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  title: { color: '#dae3ee', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  weekRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  weekStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  weekVal: { color: '#dae3ee', fontSize: 18, fontFamily: 'Montserrat_900Black' },
  weekLabel: { color: '#8b949e', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.5, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  rowMain: { flex: 1, gap: 2 },
  rowName: { color: '#c9d1d9', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  rowTrend: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_400Regular' },
  rowBest: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_800ExtraBold' },
  empty: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyText: { color: '#c9d1d9', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  emptySub: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_400Regular', textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
