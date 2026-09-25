-- ============================================================
-- 005_recurrences_and_categories_enhanced.sql
-- Tarefas Recorrentes e Categorias Melhoradas
-- ============================================================

-- ─── 1. Atualizar tabela categories com ícone e ordem ───────

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- ─── 2. Enum para tipos de recorrência ────────────────────

CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- ─── 3. Tabela de recorrências ────────────────────────────

CREATE TABLE IF NOT EXISTS public.recurrences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  priority          TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  frequency         recurrence_frequency NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  time              TIME,
  -- Para weekly: array de dias da semana (0=domingo, 1=segunda, etc)
  days_of_week      INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  -- Para monthly: dia do mês (1-31) ou "last" para último dia
  day_of_month      TEXT,
  -- Para custom: intervalo em dias
  interval_days     INTEGER,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT frequency_validation CHECK (
    (frequency = 'daily' AND interval_days IS NOT NULL) OR
    (frequency = 'weekly' AND array_length(days_of_week, 1) > 0) OR
    (frequency = 'monthly' AND day_of_month IS NOT NULL) OR
    frequency = 'custom'
  )
);

ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurrences_select" ON public.recurrences;
CREATE POLICY "recurrences_select" ON public.recurrences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurrences_insert" ON public.recurrences;
CREATE POLICY "recurrences_insert" ON public.recurrences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurrences_update" ON public.recurrences;
CREATE POLICY "recurrences_update" ON public.recurrences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurrences_delete" ON public.recurrences;
CREATE POLICY "recurrences_delete" ON public.recurrences
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS recurrences_updated_at ON public.recurrences;
CREATE TRIGGER recurrences_updated_at BEFORE UPDATE ON public.recurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Tabela de histórico de recorrências (tasks geradas) ──

CREATE TABLE IF NOT EXISTS public.recurrence_generations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_id     UUID NOT NULL REFERENCES public.recurrences(id) ON DELETE CASCADE,
  generated_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  generated_date    DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurrence_id, generated_date)
);

ALTER TABLE public.recurrence_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurrence_generations_select" ON public.recurrence_generations;
CREATE POLICY "recurrence_generations_select" ON public.recurrence_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recurrences
      WHERE id = recurrence_id AND user_id = auth.uid()
    )
  );

-- ─── 5. Função para gerar tarefas a partir de recorrências ───

CREATE OR REPLACE FUNCTION public.generate_recurrence_tasks(
  p_recurrence_id UUID,
  p_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_recurrence RECORD;
  v_task_id UUID;
BEGIN
  -- Buscar a recorrência
  SELECT * INTO v_recurrence FROM public.recurrences
    WHERE id = p_recurrence_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurrence not found or inactive';
  END IF;

  -- Checar se já foi gerada para esta data
  IF EXISTS (
    SELECT 1 FROM public.recurrence_generations
      WHERE recurrence_id = p_recurrence_id AND generated_date = p_date
  ) THEN
    RETURN NULL; -- Já existe
  END IF;

  -- Criar tarefa
  INSERT INTO public.tasks (
    user_id,
    title,
    description,
    due_date,
    due_time,
    category_id,
    priority,
    status,
    recurrence_id
  ) VALUES (
    v_recurrence.user_id,
    v_recurrence.title,
    v_recurrence.description,
    p_date,
    v_recurrence.time,
    v_recurrence.category_id,
    v_recurrence.priority,
    'pending',
    p_recurrence_id
  ) RETURNING id INTO v_task_id;

  -- Registrar no histórico
  INSERT INTO public.recurrence_generations (recurrence_id, generated_task_id, generated_date)
    VALUES (p_recurrence_id, v_task_id, p_date);

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Seed de categorias padrão ─────────────────────────

-- Usa DO block com segurança para usuários existentes
DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Buscar ID do owner (admin@admin.com)
  SELECT id INTO v_owner_id FROM auth.users
    WHERE email = 'admin@admin.com' LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.categories (name, color, user_id, icon, "order")
    VALUES
      ('Trabalho', '#3B82F6', v_owner_id, 'briefcase', 0),
      ('Pessoal', '#8B5CF6', v_owner_id, 'user', 1),
      ('Saúde', '#22C55E', v_owner_id, 'heart', 2),
      ('Estudos', '#F59E0B', v_owner_id, 'book', 3),
      ('Compras', '#EC4899', v_owner_id, 'shopping-cart', 4)
    ON CONFLICT (name, user_id) DO NOTHING;
  END IF;
END $$;
