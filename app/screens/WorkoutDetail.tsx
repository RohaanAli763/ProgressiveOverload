import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { fetchSetLogs } from '../services/workoutService';
import { deleteSet, getQueue, saveSet, subscribeIdChanges } from '../services/offlineSync';
import { applyPending } from '../lib/offlineQueue';
import SyncPill from '../components/accessible/SyncPill';
import PrBanner, { type PrNotice } from '../components/PrBanner';
import OverflowMenu from '../components/accessible/OverflowMenu';
import UndoSnackbar, { type UndoNotice } from '../components/accessible/UndoSnackbar';
import ExerciseProgress from '../components/ExerciseProgress';
import { setLabel } from '../lib/a11yLabels';
import { applyToBest, bestsByExercise, detectPR, type Best, type SetLog } from '../lib/progress';
import NumberWheel from '../components/accessible/NumberWheel';
import VoiceButton from '../components/accessible/VoiceButton';
import { VOICE_HELP, type VoiceCommand } from '../lib/voiceCommand';
import RestTimer from '../components/accessible/RestTimer';
import ElapsedClock from '../components/accessible/ElapsedClock';
import WorkoutSummary from '../components/WorkoutSummary';
import { triggerHaptic } from '../input/haptics';
import { speak } from '../input/speech';
import { useA11y } from '../accessibility/A11yContext';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  DEFAULT_REST_SEC,
  doneKey,
  MIN_REST_SEC,
  summarizeSession,
  type DoneSet,
  type SessionSummary,
} from '../lib/session';
import {
  buildValues,
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  formatValue,
  REPS_MAX,
  REPS_MIN,
  REPS_TYPED_MAX,
  WEIGHT_MAX,
  WEIGHT_MIN,
  WEIGHT_TYPED_MAX,
} from '../lib/wheel';

