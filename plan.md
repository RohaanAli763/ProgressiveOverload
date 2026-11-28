# GymYaki plan: HCI accessibility + "Liftoff, but simpler"

Branch `hci-accessibility-upgrade`. This plan builds on `docs/HCI_UPGRADE_PLAN.md`. That doc covers the HCI theory, the disability table and why we don't need Kafka. This file covers what to build and in what order.

## Goal

One job: **log a set fast, one-handed, mid-workout, and see that you're progressing.**
We borrow Liftoff's core loop (start workout, tick off sets, rest timer, PRs, progress per exercise, streak). We skip its social, leaderboard and gamification layers. Every screen should work with one thumb and a sweaty hand, with TalkBack, and at max font size.

## Where things stand

- Set entry: tap a set row in `WorkoutDetail`, which opens `EditSetModal` with two numeric `TextInput`s and the keyboard. Two-handed, small targets, keyboard covers the screen.
- Zero `accessibilityLabel`/`accessibilityRole` props in the app. No Android back-button handling (`BackHandler`), so back exits the app from any overlay.
- `exercise_sets` is overwritten in place. Only the last value is kept, plus "previous" as a text string in `notes`. `workout_improvements` keeps one row per exercise per day, holding one set's weight/reps. **We can't draw real per-exercise progress charts or compute PRs over time without a new table** (see Phase 4).
- The HCI stubs exist (`tokens.ts`, `A11yContext`, `Stepper`, `RestTimer`, `OverflowMenu`, `haptics.ts`, `speech.ts`, `voiceCommand.ts`, `offlineQueue.ts`) but none are implemented or wired in.
- `app.json` has `userInterfaceStyle: "light"` but the UI is dark only.

---

## Phase 0: Foundation (small, unblocks everything)

**Status: done 2026-11-24, needs a new dev build (Android) and ipa (tag `ios-4`).** All native packages are installed. `expo-speech-recognition` is pinned to `~57.1.1`, because `expo install` picked 58.x, which targets SDK 58. `expo-linear-gradient` was added because the chart library needs it. Prefs live in `app/lib/a11yPrefs.ts` (tested), and `A11yProvider` wraps the app in `App.tsx`. Back button: `Main.tsx` handles add screen, then tabs. `WorkoutDetail` runs its Done (auto-save) on back. Modals handle back themselves.

1. Install native packages **in one batch**, so the Android dev build (and the iOS ipa, tag `ios-4`) only gets rebuilt once:
   `npx expo install expo-haptics expo-keep-awake expo-speech expo-speech-recognition @react-native-community/netinfo react-native-svg -- --legacy-peer-deps`, plus `npm i react-native-gifted-charts --legacy-peer-deps` (pure JS, draws on top of `react-native-svg`).
   `expo-speech-recognition` needs mic/speech permissions in `app.json` (its config plugin).
2. `tokens.ts`: fill in `highContrastPalette` (AAA 7:1). Add `fontSize` scale helpers. Fix the placeholder color `#3d444e`, which fails contrast.
3. `A11yContext`: real state, persisted in AsyncStorage (already installed), seeded from `AccessibilityInfo` (reduce motion, screen reader). Wrap `Main` in `A11yProvider`.
4. `haptics.ts`: implement on top of `expo-haptics`, respecting `prefs.haptics`. Add a `tick` event for the wheel.
5. Android back button: one `BackHandler` in `Main.tsx` that closes the top overlay (edit modal, then detail, then add screen), and leaves the app only from Home.
6. `app.json`: `userInterfaceStyle: "dark"`.

## Phase 1: Number wheel set entry (the headline feature)

**Status: done 2026-11-24, needs testing on Android.** `app/components/accessible/NumberWheel.tsx` (a ScrollView with snapping), `Stepper.tsx` (the ± buttons) and `app/lib/wheel.ts` (tested). The edit popup in `WorkoutDetail` is now a bottom sheet with two wheels. A set with no value starts at 20 kg x 8. Values off the 2.5 kg grid (e.g. an old 81 kg) are kept on the wheel, not rounded away. A "Same as last" chip was dropped: a set already opens on last time's values, so Save alone repeats it. The sheet shows "Last time" and "Before that" instead. Saving gives a haptic and a TalkBack announcement. Removing the old inputs also removed the pre-existing set-state-in-effect lint error.

