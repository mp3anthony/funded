-- Hardening 6: failed-attempt counter for the join-household edge function. Idempotent.
-- Service role only: RLS on, no policies, all client grants revoked. Used only by the edge
-- function. Backward compatible: nothing in the app reads this table, and the edge function
-- fails open (lets the attempt through) if this table or function is missing.
--
-- Rule: 5 failed codes inside 15 minutes locks that user out for 30 minutes.
--
-- ROLLBACK: DROP FUNCTION public.join_attempt_register_failure(uuid); DROP TABLE public.join_attempts;

BEGIN;

CREATE TABLE IF NOT EXISTS public.join_attempts (
  user_id uuid PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
ALTER TABLE public.join_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.join_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.join_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.join_attempt_register_failure(p_user uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.join_attempts%ROWTYPE;
BEGIN
  INSERT INTO public.join_attempts (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.join_attempts WHERE user_id = p_user FOR UPDATE;
  IF r.window_start < now() - interval '15 minutes' THEN
    r.failed_count := 0;
    r.window_start := now();
  END IF;
  r.failed_count := r.failed_count + 1;
  IF r.failed_count >= 5 THEN
    r.locked_until := now() + interval '30 minutes';
    r.failed_count := 0;
    r.window_start := now();
  END IF;
  UPDATE public.join_attempts
    SET failed_count = r.failed_count, window_start = r.window_start, locked_until = r.locked_until
    WHERE user_id = p_user;
  RETURN r.locked_until;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_attempt_register_failure(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_attempt_register_failure(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
