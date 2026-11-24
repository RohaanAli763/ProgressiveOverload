import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useA11y } from '../accessibility/A11yContext';
import { dailySeries, e1rm, shortDate, trendSummary, type SetLog } from '../lib/progress';
import { formatValue } from '../lib/wheel';

type Metric = 'weight' | 'e1rm';

// Full-screen progress for one exercise: trend sentence, line chart, bests, and every session as text.
// The session list carries the same data as the chart, so TalkBack users get all of it.
export default function ExerciseProgress({
  name,
  logs,
  onClose,
}: {
  name: string | null; // null = closed
  logs: SetLog[]; // this exercise only
  onClose: () => void;
}) {
  const { prefs } = useA11y();
  const insets = useSafeAreaInsets();
  const [metric, setMetric] = useState<Metric>('weight');
  const [chartWidth, setChartWidth] = useState(0);

  const series = useMemo(() => dailySeries(logs), [logs]);
  const trend = trendSummary(series);
  const bestWeight = series.reduce((m, p) => Math.max(m, p.bestWeight), 0);
  const bestE1rm = series.reduce((m, p) => Math.max(m, p.bestE1rm), 0);

  const values = series.map((p) => (metric === 'weight' ? p.bestWeight : p.bestE1rm));
  const minValue = values.length ? Math.min(...values) : 0;
  // Start the axis a bit below the lowest point so small gains are visible.
  const yAxisOffset = Math.max(0, Math.floor((minValue * 0.85) / 5) * 5);
  // Label at most ~5 points so dates don't overlap.
  const labelEvery = Math.max(1, Math.ceil(series.length / 5));
  const chartData = series.map((p, i) => ({
    value: metric === 'weight' ? p.bestWeight : p.bestE1rm,
    label: i % labelEvery === 0 || i === series.length - 1 ? shortDate(p.date) : '',
  }));

  const Y_LABEL_W = 36;
  const plotWidth = Math.max(0, chartWidth - Y_LABEL_W - 16);

  return (
    <Modal visible={name !== null} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Back to history"
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color="#58a6ff" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title} accessibilityRole="header">
            {name}
          </Text>
          <Text style={styles.trend}>{trend}</Text>

          <View style={styles.statsRow}>
            <Stat label="BEST WEIGHT" value={`${formatValue(bestWeight)} kg`} spoken={`Best weight ${formatValue(bestWeight)} kilograms`} />
            <Stat label="EST. 1RM" value={`${formatValue(bestE1rm)} kg`} spoken={`Estimated one rep max ${formatValue(bestE1rm)} kilograms`} />
            <Stat label="SESSIONS" value={String(series.length)} spoken={`${series.length} sessions`} />
          </View>

          <View style={styles.card}>
            <View style={styles.metricRow} accessibilityRole="tablist">
              {(['weight', 'e1rm'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMetric(m)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: metric === m }}
                  style={({ pressed }) => [styles.chip, metric === m && styles.chipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, metric === m && styles.chipTextActive]}>
                    {m === 'weight' ? 'Top weight' : 'Est. 1RM'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
              accessible
              accessibilityLabel={`Chart of ${metric === 'weight' ? 'top weight' : 'estimated one rep max'} per session. ${trend}.`}
            >
              {series.length < 2 ? (
                <Text style={styles.emptyChart}>Log this exercise on another day to see a chart.</Text>
              ) : (
                plotWidth > 0 && (
                  <LineChart
                    data={chartData}
                    width={plotWidth}
                    height={180}
                    adjustToWidth
                    disableScroll
                    initialSpacing={10}
                    endSpacing={10}
                    yAxisOffset={yAxisOffset}
                    noOfSections={4}
                    yAxisLabelWidth={Y_LABEL_W}
                    color="#58a6ff"
                    thickness={3}
                    dataPointsColor="#58a6ff"
                    dataPointsRadius={4}
                    areaChart
                    startFillColor="#58a6ff"
                    endFillColor="#58a6ff"
                    startOpacity={0.25}
                    endOpacity={0.02}
                    rulesColor="#21262d"
                    yAxisColor="#30363d"
                    xAxisColor="#30363d"
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    isAnimated={!prefs.reduceMotion}
                  />
                )
              )}
            </View>
          </View>

          <Text style={styles.sectionTitle}>SESSIONS</Text>
          <View style={styles.card}>
            {[...series].reverse().map((p) => (
              <View
                key={p.date}
                style={styles.sessionRow}
                accessible
                accessibilityLabel={`${shortDate(p.date)}, top set ${formatValue(p.topWeight)} kilograms for ${p.topReps} reps`}
              >
                <Text style={styles.sessionDate}>{shortDate(p.date)}</Text>
                <Text style={styles.sessionSet}>
                  {formatValue(p.topWeight)} kg x {p.topReps}
                </Text>
                <Text style={styles.sessionE1rm}>{formatValue(e1rm(p.topWeight, p.topReps))} e1RM</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Stat({ label, value, spoken }: { label: string; value: string; spoken: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={spoken}>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b141c' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, alignSelf: 'flex-start' },
  backText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { color: '#dae3ee', fontSize: 24, fontFamily: 'Montserrat_900Black' },
  trend: { color: '#58a6ff', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: '#dae3ee', fontSize: 16, fontFamily: 'Montserrat_900Black' },
  statLabel: { color: '#8b949e', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  metricRow: { flexDirection: 'row', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#30363d',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: 'rgba(88, 166, 255, 0.15)', borderColor: '#58a6ff' },
  chipText: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  chipTextActive: { color: '#58a6ff' },
  axisText: { color: '#8b949e', fontSize: 10, fontFamily: 'Montserrat_400Regular' },
  emptyChart: {
    color: '#8b949e',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    paddingVertical: 32,
  },
  sectionTitle: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 1, marginTop: 4 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 8 },
  sessionDate: { width: 64, color: '#8b949e', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  sessionSet: { flex: 1, color: '#c9d1d9', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  sessionE1rm: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  pressed: { opacity: 0.75 },
});
