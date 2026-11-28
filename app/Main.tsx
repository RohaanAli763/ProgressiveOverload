import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import UndoSnackbar, { type UndoNotice } from './components/accessible/UndoSnackbar';
import { useA11y } from './accessibility/A11yContext';
import SyncPill from './components/accessible/SyncPill';
import { acceptFetchedWorkoutDays, initOfflineSync, loadCachedWorkoutDays } from './services/offlineSync';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { Session } from '@supabase/supabase-js';
import Home from './screens/Home';
import AddWorkout from './screens/AddWorkout';
import WorkoutDetail from './screens/WorkoutDetail';
import History from './screens/History';
import Account from './screens/Account';
import TabBar from './components/TabBar';
import type { WorkoutDay } from './screens/Home';
import {
  fetchWorkoutDays,
  saveWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
} from './services/workoutService';

type TabKey = 'home' | 'history' | 'account';
type ScreenKey = 'workouts' | 'addWorkout';

interface MainProps {
  session?: Session | null;
}

export default function Main({ session }: MainProps) {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [screenKey, setScreenKey] = useState<ScreenKey>('workouts');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState<WorkoutDay | null>(null);
  const [editingWorkoutDay, setEditingWorkoutDay] = useState<WorkoutDay | null>(null);
  const { prefs } = useA11y();
  const hc = prefs.highContrast;

  // Deleting a day hides it at once; the DB delete runs when the undo snackbar expires.
  const [pendingDelete, setPendingDelete] = useState<{ day: WorkoutDay; index: number } | null>(null);
  const [undo, setUndo] = useState<UndoNotice | null>(null);

  // Load the offline queue and start syncing it whenever the connection is there.
  useEffect(() => {
    initOfflineSync();
  }, []);

  useEffect(() => {
    let isMounted = true;
    // Show the cached list right away (works offline), then replace it with the fresh one.
    loadCachedWorkoutDays().then((cached) => {
      if (isMounted && cached.length > 0) {
        setWorkoutDays((current) => (current.length === 0 ? cached : current));
      }
    });
    fetchWorkoutDays()
      .then(acceptFetchedWorkoutDays)
      .then((days) => {
        if (isMounted && days) {
          setWorkoutDays(days);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Android back: close the add/edit screen, then go back to the Home tab, then leave the app.
  // WorkoutDetail registers its own handler (it auto-saves unsaved sets on exit), so we pass
  // the event on to it by returning false while it is open. Modals handle back themselves.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedWorkoutDay) return false;
      if (screenKey === 'addWorkout') {
        setEditingWorkoutDay(null);
        setScreenKey('workouts');
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedWorkoutDay, screenKey, activeTab]);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') return 'Your Workouts';
    if (activeTab === 'history') return 'History';
    return 'Account';
  }, [activeTab]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRemoveDay = (dayId: string) => {
    const index = workoutDays.findIndex((d) => d.id === dayId);
    if (index === -1) return;
    // A second delete commits the first one right away.
    if (pendingDelete) deleteWorkoutDay(pendingDelete.day.id);
    setPendingDelete({ day: workoutDays[index], index });
    setWorkoutDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
    setUndo({ key: Date.now(), message: `Deleted ${workoutDays[index].name}` });
  };

  const handleUndoDelete = () => {
    if (pendingDelete) {
      const { day, index } = pendingDelete;
      setWorkoutDays((currentDays) => {
        const next = [...currentDays];
        next.splice(Math.min(index, next.length), 0, day);
        return next;
      });
    }
    setPendingDelete(null);
    setUndo(null);
  };

  const commitDelete = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    setUndo(null);
    if (pending) {
      const ok = await deleteWorkoutDay(pending.day.id);
      if (!ok) {
        // Put it back so the list matches the database.
        setWorkoutDays((currentDays) => [...currentDays, pending.day]);
      }
    }
  };

  const openAddScreen = () => {
    if (pendingDelete) commitDelete();
    setEditingWorkoutDay(null);
    setScreenKey('addWorkout');
  };

  const closeAddScreen = () => {
    setEditingWorkoutDay(null);
    setScreenKey('workouts');
  };

  const handleSelectDay = (day: WorkoutDay) => {
    if (pendingDelete) commitDelete();
    setSelectedWorkoutDay(day);
  };

  const handleStartEditFromDetail = (day: WorkoutDay) => {
    setSelectedWorkoutDay(null);
    setEditingWorkoutDay(day);
    setScreenKey('addWorkout');
  };

  const handleCloseDetail = async () => {
    // Refresh workout days so set data is fresh next time the day is opened
    setSelectedWorkoutDay(null);
    const refreshed = await acceptFetchedWorkoutDays(await fetchWorkoutDays());
    if (refreshed) setWorkoutDays(refreshed); // null = offline: keep the list on screen
  };

  const handleSaveRoutine = async (day: WorkoutDay): Promise<boolean> => {
    try {
      if (editingWorkoutDay) {
        // Edit mode
        const ok = await updateWorkoutDay(day);
        if (ok) {
          const refreshed = await acceptFetchedWorkoutDays(await fetchWorkoutDays());
          if (refreshed) setWorkoutDays(refreshed);
          setEditingWorkoutDay(null);
          setScreenKey('workouts');
          setActiveTab('home');
          return true;
        }
        return false;
      } else {
        // Create mode
        const saved = await saveWorkoutDay(day);
        if (saved) {
          setWorkoutDays((currentDays) => [...currentDays, saved]);
          setScreenKey('workouts');
          setActiveTab('home');
          return true;
        }
        return false;
      }
    } catch (err) {
      console.error('Failed to save workout routine:', err);
      return false;
    }
  };

  // Workout Detail screen – full-screen overlay
  if (selectedWorkoutDay) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
        <WorkoutDetail
          day={selectedWorkoutDay}
          onBack={handleCloseDetail}
          onEdit={handleStartEditFromDetail}
        />
      </View>
    );
  }

  if (screenKey === 'addWorkout') {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b141c" translucent={false} />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AddWorkout
            initialWorkoutDay={editingWorkoutDay}
            onBack={closeAddScreen}
            onSave={handleSaveRoutine}
          />
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, hc && hcStyles.bg]}>
      <StatusBar barStyle="light-content" backgroundColor={hc ? '#000000' : '#0b141c'} translucent={false} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.screen, hc && hcStyles.bg]}>
          <View style={[styles.headerBar, hc && hcStyles.headerBar]}>
            <View style={styles.headerRow}>
              <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="GymYaki">
                <MaterialIcons name="fitness-center" size={22} color="#58a6ff" />
                <Text style={styles.appLabel}>GymYaki</Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={openAddScreen}
                  accessibilityRole="button"
                  accessibilityLabel="Add workout"
                  style={({ pressed }) => [styles.addWorkoutPill, pressed && styles.pressed]}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.addWorkoutText}>ADD WORKOUT</Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('account')}
                  accessibilityRole="button"
                  accessibilityLabel="Account"
                  hitSlop={9}
                  style={({ pressed }) => [
                    styles.profileBtn,
                    activeTab === 'account' && styles.profileBtnActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons
                    name="account-circle"
                    size={26}
                    color={activeTab === 'account' ? '#58a6ff' : '#8b949e'}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.syncRow}>
            <SyncPill />
          </View>

          <View style={styles.hero}>
            <Text style={[styles.title, hc && hcStyles.title]} accessibilityRole="header">{tabTitle}</Text>
          </View>

          <View style={styles.content}>
            {activeTab === 'home' ? (
              <Home
                workoutDays={workoutDays}
                onRemoveDay={handleRemoveDay}
                onOpenAdd={openAddScreen}
                onSelectDay={handleSelectDay}
              />
            ) : activeTab === 'history' ? (
              <History />
            ) : (
              <Account session={session} />
            )}
          </View>

          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>
        <UndoSnackbar undo={undo} onUndo={handleUndoDelete} onExpire={commitDelete} bottom={90} />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLabel: {
    color: '#58a6ff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  profileBtn: {
    padding: 2,
    borderRadius: 16,
  },
  profileBtnActive: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
  },
  hero: { paddingTop: 14, paddingBottom: 10, gap: 4 },
  syncRow: { paddingTop: 8 },
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

// High contrast overrides (highContrastPalette in tokens.ts).
const hcStyles = StyleSheet.create({
  bg: { backgroundColor: '#000000' },
  headerBar: { borderBottomColor: '#d0d7de' },
  title: { color: '#ffffff' },
});
