-- Reservation invite shares for community sharing (app-wide)
CREATE TABLE IF NOT EXISTS public.reservation_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES public.dog_parks(id) ON DELETE CASCADE,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.invite_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.reservation_invites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- RLS
ALTER TABLE public.reservation_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_uses ENABLE ROW LEVEL SECURITY;

-- Hosts can manage their invites
DROP POLICY IF EXISTS reservation_invites_owner_all ON public.reservation_invites;
CREATE POLICY reservation_invites_owner_all ON public.reservation_invites
  FOR ALL TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- Allow reading invite uses for own invites; inserting uses is usually done by service role
DROP POLICY IF EXISTS invite_uses_owner_read ON public.invite_uses;
CREATE POLICY invite_uses_owner_read ON public.invite_uses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservation_invites ri
    WHERE ri.id = invite_uses.invite_id AND ri.host_user_id = auth.uid()
  ));

-- Useful indexes
CREATE INDEX IF NOT EXISTS reservation_invites_token_idx ON public.reservation_invites(token);
CREATE INDEX IF NOT EXISTS reservation_invites_time_idx ON public.reservation_invites(start_time, end_time);

-- PostgREST cache reload
NOTIFY pgrst, 'reload schema';