const REPS_VALUES = buildValues(REPS_MIN, REPS_MAX, 1);
const KEEP_AWAKE_TAG = 'gym-mode';
const MAX_REST_SEC = 600;

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
  onEdit: (day: WorkoutDay) => void;
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
  active,
  done,
  onPress,
  onDelete,
  onToggleDone,
}: {
  displayNum: number;
  set: LocalSet;
  active: boolean; // a workout is running: show the done checkbox instead of delete
  done: boolean;
  onPress: () => void;
  onDelete: () => void;
  onToggleDone: () => void;
}) {
  const hc = useA11y().prefs.highContrast;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={setLabel(displayNum, set, done)}
      accessibilityHint="Opens weight and reps"
      style={({ pressed }) => [rowS.row, done && rowS.rowDone, pressed && rowS.rowPressed]}
    >
      {/* Set number badge */}
      <View style={[rowS.badge, hc && rowHC.badge]}>
        <Text style={[rowS.badgeText, hc && rowHC.text]} maxFontSizeMultiplier={1.3}>{displayNum}</Text>
      </View>

      {/* Previous */}
      <Text style={[rowS.prevText, hc && rowHC.muted]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {set.previous ?? '—'}
      </Text>

      {/* KG */}
      <View style={[rowS.valueBox, hc && rowHC.valueBox]}>
        <Text
          style={[rowS.valueText, hc && rowHC.text, set.weight === null && rowS.emptyValue]}
          maxFontSizeMultiplier={1.3}
        >
          {fmt(set.weight)}
        </Text>
      </View>

      {/* Reps */}
      <View style={[rowS.valueBox, hc && rowHC.valueBox]}>
        <Text
          style={[rowS.valueText, hc && rowHC.text, set.reps === null && rowS.emptyValue]}
          maxFontSizeMultiplier={1.3}
        >
          {fmt(set.reps)}
        </Text>
      </View>

      {active ? (
        // Done: saves the set and starts the rest timer. Big target, delete is hidden mid-workout.
        <Pressable
          onPress={(e) => { e.stopPropagation(); onToggleDone(); }}
          hitSlop={4}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Set ${displayNum} done`}
          style={({ pressed }) => [rowS.checkBtn, hc && rowHC.checkBtn, done && rowS.checkBtnDone, pressed && rowS.checkPressed]}
        >
          <MaterialIcons name="check" size={22} color={done || hc ? '#fff' : '#8b949e'} />
        </Pressable>
      ) : (
        <Pressable
          onPress={(e) => { e.stopPropagation(); onDelete(); }}
          hitSlop={11}
          accessibilityRole="button"
          accessibilityLabel={`Delete set ${displayNum}`}
          style={({ pressed }) => [rowS.delBtn, pressed && rowS.delBtnPressed]}
        >
          <MaterialIcons name="close" size={16} color={hc ? '#ffffff' : '#8b949e'} />
        </Pressable>
      )}
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
  rowDone: { backgroundColor: 'rgba(35, 134, 54, 0.12)' },
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
    color: '#8b949e',
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
  emptyValue: { color: '#7d8590' },
  delBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  delBtnPressed: { backgroundColor: 'rgba(248,81,73,0.12)' },
  checkBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkBtnDone: { backgroundColor: '#238636', borderColor: '#2ea043' },
  checkPressed: { opacity: 0.75 },
});

// High contrast overrides for set rows (highContrastPalette in tokens.ts).
const rowHC = StyleSheet.create({
  badge: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#d0d7de' },
  valueBox: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  checkBtn: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
});

// ─── SetTableHeader ───────────────────────────────────────────────────────────

// Visual only: each row's accessibilityLabel already says what the columns mean.
function SetTableHeader({ active }: { active: boolean }) {
  const hc = useA11y().prefs.highContrast;
  const cell = [thS.cell, hc && thHC.cell];
  return (
    <View style={thS.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text style={[cell, thS.setCol]} maxFontSizeMultiplier={1.3}>SET</Text>
      <Text style={[cell, thS.prevCol]} maxFontSizeMultiplier={1.3}>PREVIOUS</Text>
      <Text style={[cell, thS.valCol]} maxFontSizeMultiplier={1.3}>KG</Text>
      <Text style={[cell, thS.valCol]} maxFontSizeMultiplier={1.3}>REPS</Text>
      {active ? <Text style={[cell, thS.doneCol]} maxFontSizeMultiplier={1.3}>DONE</Text> : <View style={thS.delCol} />}
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
  cell: { color: '#8b949e', fontSize: 9, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  setCol: { width: 34 },
  prevCol: { flex: 1 },
  valCol: { width: 62, textAlign: 'center' },
  delCol: { width: 30 },
  doneCol: { width: 46, textAlign: 'center' },
});

const thHC = StyleSheet.create({ cell: { color: '#d0d7de' } });

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  sets,
  active,
  doneSets,
  onTapSet,
  onDeleteSet,
  onAddSet,
  onToggleDone,
  onViewProgress,
  onEditRoutine,
}: {
  exercise: Exercise;
  sets: LocalSet[];
  active: boolean;
  doneSets: Record<string, DoneSet>;
  onTapSet: (idx: number) => void;
  onDeleteSet: (idx: number) => void;
  onAddSet: () => void;
  onToggleDone: (idx: number) => void;
  onViewProgress: () => void;
  onEditRoutine: () => void;
}) {
  const hc = useA11y().prefs.highContrast;
  // Rare actions live behind ⋮ (Hick's law). Editing the routine leaves the screen, so not mid-workout.
  const menuItems = [
    { key: 'progress', label: 'View progress', icon: 'show-chart' as const, onPress: onViewProgress },
    ...(active ? [] : [{ key: 'edit', label: 'Edit routine', icon: 'edit' as const, onPress: onEditRoutine }]),
  ];
  return (
    <View style={[exS.card, hc && exHC.card]}>
      {/* Name */}
      <View style={exS.nameRow}>
        <MaterialIcons name="fiber-manual-record" size={8} color="#238636" />
        <Text style={[exS.name, hc && exHC.text]} accessibilityRole="header">{exercise.name}</Text>
        <OverflowMenu
          title={exercise.name}
          items={menuItems}
          accessibilityLabel={`More options for ${exercise.name}`}
        />
      </View>
      {!!exercise.prescription && (
        <Text style={[exS.prescription, hc && exHC.muted]}>{exercise.prescription}</Text>
      )}

      {/* Table */}
      {sets.length > 0 && <SetTableHeader active={active} />}
      {sets.map((set, idx) => (
        <SetRow
          key={set.id}
          displayNum={idx + 1}
          set={set}
          active={active}
          done={!!doneSets[doneKey(exercise.id, set.setNumber)]}
          onPress={() => onTapSet(idx)}
          onDelete={() => onDeleteSet(idx)}
          onToggleDone={() => onToggleDone(idx)}
        />
      ))}

      {/* Add set */}
      <Pressable
        onPress={onAddSet}
        accessibilityRole="button"
        accessibilityLabel={`Add set to ${exercise.name}`}
        style={({ pressed }) => [exS.addBtn, pressed && exS.addBtnPressed]}
      >
        <MaterialIcons name="add" size={18} color={hc ? '#79c0ff' : '#58a6ff'} />
        <Text style={[exS.addText, hc && exHC.accent]}>Add Set</Text>
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
    paddingTop: 6,
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
    color: '#8b949e',
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
    minHeight: 48,
  },
  addBtnPressed: { opacity: 0.55 },
  addText: { color: '#58a6ff', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
});

const exHC = StyleSheet.create({
  card: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
  accent: { color: '#79c0ff' },
});

// ─── MuscleGroupAccordion ─────────────────────────────────────────────────────

function MuscleGroupAccordion({
  mg,
  setsMap,
  active,
  doneSets,
  onTapSet,
  onDeleteSet,
  onAddSet,
  onToggleDone,
  onViewProgress,
  onEditRoutine,
}: {
  mg: MuscleGroup;
  setsMap: Record<string, LocalSet[]>;
  active: boolean;
  doneSets: Record<string, DoneSet>;
  onTapSet: (exId: string, exName: string, idx: number) => void;
  onDeleteSet: (exId: string, idx: number) => void;
  onAddSet: (exId: string, exName: string) => void;
  onToggleDone: (exId: string, exName: string, idx: number) => void;
  onViewProgress: (exId: string, exName: string) => void;
  onEditRoutine: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalSets = mg.exercises.reduce((n, ex) => n + (setsMap[ex.id]?.length ?? 0), 0);
  const hc = useA11y().prefs.highContrast;

  return (
    <View style={[mgS.container, hc && mgHC.container]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${mg.name}, ${totalSets} ${totalSets === 1 ? 'set' : 'sets'}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [mgS.header, pressed && mgS.headerPressed]}
      >
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
          size={20}
          color={hc ? '#79c0ff' : '#58a6ff'}
        />
        <Text style={[mgS.title, hc && mgHC.text]}>{mg.name}</Text>
        <View style={[mgS.badge, hc && mgHC.badge]}>
          <Text style={[mgS.badgeText, hc && mgHC.muted]} maxFontSizeMultiplier={1.3}>
            {totalSets} {totalSets === 1 ? 'set' : 'sets'}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={mgS.body}>
          {mg.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              sets={setsMap[ex.id] ?? []}
              active={active}
              doneSets={doneSets}
              onTapSet={(idx) => onTapSet(ex.id, ex.name, idx)}
              onDeleteSet={(idx) => onDeleteSet(ex.id, idx)}
              onAddSet={() => onAddSet(ex.id, ex.name)}
              onToggleDone={(idx) => onToggleDone(ex.id, ex.name, idx)}
              onViewProgress={() => onViewProgress(ex.id, ex.name)}
              onEditRoutine={onEditRoutine}
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
  // (mgHC below holds the high contrast overrides)
  body: { paddingHorizontal: 10, paddingBottom: 12 },
});

const mgHC = StyleSheet.create({
  container: { backgroundColor: '#0d1117', borderColor: '#d0d7de' },
  badge: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
});

// ─── EditSetModal ─────────────────────────────────────────────────────────────

// Bottom sheet with two scroll wheels so a set can be logged with one thumb, no keyboard.
// Remounted (via `key`) for every set it opens, so its state always starts from that set.
function EditSetModal({
  visible,
  exName,
  displayNum,
  initialWeight,
  initialReps,
  previous,
  isNew,
  isSaving,
  onSave,
  onCancel,
}: {
  visible: boolean;
  exName: string;
  displayNum: number;
  initialWeight: number | null;
  initialReps: number | null;
  previous: string | null;
  isNew: boolean;
  isSaving: boolean;
  onSave: (weight: number, reps: number) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(initialWeight ?? DEFAULT_WEIGHT);
  const [reps, setReps] = useState(initialReps ?? DEFAULT_REPS);
  const { prefs } = useA11y();
  const hc = prefs.highContrast;
  const weightValues = useMemo(() => buildValues(WEIGHT_MIN, WEIGHT_MAX, prefs.weightStep), [prefs.weightStep]);

  // Voice: fill the wheels, optionally save. Returns the sentence spoken back to the user.
  const handleVoice = (cmd: VoiceCommand): string => {
    const said = (w: number, r: number) => `${formatValue(w)} kilos, ${r} reps`;
    switch (cmd.kind) {
      case 'logSet': {
        const w = cmd.weight ?? weight;
        const r = cmd.reps ?? reps;
        setWeight(w);
        setReps(r);
        if (cmd.save && !isSaving) {
          onSave(w, r);
          return `${said(w, r)}, saving`;
        }
        return said(w, r);
      }
      case 'repeatLast': {
        if (initialWeight === null || initialReps === null) return 'No previous set to repeat';
        setWeight(initialWeight);
        setReps(initialReps);
        if (cmd.save && !isSaving) {
          onSave(initialWeight, initialReps);
          return `Same as last, ${said(initialWeight, initialReps)}, saving`;
        }
        return `Same as last, ${said(initialWeight, initialReps)}`;
      }
      case 'save':
        if (!isSaving) onSave(weight, reps);
        return `Saving ${said(weight, reps)}`;
      case 'cancel':
        onCancel();
        return 'Cancelled';
      default:
        return VOICE_HELP;
    }
  };

  const hasLast = !isNew && initialWeight !== null && initialReps !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={prefs.reduceMotion ? 'none' : 'slide'}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={modalS.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close without saving"
        />

        <View style={[modalS.card, hc && modalHC.card]}>
          <View style={modalS.grabber} />

          {/* Title */}
          <View style={modalS.titleRow}>
            <MaterialIcons name="edit" size={16} color="#58a6ff" />
            <Text style={[modalS.title, hc && modalHC.text]} numberOfLines={1} accessibilityRole="header">
              {exName}
            </Text>
            <View style={modalS.setChip}>
              <Text style={modalS.setChipText}>Set {displayNum}</Text>
            </View>
          </View>

          {(hasLast || previous) && (
            <Text style={[modalS.lastText, hc && modalHC.text]}>
              {hasLast ? `Last time: ${initialWeight} x ${initialReps}` : ''}
              {hasLast && previous ? '   ·   ' : ''}
              {previous ? `Before that: ${previous}` : ''}
            </Text>
          )}

          {/* Wheels */}
          <View style={modalS.wheelsRow}>
            <NumberWheel
              base={weightValues}
              value={weight}
              onChange={setWeight}
              label="Weight"
              unit="kg"
              spokenUnit="kilograms"
              typedMax={WEIGHT_TYPED_MAX}
            />
            <NumberWheel
              base={REPS_VALUES}
              value={reps}
              onChange={setReps}
              label="Reps"
              unit="reps"
              spokenUnit="reps"
              integer
              typedMax={REPS_TYPED_MAX}
            />
          </View>

          <Text style={[modalS.hint, hc && modalHC.muted]}>Scroll, tap a number or use − / +. Long-press to type.</Text>

          {prefs.voiceInput && <VoiceButton onCommand={handleVoice} highContrast={hc} />}

          {/* Actions: in the thumb zone, Save is the biggest target */}
          <View style={[modalS.actions, prefs.leftHanded && modalS.actionsReversed]}>
            <Pressable
              onPress={onCancel}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [modalS.cancelBtn, pressed && modalS.btnPressed]}
            >
              <Text style={modalS.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => onSave(weight, reps)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={`Save set ${displayNum}, ${formatValue(weight)} kilograms, ${reps} reps`}
              accessibilityState={{ disabled: isSaving, busy: isSaving }}
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
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={modalS.saveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#30363d',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363d',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#dae3ee',
    fontSize: 16,
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
  lastText: {
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  wheelsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hint: {
    color: '#8b949e',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  // Left-handed layout: Save (the big button) under the left thumb.
  actionsReversed: { flexDirection: 'row-reverse' },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#8b949e', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  saveBtn: {
    flex: 2,
    height: 56,
    borderRadius: 10,
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
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.5 },
  btnPressed: { opacity: 0.7 },
});

const modalHC = StyleSheet.create({
  card: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
});

// ─── EditRoutineModal ─────────────────────────────────────────────────────────

function EditRoutineModal({
  visible,
  workoutDay,
  onClose,
  onAddMuscleGroup,
  onDeleteMuscleGroup,
  onAddExercise,
  onDeleteExercise,
}: {
  visible: boolean;
  workoutDay: WorkoutDay;
  onClose: () => void;
  onAddMuscleGroup: (name: string) => Promise<void>;
  onDeleteMuscleGroup: (mgId: string, name: string) => Promise<void>;
  onAddExercise: (mgId: string, name: string, prescription?: string) => Promise<void>;
  onDeleteExercise: (exId: string, name: string) => Promise<void>;
}) {
  const [addingMg, setAddingMg] = useState(false);
  const [newMgName, setNewMgName] = useState('');

  const [addingExMgId, setAddingExMgId] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');
  const [newExPrescription, setNewExPrescription] = useState('');

  const [loading, setLoading] = useState(false);

  const handleConfirmAddMg = async () => {
    if (!newMgName.trim()) return;
    setLoading(true);
    await onAddMuscleGroup(newMgName.trim());
    setNewMgName('');
    setAddingMg(false);
    setLoading(false);
  };

  const handleConfirmAddEx = async (mgId: string) => {
    if (!newExName.trim()) return;
    setLoading(true);
    await onAddExercise(mgId, newExName.trim(), newExPrescription.trim());
    setNewExName('');
    setNewExPrescription('');
    setAddingExMgId(null);
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={ermS.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={ermS.card}>
          {/* Header */}
          <View style={ermS.header}>
            <View style={ermS.titleRow}>
              <MaterialIcons name="edit-note" size={22} color="#58a6ff" />
              <Text style={ermS.title}>Edit Routine Structure</Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [ermS.closeBtn, pressed && ermS.pressed]}>
              <MaterialIcons name="close" size={20} color="#8b949e" />
            </Pressable>
          </View>

          <Text style={ermS.subtitle}>Add or remove muscle groups and exercises for {workoutDay.name}.</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ermS.scrollContent}>
            {workoutDay.muscleGroups.map((mg) => (
              <View key={mg.id} style={ermS.mgCard}>
                {/* Muscle Group Header */}
                <View style={ermS.mgHeader}>
                  <Text style={ermS.mgTitle}>{mg.name}</Text>
                  <Pressable
                    onPress={() => onDeleteMuscleGroup(mg.id, mg.name)}
                    hitSlop={8}
                    style={({ pressed }) => [ermS.delBtn, pressed && ermS.pressed]}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#f85149" />
                  </Pressable>
                </View>

                {/* Exercises list */}
                <View style={ermS.exList}>
                  {mg.exercises.map((ex) => (
                    <View key={ex.id} style={ermS.exRow}>
                      <View style={ermS.exInfo}>
                        <Text style={ermS.exName}>{ex.name}</Text>
                        {!!ex.prescription && (
                          <Text style={ermS.exPrescription}>{ex.prescription}</Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => onDeleteExercise(ex.id, ex.name)}
                        hitSlop={8}
                        style={({ pressed }) => [ermS.delBtn, pressed && ermS.pressed]}
                      >
                        <MaterialIcons name="close" size={16} color="#6e7681" />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Add Exercise section for this MG */}
                {addingExMgId === mg.id ? (
                  <View style={ermS.addForm}>
                    <TextInput
                      style={ermS.input}
                      placeholder="Exercise Name (e.g. Incline Bench Press)"
                      placeholderTextColor="#7d8590"
                      value={newExName}
                      onChangeText={setNewExName}
                      autoFocus
                    />
                    <TextInput
                      style={ermS.inputSmall}
                      placeholder="Prescription / Notes (e.g. 3x8-10 reps)"
                      placeholderTextColor="#7d8590"
                      value={newExPrescription}
                      onChangeText={setNewExPrescription}
                    />
                    <View style={ermS.addFormActions}>
                      <Pressable
                        onPress={() => setAddingExMgId(null)}
                        style={({ pressed }) => [ermS.formCancelBtn, pressed && ermS.pressed]}
                      >
                        <Text style={ermS.formCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleConfirmAddEx(mg.id)}
                        disabled={loading}
                        style={({ pressed }) => [ermS.formAddBtn, pressed && ermS.pressed]}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={ermS.formAddText}>Save Exercise</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => { setAddingExMgId(mg.id); setNewExName(''); setNewExPrescription(''); }}
                    style={({ pressed }) => [ermS.addExBtn, pressed && ermS.pressed]}
                  >
                    <MaterialIcons name="add" size={14} color="#58a6ff" />
                    <Text style={ermS.addExText}>Add Exercise to {mg.name}</Text>
                  </Pressable>
                )}
              </View>
            ))}

            {/* Add Muscle Group section */}
            {addingMg ? (
              <View style={ermS.addForm}>
                <Text style={ermS.formLabel}>NEW MUSCLE GROUP</Text>
                <TextInput
                  style={ermS.input}
                  placeholder="Group Name (e.g. Biceps & Forearms)"
                  placeholderTextColor="#7d8590"
                  value={newMgName}
                  onChangeText={setNewMgName}
                  autoFocus
                />
                <View style={ermS.addFormActions}>
                  <Pressable
                    onPress={() => setAddingMg(false)}
                    style={({ pressed }) => [ermS.formCancelBtn, pressed && ermS.pressed]}
                  >
                    <Text style={ermS.formCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmAddMg}
                    disabled={loading}
                    style={({ pressed }) => [ermS.formAddBtn, pressed && ermS.pressed]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={ermS.formAddText}>Add Muscle Group</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => { setAddingMg(true); setNewMgName(''); }}
                style={({ pressed }) => [ermS.addMgBtn, pressed && ermS.pressed]}
              >
                <MaterialIcons name="add-circle-outline" size={16} color="#238636" />
                <Text style={ermS.addMgText}>Add Muscle Group</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Footer */}
          <Pressable onPress={onClose} style={({ pressed }) => [ermS.doneBtn, pressed && ermS.pressed]}>
            <Text style={ermS.doneText}>Done Editing</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ermS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#dae3ee', fontSize: 17, fontFamily: 'Montserrat_700Bold' },
  closeBtn: { padding: 4 },
  subtitle: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  scrollContent: { paddingVertical: 8, gap: 14 },
  mgCard: {
    backgroundColor: '#0d1117',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262d',
    padding: 12,
    gap: 8,
  },
  mgHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mgTitle: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  delBtn: { padding: 4, borderRadius: 6 },
  exList: { gap: 6 },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161b22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  exInfo: { flex: 1, gap: 2 },
  exName: { color: '#c9d1d9', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  exPrescription: { color: '#6e7681', fontSize: 11, fontFamily: 'Montserrat_400Regular' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  addExText: { color: '#58a6ff', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  addMgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(35, 134, 54, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(35, 134, 54, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  addMgText: { color: '#39d353', fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  addForm: {
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    gap: 8,
  },
  formLabel: { color: '#8b949e', fontSize: 10, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 7,
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputSmall: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 7,
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  formCancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  formCancelText: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  formAddBtn: {
    backgroundColor: '#238636',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  formAddText: { color: '#fff', fontSize: 12, fontFamily: 'Montserrat_700Bold' },
  doneBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  doneText: { color: '#c9d1d9', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  pressed: { opacity: 0.7 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutDetail({ day, onBack, onEdit }: WorkoutDetailProps) {
  const [workoutDay, setWorkoutDay] = useState<WorkoutDay>(day);

  // Build initial local set state from workout day data
  const [setsMap, setSetsMap] = useState<Record<string, LocalSet[]>>(() => {
    const map: Record<string, LocalSet[]> = {};
    // Overlay sets still waiting in the offline queue, so they don't look lost after re-opening.
    for (const mg of applyPending(day, getQueue()).muscleGroups) {
      for (const ex of mg.exercises) {
        map[ex.id] = toLocalSets(ex.sets ?? []);
      }
    }
    return map;
  });

  // Which set is being edited
  const [editing, setEditing] = useState<EditingRef | null>(null);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  // Gym mode: a running workout, the sets ticked off in it, and the rest timer.
  const { prefs } = useA11y();
  const [session, setSession] = useState<{ startedAt: number } | null>(null);
  const [doneSets, setDoneSets] = useState<Record<string, DoneSet>>({});
  const [rest, setRest] = useState<{ endAt: number; total: number } | null>(null);
  const [restDuration, setRestDuration] = useState(DEFAULT_REST_SEC); // remembers +/- adjustments
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [prCount, setPrCount] = useState(0);

  // Personal records: each exercise's best weight / e1RM from set_logs, raised as new PRs land.
  const [bests, setBests] = useState<Record<string, Best>>({});
  const [pr, setPr] = useState<PrNotice | null>(null);

  useEffect(() => {
    let alive = true;
    const exIds = day.muscleGroups.flatMap((mg) => mg.exercises.map((ex) => ex.id));
    fetchSetLogs(exIds).then((logs) => {
      if (alive) setBests(bestsByExercise(logs));
    });
    return () => {
      alive = false;
    };
  }, [day]);

  const { prefs: a11yPrefs } = useA11y();
  const hc = a11yPrefs.highContrast;

  // Delete with undo: the row disappears at once, the DB delete runs when the snackbar expires.
  const [pendingSetDelete, setPendingSetDelete] = useState<{ exId: string; set: LocalSet; idx: number } | null>(null);
  const [undo, setUndo] = useState<UndoNotice | null>(null);

  // ⋮ > View progress: chart for one exercise, fetched fresh so it includes today's sets.
  const [progressFor, setProgressFor] = useState<{ name: string; logs: SetLog[] } | null>(null);

  const exerciseName = (exId: string) =>
    workoutDay.muscleGroups.flatMap((mg) => mg.exercises).find((ex) => ex.id === exId)?.name ?? 'Exercise';

  // When a queued new set syncs, replace its temp id so later edits update instead of insert.
  useEffect(
    () =>
      subscribeIdChanges((map) => {
        setSetsMap((prev) => {
          let changed = false;
          const next: Record<string, LocalSet[]> = {};
          for (const [exId, list] of Object.entries(prev)) {
            next[exId] = list.map((st) => {
              if (!map[st.id]) return st;
              changed = true;
              return { ...st, id: map[st.id] };
            });
          }
          return changed ? next : prev;
        });
      }),
    []
  );

  // Keep the screen on during a workout so the phone doesn't lock between sets.
  useEffect(() => {
    if (!session) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [session]);

  // Derive modal display values from the current editing target
  const editingSet = editing ? setsMap[editing.exId]?.[editing.setIdx] : null;

  // ── Open popup for existing or new local set ─────────────────────────────

  const handleTapSet = useCallback((exId: string, exName: string, setIdx: number) => {
    const set = setsMap[exId]?.[setIdx];
    const isNew = set ? set.id.startsWith('new-') : false;
    setEditing({ exId, exName, setIdx, isNew });
  }, [setsMap]);

  // ── Add new set (does not automatically open popup) ─────────────────────────

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
  }, []);

  // ── Delete a set ─────────────────────────────────────────────────────────

  // Runs the real delete for a set removed from the list (local-only sets need no DB call).
  const commitSetDelete = async (pending: { set: LocalSet } | null) => {
    if (pending) await deleteSet(pending.set.id);
  };

  const handleDeleteSet = (exId: string, idx: number) => {
    const set = setsMap[exId]?.[idx];
    if (!set) return;
    // A second delete commits the first one right away.
    if (pendingSetDelete) commitSetDelete(pendingSetDelete);
    setPendingSetDelete({ exId, set, idx });
    setSetsMap((prev) => ({ ...prev, [exId]: prev[exId].filter((_, i) => i !== idx) }));
    setUndo({ key: Date.now(), message: `Deleted set ${idx + 1} of ${exerciseName(exId)}` });
  };

  const handleUndoDelete = () => {
    if (pendingSetDelete) {
      const { exId, set, idx } = pendingSetDelete;
      setSetsMap((prev) => {
        const list = [...(prev[exId] ?? [])];
        list.splice(Math.min(idx, list.length), 0, set);
        return { ...prev, [exId]: list };
      });
    }
    setPendingSetDelete(null);
    setUndo(null);
  };

  const handleUndoExpire = () => {
    commitSetDelete(pendingSetDelete);
    setPendingSetDelete(null);
    setUndo(null);
  };

  const handleViewProgress = async (exId: string, exName: string) => {
    const logs = await fetchSetLogs([exId]);
    setProgressFor({ name: exName, logs });
  };

  // ── Save a set ────────────────────────────────────────────────────────────

  // Saves one set to Supabase and local state. Returns true on success.
  const persistSet = async (exId: string, setIdx: number, newWeight: number, newReps: number): Promise<boolean> => {
    const set = setsMap[exId]?.[setIdx];
    if (!set) return false;
    const isNew = set.id.startsWith('new-');

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
      // Offline-aware: writes through when online, otherwise queues on the phone (also the set_logs entry).
      const { status, savedId } = await saveSet(exId, updatedSet, {
        weight: newWeight,
        reps: newReps,
        loggedAt: new Date().toISOString(),
      });
      if (status === 'failed') {
        triggerHaptic('error');
        Alert.alert('Error', 'Could not save set. Please try again.');
        return false;
      }
      triggerHaptic('setSaved');
      const queuedNote = status === 'queued' ? ' Offline, it will sync later.' : '';

      // PR check works offline too: bests are kept on the phone.
      const prKind = detectPR(bests[exId], newWeight, newReps);
      setBests((prev) => ({ ...prev, [exId]: applyToBest(prev[exId], newWeight, newReps) }));
      if (prKind) {
        const exName = exerciseName(exId);
        setPr({ key: Date.now(), exName, weight: newWeight, reps: newReps, kind: prKind });
        if (session) setPrCount((c) => c + 1);
        AccessibilityInfo.announceForAccessibility(
          `New personal record! ${exName}, ${formatValue(newWeight)} kilograms for ${newReps} reps.${queuedNote}`
        );
      } else {
        AccessibilityInfo.announceForAccessibility(
          `Set saved, ${formatValue(newWeight)} kilograms, ${newReps} reps.${queuedNote}`
        );
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
      return true;
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'An error occurred.');
      return false;
    } finally {
      setIsSavingSet(false);
    }
  };

  // ── Gym mode ──────────────────────────────────────────────────────────────

  const startRest = () => {
    setRest({ endAt: Date.now() + restDuration * 1000, total: restDuration });
  };

  // `set` holds the values from before this save. If the set was already ticked this workout,
  // keep its original "before" values so a re-edit doesn't count as beating itself.
  const markDone = (exId: string, set: LocalSet, weight: number, reps: number) => {
    const key = doneKey(exId, set.setNumber);
    const isNew = set.id.startsWith('new-');
    setDoneSets((prev) => ({
      ...prev,
      [key]: {
        exerciseId: exId,
        weight,
        reps,
        beforeWeight: prev[key] ? prev[key].beforeWeight : isNew ? null : set.weight,
        beforeReps: prev[key] ? prev[key].beforeReps : isNew ? null : set.reps,
      },
    }));
    startRest();
  };

  const handleToggleDone = async (exId: string, exName: string, setIdx: number) => {
    if (isSavingSet) return;
    const set = setsMap[exId]?.[setIdx];
    if (!set) return;
    const key = doneKey(exId, set.setNumber);

    if (doneSets[key]) {
      // Un-tick only changes the workout tally; the saved values stay.
      setDoneSets((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    // Nothing to log yet: open the wheels instead. Saving there ticks the set.
    if (set.weight === null || set.reps === null) {
      handleTapSet(exId, exName, setIdx);
      return;
    }
    if (await persistSet(exId, setIdx, set.weight, set.reps)) {
      markDone(exId, set, set.weight, set.reps);
    }
  };

  const handleStartWorkout = () => {
    setSession({ startedAt: Date.now() });
    setDoneSets({});
    setPrCount(0);
    setSummary(null);
    triggerHaptic('tick');
    AccessibilityInfo.announceForAccessibility('Workout started. Tick each set when it is done.');
  };

  const handleFinishWorkout = () => {
    if (!session) return;
    setRest(null);
    const result = summarizeSession(Object.values(doneSets), session.startedAt, Date.now());
    setSummary(result);
    triggerHaptic('setSaved');
  };

  const confirmFinish = () => {
    Alert.alert('Finish workout?', 'Your sets are already saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', onPress: handleFinishWorkout },
    ]);
  };

  const handleRestAdjust = (deltaSec: number) => {
    const now = Date.now();
    setRest((r) => r && { endAt: Math.max(now + 1000, r.endAt + deltaSec * 1000), total: Math.max(1, r.total + deltaSec) });
    setRestDuration((d) => Math.min(MAX_REST_SEC, Math.max(MIN_REST_SEC, d + deltaSec)));
  };

  const handleRestFinished = () => {
    triggerHaptic('restDone');
    AccessibilityInfo.announceForAccessibility('Rest over. Next set.');
    if (prefs.audioCues) speak('Rest over. Next set.');
  };

  // ── Save popup ────────────────────────────────────────────────────────────

  const handleModalSave = async (newWeight: number, newReps: number) => {
    if (!editing) return;
    const { exId, setIdx } = editing;
    const set = setsMap[exId]?.[setIdx];
    if (!set) return;
    if (!(await persistSet(exId, setIdx, newWeight, newReps))) return;
    setEditing(null);
    if (session) markDone(exId, set, newWeight, newReps);
  };

  // ── Cancel popup ──────────────────────────────────────────────────────────

  const handleModalCancel = useCallback(() => {
    setEditing(null);
  }, []);

  // ── Auto-save unsaved sets on exit ─────────────────────────────────────────

  const handleDone = async () => {
    if (isSavingWorkout) return;
    if (pendingSetDelete) {
      setPendingSetDelete(null);
      setUndo(null);
      await commitSetDelete(pendingSetDelete);
    }

    // Scan for any local-only sets starting with 'new-'
    const unsavedSets: { exId: string; set: LocalSet }[] = [];
    for (const exId of Object.keys(setsMap)) {
      const sets = setsMap[exId] ?? [];
      for (const s of sets) {
        if (s.id.startsWith('new-')) {
          unsavedSets.push({ exId, set: s });
        }
      }
    }

    if (unsavedSets.length === 0) {
      onBack();
      return;
    }

    setIsSavingWorkout(true);
    try {
      const tasks = unsavedSets.map(({ exId, set }) => {
        const updatedSet: ExerciseSet = {
          id: set.id,
          exerciseId: exId,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          previous: set.previous,
        };
        // No set_logs entry: these sets were never confirmed, only filled in.
        return saveSet(exId, updatedSet, null);
      });

      const results = await Promise.all(tasks);
      const allOk = results.every((r) => r.status !== 'failed');
      if (!allOk) {
        Alert.alert('Save Alert', 'Some new sets could not be automatically saved.');
      }
    } catch (err) {
      console.error('Failed to auto-save sets on exit:', err);
    } finally {
      setIsSavingWorkout(false);
      onBack();
    }
  };

  // Leaving mid-workout asks first, so a workout isn't ended by accident.
  const requestExit = () => {
    if (session) confirmFinish();
    else handleDone();
  };

  const handleCloseSummary = () => {
    setSummary(null);
    setSession(null);
    setDoneSets({});
    handleDone();
  };

  // Android back behaves like the Done button, so unsaved sets are never lost.
  // Re-subscribes every render so the handler always sees the current state.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => sub.remove();
  });

  const doneCount = Object.keys(doneSets).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, hc && sHC.root]}>
      {/* Header */}
      <View style={[s.header, hc && sHC.header]}>
        <Pressable
          onPress={requestExit}
          disabled={isSavingWorkout || isSavingSet}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
        >
          <MaterialIcons name="arrow-back" size={22} color="#58a6ff" />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <View style={s.headerRightActions}>
          {/* During a workout the clock replaces EDIT (editing the routine would leave the screen) */}
          {session ? (
            <ElapsedClock startedAt={session.startedAt} />
          ) : (
            <Pressable
              onPress={() => onEdit(workoutDay)}
              disabled={isSavingWorkout || isSavingSet}
              accessibilityRole="button"
              accessibilityLabel="Edit routine"
              style={({ pressed }) => [s.editBtn, pressed && s.pressed]}
            >
              <MaterialIcons name="edit" size={14} color="#58a6ff" />
              <Text style={s.editBtnText}>EDIT</Text>
            </Pressable>
          )}

          {/* Done — saves any unsaved local sets before exiting */}
          <Pressable
            onPress={requestExit}
            disabled={isSavingWorkout || isSavingSet}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [s.doneBtn, pressed && s.pressed]}
          >
            <MaterialIcons name="check" size={15} color="#fff" />
            <Text style={s.doneBtnText}>DONE</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SyncPill />

        {/* Left-aligned Workout Day Title & Note */}
        <View style={s.dayTitleContainer}>
          <Text style={[s.dayTitleText, hc && sHC.text]} accessibilityRole="header">{workoutDay.name}</Text>
          {!!workoutDay.note && (
            <Text style={[s.noteTextPlain, hc && sHC.muted]}>{workoutDay.note}</Text>
          )}
        </View>

        {/* Hint */}
        <View style={s.hintRow}>
          <MaterialIcons name="touch-app" size={13} color={hc ? '#d0d7de' : '#8b949e'} />
          <Text style={[s.hintText, hc && sHC.muted]}>
            {session
              ? 'Tap ✓ when a set is done. Tap the row to change weight or reps.'
              : 'Tap a set row to log weight & reps'}
          </Text>
        </View>

        {/* Muscle group accordions */}
        {workoutDay.muscleGroups.map((mg) => (
          <MuscleGroupAccordion
            key={mg.id}
            mg={mg}
            setsMap={setsMap}
            active={!!session}
            doneSets={doneSets}
            onTapSet={handleTapSet}
            onDeleteSet={handleDeleteSet}
            onAddSet={handleAddSet}
            onToggleDone={handleToggleDone}
            onViewProgress={handleViewProgress}
            onEditRoutine={() => onEdit(workoutDay)}
          />
        ))}
      </ScrollView>

      {/* Rest timer + start/finish: bottom of the screen, in the thumb zone */}
      {rest && (
        <RestTimer
          endAt={rest.endAt}
          total={rest.total}
          onAdjust={handleRestAdjust}
          onSkip={() => setRest(null)}
          onFinished={handleRestFinished}
        />
      )}
      <View style={s.bottomBar}>
        {session ? (
          <Pressable
            onPress={confirmFinish}
            accessibilityRole="button"
            accessibilityLabel={`Finish workout, ${doneCount} ${doneCount === 1 ? 'set' : 'sets'} done`}
            style={({ pressed }) => [s.finishBtn, pressed && s.pressed]}
          >
            <MaterialIcons name="flag" size={20} color="#2ea043" />
            <Text style={s.finishText}>
              FINISH WORKOUT · {doneCount} {doneCount === 1 ? 'SET' : 'SETS'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStartWorkout}
            accessibilityRole="button"
            accessibilityLabel="Start workout"
            style={({ pressed }) => [s.startBtn, pressed && s.pressed]}
          >
            <MaterialIcons name="play-arrow" size={24} color="#fff" />
            <Text style={s.startText}>START WORKOUT</Text>
          </Pressable>
        )}
      </View>

      <PrBanner pr={pr} onHide={() => setPr(null)} />
      <UndoSnackbar undo={undo} onUndo={handleUndoDelete} onExpire={handleUndoExpire} bottom={96} />
      <ExerciseProgress
        name={progressFor?.name ?? null}
        logs={progressFor?.logs ?? []}
        onClose={() => setProgressFor(null)}
      />

      <WorkoutSummary summary={summary} dayName={workoutDay.name} prCount={prCount} onClose={handleCloseSummary} />

      {/* Edit set modal */}
      <EditSetModal
        key={editing ? `${editing.exId}-${editing.setIdx}` : 'closed'}
        visible={!!editing}
        exName={editing?.exName ?? ''}
        displayNum={(editing ? setsMap[editing.exId]?.findIndex((_, i) => i === editing.setIdx) ?? 0 : 0) + 1}
        initialWeight={editingSet?.weight ?? null}
        initialReps={editingSet?.reps ?? null}
        previous={editingSet?.previous ?? null}
        isNew={editing?.isNew ?? false}
        isSaving={isSavingSet}
        onSave={handleModalSave}
        onCancel={handleModalCancel}
      />

      {/* Saving overlay */}
      {isSavingWorkout && (
        <View style={s.savingOverlay}>
          <View style={s.savingCard}>
            <ActivityIndicator size="large" color="#58a6ff" />
            <Text style={s.savingText}>Saving workout…</Text>
          </View>
        </View>
      )}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  editBtnText: { color: '#58a6ff', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
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

  dayTitleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 12,
    paddingTop: 2,
  },
  dayTitleText: {
    color: '#dae3ee',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Montserrat_800ExtraBold',
    textAlign: 'left',
  },
  noteTextPlain: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 4,
    lineHeight: 17,
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
  hintText: { color: '#8b949e', fontSize: 12, fontFamily: 'Montserrat_400Regular', flexShrink: 1 },

  bottomBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
    backgroundColor: '#0f1720',
  },
  startBtn: {
    height: 56,
    borderRadius: 10,
    backgroundColor: '#238636',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.8 },
  finishBtn: {
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2ea043',
    backgroundColor: 'rgba(35, 134, 54, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishText: { color: '#c9d1d9', fontSize: 14, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 0.8 },

  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 20, 28, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  savingCard: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 28,
    alignItems: 'center',
    gap: 14,
    minWidth: 180,
  },
  savingText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
});

// High contrast overrides for the screen shell (highContrastPalette in tokens.ts).
const sHC = StyleSheet.create({
  root: { backgroundColor: '#000000' },
  header: { borderBottomColor: '#d0d7de' },
  text: { color: '#ffffff' },
  muted: { color: '#d0d7de' },
});
