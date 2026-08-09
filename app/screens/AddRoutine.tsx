import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { WorkoutDay, MuscleGroup, Exercise } from './Home';

interface AddRoutineProps {
  onBack: () => void;
  onSave: (day: WorkoutDay) => void;
}

export default function AddRoutine({ onBack, onSave }: AddRoutineProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  
  // Pre-populate with the exact Muscle Groups & Exercises created in Stitch
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([
    {
      id: 'mg-chest',
      name: 'Chest',
      exercises: [
        {
          id: 'ex-bench-press',
          name: 'Barbell Bench Press',
          prescription: '4 sets x 8 reps',
        },
        {
          id: 'ex-incline-press',
          name: 'Incline Dumbbell Press',
          prescription: '3 sets x 10 reps',
        },
      ],
    },
    {
      id: 'mg-shoulders',
      name: 'Shoulders',
      exercises: [
        {
          id: 'ex-overhead-press',
          name: 'Overhead Press',
          prescription: '4 sets x 6 reps',
        },
      ],
    },
  ]);

  // Modal State for adding/editing exercises
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMgId, setEditingMgId] = useState<string | null>(null);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [modalExName, setModalExName] = useState('');
  const [modalExPresc, setModalExPresc] = useState('');

  // Add Muscle Group
  const addMuscleGroup = () => {
    const newId = `mg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setMuscleGroups((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        exercises: [],
      },
    ]);
  };

  // Remove Muscle Group
  const removeMuscleGroup = (mgId: string) => {
    Alert.alert(
      'Delete Muscle Group',
      'Are you sure you want to delete this muscle group and all its exercises?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMuscleGroups((prev) => prev.filter((mg) => mg.id !== mgId));
          },
        },
      ]
    );
  };

  // Update Muscle Group Name
  const updateMuscleGroupName = (mgId: string, value: string) => {
    setMuscleGroups((prev) =>
      prev.map((mg) => (mg.id === mgId ? { ...mg, name: value } : mg))
    );
  };

  // Open modal to Add Exercise
  const openAddExerciseModal = (mgId: string) => {
    setEditingMgId(mgId);
    setEditingExId(null);
    setModalExName('');
    setModalExPresc('');
    setIsModalVisible(true);
  };

  // Open modal to Edit Exercise
  const openEditExerciseModal = (mgId: string, ex: Exercise) => {
    setEditingMgId(mgId);
    setEditingExId(ex.id);
    setModalExName(ex.name);
    setModalExPresc(ex.prescription);
    setIsModalVisible(true);
  };

  // Save Exercise from Modal
  const saveExercise = () => {
    if (!modalExName.trim()) {
      Alert.alert('Validation Error', 'Please enter an exercise name.');
      return;
    }

    if (!editingMgId) return;

    setMuscleGroups((prev) =>
      prev.map((mg) => {
        if (mg.id !== editingMgId) return mg;

        if (editingExId) {
          // Edit Mode
          return {
            ...mg,
            exercises: mg.exercises.map((ex) =>
              ex.id === editingExId
                ? { ...ex, name: modalExName.trim(), prescription: modalExPresc.trim() }
                : ex
            ),
          };
        } else {
          // Add Mode
          const newExId = `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          return {
            ...mg,
            exercises: [
              ...mg.exercises,
              {
                id: newExId,
                name: modalExName.trim(),
                prescription: modalExPresc.trim() || '3 sets x 10 reps',
              },
            ],
          };
        }
      })
    );

    setIsModalVisible(false);
  };

  // Remove Exercise
  const removeExercise = (mgId: string, exId: string) => {
    setMuscleGroups((prev) =>
      prev.map((mg) => {
        if (mg.id !== mgId) return mg;
        return {
          ...mg,
          exercises: mg.exercises.filter((ex) => ex.id !== exId),
        };
      })
    );
  };

  // Validate and Submit
  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a routine name.');
      return;
    }

    // Validate that all muscle groups and exercises have names
    if (muscleGroups.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one muscle group.');
      return;
    }

    for (const mg of muscleGroups) {
      if (!mg.name.trim()) {
        Alert.alert('Validation Error', 'Please name all muscle groups.');
        return;
      }
      if (mg.exercises.length === 0) {
        Alert.alert(
          'Validation Error',
          `Please add at least one exercise to the "${mg.name}" group.`
        );
        return;
      }
    }

    const newRoutine: WorkoutDay = {
      id: `wd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      note: note.trim(),
      muscleGroups: muscleGroups.map((mg) => ({
        ...mg,
        name: mg.name.trim(),
        exercises: mg.exercises.map((ex) => ({
          ...ex,
          name: ex.name.trim(),
          prescription: ex.prescription.trim(),
        })),
      })),
      icon: 'fitness-center', // Default icon matching the gym-focused UI
    };

    onSave(newRoutine);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#58a6ff" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Routine</Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="save" size={16} color="#fff" style={styles.saveIcon} />
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Routine Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hypertrophy Upper"
              placeholderTextColor="#899485"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Rest protocols, focus cues..."
              placeholderTextColor="#899485"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Builder Header */}
        <View style={styles.builderHeader}>
          <View style={styles.builderTitleRow}>
            <MaterialIcons name="view-list" size={22} color="#58a6ff" />
            <Text style={styles.builderTitle}>Workout Structure</Text>
          </View>
          <View style={styles.groupChip}>
            <Text style={styles.groupChipText}>
              {muscleGroups.length} {muscleGroups.length === 1 ? 'Group' : 'Groups'}
            </Text>
          </View>
        </View>

        {/* Muscle Groups List */}
        <View style={styles.muscleGroupsList}>
          {muscleGroups.map((mg, mgIndex) => (
            <View key={mg.id} style={styles.mgCard}>
              {/* Muscle Group Header */}
              <View style={styles.mgCardHeader}>
                <View style={styles.mgTitleRow}>
                  <MaterialIcons name="fitness-center" size={18} color="#8b949e" />
                  <TextInput
                    style={styles.mgNameInput}
                    value={mg.name}
                    onChangeText={(val) => updateMuscleGroupName(mg.id, val)}
                    placeholder="Muscle Group (e.g. Chest)"
                    placeholderTextColor="#8b949e"
                  />
                </View>
                <Pressable
                  onPress={() => removeMuscleGroup(mg.id)}
                  style={({ pressed }) => [styles.deleteGroupButton, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete" size={20} color="#f85149" />
                </Pressable>
              </View>

              {/* Exercises inside Muscle Group */}
              <View style={styles.exercisesList}>
                {mg.exercises.map((ex) => (
                  <Pressable
                    key={ex.id}
                    onPress={() => openEditExerciseModal(mg.id, ex)}
                    style={({ pressed }) => [
                      styles.exerciseRow,
                      pressed && styles.exerciseRowPressed,
                    ]}
                  >
                    <View style={styles.exLeft}>
                      <MaterialIcons name="drag-indicator" size={18} color="#8b949e" />
                      <Text style={styles.exName}>{ex.name}</Text>
                    </View>
                    <View style={styles.exRight}>
                      <Text style={styles.exPresc}>{ex.prescription}</Text>
                      <Pressable
                        onPress={() => removeExercise(mg.id, ex.id)}
                        style={({ pressed }) => [styles.removeExButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <MaterialIcons name="close" size={18} color="#8b949e" />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}

                {/* Add Exercise Button */}
                <Pressable
                  onPress={() => openAddExerciseModal(mg.id)}
                  style={({ pressed }) => [styles.addExButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="add" size={18} color="#c9d1d9" />
                  <Text style={styles.addExText}>Add Exercise</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Add Muscle Group Button */}
          <Pressable
            onPress={addMuscleGroup}
            style={({ pressed }) => [styles.addMgButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="add-circle-outline" size={20} color="#c9d1d9" />
            <Text style={styles.addMgText}>Add Muscle Group</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add/Edit Exercise Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExId ? 'Edit Exercise' : 'Add Exercise'}
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Exercise Name</Text>
              <TextInput
                style={styles.modalInput}
                value={modalExName}
                onChangeText={setModalExName}
                placeholder="e.g. Barbell Bench Press"
                placeholderTextColor="#899485"
                autoFocus
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Prescription / Sets & Reps</Text>
              <TextInput
                style={styles.modalInput}
                value={modalExPresc}
                onChangeText={setModalExPresc}
                placeholder="e.g. 4 sets x 8 reps"
                placeholderTextColor="#899485"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={({ pressed }) => [styles.modalButtonSec, pressed && styles.pressed]}
              >
                <Text style={styles.modalButtonSecText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveExercise}
                style={({ pressed }) => [styles.modalButtonPrim, pressed && styles.pressed]}
              >
                <Text style={styles.modalButtonPrimText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d363e',
    backgroundColor: '#0b141c',
    height: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#58a6ff',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  headerTitle: {
    color: '#dae3ee',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  saveButton: {
    backgroundColor: '#238636',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.1)',
    gap: 6,
  },
  saveIcon: {
    marginRight: -2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    color: '#becaba',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#c9d1d9',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  builderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  builderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  builderTitle: {
    color: '#58a6ff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  groupChip: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  groupChipText: {
    color: '#8b949e',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
  },
  muscleGroupsList: {
    gap: 24,
  },
  mgCard: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mgCardHeader: {
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  mgNameInput: {
    flex: 1,
    color: '#dae3ee',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    padding: 0,
    backgroundColor: 'transparent',
  },
  deleteGroupButton: {
    padding: 4,
  },
  exercisesList: {
    padding: 16,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    borderRadius: 4,
  },
  exerciseRowPressed: {
    backgroundColor: '#161b22',
  },
  exLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exName: {
    color: '#dae3ee',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
  exRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  exPresc: {
    color: '#8b949e',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
  },
  removeExButton: {
    padding: 2,
  },
  addExButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#30363d',
    borderRadius: 4,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addExText: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  addMgButton: {
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 4,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addMgText: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  pressed: {
    opacity: 0.75,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    color: '#dae3ee',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalLabel: {
    color: '#becaba',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  modalInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#c9d1d9',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButtonSec: {
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalButtonSecText: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  modalButtonPrim: {
    backgroundColor: '#238636',
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalButtonPrimText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
});
