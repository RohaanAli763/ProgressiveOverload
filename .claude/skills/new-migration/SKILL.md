---
name: new-migration
description: Draft a numbered SQL migration file under supabase/migrations/ for the user to review and apply by hand.
disable-model-invocation: true
---

Create a migration for: $ARGUMENTS

1. Read `supabase/schema.sql` and any existing files in `supabase/migrations/` to understand the current schema. Never assume.
2. Create `supabase/migrations/` if missing. Name the new file `NNNN_short_description.sql`, where NNNN is the next number after the highest existing one (start at 0001).
3. Write idempotent SQL where possible (`if not exists`, `create or replace`). Keep RLS enabled and policies owner-scoped (`user_id = auth.uid()`) for any new table, and add an `updated_at` trigger like the existing tables.
4. Do not edit `supabase/schema.sql`, and do not apply the SQL. Show the user the file and tell them to run it in the Supabase SQL editor.
5. Mention any client code (`app/services/workoutService.ts`, shared types in `app/screens/Home.tsx`) that will need to change, and wait for approval before changing it.
