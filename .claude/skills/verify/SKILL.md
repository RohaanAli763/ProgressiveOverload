---
name: verify
description: Typecheck the app after changes and report what the user should check manually on Android. Use after finishing code changes.
---

1. Run `npx tsc --noEmit`, `npm run lint` and `npm test` from the repo root.
2. Fix type, lint and test failures caused by your changes. Do not fix unrelated pre-existing problems; just list them.
3. Report in a few lines: typecheck, lint and test results, the files changed, and a short checklist of UI behaviour the user should try on the Android dev build.
