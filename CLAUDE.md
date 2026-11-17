# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GymYaki: a progressive-overload workout tracker. Expo ~57 managed + expo-dev-client, React Native 0.86, React 19, strict TypeScript, npm, Supabase (auth, Postgres, RLS). The user tests on Android with a dev build, so Expo Go may not work for native features.

## Working rules

- Read the relevant code before changing it. Never assume file structure, dependencies or existing implementations.
- Follow existing conventions and reuse existing components/helpers. Keep diffs small and focused: no refactors, renames or restyling beyond what was asked.
- Ask when requirements are ambiguous. For changes touching many files, propose a plan first.
- Never modify environment variables (`.env`), database schemas or API contracts without explicit approval.
- Do not commit unless asked. Commit messages are short, lowercase, informal, no prefix and no trailing period.
- Keep end-of-turn summaries to a few lines.

## Verification

There is no format script. After changes run `npx tsc --noEmit` (not scripted in package.json), `npm run lint` (ESLint via `expo lint`) and `npm test` (Jest with `jest-expo`; tests sit next to the code as `*.test.ts`), and fix errors you introduced. Pure logic goes in `app/lib/` (e.g. `commits.ts`) so it can be unit-tested; add tests when you change it. `npm install` needs `--legacy-peer-deps` because `jest-expo` wants `@react-native/jest-preset` ^0.86.3 while `react-native` 0.86.2 pins 0.86.2. Some lint problems already exist (e.g. a `set-state-in-effect` error in `WorkoutDetail.tsx`); leave them unless asked. UI is verified by the user on Android.

## Database

- `supabase/schema.sql` is the source of truth for the current schema. It is applied by hand in the Supabase SQL editor.
- New DB changes go in numbered files under `supabase/migrations/` for the user to apply. Do not edit `schema.sql` directly, and never apply SQL yourself.
- `architecture.md` and `prd.md` are outdated (they mention `workout_sessions`/`workout_sets`, which don't exist). Ignore them and trust the schema and the code.
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_APP_NAME` in a gitignored `.env`.

## Architecture gotchas

- There is no navigation library. `app/Main.tsx` holds all top-level state and conditionally renders full-screen overlays (`WorkoutDetail`, `AddWorkout`) with `useState`. There is no back stack and no Android back-button handling. State is plain `useState` and prop drilling.
- Shared types (`WorkoutDay`, `MuscleGroup`, `Exercise`, `ExerciseSet`) are exported from `app/screens/Home.tsx` and imported elsewhere.
- All Supabase access goes through `app/services/workoutService.ts`.
- Locally created items have prefixed ids (`new-` sets, `mg-` muscle groups, `ex-` exercises). `updateWorkoutDay` and `saveExerciseSets` use those prefixes to decide insert vs update, so keep them.
- The "previous" weight x reps is stored as a text string in `exercise_sets.notes`; the client copies old values into it on save.
- `saveWorkoutDay` logs errors and continues instead of rolling back. Unique constraints: `workout_days (user_id, name)`, `muscle_groups (workout_day_id, name)`, `exercises (muscle_group_id, name)`, `exercise_sets (exercise_id, set_number)`.

## "Commits" (progressive overload) logic

- Lives in the DB, not the client: trigger `trigger_log_exercise_set_improvement` calls `public.log_set_improvement()` AFTER UPDATE on `exercise_sets`.
- It inserts a `workout_improvements` row when a set's weight or reps change, unless that user already has one for that exercise today. So at most one commit per exercise per day, however many sets are edited. Set INSERTs never create commits. The trigger does not check for an increase, so a decrease also counts.
- The trigger's day boundary is UTC, but `History.tsx` buckets by local date (`toLocalDateStr`), so a timezone mismatch is possible.

## Style

- Function components with hooks. Default export per screen, named exports for services. Screens are PascalCase files, services are camelCase.
- Styling is `StyleSheet.create` at the bottom of each file with hardcoded hex colors. There is no theme module. The UI is dark only (GitHub-like palette: bg `#0b141c`, tab bar `#0f1720`, border `#30363d`, text `#c9d1d9`, muted `#8b949e`, accent `#58a6ff`, action green `#238636`). Reuse these values rather than inventing new ones.
- Fonts are Montserrat via `fontFamily` strings (`Montserrat_400Regular`, `_700Bold`, `_800ExtraBold`, `_900Black`). Headings are uppercase with letterSpacing. Icons come from MaterialIcons.
- Pressables use `style={({pressed}) => [..., pressed && styles.pressed]}` (opacity 0.75).
- Services catch errors, `console.error` with a `[Supabase]` prefix and return fallbacks (`[]`, `false`). Screens show user-facing errors with `Alert.alert`.
