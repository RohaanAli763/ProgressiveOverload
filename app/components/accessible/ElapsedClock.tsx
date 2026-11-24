import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatClock, spokenDuration } from '../../lib/session';

// Workout duration shown in the header. Ticks on its own so the rest of the screen doesn't re-render every second.
export default function ElapsedClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sec = (now - startedAt) / 1000;

  return (
    <View style={styles.pill} accessible accessibilityLabel={`Workout time ${spokenDuration(sec)}`}>
      <View style={styles.dot} />
      <Text style={styles.text}>{formatClock(sec)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(35, 134, 54, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(35, 134, 54, 0.5)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ea043' },
  text: { color: '#c9d1d9', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
});
