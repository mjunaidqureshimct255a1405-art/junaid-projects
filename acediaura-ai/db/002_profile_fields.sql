ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS cgpa numeric(4,2),
  ADD COLUMN IF NOT EXISTS sgpa_history text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_data text NOT NULL DEFAULT '';
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_cgpa_range CHECK (cgpa IS NULL OR cgpa BETWEEN 0 AND 10);
-- Existing name and bio remain editable; empty strings clear values.
