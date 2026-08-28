import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WorkoutDay, MuscleGroup, Exercise, ExerciseSet } from '../screens/Home';

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
            position,
            exercise_sets (
              id,
              exercise_id,
              set_number,
              weight,
              reps,
              notes
            )
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
          sets: (ex.exercise_sets || [])
            .map((set: any) => ({
              id: set.id,
              exerciseId: set.exercise_id,
              setNumber: set.set_number,
              weight: set.weight !== null ? Number(set.weight) : null,
              reps: set.reps !== null ? Number(set.reps) : null,
              previous: set.notes || null,
            }))
            .sort((a: any, b: any) => a.setNumber - b.setNumber),
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

/**
 * Save (upsert/delete) exercise sets for a given exercise.
 *
 * Strategy for "previous":
 *   - The `notes` column stores the previous performance as "weight x reps".
 *   - When saving, we look up what is currently in the DB for each set.
 *     If the set already exists and had real weight/reps, we carry those over
 *     into `notes` (the previous field) before writing the new values.
 *   - New sets get null notes (no previous data yet).
 *   - Deleted sets are removed from the DB.
 *
 * @param exerciseId  UUID of the exercise
 * @param currentSets The sets as they currently appear in Supabase (before edits)
 * @param updatedSets The new set list the user wants to save
 */
export async function saveExerciseSets(
  exerciseId: string,
  currentSets: ExerciseSet[],
  updatedSets: ExerciseSet[]
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    // 1. Determine which sets were deleted
    const updatedIds = new Set(updatedSets.map((s) => s.id).filter((id) => !id.startsWith('new-')));
    const deletedIds = currentSets
      .filter((s) => !updatedIds.has(s.id))
      .map((s) => s.id);

    // 2. Delete removed sets
    if (deletedIds.length > 0) {
      const { error: delError } = await supabase
        .from('exercise_sets')
        .delete()
        .in('id', deletedIds);
      if (delError) {
        console.error('[Supabase] Error deleting sets:', delError.message);
      }
    }

    // 3. Build a quick lookup of current DB values so we can compute "previous"
    const currentBySetNumber = new Map<number, ExerciseSet>();
    for (const s of currentSets) {
      currentBySetNumber.set(s.setNumber, s);
    }

    // 4. Upsert each updated set
    for (const set of updatedSets) {
      const isNew = set.id.startsWith('new-');

      // Derive the "previous" notes value:
      //   - For existing sets: use the old weight/reps from the DB as the new previous
      //   - For new sets: keep whatever previous string exists (null for brand-new rows)
      let previousNotes: string | null = set.previous;
      if (!isNew) {
        const old = currentBySetNumber.get(set.setNumber);
        if (old && old.weight !== null && old.reps !== null) {
          previousNotes = `${old.weight} x ${old.reps}`;
        } else if (old) {
          previousNotes = old.previous;
        }
      }

      if (isNew) {
        // INSERT
        const { error: insError } = await supabase.from('exercise_sets').insert({
          exercise_id: exerciseId,
          set_number: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          notes: previousNotes,
        });
        if (insError) {
          console.error('[Supabase] Error inserting set:', insError.message);
        }
      } else {
        // UPDATE
        const { error: updError } = await supabase
          .from('exercise_sets')
          .update({
            set_number: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            notes: previousNotes,
          })
          .eq('id', set.id);
        if (updError) {
          console.error('[Supabase] Error updating set:', updError.message);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Unexpected error saving sets:', err);
    return false;
  }
}

/**
 * Insert or update a single exercise set.
 * Returns the real DB id (important after inserts so local state stays in sync).
 */
export async function upsertSingleSet(
  exerciseId: string,
  set: ExerciseSet,
): Promise<{ success: boolean; savedId: string }> {
  if (!isSupabaseConfigured) return { success: true, savedId: set.id };

  const isNew = set.id.startsWith('new-');

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from('exercise_sets')
        .insert({
          exercise_id: exerciseId,
          set_number: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          notes: set.previous,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Supabase] Error inserting set:', error.message);
        return { success: false, savedId: set.id };
      }
      return { success: true, savedId: data.id };
    } else {
      const { error } = await supabase
        .from('exercise_sets')
        .update({
          weight: set.weight,
          reps: set.reps,
          notes: set.previous,
        })
        .eq('id', set.id);

      if (error) {
        console.error('[Supabase] Error updating set:', error.message);
        return { success: false, savedId: set.id };
      }
      return { success: true, savedId: set.id };
    }
  } catch (err) {
    console.error('[Supabase] Unexpected error upserting set:', err);
    return { success: false, savedId: set.id };
  }
}

