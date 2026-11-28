# HCI upgrade plan

Branch `hci-accessibility-upgrade`. Everything here is a typed stub. Nothing is wired into `Main.tsx` yet, so the app behaves exactly as it does on `main`.

## Disability spectrum (Microsoft Inclusive Design: permanent / temporary / situational)

| Need | Permanent | Temporary | Situational (gym) | Feature |
|---|---|---|---|---|
| Touch | Motor impairment, tremor | Injured hand or arm | Holding a dumbbell, sweaty or chalky hands, gloves | `Stepper`, voice input, one-handed mode, 48dp targets |
| See | Low vision, blindness | Dilated eyes, migraine | Glare, phone on the floor, mid-set fatigue | High contrast, text scale, TalkBack labels (`a11yLabels.ts`) |
| Hear | Deaf / HoH | Ear infection | Loud gym music, headphones | Rest timer gives haptic and visual cues, never audio alone |
| Cognitive | ADHD, memory issues | Concussion | Exhausted between sets | Hick's law menus, "repeat last set", previous values always visible |

## HCI principles to features

- **Fitts's law**: `MIN_TOUCH_TARGET = 48` in `app/theme/tokens.ts`. One-handed mode moves primary actions into the bottom thumb zone (bigger and closer means faster).
- **Hick's law**: `OverflowMenu` keeps 1 or 2 primary actions per card and hides rarely used ones (edit, delete, reorder, note).
- **Multimodality / redundancy**: input by touch, stepper or voice (`app/input/speech.ts`, `app/lib/voiceCommand.ts`). Output is visual plus haptic plus speech (`haptics.ts`, `RestTimer`). Each piece of feedback uses at least two channels.
- **Feedback and visibility (Norman)**: a haptic plus visual confirmation on every save. The offline state stays visible.
- **Error tolerance**: the offline queue means a set is never lost because of bad signal. Delete can be undone instead of asking for confirmation.
- **User control**: `AccessibilitySettings` screen, defaults seeded from OS settings (reduce motion, screen reader).

## New structure

```
app/
  theme/tokens.ts                     palette + high contrast + touch target size
  accessibility/A11yContext.tsx       prefs provider (useA11y)
  input/haptics.ts                    tactile output
  input/speech.ts                     STT / TTS wrapper
  lib/voiceCommand.ts (+ .test.ts)    pure parser for "80 by 8" (testable)
  lib/a11yLabels.ts                   screen-reader strings
  lib/offlineQueue.ts                 local write queue
  components/accessible/Stepper.tsx
  components/accessible/RestTimer.tsx
  components/accessible/OverflowMenu.tsx
  screens/AccessibilitySettings.tsx
```

The existing structure stays the same: no navigation library, `Main.tsx` keeps owning state, and Supabase is still the only backend.

## Tech: Kafka, load balancing and similar

**Not needed. Adding them would hurt the project, not help it.**
- Kafka is built for high-throughput event streams between many backend services. This app has one client writing a few rows per workout into one Postgres database.
- Supabase already handles load balancing, connection pooling (Supavisor), auth and scaling. There is no server of ours to put a load balancer in front of.
- Adding them means paying for and running infrastructure, and examiners will ask "why?". The HCI marks come from the user experience, not the backend.

**Modern tech that does fit:**
| Tech | Why | Status |
|---|---|---|
| Offline-first queue (AsyncStorage + NetInfo) | Gym signal is bad; this is a real situational constraint | stub |
| `expo-haptics`, `expo-speech`, `expo-speech-recognition` | Multimodal I/O | not installed |
| Supabase Edge Function (optional) | Move commit/streak logic or weekly summaries server-side if needed | later |
| Supabase Realtime (optional) | Sync across devices (phone and watch/tablet) | later |
| On-device or LLM voice parsing (optional) | Fallback when the regex parser fails | later |

If you want to *talk about* scalability in the report, the honest version is: "event-driven via Postgres triggers (already used for commits), horizontally scaled by Supabase, so Kafka would be redundant at this scale."

## Implementation order (when ready)

1. `tokens.ts` + `A11yContext` wired into `Main.tsx`
2. `accessibilityLabel`/`accessibilityRole` on existing screens (there are currently **zero** a11y props in the app)
3. `Stepper` in `WorkoutDetail` / `AddWorkout`
4. `OverflowMenu` on exercise cards
5. Haptics + `RestTimer`
6. Voice input
7. Offline queue

Packages to install later (with `--legacy-peer-deps`): `expo-haptics expo-speech expo-speech-recognition @react-native-community/netinfo`. Voice recognition needs a new dev build.

## Evaluation (for the report)

- Test with TalkBack on, font size at max, and one-handed use while holding a water bottle.
- Time-on-task to log a set before and after the change (Fitts/Hick claims become measurable).
- SUS questionnaire with 5 or more users.
