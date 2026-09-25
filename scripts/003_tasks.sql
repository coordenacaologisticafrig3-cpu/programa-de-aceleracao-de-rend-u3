-- ============================================================
-- 003_tasks.sql  –  Tarefas e Categorias
-- ============================================================

-- 0. Função utilitária updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 1. Categorias ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, user_id)
);

-- Garante que a constraint única existe mesmo se a tabela foi criada antes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_name_user_id_key'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_name_user_id_key UNIQUE (name, user_id);
  END IF;
END $$;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- ─── 2. Tarefas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  due_date      DATE,
  due_time      TIME,
  recurrence    TEXT NOT NULL DEFAULT 'none'
                  CHECK (recurrence IN ('none','daily','weekly','monthly')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','done','overdue')),
  is_starred    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = assigned_to
  );

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Marcar tarefas como atrasadas ────────────────────────
CREATE OR REPLACE FUNCTION public.mark_overdue_tasks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.tasks
  SET    status = 'overdue'
  WHERE  status IN ('pending','in_progress')
    AND  due_date < CURRENT_DATE;
END;
$$;

SELECT public.mark_overdue_tasks();

-- ─── 4. Seed para o owner (admin@admin.com) ──────────────────
DO $$
DECLARE
  v_user_id     UUID;
  v_cat_work    UUID;
  v_cat_pessoal UUID;
  v_cat_urgente UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@admin.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário admin@admin.com não encontrado, seed ignorado.';
    RETURN;
  END IF;

  -- Categorias
  INSERT INTO public.categories (name, color, user_id)
  VALUES ('Trabalho', '#6366f1', v_user_id)
  ON CONFLICT (name, user_id) DO NOTHING;

  INSERT INTO public.categories (name, color, user_id)
  VALUES ('Pessoal', '#10b981', v_user_id)
  ON CONFLICT (name, user_id) DO NOTHING;

  INSERT INTO public.categories (name, color, user_id)
  VALUES ('Urgente', '#ef4444', v_user_id)
  ON CONFLICT (name, user_id) DO NOTHING;

  SELECT id INTO v_cat_work    FROM public.categories WHERE user_id = v_user_id AND name = 'Trabalho';
  SELECT id INTO v_cat_pessoal FROM public.categories WHERE user_id = v_user_id AND name = 'Pessoal';
  SELECT id INTO v_cat_urgente FROM public.categories WHERE user_id = v_user_id AND name = 'Urgente';

  -- Tarefas de hoje
  INSERT INTO public.tasks (title, due_date, due_time, user_id, category_id, status)
  VALUES
    ('Revisar relatório semanal',         CURRENT_DATE, '10:00', v_user_id, v_cat_work,    'pending'),
    ('Reunião de alinhamento com o time', CURRENT_DATE, '14:30', v_user_id, v_cat_work,    'pending'),
    ('Enviar proposta para cliente',      CURRENT_DATE, '17:00', v_user_id, v_cat_urgente, 'pending'),
    ('Atualizar documentação do sistema', CURRENT_DATE, '09:00', v_user_id, v_cat_pessoal, 'pending');

  -- Tarefas em atraso
  INSERT INTO public.tasks (title, due_date, due_time, user_id, category_id, status)
  VALUES
    ('Atualizar planilha de custos',  CURRENT_DATE - INTERVAL '2 days', '09:00', v_user_id, v_cat_work, 'overdue'),
    ('Responder e-mails pendentes',   CURRENT_DATE - INTERVAL '1 day',  '12:00', v_user_id, v_cat_work, 'overdue'),
    ('Revisar contrato do fornecedor',CURRENT_DATE - INTERVAL '3 days', '15:00', v_user_id, v_cat_urgente, 'overdue');

END $$;
