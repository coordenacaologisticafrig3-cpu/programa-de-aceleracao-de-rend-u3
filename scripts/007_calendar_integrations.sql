-- Tabela de integracoes de calendario por usuario
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token  TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  calendar_id   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cal_integrations_select_own" ON public.calendar_integrations;
CREATE POLICY "cal_integrations_select_own" ON public.calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cal_integrations_insert_own" ON public.calendar_integrations;
CREATE POLICY "cal_integrations_insert_own" ON public.calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cal_integrations_update_own" ON public.calendar_integrations;
CREATE POLICY "cal_integrations_update_own" ON public.calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cal_integrations_delete_own" ON public.calendar_integrations;
CREATE POLICY "cal_integrations_delete_own" ON public.calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_cal_integration_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cal_integrations_updated_at ON public.calendar_integrations;
CREATE TRIGGER cal_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_cal_integration_updated_at();
