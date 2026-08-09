import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { StatusBar } from 'expo-status-bar';
import Home from './screens/Home';
import History from './screens/History';
import Account from './screens/Account';
import TabBar from './components/TabBar';
import type { WorkoutDay } from './screens/Home';

type TabKey = 'home' | 'history' | 'account';

export default function Main() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      id: 'push-day',
      name: 'Push Day',
      subtitle: 'Chest, Shoulders & Tris',
      tags: ['Chest', 'Delts', 'Triceps'],
      icon: 'directions-run',
    },
    {
      id: 'pull-day',
      name: 'Pull Day',
      subtitle: 'Back, Biceps & Rear Delts',
      tags: ['Back', 'Biceps', 'Lats'],
      icon: 'rowing',
    },
    {
      id: 'leg-day',
      name: 'Leg Day',
      subtitle: 'Quads, Hams & Calves',
      tags: ['Quads', 'Hamstrings', 'Calves'],
      icon: 'directions-walk',
    },
  ]);
  const [dayName, setDayName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') return 'Your Workouts';
    if (activeTab === 'history') return 'History';
    return 'Account';
  }, [activeTab]);

  if (!fontsLoaded) {
    return null;
  }

  const handleAddDay = () => {
    const trimmedName = dayName.trim();
    if (!trimmedName) return;
    setWorkoutDays((currentDays) => [
      ...currentDays,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: trimmedName,
        subtitle: 'Custom routine',
        tags: ['Custom'],
        icon: 'fitness-center',
      },
    ]);
    setDayName('');
  };

  const handleRemoveDay = (dayId: string) => {
    setWorkoutDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
  };

  const openAddModal = () => setShowAddModal(true);
  const closeAddModal = () => {
    setShowAddModal(false);
    setDayName('');
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.screen}>
          <View style={styles.headerBar}>
            <View style={styles.headerRow}>
              <View style={styles.brand}>
                <MaterialIcons name="fitness-center" size={22} color="#58a6ff" />
                <Text style={styles.appLabel}>IronTrack</Text>
              </View>
              <Pressable onPress={openAddModal} style={({ pressed }) => [styles.addRoutinePill, pressed && styles.pressed]}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.addRoutineText}>ADD ROUTINE</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{tabTitle}</Text>
            <Text style={styles.subtitle}>
              Select a workout day to begin, or create a new custom routine tailored to your goals.
            </Text>
          </View>

          <View style={styles.content}>
            {activeTab === 'home' ? (
              <Home workoutDays={workoutDays} onRemoveDay={handleRemoveDay} onOpenAdd={openAddModal} />
            ) : activeTab === 'history' ? (
              <History />
            ) : (
              <Account />
            )}
          </View>

          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

          <Modal visible={showAddModal} animationType="fade" transparent onRequestClose={closeAddModal}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Add Routine</Text>
                <TextInput
                  value={dayName}
                  onChangeText={setDayName}
                  placeholder="Routine name"
                  placeholderTextColor="#6b7280"
                  style={styles.modalInput}
                />
                <View style={styles.modalRow}>
                  <Pressable onPress={closeAddModal} style={({ pressed }) => [styles.modalButton, styles.modalCancel, pressed && styles.pressed]}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      handleAddDay();
                      closeAddModal();
                    }}
                    style={({ pressed }) => [styles.modalButton, styles.modalAdd, pressed && styles.pressed]}
                    disabled={dayName.trim().length === 0}
                  >
                    <Text style={styles.modalAddText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b141c' },
  keyboardAvoidingView: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: '#0b141c',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  headerBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLabel: {
    color: '#58a6ff',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  addRoutinePill: {
    backgroundColor: '#238636',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#238636',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  addRoutineText: { color: '#fff', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  hero: { paddingTop: 20, paddingBottom: 14, gap: 6 },
  title: {
    color: '#c9d1d9',
    fontSize: 36,
    lineHeight: 42,
    fontFamily: 'Montserrat_900Black',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
    fontFamily: 'Montserrat_400Regular',
  },
  content: { flex: 1, minHeight: 0 },
  pressed: { opacity: 0.75 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5,7,10,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '88%', backgroundColor: '#0b141c', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#30363d' },
  modalTitle: { color: '#f0f6fc', fontSize: 18, fontFamily: 'Montserrat_700Bold', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0b141c',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    padding: 12,
    color: '#f0f6fc',
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  modalCancel: { backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d' },
  modalAdd: { backgroundColor: '#238636' },
  modalCancelText: { color: '#8b949e', fontFamily: 'Montserrat_700Bold' },
  modalAddText: { color: '#fff', fontFamily: 'Montserrat_700Bold' },
});
