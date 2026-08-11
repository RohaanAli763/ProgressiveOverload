import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WorkoutDay, MuscleGroup, Exercise } from '../screens/Home';

/**
 * Fetch all workout days from Supabase with muscle groups and exercises nested.
 */
export async function fetchWorkoutDays(): Promise<WorkoutDay[]> {
  if (!isSupabaseConfigured) {
    console.log('[Supabase] Not configured.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('workout_days')
      .select(`
        id,
        name,
        notes,
        position,
        muscle_groups (
          id,
          name,
          position,
          exercises (
            id,
            name,
            notes,
            position
          )
        )
      `)
      .order('position', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching workout days:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map database shape to app model
    const mapped: WorkoutDay[] = data.map((wd: any) => ({
      id: wd.id,
      name: wd.name,
      note: wd.notes || '',
      icon: 'fitness-center',
      muscleGroups: (wd.muscle_groups || []).map((mg: any) => ({
        id: mg.id,
        name: mg.name,
        exercises: (mg.exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          prescription: ex.notes || '',
        })),
      })),
    }));

    return mapped;
  } catch (err) {
    console.error('[Supabase] Unexpected error fetching workout days:', err);
    return [];
  }
}

/**
 * Persist a new workout day (with muscle groups & exercises) to Supabase.
 */
export async function saveWorkoutDay(day: WorkoutDay): Promise<WorkoutDay> {
  if (!isSupabaseConfigured) {
    return day;
  }

  try {
    // 1. Get current logged in user ID if available
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const wdPayload: Record<string, any> = {
      name: day.name,
      notes: day.note,
    };
    if (userId) {
      wdPayload.user_id = userId;
    }

    // 2. Insert Workout Day
    const { data: wdData, error: wdError } = await supabase
      .from('workout_days')
      .insert(wdPayload)
      .select()
      .single();

    if (wdError) {
      console.error('[Supabase] Error saving workout day:', wdError.message);
      return day;
    }

    const savedWdId = wdData.id;
    const savedMuscleGroups: MuscleGroup[] = [];

    // 2. Insert Muscle Groups & Exercises
    for (let mgIdx = 0; mgIdx < day.muscleGroups.length; mgIdx++) {
      const mg = day.muscleGroups[mgIdx];
      const { data: mgData, error: mgError } = await supabase
        .from('muscle_groups')
        .insert({
          workout_day_id: savedWdId,
          name: mg.name,
          position: mgIdx,
        })
        .select()
        .single();

      if (mgError) {
        console.error('[Supabase] Error saving muscle group:', mgError.message);
        continue;
      }

      const savedMgId = mgData.id;
      const savedExercises: Exercise[] = [];

      for (let exIdx = 0; exIdx < mg.exercises.length; exIdx++) {
        const ex = mg.exercises[exIdx];
        const { data: exData, error: exError } = await supabase
          .from('exercises')
          .insert({
            muscle_group_id: savedMgId,
            name: ex.name,
            notes: ex.prescription,
            position: exIdx,
          })
          .select()
          .single();

        if (exError) {
          console.error('[Supabase] Error saving exercise:', exError.message);
          savedExercises.push(ex);
        } else {
          savedExercises.push({
            id: exData.id,
            name: exData.name,
            prescription: exData.notes || '',
          });
        }
      }

      savedMuscleGroups.push({
        id: savedMgId,
        name: mgData.name,
        exercises: savedExercises,
      });
    }

    return {
      id: savedWdId,
      name: wdData.name,
      note: wdData.notes || '',
      icon: 'fitness-center',
      muscleGroups: savedMuscleGroups,
    };
  } catch (err) {
    console.error('[Supabase] Unexpected error saving workout day:', err);
    return day;
  }
}

/**
 * Delete a workout day from Supabase.
 */
export async function deleteWorkoutDay(dayId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('workout_days')
      .delete()
      .eq('id', dayId);

    if (error) {
      console.error('[Supabase] Error deleting workout day:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Unexpected error deleting workout day:', err);
    return false;
  }
}
