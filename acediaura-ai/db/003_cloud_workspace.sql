-- Execute once in the existing Neon SQL Editor (main branch).
CREATE TABLE IF NOT EXISTS public.student_workspaces (
 user_id text PRIMARY KEY,
 content jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_workspaces ENABLE ROW LEVEL SECURITY;
-- No public policies: this table is accessed exclusively by the authenticated server API.
