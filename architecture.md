# Architecture

## Stack
- Frontend: React Native with Expo
- Backend/Auth: Supabase
- Language: TypeScript

## Core App Areas
- Authentication: Supabase email/password or future OAuth options.
- Workout days: user-defined training splits such as push, pull, leg, arm, or custom days.
- Exercises: each workout day contains multiple exercises.
- Logging: store weight, reps, and session date for each exercise entry.
- History: show past performance per exercise and per workout day.

## Proposed Data Model
- profiles: user account metadata.
- workout_days: day name, order, and muscle group.
- exercises: exercise name, default day reference, and ordering.
- workout_sessions: completed gym visits with date and day reference.
- workout_sets: set-level weight, reps, and optional notes.

## Client Structure
- app screens for login, workout day overview, session detail, history, and edit flows.
- reusable UI components for inputs, cards, set rows, and history summaries.
- a Supabase client module for auth and database access.

## Future Considerations
- Offline-first caching for gym-floor reliability.
- Quick edit interactions optimized for one-handed use.
- Exercise templates and session duplication.
