-- Acediaura AI v1 academic data schema
-- Apply to the existing Neon database before enabling cloud writes.
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id text PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  college text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT '',
  current_semester integer CHECK (current_semester BETWEEN 1 AND 12),
  about text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  semester_number integer NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  target_sgpa numeric(4,2) CHECK (target_sgpa BETWEEN 0 AND 10),
  exam_date date,
  UNIQUE (user_id, semester_number)
);
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  semester_id uuid NOT NULL REFERENCES public.student_semesters(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('theory','lab')),
  credits numeric(4,1) NOT NULL DEFAULT 0 CHECK (credits BETWEEN 0 AND 20)
);
CREATE TABLE IF NOT EXISTS public.student_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
  unit text NOT NULL DEFAULT '',
  title text NOT NULL,
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified','passed','revision')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
  exam_type text NOT NULL,
  score numeric(6,2) NOT NULL,
  maximum numeric(6,2) NOT NULL CHECK (maximum > 0),
  CHECK (score BETWEEN 0 AND maximum)
);
CREATE INDEX IF NOT EXISTS student_subjects_owner_idx ON public.student_subjects(user_id);
CREATE INDEX IF NOT EXISTS student_topics_owner_idx ON public.student_topics(user_id);
CREATE INDEX IF NOT EXISTS student_marks_owner_idx ON public.student_marks(user_id);
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
-- Intentionally NO public RLS policies here.
-- Do not expose student rows until token verification + owner policies are deployed and tested.
