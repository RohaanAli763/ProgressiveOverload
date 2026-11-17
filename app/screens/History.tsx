import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchImprovements } from '../services/workoutService';
import { buildCommitMap, getContributionColor, toLocalDateStr } from '../lib/commits';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImprovementLog {
  id: string;
  weight: number | null;
  reps: number | null;
  logged_at: string;
  exercises: { name: string } | null;
}

interface GridDay {
  date: Date;
  count: number;
  dateStr: string;
}

type ViewMode = 'year' | 'month';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL  = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Year Grid ───────────────────────────────────────────────────────────────

function YearGrid({
  commitMap,
  scrollViewRef,
}: {
  commitMap: Record<string, number>;
  scrollViewRef: React.RefObject<ScrollView | null>;
}) {
  const gridWeeks = React.useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 370);
    startDate.setHours(0, 0, 0, 0);

    const weeks: GridDay[][] = [];
    const cur = new Date(startDate);
    for (let w = 0; w < 53; w++) {
      const week: GridDay[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toLocalDateStr(cur);
        week.push({ date: new Date(cur), count: commitMap[dateStr] || 0, dateStr });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [commitMap]);

  const monthHeaders = React.useMemo(() => {
    const headers: { month: string; colIdx: number }[] = [];
    let lastMonth = -1;
    gridWeeks.forEach((week, colIdx) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth) { headers.push({ month: MONTHS_SHORT[m], colIdx }); lastMonth = m; }
    });
    return headers;
  }, [gridWeeks]);

  return (
    <View style={yg.gridContainer}>
      {/* Weekday labels */}
      <View style={yg.weekdayLabels}>
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
          <Text key={i} style={yg.weekdayText}>{label}</Text>
        ))}
      </View>

      {/* Scrollable grid */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={yg.gridScroll}
      >
        <View>
          {/* Month header row */}
          <View style={yg.monthsRow}>
            {monthHeaders.map((hdr, idx) => (
              <Text key={idx} style={[yg.monthLabel, { left: hdr.colIdx * 13 }]}>
                {hdr.month}
              </Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={yg.columnsMatrix}>
            {gridWeeks.map((week, wIdx) => (
              <View key={wIdx} style={yg.gridColumn}>
                {week.map((day, dIdx) => (
                  <View
                    key={dIdx}
                    style={[yg.dayCell, { backgroundColor: getContributionColor(day.count) }]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const yg = StyleSheet.create({
  gridContainer: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  weekdayLabels: { justifyContent: 'space-between', paddingVertical: 22, width: 26 },
  weekdayText: {
    color: '#6e7681', fontSize: 9, fontFamily: 'Montserrat_700Bold',
    lineHeight: 9, textAlign: 'right',
  },
  gridScroll: { paddingRight: 10 },
  monthsRow: { height: 18, position: 'relative', marginBottom: 4 },
  monthLabel: { position: 'absolute', color: '#6e7681', fontSize: 9, fontFamily: 'Montserrat_700Bold' },
  columnsMatrix: { flexDirection: 'row', gap: 4 },
  gridColumn: { gap: 4 },
  dayCell: { width: 9, height: 9, borderRadius: 1.5 },
});

// ─── Month Grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  commitMap,
  viewYear,
  viewMonth,
  onPrev,
  onNext,
}: {
  commitMap: Record<string, number>;
  viewYear: number;
  viewMonth: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Build calendar cells: blanks for days before the 1st, then day cells
  const calRows = React.useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Total cells = leading blanks + days, padded to full weeks
    const total = firstDay + daysInMonth;
    const totalCells = Math.ceil(total / 7) * 7;

    const cells: (GridDay | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = toLocalDateStr(date);
      cells.push({ date, count: commitMap[dateStr] || 0, dateStr });
    }
    while (cells.length < totalCells) cells.push(null);

    // Split into rows of 7
    const rows: (GridDay | null)[][] = [];
    for (let r = 0; r < cells.length / 7; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [commitMap, viewYear, viewMonth]);

  // Stats for this month only
  const monthCommits = React.useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return Object.entries(commitMap)
      .filter(([k]) => k.startsWith(prefix))
      .reduce((sum, [, v]) => sum + v, 0);
  }, [commitMap, viewYear, viewMonth]);

  const monthActiveDays = React.useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return Object.keys(commitMap).filter((k) => k.startsWith(prefix)).length;
  }, [commitMap, viewYear, viewMonth]);

  return (
    <View>
      {/* Month navigator */}
      <View style={mg.navRow}>
        <Pressable onPress={onPrev} style={({ pressed }) => [mg.navBtn, pressed && mg.navBtnPressed]}>
          <MaterialIcons name="chevron-left" size={20} color="#58a6ff" />
        </Pressable>

        <View style={mg.monthNameWrap}>
          <Text style={mg.monthName}>{MONTHS_FULL[viewMonth]} {viewYear}</Text>
          {isCurrentMonth && <View style={mg.currentDot} />}
        </View>

        <Pressable
          onPress={onNext}
          disabled={isCurrentMonth}
          style={({ pressed }) => [mg.navBtn, pressed && mg.navBtnPressed, isCurrentMonth && mg.navBtnDisabled]}
        >
          <MaterialIcons name="chevron-right" size={20} color={isCurrentMonth ? '#3d444e' : '#58a6ff'} />
        </Pressable>
      </View>

      {/* Month stats strip */}
      <View style={mg.statsStrip}>
        <View style={mg.statItem}>
          <Text style={mg.statVal}>{monthCommits}</Text>
          <Text style={mg.statLbl}>commits</Text>
        </View>
        <View style={mg.statDivider} />
        <View style={mg.statItem}>
          <Text style={mg.statVal}>{monthActiveDays}</Text>
          <Text style={mg.statLbl}>active days</Text>
        </View>
      </View>

      {/* Day-of-week column headers */}
      <View style={mg.dayHeaders}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={mg.dayHeaderText}>{d}</Text>
        ))}
      </View>

      {/* Calendar rows */}
      {calRows.map((row, rIdx) => (
        <View key={rIdx} style={mg.calRow}>
          {row.map((cell, cIdx) => {
            if (!cell) {
              return <View key={cIdx} style={mg.emptyCell} />;
            }
            const isToday = toLocalDateStr(today) === cell.dateStr;
            return (
              <View
                key={cIdx}
                style={[
                  mg.dayCell,
                  { backgroundColor: getContributionColor(cell.count) },
                  isToday && mg.todayCell,
                ]}
              >
                <Text style={[mg.dayNum, cell.count > 0 && mg.dayNumActive]}>
                  {cell.date.getDate()}
                </Text>
                {cell.count > 0 && (
                  <Text style={mg.commitCount}>{cell.count}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const mg = StyleSheet.create({
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6, borderRadius: 8 },
  navBtnPressed: { backgroundColor: 'rgba(88,166,255,0.12)' },
  navBtnDisabled: { opacity: 0.35 },
  monthNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthName: { color: '#dae3ee', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#39d353' },
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 0, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1,
    borderColor: '#21262d', paddingVertical: 8, marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 1 },
  statVal: { color: '#dae3ee', fontSize: 14, fontFamily: 'Montserrat_900Black' },
  statLbl: { color: '#6e7681', fontSize: 8, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 22, backgroundColor: '#21262d' },
  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderText: {
    flex: 1, textAlign: 'center', color: '#6e7681',
    fontSize: 10, fontFamily: 'Montserrat_700Bold',
  },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  emptyCell: { flex: 1, height: 42, margin: 1.5, borderRadius: 6, backgroundColor: 'transparent' },
  dayCell: {
    flex: 1, height: 42, margin: 1.5, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', gap: 1,
    borderWidth: 1, borderColor: '#21262d',
  },
  todayCell: { borderColor: '#58a6ff', borderWidth: 1.5 },
  dayNum: { color: '#6e7681', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  dayNumActive: { color: '#dae3ee' },
  commitCount: { color: '#ffffff', fontSize: 8, fontFamily: 'Montserrat_700Bold' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function History() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ImprovementLog[]>([]);
  const [commitMap, setCommitMap] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Month view navigation state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let isMounted = true;
    fetchImprovements().then((data) => {
      if (isMounted) {
        setLogs(data);
        setCommitMap(buildCommitMap(data));
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Auto-scroll year grid to the right
  useEffect(() => {
    if (!loading && viewMode === 'year') {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, viewMode]);

  // Month navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Grouped activity feed
  const groupedLogs = React.useMemo(() => {
    const groups: Record<string, ImprovementLog[]> = {};
    logs.forEach((log) => {
      const dateHeader = new Date(log.logged_at).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      if (!groups[dateHeader]) groups[dateHeader] = [];
      groups[dateHeader].push(log);
    });
    return groups;
  }, [logs]);

  // Overall stats
  const totalImprovements = logs.length;
  const activeDays = Object.keys(commitMap).length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#58a6ff" />
        <Text style={s.loadingText}>Loading history logs…</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

      {/* ── Overall Stats ── */}
      <View style={s.statsRow}>
        <View style={s.statsCard}>
          <Text style={s.statsVal}>{totalImprovements}</Text>
          <Text style={s.statsLabel}>Total Commits</Text>
        </View>
        <View style={s.statsCard}>
          <Text style={s.statsVal}>{activeDays}</Text>
          <Text style={s.statsLabel}>Active Days</Text>
        </View>
      </View>

      {/* ── Contribution Card ── */}
      <View style={s.card}>
        {/* Card heading + switch link */}
        <View style={s.cardHeadingRow}>
          <Text style={s.cardTitle}>Commit History</Text>
          <Pressable
            onPress={() => setViewMode(viewMode === 'year' ? 'month' : 'year')}
            style={({ pressed }) => [s.switchLink, pressed && s.switchLinkPressed]}
          >
            <Text style={s.switchLinkText}>
              {viewMode === 'year' ? 'Switch to Monthly' : 'Switch to Yearly'}
            </Text>
            <MaterialIcons
              name={viewMode === 'year' ? 'calendar-today' : 'date-range'}
              size={11}
              color="#58a6ff"
            />
          </Pressable>
        </View>
        <Text style={s.cardSubtitle}>
          {viewMode === 'year'
            ? 'Your exercise improvements over the past 12 months'
            : 'Daily activity for the selected month'}
        </Text>

        {viewMode === 'year' ? (
          <YearGrid commitMap={commitMap} scrollViewRef={scrollViewRef} />
        ) : (
          <MonthGrid
            commitMap={commitMap}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
          />
        )}

        {/* Legend */}
        <View style={s.legendRow}>
          <Text style={s.legendText}>Less</Text>
          {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map((c) => (
            <View key={c} style={[s.legendCell, { backgroundColor: c }]} />
          ))}
          <Text style={s.legendText}>More</Text>
        </View>
      </View>

      {/* ── Activity Feed ── */}
      <View style={s.feedCard}>
        <Text style={s.feedTitle}>Recent Activity</Text>
        <Text style={s.feedSub}>Last 7 active days</Text>

        {totalImprovements === 0 ? (
          <View style={s.emptyFeed}>
            <MaterialIcons name="history" size={24} color="#8b949e" />
            <Text style={s.emptyText}>No commits recorded yet.</Text>
            <Text style={s.emptySubtext}>Your set activity logs will show up here.</Text>
          </View>
        ) : (
          Object.keys(groupedLogs).slice(0, 7).map((dateHeader) => (
            <View key={dateHeader} style={s.dateGroup}>
              <Text style={s.groupHeader}>{dateHeader}</Text>
              <View style={s.groupBody}>
                {groupedLogs[dateHeader].map((log) => {
                  const logTime = new Date(log.logged_at).toLocaleTimeString(undefined, {
                    hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <View key={log.id} style={s.feedItem}>
                      <View style={s.timelineCol}>
                        <View style={s.timelineDot} />
                        <View style={s.timelineLine} />
                      </View>
                      <View style={s.feedInfo}>
                        <Text style={s.exerciseName} numberOfLines={1}>
                          {log.exercises?.name ?? 'Deleted Exercise'}
                        </Text>
                        <Text style={s.setDetails}>
                          {log.weight !== null ? `${log.weight} kg` : ''}
                          {log.weight !== null && log.reps !== null ? ' × ' : ''}
                          {log.reps !== null ? `${log.reps} reps` : ''}
                          {log.weight === null && log.reps === null ? 'empty set' : ''}
                        </Text>
                      </View>
                      <Text style={s.timeText}>{logTime}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { paddingBottom: 104, gap: 12 },
  center: { flex: 1, backgroundColor: '#0b141c', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#8b949e', fontSize: 13, fontFamily: 'Montserrat_400Regular' },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statsCard: {
    flex: 1, backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10, alignItems: 'center', gap: 1,
  },
  statsVal: { color: '#dae3ee', fontSize: 16, fontFamily: 'Montserrat_900Black' },
  statsLabel: { color: '#8b949e', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.5 },

  // Switch link
  cardHeadingRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 0,
  },
  switchLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  switchLinkPressed: { opacity: 0.5 },
  switchLinkText: {
    color: '#58a6ff',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(88,166,255,0.4)',
  },

  // Grid card
  card: {
    backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d',
    borderRadius: 11, padding: 14,
  },
  cardTitle: { color: '#c9d1d9', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  cardSubtitle: {
    color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_400Regular',
    marginTop: 2, marginBottom: 14,
  },

  // Legend
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 },
  legendText: { color: '#6e7681', fontSize: 9, fontFamily: 'Montserrat_700Bold', marginHorizontal: 2 },
  legendCell: { width: 9, height: 9, borderRadius: 1.5 },

  // Feed card
  feedCard: {
    backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d',
    borderRadius: 11, padding: 14, minHeight: 200,
  },
  feedTitle: { color: '#c9d1d9', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  feedSub: { color: '#6e7681', fontSize: 11, fontFamily: 'Montserrat_400Regular', marginBottom: 14, marginTop: 2 },
  emptyFeed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: '#dae3ee', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  emptySubtext: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_400Regular' },

  dateGroup: { marginBottom: 16 },
  groupHeader: {
    color: '#58a6ff', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.6,
    marginBottom: 10, backgroundColor: 'rgba(88, 166, 255, 0.08)',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 5, alignSelf: 'flex-start',
  },
  groupBody: { paddingLeft: 4 },
  feedItem: { flexDirection: 'row', alignItems: 'stretch', minHeight: 46 },
  timelineCol: { width: 16, alignItems: 'center' },
  timelineDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#238636', marginTop: 6, zIndex: 1,
  },
  timelineLine: { position: 'absolute', top: 12, bottom: -12, width: 1, backgroundColor: '#30363d' },
  feedInfo: { flex: 1, paddingLeft: 10, paddingBottom: 10, gap: 2 },
  exerciseName: { color: '#dae3ee', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  setDetails: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_400Regular' },
  timeText: {
    color: '#6e7681', fontSize: 11, fontFamily: 'Montserrat_400Regular', textAlign: 'right', paddingLeft: 8,
  },
});
