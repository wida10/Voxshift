-- ============================================================
-- VoxShift — Supabase Schema
-- Run this in the Supabase SQL Editor of your SeriYA project
-- ============================================================

-- 1. Create the voxshift schema
CREATE SCHEMA IF NOT EXISTS voxshift;

GRANT USAGE ON SCHEMA voxshift TO authenticated;
GRANT USAGE ON SCHEMA voxshift TO service_role;
GRANT ALL   ON SCHEMA voxshift TO service_role;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE voxshift.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  avatar_url          TEXT,
  plan                TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'creator', 'pro')),
  minutes_used        INTEGER NOT NULL DEFAULT 0,
  minutes_limit       INTEGER NOT NULL DEFAULT 5,
  stripe_customer_id  TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE voxshift.audio_jobs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES voxshift.users(id) ON DELETE CASCADE,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source_language           TEXT NOT NULL,
  target_language           TEXT NOT NULL,
  original_filename         TEXT,
  original_duration_seconds INTEGER,
  output_url                TEXT,
  transcript_original       TEXT,
  transcript_translated     TEXT,
  elevenlabs_voice_id       TEXT,
  error_message             TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);

CREATE TABLE voxshift.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES voxshift.users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT NOT NULL UNIQUE,
  plan                    TEXT NOT NULL CHECK (plan IN ('creator', 'pro')),
  status                  TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT, UPDATE          ON voxshift.users         TO authenticated;
GRANT SELECT, INSERT          ON voxshift.audio_jobs    TO authenticated;
GRANT SELECT                  ON voxshift.subscriptions TO authenticated;
GRANT ALL                     ON voxshift.users         TO service_role;
GRANT ALL                     ON voxshift.audio_jobs    TO service_role;
GRANT ALL                     ON voxshift.subscriptions TO service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE voxshift.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE voxshift.audio_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE voxshift.subscriptions ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own"   ON voxshift.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_update_own"   ON voxshift.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "service_all_users"  ON voxshift.users FOR ALL    TO service_role  USING (true)           WITH CHECK (true);

-- audio_jobs
CREATE POLICY "jobs_select_own"    ON voxshift.audio_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobs_insert_own"    ON voxshift.audio_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_all_jobs"   ON voxshift.audio_jobs FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- subscriptions
CREATE POLICY "subs_select_own"    ON voxshift.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_all_subs"   ON voxshift.subscriptions FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION voxshift.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO voxshift.users (id, email, full_name, avatar_url, plan, minutes_limit)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    5
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION voxshift.handle_new_user();

-- ============================================================
-- RESET MONTHLY MINUTES (called via backend cron)
-- ============================================================

CREATE OR REPLACE FUNCTION voxshift.reset_monthly_minutes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE voxshift.users SET minutes_used = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION voxshift.reset_monthly_minutes() TO service_role;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'audio-originals', 'audio-originals', false,
    52428800,
    ARRAY['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/webm','audio/ogg','audio/x-m4a']
  ),
  (
    'audio-processed', 'audio-processed', true,
    52428800,
    ARRAY['audio/mpeg']
  )
ON CONFLICT (id) DO NOTHING;

-- audio-originals: private, only owner can upload/read
CREATE POLICY "originals_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audio-originals' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "originals_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'audio-originals' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "originals_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'audio-originals');

-- audio-processed: public read, service writes
CREATE POLICY "processed_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'audio-processed');

CREATE POLICY "processed_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'audio-processed');
