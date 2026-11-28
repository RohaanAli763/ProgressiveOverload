# Handoff (2026-11-24, session 2)

Read CLAUDE.md first, then `plan.md` (the roadmap; each phase has a **Status** paragraph with details). This file records what changed or was learned this session.

## State
- Branch `gymyaki-hci-upgrade`, cut from `hci-accessibility-upgrade` and committed locally. **Not pushed.**
- Checks: `npx tsc --noEmit` clean. `npm test` has 74 passing (8 suites, all in `app/lib/`). Lint shows only 3 old warnings: unused `EditRoutineModal` and `setWorkoutDay` in WorkoutDetail.tsx, and an exhaustive-deps warning in Auth.tsx:86. The old `set-state-in-effect` error is gone (the old set modal was replaced). `expo-doctor` passed 21/21 after the installs.
- **Nothing has been tested on a device yet.** All UI below was typechecked and unit-tested only.

## User still has to do
1. **Run `supabase/migrations/001_set_logs.sql`** in the Supabase SQL editor (new `set_logs` table + RLS). Until then, progress/PRs/history charts stay empty and `logSet` logs `[Supabase]` errors (harmless).
2. **Rebuild the Android dev build.** New native packages since the last build: expo-haptics, expo-keep-awake, expo-speech, expo-speech-recognition (pinned `~57.1.1`, because `expo install` picks 58.x, which targets SDK 58), @react-native-community/netinfo, react-native-svg, expo-linear-gradient. `app.json` changed too: dark UI style, plus the speech-recognition plugin with mic/speech permission strings. For iOS, push tag `ios-4`.
3. Test on Android. The checklist per phase is in the session summary below.

## Done this session (all phases of plan.md)
- **0 Foundation:** `tokens.ts` (palette + AAA `highContrastPalette`, `MIN_TOUCH_TARGET`). `A11yContext` provides real prefs persisted in AsyncStorage (`app/lib/a11yPrefs.ts`), wired into `App.tsx`. `haptics.ts` (tick/setSaved/restDone/error, respects the pref). Android back button: `Main.tsx` handles the add screen and tabs; `WorkoutDetail` runs Done (auto-save) or asks "Finish workout?".
- **1 Number wheel:** `components/accessible/NumberWheel.tsx` is a ScrollView with snapping (5 rows, 48dp each, haptic tick, tap a row, long-press to type, TalkBack "adjustable"). `Stepper.tsx` provides the ± buttons. Logic is in `lib/wheel.ts`. `EditSetModal` in WorkoutDetail is now a bottom sheet with two wheels and is remounted per set via `key`.
- **3 Gym mode:** START WORKOUT bar → ✓ per set (saves + starts rest) → `RestTimer` (timestamp-based, ±15, skip, 3 haptic pulses + optional speech) → `ElapsedClock`, keep-awake → `WorkoutSummary`. Logic is in `lib/session.ts`.
- **4 Progress:** `logSet` writes `set_logs`, one row per set per local day. PRs: `PrBanner` plus a count in the summary. History has `ProgressOverview` (week stats/streak + exercise list) and `ExerciseProgress` (gifted-charts line chart + session list). Logic is in `lib/progress.ts` (Epley e1RM).
- **2 Accessibility pass:** roles/labels/states everywhere. `lib/a11yLabels.ts` turns set rows into sentences. hitSlop ≥48dp. maxFontSizeMultiplier 1.3 on tight cells. `UndoSnackbar` replaces delete confirms for sets and days. `OverflowMenu` (⋮ → View progress / Edit routine). `AccessibilitySettings` opens from Account: high contrast, voice input, left-handed, vibration, spoken alerts, reduce motion, weight step 1/1.25/2.5/5, and a link to the phone's display settings.
- **5 Voice:** `VoiceButton` in the set sheet (only when the voice pref is on). `lib/voiceCommand.ts` parses the commands. `speech.ts` wraps expo-speech-recognition and expo-speech.
- **6 Offline:** `services/offlineSync.ts` (queue in AsyncStorage + NetInfo, flush in order) on top of the pure `lib/offlineQueue.ts`. New `upsertSetByNumber` in workoutService (idempotent retry). `SyncPill`. The workout list is cached on the phone.

## Decisions the user made / deviations from plan.md
- kg only. Voice kept. `set_logs` table approved. Default weight step 2.5. Charts use react-native-gifted-charts.
- The user wanted accessibility settings in the Account tab. High contrast covers the gym screens only (workout, wheels, stepper, rest timer, Home, tab bar, Main header), not History, Account or Login.
- Dropped: app-level text size (the app follows the OS font size), the "Same as last" chip (Save already repeats last time), and ⋮ delete/reorder/note (EDIT covers those). One-handed mode became "left-handed layout". START WORKOUT lives in WorkoutDetail, not on the Home card. The streak shows in History, not Home.

## Conventions added (follow them)
- **Set writes go through `saveSet` / `deleteSet` in `services/offlineSync.ts`**, not `upsertSingleSet`/`deleteSingleSet` directly; otherwise offline queueing and temp-id remapping break. `persistSet` in WorkoutDetail is the single save path (wheel Save, ✓, voice).
- High contrast = per-component override StyleSheets (`hcStyles`, `rowHC`, `exHC`…) layered with `prefs.highContrast && …`, using `highContrastPalette` hex values. Read prefs with `useA11y()` inside each component instead of prop drilling.
- Pure logic lives in `app/lib/*.ts` with a `*.test.ts` next to it (wheel, session, progress, a11yLabels, a11yPrefs, voiceCommand, offlineQueue).
- Delete-with-undo pattern: remove from UI immediately, keep `pending…` state, commit in `onExpire` (or when leaving the screen / on the next delete).

## Known gaps / ideas for next session
- No notification when rest ends with the app in the background (needs expo-notifications + rebuild).
- If a day delete is still pending when the app is killed (5s undo window), it never happens and the day comes back. This is the safe failure.
- Offline doesn't cover routine create/edit, day delete, or History.
- High contrast is not applied to History/Account/Auth/AddWorkout.
- `todo.txt` still lists a splash screen.
- `docs/HCI_UPGRADE_PLAN.md` holds the HCI theory for the report; the evaluation plan (time-on-task, TalkBack walkthrough, SUS) is at the end of `plan.md`.

## Gotchas learned
- Several source files use CRLF (`workoutService.ts`, `History.tsx`, `AddWorkout.tsx`, `Account.tsx`, `Home.tsx`, `Main.tsx`). Editing with `sed -i` rewrites them to LF and makes the whole file show as changed; preserve the line endings.
- A Bash `cd` into `node_modules/...` persists as the working directory; use absolute paths.
- `fetchWorkoutDays` returns `[]` both for "no days" and for errors. Use `acceptFetchedWorkoutDays` (offlineSync) before replacing the list.
- gifted-charts needs both react-native-svg and expo-linear-gradient. `yAxisOffset` subtracts from values (the axis doesn't start at 0).
