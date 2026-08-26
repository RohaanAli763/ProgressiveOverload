import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { WorkoutDay, MuscleGroup, Exercise, ExerciseSet } from './Home';
import { upsertSingleSet, deleteSingleSet } from '../services/workoutService';

// ─── Local Types ──────────────────────────────────────────────────────────────

/** In-memory representation of a set (numbers, not strings) */
type LocalSet = {
  id: string;           // 'new-<ts>' for rows not yet in DB
  setNumber: number;    // original / DB set_number (used for uniqueness)
  weight: number | null;
  reps: number | null;
  previous: string | null; // stored in `notes` column
};

type EditingRef = {
  exId: string;
  exName: string;
  setIdx: number;   // index in setsMap[exId]
  isNew: boolean;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkoutDetailProps {
  day: WorkoutDay;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalSets(sets: ExerciseSet[]): LocalSet[] {
  return sets.map((s) => ({
    id: s.id,
    setNumber: s.setNumber,
    weight: s.weight,
    reps: s.reps,
    previous: s.previous,
  }));
}

function fmt(val: number | null): string {
  return val !== null ? String(val) : '—';
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

function SetRow({
  displayNum,
  set,
  onPress,
  onDelete,
}: {
  displayNum: number;
  set: LocalSet;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowS.row, pressed && rowS.rowPressed]}
    >
      {/* Set number badge */}
      <View style={rowS.badge}>
        <Text style={rowS.badgeText}>{displayNum}</Text>
      </View>

      {/* Previous */}
      <Text style={rowS.prevText} numberOfLines={1}>
        {set.previous ?? '—'}
      </Text>

      {/* KG */}
      <View style={rowS.valueBox}>
        <Text style={[rowS.valueText, set.weight === null && rowS.emptyValue]}>
          {fmt(set.weight)}
        </Text>
      </View>

      {/* Reps */}
      <View style={rowS.valueBox}>
        <Text style={[rowS.valueText, set.reps === null && rowS.emptyValue]}>
          {fmt(set.reps)}
        </Text>
      </View>

      {/* Delete */}
      <Pressable
        onPress={(e) => { e.stopPropagation(); onDelete(); }}
        hitSlop={10}
        style={({ pressed }) => [rowS.delBtn, pressed && rowS.delBtnPressed]}
      >
        <MaterialIcons name="close" size={14} color="#6e7681" />
      </Pressable>
    </Pressable>
  );
}

const rowS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  rowPressed: { backgroundColor: 'rgba(88, 166, 255, 0.07)' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeText: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_700Bold' },
  prevText: {
    flex: 1,
    color: '#6e7681',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  valueBox: {
    width: 56,
    height: 30,
    backgroundColor: '#21262d',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  valueText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  emptyValue: { color: '#3d444e' },
  delBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  delBtnPressed: { backgroundColor: 'rgba(248,81,73,0.12)' },
});

// ─── SetTableHeader ───────────────────────────────────────────────────────────

function SetTableHeader() {
  return (
    <View style={thS.row}>
      <Text style={[thS.cell, thS.setCol]}>SET</Text>
      <Text style={[thS.cell, thS.prevCol]}>PREVIOUS</Text>
      <Text style={[thS.cell, thS.valCol]}>KG</Text>
      <Text style={[thS.cell, thS.valCol]}>REPS</Text>
      <View style={thS.delCol} />
    </View>
  );
}

const thS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    marginBottom: 2,
  },
  cell: { color: '#6e7681', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  setCol: { width: 34 },
  prevCol: { flex: 1 },
  valCol: { width: 62, textAlign: 'center' },
  delCol: { width: 30 },
});

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  sets,
  onTapSet,
  onDeleteSet,
  onAddSet,
}: {
  exercise: Exercise;
  sets: LocalSet[];
  onTapSet: (idx: number) => void;
  onDeleteSet: (idx: number) => void;
  onAddSet: () => void;
}) {
  return (
    <View style={exS.card}>
      {/* Name */}
      <View style={exS.nameRow}>
        <MaterialIcons name="fiber-manual-record" size={8} color="#238636" />
        <Text style={exS.name}>{exercise.name}</Text>
      </View>
      {!!exercise.prescription && (
        <Text style={exS.prescription}>{exercise.prescription}</Text>
      )}

      {/* Table */}
      {sets.length > 0 && <SetTableHeader />}
      {sets.map((set, idx) => (
        <SetRow
          key={set.id}
          displayNum={idx + 1}
          set={set}
          onPress={() => onTapSet(idx)}
          onDelete={() => onDeleteSet(idx)}
        />
      ))}

      {/* Add set */}
      <Pressable
        onPress={onAddSet}
        style={({ pressed }) => [exS.addBtn, pressed && exS.addBtnPressed]}
      >
        <MaterialIcons name="add" size={15} color="#58a6ff" />
        <Text style={exS.addText}>Add Set</Text>
      </Pressable>
    </View>
  );
}

