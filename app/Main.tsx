import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import Home from './screens/Home';
import AddRoutine from './screens/AddRoutine';
import History from './screens/History';
import Account from './screens/Account';
import TabBar from './components/TabBar';
import type { WorkoutDay } from './screens/Home';

type TabKey = 'home' | 'history' | 'account';
type ScreenKey = 'workouts' | 'addRoutine';

export default function Main() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [screenKey, setScreenKey] = useState<ScreenKey>('workouts');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      id: 'push-day',
      name: 'Push Day',
      note: 'Focus on pressing strength and upper-body volume.',
      muscleGroups: [
        {
          id: 'push-chest',
          name: 'Chest',
          exercises: [
            { id: 'push-chest-1', name: 'Barbell Bench Press', prescription: '4 sets x 8 reps' },
            { id: 'push-chest-2', name: 'Incline Dumbbell Press', prescription: '3 sets x 10 reps' },
          ],
        },
        {
          id: 'push-delts',
          name: 'Shoulders',
          exercises: [
            { id: 'push-delts-1', name: 'Overhead Press', prescription: '4 sets x 6 reps' },
          ],
        },
      ],
      icon: 'directions-run',
    },
    {
      id: 'pull-day',
      name: 'Pull Day',
      note: 'Prioritize rows, pulls, and controlled back work.',
      muscleGroups: [
        {
          id: 'pull-back',
          name: 'Back',
          exercises: [
            { id: 'pull-back-1', name: 'Barbell Row', prescription: '4 sets x 8 reps' },
            { id: 'pull-back-2', name: 'Chest-Supported Row', prescription: '3 sets x 10 reps' },
          ],
        },
        {
          id: 'pull-biceps',
          name: 'Biceps',
          exercises: [{ id: 'pull-biceps-1', name: 'EZ Bar Curl', prescription: '3 sets x 12 reps' }],
        },
      ],
      icon: 'rowing',
    },
    {
      id: 'leg-day',
      name: 'Leg Day',
      note: 'Train lower-body strength with a balanced leg session.',
      muscleGroups: [
        {
          id: 'leg-quads',
          name: 'Quads',
          exercises: [
            { id: 'leg-quads-1', name: 'Squat', prescription: '4 sets x 6 reps' },
            { id: 'leg-quads-2', name: 'Leg Press', prescription: '3 sets x 10 reps' },
          ],
        },
        {
          id: 'leg-hams',
          name: 'Hamstrings',
          exercises: [{ id: 'leg-hams-1', name: 'Romanian Deadlift', prescription: '3 sets x 8 reps' }],
        },
        {
          id: 'leg-calves',
          name: 'Calves',
          exercises: [{ id: 'leg-calves-1', name: 'Standing Calf Raise', prescription: '4 sets x 12 reps' }],
        },
      ],
      icon: 'directions-walk',
    },
  ]);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') return 'Your Workouts';
    if (activeTab === 'history') return 'History';
    return 'Account';
  }, [activeTab]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRemoveDay = (dayId: string) => {
    setWorkoutDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
  };

  const openAddScreen = () => setScreenKey('addRoutine');
  const closeAddScreen = () => setScreenKey('workouts');

  const handleSaveRoutine = (day: WorkoutDay) => {
    setWorkoutDays((currentDays) => [...currentDays, day]);
    setScreenKey('workouts');
    setActiveTab('home');
  };

  if (screenKey === 'addRoutine') {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AddRoutine onBack={closeAddScreen} onSave={handleSaveRoutine} />
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
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
              <Pressable onPress={openAddScreen} style={({ pressed }) => [styles.addRoutinePill, pressed && styles.pressed]}>
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
              <Home workoutDays={workoutDays} onRemoveDay={handleRemoveDay} onOpenAdd={openAddScreen} />
            ) : activeTab === 'history' ? (
              <History />
            ) : (
              <Account />
            )}
          </View>

          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
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
    paddingBottom: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLabel: {
    color: '#58a6ff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  addRoutinePill: {
    backgroundColor: '#238636',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#238636',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  addRoutineText: { color: '#fff', fontSize: 10, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
  hero: { paddingTop: 14, paddingBottom: 10, gap: 4 },
  title: {
    color: '#c9d1d9',
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Montserrat_900Black',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
    fontFamily: 'Montserrat_400Regular',
  },
  content: { flex: 1, minHeight: 0 },
  pressed: { opacity: 0.75 },
});
