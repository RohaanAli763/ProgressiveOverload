import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type WorkoutDay = {
  id: string;
  name: string;
  note: string;
  muscleGroups: MuscleGroup[];
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

export type Exercise = {
  id: string;
  name: string;
  prescription: string;
};

export type MuscleGroup = {
  id: string;
  name: string;
  exercises: Exercise[];
};

export default function Home({
  workoutDays,
  onRemoveDay,
  onOpenAdd,
}: {
  workoutDays: WorkoutDay[];
  onRemoveDay: (id: string) => void;
  onOpenAdd: () => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.cardStack}>
        {workoutDays.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fitness-center" size={32} color="#8b949e" style={styles.emptyIcon} />
            <Text style={styles.noWorkoutText}>You have no workout days yet</Text>
          </View>
        )}

        {workoutDays.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.accentBar} />
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.note}</Text>
              </View>
              <View style={styles.cardActions}>
                <View style={styles.iconBubble}>
                  <MaterialIcons name={item.icon} size={18} color="#238636" />
                </View>
                <Pressable
                  onPress={() => onRemoveDay(item.id)}
                  style={({ pressed }) => [styles.trashButton, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete" size={20} color="#8b949e" />
                </Pressable>
              </View>
            </View>

            <View style={styles.tagRow}>
              {item.muscleGroups.map((group) => (
                <View key={group.id} style={styles.tag}>
                  <Text style={styles.tagText}>{group.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable onPress={onOpenAdd} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
          <View style={styles.createInner}>
            <MaterialIcons name="add" size={24} color="#c9d1d9" />
          </View>
          <Text style={styles.createTitle}>Create Workout Day</Text>
          <Text style={styles.createSubtitle}>Build a routine from scratch</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 104,
  },
  cardStack: {
    gap: 10,
  },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 11,
    padding: 10,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#238636',
    opacity: 0,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: {
    color: '#c9d1d9',
    fontSize: 21,
    lineHeight: 26,
    fontFamily: 'Montserrat_700Bold',
  },
  cardSubtitle: { color: '#8b949e', fontSize: 13, lineHeight: 18, fontFamily: 'Montserrat_400Regular' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#222b33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashButton: { padding: 5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  tag: {
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  tagText: {
    color: '#8b949e',
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: 'Montserrat_700Bold',
  },
  pressed: { opacity: 0.75 },
  emptyContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  noWorkoutText: {
    color: '#8b949e',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  createCard: {
    marginTop: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#0d1117',
    borderRadius: 11,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  createInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222b33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  createTitle: {
    color: '#c9d1d9',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  createSubtitle: {
    color: '#8b949e',
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
  },
});