const exS = StyleSheet.create({
  card: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21262d',
    marginTop: 10,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  name: {
    color: '#c9d1d9',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
  },
  prescription: {
    color: '#6e7681',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  addBtnPressed: { opacity: 0.55 },
  addText: { color: '#58a6ff', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
});

// ─── MuscleGroupAccordion ─────────────────────────────────────────────────────

function MuscleGroupAccordion({
  mg,
  setsMap,
  onTapSet,
  onDeleteSet,
  onAddSet,
}: {
  mg: MuscleGroup;
  setsMap: Record<string, LocalSet[]>;
  onTapSet: (exId: string, exName: string, idx: number) => void;
  onDeleteSet: (exId: string, idx: number) => void;
  onAddSet: (exId: string, exName: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalSets = mg.exercises.reduce((n, ex) => n + (setsMap[ex.id]?.length ?? 0), 0);

  return (
    <View style={mgS.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [mgS.header, pressed && mgS.headerPressed]}
      >
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
          size={20}
          color="#58a6ff"
        />
        <Text style={mgS.title}>{mg.name}</Text>
        <View style={mgS.badge}>
          <Text style={mgS.badgeText}>{totalSets} {totalSets === 1 ? 'set' : 'sets'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={mgS.body}>
          {mg.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              sets={setsMap[ex.id] ?? []}
              onTapSet={(idx) => onTapSet(ex.id, ex.name, idx)}
              onDeleteSet={(idx) => onDeleteSet(ex.id, idx)}
              onAddSet={() => onAddSet(ex.id, ex.name)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const mgS = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  headerPressed: { backgroundColor: '#1c232d' },
  title: { flex: 1, color: '#dae3ee', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  badge: {
    backgroundColor: '#21262d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  badgeText: { color: '#8b949e', fontSize: 10, fontFamily: 'Montserrat_700Bold' },
  body: { paddingHorizontal: 10, paddingBottom: 12 },
});

// ─── EditSetModal ─────────────────────────────────────────────────────────────

function EditSetModal({
  visible,
  exName,
  displayNum,
  initialWeight,
  initialReps,
  isSaving,
  onSave,
  onCancel,
}: {
  visible: boolean;
  exName: string;
  displayNum: number;
  initialWeight: string;
  initialReps: string;
  isSaving: boolean;
  onSave: (weight: string, reps: string) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);

  // Reset inputs every time the modal opens for a different set
  React.useEffect(() => {
    if (visible) {
      setWeight(initialWeight);
      setReps(initialReps);
    }
  }, [visible, initialWeight, initialReps]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={modalS.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); onCancel(); }} />

        <Pressable style={modalS.card} onPress={Keyboard.dismiss}>
          {/* Title */}
          <View style={modalS.titleRow}>
            <MaterialIcons name="edit" size={16} color="#58a6ff" />
            <Text style={modalS.title} numberOfLines={1}>
              {exName}
            </Text>
            <View style={modalS.setChip}>
              <Text style={modalS.setChipText}>Set {displayNum}</Text>
            </View>
          </View>

          <Text style={modalS.hint}>Tap Save to record this set and update your history.</Text>

          {/* Inputs row */}
          <View style={modalS.inputsRow}>
            {/* Weight */}
            <View style={modalS.inputGroup}>
              <Text style={modalS.inputLabel}>WEIGHT (KG)</Text>
              <TextInput
                style={modalS.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#3d444e"
                selectTextOnFocus
                autoFocus
              />
            </View>

            <View style={modalS.divider} />

            {/* Reps */}
            <View style={modalS.inputGroup}>
              <Text style={modalS.inputLabel}>REPS</Text>
              <TextInput
                style={modalS.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#3d444e"
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Actions */}
          <View style={modalS.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isSaving}
              style={({ pressed }) => [modalS.cancelBtn, pressed && modalS.btnPressed]}
            >
              <Text style={modalS.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => onSave(weight, reps)}
              disabled={isSaving}
              style={({ pressed }) => [
                modalS.saveBtn,
                isSaving && modalS.saveBtnDisabled,
                pressed && modalS.btnPressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={15} color="#fff" />
                  <Text style={modalS.saveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#dae3ee',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  setChip: {
    backgroundColor: '#21262d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  setChipText: {
    color: '#58a6ff',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  hint: {
    color: '#6e7681',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 16,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  inputLabel: {
    color: '#6e7681',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    color: '#c9d1d9',
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 52,
    backgroundColor: '#30363d',
    marginHorizontal: 12,
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#8b949e', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#238636',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#238636',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  btnPressed: { opacity: 0.7 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutDetail({ day, onBack }: WorkoutDetailProps) {
  // Build initial local set state from workout day data
  const [setsMap, setSetsMap] = useState<Record<string, LocalSet[]>>(() => {
    const map: Record<string, LocalSet[]> = {};
    for (const mg of day.muscleGroups) {
      for (const ex of mg.exercises) {
        map[ex.id] = toLocalSets(ex.sets ?? []);
      }
    }
    return map;
  });

  // Which set is being edited
  const [editing, setEditing] = useState<EditingRef | null>(null);
  const [isSavingSet, setIsSavingSet] = useState(false);

  // Derive modal display values from the current editing target
  const editingSet = editing ? setsMap[editing.exId]?.[editing.setIdx] : null;
  const modalInitWeight = editingSet?.weight !== null ? String(editingSet?.weight ?? '') : '';
  const modalInitReps   = editingSet?.reps   !== null ? String(editingSet?.reps   ?? '') : '';

  // ── Open popup for existing set ──────────────────────────────────────────

  const handleTapSet = useCallback((exId: string, exName: string, setIdx: number) => {
    setEditing({ exId, exName, setIdx, isNew: false });
  }, []);

  // ── Add new set, then immediately open popup ──────────────────────────────

  const handleAddSet = useCallback((exId: string, exName: string) => {
    setSetsMap((prev) => {
      const current = prev[exId] ?? [];
      const last = current[current.length - 1];
      // Use max existing setNumber + 1 to avoid DB uniqueness conflicts
      const maxNum = current.reduce((m, s) => Math.max(m, s.setNumber), 0);
      const newSet: LocalSet = {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        setNumber: maxNum + 1,
        weight: last?.weight ?? null,
        reps: last?.reps ?? null,
        previous: null,
      };
      return { ...prev, [exId]: [...current, newSet] };
    });
    // Open modal for the new last set (index = current.length)
    setSetsMap((prev) => {
      const idx = (prev[exId] ?? []).length - 1;
      setEditing({ exId, exName, setIdx: idx, isNew: true });
      return prev; // no mutation
    });
  }, []);

  // ── Delete a set ─────────────────────────────────────────────────────────

  const handleDeleteSet = useCallback((exId: string, idx: number) => {
    const set = setsMap[exId]?.[idx];
    if (!set) return;

    const doDelete = async () => {
      // If it's a real DB row, delete it remotely
      if (!set.id.startsWith('new-')) {
        await deleteSingleSet(set.id);
      }
      setSetsMap((prev) => {
        const updated = prev[exId].filter((_, i) => i !== idx);
        return { ...prev, [exId]: updated };
      });
    };

    if (set.id.startsWith('new-')) {
      doDelete();
    } else {
      Alert.alert('Remove Set', 'Delete this set?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [setsMap]);

  // ── Save popup ────────────────────────────────────────────────────────────

  const handleModalSave = async (weightStr: string, repsStr: string) => {
    if (!editing) return;
    const { exId, setIdx, isNew } = editing;
    const set = setsMap[exId]?.[setIdx];
    if (!set) return;

    const newWeight = weightStr.trim() !== '' ? parseFloat(weightStr) : null;
    const newReps   = repsStr.trim()   !== '' ? parseInt(repsStr, 10) : null;

    // Carry current values → previous (only if they were real numbers, not for brand-new sets)
    let newPrevious = set.previous;
    if (!isNew && set.weight !== null && set.reps !== null) {
      newPrevious = `${set.weight} x ${set.reps}`;
    }

    const updatedSet: ExerciseSet = {
      id: set.id,
      exerciseId: exId,
      setNumber: set.setNumber,
      weight: newWeight,
      reps: newReps,
      previous: newPrevious,
    };

    setIsSavingSet(true);
    try {
      const { success, savedId } = await upsertSingleSet(exId, updatedSet);
      if (!success) {
        Alert.alert('Error', 'Could not save set. Please try again.');
        return;
      }

      // Update local state immediately — no re-fetch needed
      setSetsMap((prev) => {
        const updated = [...prev[exId]];
        updated[setIdx] = {
          ...updated[setIdx],
          id: savedId,           // replace temp id with real DB id on insert
          weight: newWeight,
          reps: newReps,
          previous: newPrevious,
        };
        return { ...prev, [exId]: updated };
      });
      setEditing(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'An error occurred.');
    } finally {
      setIsSavingSet(false);
    }
  };

  // ── Cancel popup ──────────────────────────────────────────────────────────

  const handleModalCancel = useCallback(() => {
    if (!editing) return;
    const { exId, setIdx, isNew } = editing;
    if (isNew) {
      // Remove the optimistically-added row
      setSetsMap((prev) => {
        const updated = prev[exId].filter((_, i) => i !== setIdx);
        return { ...prev, [exId]: updated };
      });
    }
    setEditing(null);
  }, [editing]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
        >
          <MaterialIcons name="arrow-back" size={22} color="#58a6ff" />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <Text style={s.headerTitle} numberOfLines={1}>{day.name}</Text>

        {/* Done — data already saved per-set via popup */}
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [s.doneBtn, pressed && s.pressed]}
        >
          <MaterialIcons name="check" size={15} color="#fff" />
          <Text style={s.doneBtnText}>DONE</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout note */}
        {!!day.note && (
          <View style={s.noteCard}>
            <View style={s.noteIconRow}>
              <MaterialIcons name="sticky-note-2" size={15} color="#d29922" />
              <Text style={s.noteLabel}>WORKOUT NOTE</Text>
            </View>
            <Text style={s.noteText}>{day.note}</Text>
          </View>
        )}

        {/* Hint */}
        <View style={s.hintRow}>
          <MaterialIcons name="touch-app" size={13} color="#6e7681" />
          <Text style={s.hintText}>Tap a set row to log weight & reps</Text>
        </View>

        {/* Muscle group accordions */}
        {day.muscleGroups.map((mg) => (
          <MuscleGroupAccordion
            key={mg.id}
            mg={mg}
            setsMap={setsMap}
            onTapSet={handleTapSet}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
          />
        ))}
      </ScrollView>

      {/* Edit set modal */}
      <EditSetModal
        visible={!!editing}
        exName={editing?.exName ?? ''}
        displayNum={(editing ? setsMap[editing.exId]?.findIndex((_, i) => i === editing.setIdx) ?? 0 : 0) + 1}
        initialWeight={modalInitWeight}
        initialReps={modalInitReps}
        isSaving={isSavingSet}
        onSave={handleModalSave}
        onCancel={handleModalCancel}
      />
    </View>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b141c' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    paddingVertical: 4,
  },
  backText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  headerTitle: {
    flex: 1,
    color: '#dae3ee',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#238636',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    minWidth: 72,
    justifyContent: 'center',
    shadowColor: '#238636',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  doneBtnText: { color: '#fff', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  pressed: { opacity: 0.7 },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 80,
  },

  noteCard: {
    backgroundColor: '#1c1a0f',
    borderWidth: 1,
    borderColor: '#3d3109',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 6,
  },
  noteIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteLabel: { color: '#d29922', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 1 },
  noteText: { color: '#c9b46a', fontSize: 13, fontFamily: 'Montserrat_400Regular', lineHeight: 19 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  hintText: { color: '#6e7681', fontSize: 11, fontFamily: 'Montserrat_400Regular' },
});
