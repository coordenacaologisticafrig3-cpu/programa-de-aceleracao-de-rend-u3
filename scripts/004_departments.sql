-- Tabela de departamentos
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona colunas faltantes caso a tabela já exista sem elas
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Garante a constraint de check no status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departments_status_check'
      AND conrelid = 'public.departments'::regclass
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_status_check CHECK (status IN ('ativo', 'inativo'));
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler departamentos
CREATE POLICY "departments_read_all" 
  ON public.departments FOR SELECT 
  USING (true);

-- Política: Apenas owner pode criar/atualizar/deletar
CREATE POLICY "departments_write_owner" 
  ON public.departments FOR ALL 
  USING ((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_departments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_departments_timestamp();

-- ── Seed ──────────────────────────────────────────────────────────────────────

-- Obter o user_id do owner (admin@admin.com)
DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'admin@admin.com' LIMIT 1;
  
  IF v_owner_id IS NOT NULL THEN
    -- Inserir departamentos de exemplo
    INSERT INTO public.departments (name, manager_id, status) VALUES
      ('Comercial', v_owner_id, 'ativo'),
      ('Marketing', v_owner_id, 'ativo'),
      ('Financeiro', v_owner_id, 'ativo'),
      ('Operações', v_owner_id, 'ativo'),
      ('RH', v_owner_id, 'ativo')
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;
