import React, { useState } from 'react';
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
import type { WorkoutDay, MuscleGroup, Exercise } from './Home';

interface AddWorkoutProps {
  onBack: () => void;
  onSave: (day: WorkoutDay) => Promise<boolean | void> | void;
}

export default function AddWorkout({ onBack, onSave }: AddWorkoutProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // By default, start with NO muscle groups
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);

  // Exercise Modal State
  const [isExModalVisible, setIsExModalVisible] = useState(false);
  const [editingMgId, setEditingMgId] = useState<string | null>(null);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [modalExName, setModalExName] = useState('');
  const [modalExPresc, setModalExPresc] = useState('');

  // Muscle Group Modal State
  const [isMgModalVisible, setIsMgModalVisible] = useState(false);
  const [editingMgIdForName, setEditingMgIdForName] = useState<string | null>(null);
  const [modalMgName, setModalMgName] = useState('');

  // Open modal to Add Muscle Group
  const openAddMgModal = () => {
    setEditingMgIdForName(null);
    setModalMgName('');
    setIsMgModalVisible(true);
  };

  // Open modal to Edit Muscle Group Name
  const openEditMgModal = (mg: MuscleGroup) => {
    setEditingMgIdForName(mg.id);
    setModalMgName(mg.name);
    setIsMgModalVisible(true);
  };

  // Save Muscle Group Name (Add or Edit)
  const saveMuscleGroup = () => {
    if (!modalMgName.trim()) {
      Alert.alert('Validation Error', 'Please enter a muscle group name.');
      return;
    }

    if (editingMgIdForName) {
      // Edit Mode
      setMuscleGroups((prev) =>
        prev.map((mg) =>
          mg.id === editingMgIdForName ? { ...mg, name: modalMgName.trim() } : mg
        )
      );
    } else {
      // Add Mode
      const newMgId = `mg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setMuscleGroups((prev) => [
        ...prev,
        {
          id: newMgId,
          name: modalMgName.trim(),
          exercises: [],
        },
      ]);
    }

    setIsMgModalVisible(false);
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

  // Open modal to Add Exercise
  const openAddExerciseModal = (mgId: string) => {
    setEditingMgId(mgId);
    setEditingExId(null);
    setModalExName('');
    setModalExPresc('');
    setIsExModalVisible(true);
  };

  // Open modal to Edit Exercise
  const openEditExerciseModal = (mgId: string, ex: Exercise) => {
    setEditingMgId(mgId);
    setEditingExId(ex.id);
    setModalExName(ex.name);
    setModalExPresc(ex.prescription);
    setIsExModalVisible(true);
  };

  // Save Exercise (Add or Edit)
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
                prescription: modalExPresc.trim(),
              },
            ],
          };
        }
      })
    );

    setIsExModalVisible(false);
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
  const handleSave = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a workout day name.');
      return;
    }

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
      icon: 'fitness-center',
    };

    setIsSaving(true);
    try {
      const result = await onSave(newRoutine);
      if (result === false) {
        Alert.alert('Save Error', 'Failed to insert row into Supabase. Please check table security policies.');
        setIsSaving(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An error occurred while saving.');
      setIsSaving(false);
    }
  };

  const editingMg = muscleGroups.find((mg) => mg.id === editingMgId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          disabled={isSaving}
          style={({ pressed }) => [styles.backButton, (pressed || isSaving) && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#58a6ff" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Workout Day</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            isSaving && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={16} color="#fff" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
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
            <Text style={styles.inputLabel}>Workout day Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Push day"
              placeholderTextColor="#899485"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Add any note for this workout day..."
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

        {/* Empty State when no Muscle Groups are added */}
        {muscleGroups.length === 0 ? (
          <Pressable
            onPress={openAddMgModal}
            style={({ pressed }) => [styles.emptyState, pressed && styles.pressed]}
          >
            <MaterialIcons name="fitness-center" size={32} color="#8b949e" style={styles.emptyStateIcon} />
            <Text style={styles.emptyStateTitle}>Workout is empty</Text>
            <Text style={styles.emptyStateSubtitle}>
              Tap here to add a muscle group (like Chest or Legs) to begin building your workout structure.
            </Text>
          </Pressable>
        ) : (
          /* Muscle Groups List */
          <View style={styles.muscleGroupsList}>
            {muscleGroups.map((mg) => (
              <View key={mg.id} style={styles.mgCard}>
                {/* Muscle Group Header */}
                <View style={styles.mgCardHeader}>
                  <Pressable
                    onPress={() => openEditMgModal(mg)}
                    style={({ pressed }) => [styles.mgTitleRow, pressed && styles.mgTitleRowPressed]}
                  >
                    <MaterialIcons name="fitness-center" size={18} color="#8b949e" />
                    <Text style={styles.mgNameText}>{mg.name}</Text>
                    <MaterialIcons name="edit" size={14} color="#8b949e" style={styles.editMgIcon} />
                  </Pressable>
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
                        <View style={styles.exNameContainer}>
                          <Text style={styles.exName}>{ex.name}</Text>
                          {!!ex.prescription && (
                            <Text style={styles.exPresc}>{ex.prescription}</Text>
                          )}
                        </View>
                      </View>
                      <Pressable
                        onPress={() => removeExercise(mg.id, ex.id)}
                        style={({ pressed }) => [styles.removeExButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <MaterialIcons name="close" size={18} color="#8b949e" />
                      </Pressable>
                    </Pressable>
                  ))}

                  {/* Add exercises hint */}
                  {mg.exercises.length === 0 && (
                    <Text style={styles.addExHint}>Add exercises to this muscle group</Text>
                  )}

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
          </View>
        )}

        {/* Add Muscle Group Button */}
        <Pressable
          onPress={openAddMgModal}
          style={({ pressed }) => [styles.addMgButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="add-circle-outline" size={20} color="#c9d1d9" />
          <Text style={styles.addMgText}>Add Muscle Group</Text>
        </Pressable>

        {/* Save Workout Day Button */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveWorkoutDayButton,
            isSaving && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveWorkoutDayButtonText}>Save Workout Day</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Saving Overlay Indicator */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color="#58a6ff" />
            <Text style={styles.savingText}>Saving workout to Supabase...</Text>
          </View>
        </View>
      )}

      {/* Add/Edit Muscle Group Modal */}
      <Modal
        visible={isMgModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMgModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          {/* Backdrop — tap outside to close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setIsMgModalVisible(false);
            }}
          />

          {/* Card — tap inside dismisses keyboard only */}
          <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
            <Text style={styles.modalTitle}>
              {editingMgIdForName ? 'Rename Muscle Group' : 'Add Muscle Group'}
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Muscle Group Name</Text>
              <TextInput
                style={styles.modalInput}
                value={modalMgName}
                onChangeText={setModalMgName}
                placeholder="e.g. Chest"
                placeholderTextColor="#899485"
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsMgModalVisible(false)}
                style={({ pressed }) => [styles.modalButtonSec, pressed && styles.pressed]}
              >
                <Text style={styles.modalButtonSecText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveMuscleGroup}
                style={({ pressed }) => [styles.modalButtonPrim, pressed && styles.pressed]}
              >
                <Text style={styles.modalButtonPrimText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Exercise Modal */}
      <Modal
        visible={isExModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          {/* Backdrop — tap outside to close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setIsExModalVisible(false);
            }}
          />

          {/* Card — tap inside dismisses keyboard only */}
          <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
            <Text style={styles.modalTitle}>
              {editingExId
                ? editingMg
                  ? `Edit Exercise for ${editingMg.name}`
                  : 'Edit Exercise'
                : editingMg
                  ? `Add Exercise for ${editingMg.name}`
                  : 'Add Exercise'}
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
              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={modalExPresc}
                onChangeText={setModalExPresc}
                placeholder="Add a note for this exercise"
                placeholderTextColor="#899485"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalHintContainer}>
              <MaterialIcons name="info-outline" size={15} color="#8b949e" />
              <Text style={styles.modalHintText}>
                You can add weight and reps once you create the workout day.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsExModalVisible(false)}
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
          </Pressable>
        </KeyboardAvoidingView>
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
    padding: 12,
    gap: 12,
    marginBottom: 20,
  },
  inputContainer: {
    gap: 5,
  },
  inputLabel: {
    color: '#becaba',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  modalTextArea: {
    height: 75,
    paddingTop: 8,
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
  emptyState: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateIcon: {
    marginBottom: 8,
    opacity: 0.8,
  },
  emptyStateTitle: {
    color: '#dae3ee',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
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
    paddingVertical: 4,
  },
  mgTitleRowPressed: {
    opacity: 0.7,
  },
  mgNameText: {
    color: '#dae3ee',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  editMgIcon: {
    marginLeft: 2,
    opacity: 0.6,
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
    marginRight: 8,
  },
  exNameContainer: {
    flex: 1,
    gap: 2,
  },
  exName: {
    color: '#dae3ee',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  exPresc: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 16,
  },
  removeExButton: {
    padding: 2,
  },
  addExHint: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    paddingVertical: 8,
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
  saveWorkoutDayButton: {
    backgroundColor: '#238636',
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.1)',
    borderRadius: 6,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  saveWorkoutDayButtonText: {
    color: '#fff',
    fontSize: 14,
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
    paddingHorizontal: 16,
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
  modalHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  modalHintText: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
    lineHeight: 17,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 28, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  savingCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  savingText: {
    color: '#f0f6fc',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
});
