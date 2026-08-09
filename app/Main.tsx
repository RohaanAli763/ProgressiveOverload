import React, { useEffect, useMemo, useState } from 'react';
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
import AddWorkout from './screens/AddWorkout';
import History from './screens/History';
import Account from './screens/Account';
import TabBar from './components/TabBar';
import type { WorkoutDay } from './screens/Home';
import {
  fetchWorkoutDays,
  saveWorkoutDay,
  deleteWorkoutDay,
} from './services/workoutService';

type TabKey = 'home' | 'history' | 'account';
type ScreenKey = 'workouts' | 'addWorkout';

export default function Main() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [screenKey, setScreenKey] = useState<ScreenKey>('workouts');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchWorkoutDays().then((days) => {
      if (isMounted) {
        setWorkoutDays(days);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') return 'Your Workouts';
    if (activeTab === 'history') return 'History';
    return 'Account';
  }, [activeTab]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRemoveDay = async (dayId: string) => {
    setWorkoutDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
    await deleteWorkoutDay(dayId);
  };

  const openAddScreen = () => setScreenKey('addWorkout');
  const closeAddScreen = () => setScreenKey('workouts');

  const handleSaveRoutine = async (day: WorkoutDay) => {
    setWorkoutDays((currentDays) => [...currentDays, day]);
    setScreenKey('workouts');
    setActiveTab('home');

    const saved = await saveWorkoutDay(day);
    setWorkoutDays((currentDays) =>
      currentDays.map((d) => (d.id === day.id ? saved : d))
    );
  };

  if (screenKey === 'addWorkout') {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AddWorkout onBack={closeAddScreen} onSave={handleSaveRoutine} />
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
              <Pressable onPress={openAddScreen} style={({ pressed }) => [styles.addWorkoutPill, pressed && styles.pressed]}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.addWorkoutText}>ADD WORKOUT</Text>
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
  addWorkoutPill: {
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
  addWorkoutText: { color: '#fff', fontSize: 10, fontFamily: 'Montserrat_700Bold', letterSpacing: 0.8 },
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
