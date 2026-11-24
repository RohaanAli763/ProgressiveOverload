import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatClock, formatThousands, spokenDuration, type SessionSummary } from '../lib/session';

// End-of-workout card: the payoff moment. Big numbers, one button.
export default function WorkoutSummary({
  summary,
  dayName,
  prCount,
  onClose,
}: {
  summary: SessionSummary | null;
  dayName: string;
  prCount: number;
  onClose: () => void;
}) {
  const stats = summary
    ? [
        { key: 'time', icon: 'timer', value: formatClock(summary.durationSec), label: 'TIME', spoken: spokenDuration(summary.durationSec) },
        { key: 'sets', icon: 'check-circle', value: String(summary.sets), label: 'SETS', spoken: `${summary.sets} sets` },
        { key: 'volume', icon: 'fitness-center', value: `${formatThousands(summary.volume)}`, label: 'KG LIFTED', spoken: `${formatThousands(summary.volume)} kilograms lifted` },
        { key: 'improved', icon: 'trending-up', value: String(summary.improvedSets), label: 'BEAT LAST TIME', spoken: `${summary.improvedSets} sets beat last time` },
      ] as const
    : [];

  return (
    <Modal visible={!!summary} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <MaterialIcons name="emoji-events" size={40} color="#d29922" />
          <Text style={styles.title} accessibilityRole="header">
            WORKOUT DONE
          </Text>
          <Text style={styles.subtitle}>
            {dayName}
            {summary ? ` · ${summary.exercises} ${summary.exercises === 1 ? 'exercise' : 'exercises'}` : ''}
          </Text>

          {prCount > 0 && (
            <View style={styles.prRow} accessible accessibilityLabel={`${prCount} new personal ${prCount === 1 ? 'record' : 'records'}`}>
              <MaterialIcons name="emoji-events" size={18} color="#d29922" />
              <Text style={styles.prText}>
                {prCount} NEW {prCount === 1 ? 'PR' : 'PRS'}
              </Text>
            </View>
          )}

          <View style={styles.grid}>
            {stats.map((st) => (
              <View key={st.key} style={styles.stat} accessible accessibilityLabel={st.spoken}>
                <MaterialIcons name={st.icon} size={18} color="#58a6ff" />
                <Text style={styles.statValue} maxFontSizeMultiplier={1.4}>
                  {st.value}
                </Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done, back to workouts"
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.btnText}>DONE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#161b22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#c9d1d9',
    fontSize: 22,
    fontFamily: 'Montserrat_900Black',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  subtitle: { color: '#8b949e', fontSize: 13, fontFamily: 'Montserrat_400Regular', marginBottom: 8 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#1c1a0f',
    borderWidth: 1,
    borderColor: '#d29922',
    marginBottom: 8,
  },
  prText: { color: '#d29922', fontSize: 13, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginBottom: 8 },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: '#0d1117',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#21262d',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: '#c9d1d9', fontSize: 24, fontFamily: 'Montserrat_800ExtraBold' },
  statLabel: { color: '#8b949e', fontSize: 10, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 10,
    backgroundColor: '#238636',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.8 },
  pressed: { opacity: 0.75 },
});