/**
 * Delete a single exercise set by its DB id.
 */
export async function deleteSingleSet(setId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId);

    if (error) {
      console.error('[Supabase] Error deleting set:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Unexpected error deleting set:', err);
    return false;
  }
}

/**
 * Update an existing workout day structure (name, notes, muscle groups & exercises).
 */
export async function updateWorkoutDay(day: WorkoutDay): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    // 1. Update workout_days table
    const { error: wdError } = await supabase
      .from('workout_days')
      .update({
        name: day.name,
        notes: day.note,
      })
      .eq('id', day.id);

    if (wdError) {
      console.error('[Supabase] Error updating workout day:', wdError.message);
      return false;
    }

    // 2. Fetch existing muscle groups for this workout day
    const { data: existingMgs } = await supabase
      .from('muscle_groups')
      .select('id, name')
      .eq('workout_day_id', day.id);

    const currentMgIds = (existingMgs || []).map((m: any) => m.id);
    const updatedMgIds = new Set(day.muscleGroups.map((m) => m.id).filter((id) => !id.startsWith('mg-')));

    // Delete removed muscle groups
    const deletedMgIds = currentMgIds.filter((id) => !updatedMgIds.has(id));
    if (deletedMgIds.length > 0) {
      await supabase.from('muscle_groups').delete().in('id', deletedMgIds);
    }

    // Upsert muscle groups and exercises
    for (let mgIdx = 0; mgIdx < day.muscleGroups.length; mgIdx++) {
      const mg = day.muscleGroups[mgIdx];
      let mgId = mg.id;

      if (mg.id.startsWith('mg-')) {
        // Insert new muscle group
        const { data: newMg, error: newMgErr } = await supabase
          .from('muscle_groups')
          .insert({
            workout_day_id: day.id,
            name: mg.name,
            position: mgIdx,
          })
          .select('id')
          .single();

        if (newMgErr || !newMg) continue;
        mgId = newMg.id;
      } else {
        // Update existing muscle group
        await supabase
          .from('muscle_groups')
          .update({ name: mg.name, position: mgIdx })
          .eq('id', mgId);
      }

      // Handle exercises inside this muscle group
      const { data: existingExs } = await supabase
        .from('exercises')
        .select('id')
        .eq('muscle_group_id', mgId);

      const currentExIds = (existingExs || []).map((e: any) => e.id);
      const updatedExIds = new Set(mg.exercises.map((e) => e.id).filter((id) => !id.startsWith('ex-')));

      // Delete removed exercises
      const deletedExIds = currentExIds.filter((id) => !updatedExIds.has(id));
      if (deletedExIds.length > 0) {
        await supabase.from('exercises').delete().in('id', deletedExIds);
      }

      // Upsert exercises
      for (let exIdx = 0; exIdx < mg.exercises.length; exIdx++) {
        const ex = mg.exercises[exIdx];
        if (ex.id.startsWith('ex-')) {
          // Insert new exercise
          await supabase.from('exercises').insert({
            muscle_group_id: mgId,
            name: ex.name,
            notes: ex.prescription,
            position: exIdx,
          });
        } else {
          // Update existing exercise
          await supabase
            .from('exercises')
            .update({
              name: ex.name,
              notes: ex.prescription,
              position: exIdx,
            })
            .eq('id', ex.id);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Unexpected error updating workout day:', err);
    return false;
  }
}

/**
 * Fetch all workout improvements (commits) logged by the user,
 * ordered by logged_at descending.
 */
export async function fetchImprovements(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('workout_improvements')
      .select(`
        id,
        weight,
        reps,
        logged_at,
        exercises (
          name
        )
      `)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching improvements:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[Supabase] Unexpected error fetching improvements:', err);
    return [];
  }
}