Replace the keyboard modal with a **bottom sheet that has two vertical scroll wheels**, weight and reps, side by side, all reachable with one thumb.

```
┌──────────────────────────────┐
│ Bench Press        Set 3     │
│ Last time: 80 x 8            │
│                              │
│    77.5        7             │
│  ▶ 80.0 kg ◀ ▶ 8 reps ◀      │   <- centre row highlighted
│    82.5        9             │
│  [ − ] [ + ]   [ − ] [ + ]   │   <- fine-tune buttons, 48dp+
│                              │
│ [Same as last]   [  SAVE ✓ ] │   <- thumb zone, Save is the biggest target
└──────────────────────────────┘
```

- **New component `app/components/accessible/NumberWheel.tsx`.** Pure JS: a `FlatList` with `snapToInterval`, `decelerationRate="fast"`, item height ≥ 48dp, and a centre highlight band. No new native dependency, so no rebuild for this phase. A haptic `tick` fires on every value change and a stronger one on Save.
- Ranges: weight 0 to 300 kg in 2.5 kg steps (kg only; step adjustable later in settings: 1 / 1.25 / 2.5 / 5), reps 0 to 50.
- Opens pre-scrolled to the last value for that set, otherwise to the previous set's value. Most of the time the user just taps Save, or scrolls one notch.
- **Accessibility (wheels are bad for TalkBack by default):** each wheel gets `accessibilityRole="adjustable"` with `increment`/`decrement` `accessibilityActions`, so a TalkBack swipe up/down changes the value. The label reads "Weight, 80 kilograms". The ± buttons are a second way to change the value for tremor or motor impairment, where a fling is hard. **Long-press the number to type it**, kept as a keyboard fallback for odd weights.
- Respect `reduceMotion` (no fling animation, use `scrollToIndex` without `animated`).
- The existing `Stepper` stub becomes the ± buttons, reused inside `NumberWheel`, so there's no dead code.
- Pure logic in `app/lib/wheel.ts` (build values for a range and step, nearest index for a value, clamp, format `80` vs `82.5`) with `wheel.test.ts`.
- Used in `WorkoutDetail` (replaces `EditSetModal` inputs). `AddWorkout` only edits names and prescriptions, so it keeps text inputs.
- The save path (`upsertSingleSet`, copying values into `previous`) stays exactly as it is now.

## Phase 2: Accessibility pass on existing screens

**Status: done 2026-11-24, needs a TalkBack + Android check.** Roles, labels and states on every button across all screens. Set rows read as one sentence (`app/lib/a11yLabels.ts`, tested); the table header is hidden from TalkBack. Small icons got hitSlop up to 48dp. Tight cells cap font scaling at 1.3x. `#6e7681` greys on the workout screen were raised to `#8b949e` (AA). Deleting a set or a day now uses an undo snackbar (`UndoSnackbar`; the DB delete runs after 5s) instead of a confirm dialog. Exercise cards have a ⋮ menu (`OverflowMenu`, a bottom sheet) with View progress and Edit routine; delete/reorder/note from todo.txt were left out because EDIT already covers them. The Accessibility screen opens from Account: high contrast, left-handed layout, vibration, spoken rest alerts, reduce motion, weight step (1/1.25/2.5/5), and a link to the phone's display settings. Changes vs the plan: the app-level text size setting was dropped (it duplicated the OS font size, which the app already follows); one-handed mode became a left-handed layout (Save in the sheet and Skip in the rest bar move left); high contrast covers the gym screens only (workout, wheels, stepper, rest timer, Home, tab bar, header), not History, Account or Login.

