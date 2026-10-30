-- Hardening 5: storage write rules tied to the caller's own folder. Idempotent.
-- Upload layouts (src/lib/storage.ts): avatars/<uid>/<file> in bucket "avatars";
-- screenshots/<uid>/<file> in bucket "bug-report-screenshots". So folder [2] must equal auth.uid().
--
-- Both buckets stay PUBLIC, so image URLs keep working (public object URLs do not use RLS).
-- What changes: no one can write/replace/delete another user's files, and the broad SELECT
-- policies (which allowed listing every file) become own-folder-only. Own-folder SELECT is kept
-- because the app lists the caller's own avatar folder and upload/delete need to read the object.
--
-- The avatars policies were created in the dashboard with unknown names, so the block below drops
-- every policy on storage.objects whose text mentions one of these two buckets, then recreates the
-- set. Policies for other buckets are left alone. Run the pre-check in the PR notes first.
--
-- ROLLBACK: drop the "hardening5 ..." policies, then recreate permissive ones, e.g.
--   CREATE POLICY "avatars write" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
--   CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
--   CREATE POLICY "Allow authenticated users to upload bug report screenshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bug-report-screenshots');
--   CREATE POLICY "Allow public to view bug report screenshots" ON storage.objects FOR SELECT TO public USING (bucket_id = 'bug-report-screenshots');

BEGIN;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(avatars|bug-report-screenshots)'
      AND policyname NOT LIKE 'hardening5 %'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "hardening5 avatars select own" ON storage.objects;
DROP POLICY IF EXISTS "hardening5 avatars insert own" ON storage.objects;
DROP POLICY IF EXISTS "hardening5 avatars update own" ON storage.objects;
DROP POLICY IF EXISTS "hardening5 avatars delete own" ON storage.objects;
DROP POLICY IF EXISTS "hardening5 screenshots select own" ON storage.objects;
DROP POLICY IF EXISTS "hardening5 screenshots insert own" ON storage.objects;

CREATE POLICY "hardening5 avatars select own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "hardening5 avatars insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "hardening5 avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "hardening5 avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "hardening5 screenshots select own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bug-report-screenshots' AND (storage.foldername(name))[1] = 'screenshots' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "hardening5 screenshots insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bug-report-screenshots' AND (storage.foldername(name))[1] = 'screenshots' AND (storage.foldername(name))[2] = auth.uid()::text);

COMMIT;