- `accessibilityLabel` / `accessibilityRole` / `accessibilityState` on every Pressable, icon button and tab (`TabBar`, `Home`, `WorkoutDetail`, `AddWorkout`, `History`, `Account`, `Auth`).
- `a11yLabels.ts`: `setLabel` reads "Set 2, 80 kilograms, 8 reps, previous 75 by 8" instead of "80 8 75 x 8". Unit-tested.
- Hit targets ≥ 48dp (`MIN_TOUCH_TARGET`); use `hitSlop` on small icons such as the set delete ✕.
- Text scaling: test at the largest system font. Use `maxFontSizeMultiplier` only on tight table cells, and let other text wrap.
- Errors and confirmations via `AccessibilityInfo.announceForAccessibility` in addition to the visual feedback.
- Delete set or day: **undo snackbar** instead of an `Alert` confirm (error tolerance, one tap fewer).
- `OverflowMenu` (⋮) on exercise cards for edit / delete / reorder / note (Hick's law, also in `todo.txt`).
- `AccessibilitySettings` screen reachable from Account: high contrast, text size, one-handed mode, haptics, weight step.

## Phase 3: Gym mode (the Liftoff loop)

Turn `WorkoutDetail` into an "in-workout" screen instead of a static editor.

**Status: done 2026-11-24, needs testing on Android.** START WORKOUT is a bar at the bottom of `WorkoutDetail`, not on the Home card, so a day still opens the same way. While a workout runs, each set's delete ✕ becomes a ✓. Ticking saves the set and starts rest; a set with no values opens the wheels, and saving there ticks it. The rest default is 90s, and ±15 adjustments carry over to the next rest. When rest ends: green bar + 3 haptic pulses + TalkBack announcement + speech if `prefs.audioCues` (no toggle until Phase 2). EDIT is replaced by an elapsed clock. Back/Done/Finish ask "Finish workout?", then show the summary (time, sets, kg lifted, sets that beat last time), and closing it leaves the screen. Logic is in `app/lib/session.ts` (tested). Not done: a notification when rest ends with the app in the background (would need expo-notifications).

- A **"Start workout"** button on the day card. An elapsed timer shows at the top.
- Each set row gets a big **✓ done** checkbox. Tapping it saves the set (with the current values, which are usually the same as last time) and **auto-starts the rest timer**. Logging an unchanged set becomes a single tap.
- `RestTimer`: bar pinned to the bottom (thumb zone) with −15s / +15s / skip. When rest ends it uses haptic + visual flash + optional spoken cue, never audio alone (deaf users, loud gym). Default rest time per exercise, or 90s.
- One-handed mode (pref): the primary action bar sits at the bottom, and the header actions move down too.
- **Finish → summary card**: duration, sets done, total volume, exercises improved today (from the existing commits). Computed client-side, no schema change needed.
- Keep the screen awake during a workout (`expo-keep-awake`, in the Phase 0 batch).

## Phase 4: Progress tracking (`set_logs` table, approved)

**Status: code done 2026-11-24. Migration `001_set_logs.sql` must be applied in the Supabase SQL editor first**; until then logging fails quietly (console error) and Progress shows empty. Every successful set save (wheel Save or ✓) also writes `set_logs` via `logSet` in `workoutService`, fire-and-forget, one row per set per local day. PRs: `WorkoutDetail` loads bests for the day's exercises on open; a heavier weight or better e1RM shows a gold banner + TalkBack announcement, and the workout summary counts PRs. The first-ever log of an exercise is not a PR. History tab: a Progress card (days this week, week streak, one row per exercise), and tapping a row opens a chart (top weight / est. 1RM toggle, bests, every session listed as text). Logic is in `app/lib/progress.ts` (tested). Streak lives in History, not on Home (deviation from the plan; it could move later).

What we can do **without** schema changes:
- Home: a streak / "workouts this week" chip, from `workout_improvements` dates.
- History: a per-exercise timeline (from `todo.txt`) built from `workout_improvements` (one point per day the exercise changed).

New table in `supabase/migrations/001_set_logs.sql` (written, **you apply it** in the SQL editor):
- `set_logs (id, user_id, exercise_id, set_id, set_number, weight, reps, logged_at)`, RLS own-rows only.
- Client writes it from `workoutService` whenever a set is saved or ticked ✓: one row per set per local day (insert first time, update if corrected the same day), so typo fixes don't create fake history. The existing commits trigger is untouched.
- That unlocks: a real weight/e1RM chart per exercise, **PR badges** ("new best: 85 kg x 6") shown right after saving, "last session" values on every set, and an accurate volume history.
- Pure logic in `app/lib/progress.ts`: Epley e1RM, PR detection, weekly volume, streak (local dates, which also fixes the UTC vs local mismatch noted in CLAUDE.md). Unit-tested.
- Chart: `react-native-gifted-charts` line chart per exercise (best weight / e1RM over time), with an accessible text summary ("up 10 kg in 6 weeks") because TalkBack can't read a chart.

## Phase 5: Voice input (kept)

**Status: done 2026-11-24, needs testing on Android.** Turn on Account → Accessibility → Voice input, and a SAY IT mic button appears in the weight/reps sheet (`VoiceButton`). Say "80 by 8" to set the wheels; add "save" to log it hands-free. "Same as last" restores last time's values; "cancel" closes. Parser: `app/lib/voiceCommand.ts` (tested). It handles digits and number words, "and a half", "point five", kg/reps in any order, and mishearings ("buy"/"bye", "for" heard as "4"). Every result is shown as text and spoken back. `speech.ts` wraps expo-speech-recognition (permission, live transcript, error messages, gym words as contextual hints). `NumberWheel` now keeps any off-grid value set from outside (spoken 81 with 2.5 steps).

"Eighty by eight" / "same as last" → `parseVoiceCommand` (pure, tests already stubbed) → fills the wheels, and the user confirms with Save. Needs `expo-speech-recognition` and a rebuild. Mic button on the wheel sheet. Spoken confirmation via `expo-speech` ("80 kilos, 8 reps, saved"). Strong HCI-report point (multimodality, hands-free).

## Phase 6 (stretch): Offline queue

**Status: done 2026-11-24, needs testing on Android (airplane mode).** `app/services/offlineSync.ts` (runtime: AsyncStorage + NetInfo) on top of the pure `app/lib/offlineQueue.ts` (tested). Set saves and deletes in `WorkoutDetail` go through `saveSet`/`deleteSet`: written straight through when online, queued on the phone when offline (or while older writes are still queued), flushed in order on reconnect, when the app comes back to the front, or on the next save. Queued new sets are sent with `upsertSetByNumber` (new in `workoutService`, upsert on `exercise_id,set_number`) so a retry can't duplicate or jam. Temp ids are swapped for real ones in the open screen. Set logs keep their real time (`logSet` takes `loggedAt`). A re-opened workout overlays queued changes (`applyPending`). `SyncPill` shows "Offline · N changes waiting" / "Syncing…" on Home and the workout screen. The workout list is cached on the phone, so the app opens offline. Not offline: creating/editing routines, deleting a workout day, History/progress (these need the server).

Queue failed `upsertSingleSet` calls in AsyncStorage and flush on NetInfo reconnect. Show a small "offline, N sets pending" pill. Gym basements really do have bad signal.

---

## Order and effort

| # | Phase | Native rebuild? | Schema change? | Size |
|---|---|---|---|---|
| 0 | Foundation | yes (one batch) | no | S |
| 1 | Number wheel | no | no | M |
| 2 | A11y pass | no | no | M |
| 3 | Gym mode + rest timer | no | no | M–L |
| 4 | Progress / PRs | no (svg in batch) | `set_logs` (approved) | M |
| 5 | Voice | no (in batch) | no | M |
| 6 | Offline queue | no (netinfo in batch) | no | S–M |

Suggested start: **0 → 1**. Everything native is in the Phase 0 batch, so after that one rebuild no later phase needs another.

Each phase ends with `npx tsc --noEmit`, `npm run lint`, `npm test`, and you checking on Android.

## Evaluation (for the HCI report)

- Time-on-task to log 3 sets of one exercise: keyboard modal (now) vs wheel vs gym-mode ✓ tap. Measure each with one hand while holding a bottle.
- TalkBack walkthrough: log a set without looking at the screen.
- Max font size + high contrast screenshots.
- SUS questionnaire, 5+ users.

## Decisions (2026-11-24)

- `set_logs` table: yes (migration 001 written, not yet applied).
- Units: kg only.
- Voice input: kept.
- Charts: `react-native-svg` + `react-native-gifted-charts`.
- Wheel weight step: 2.5 kg default.
