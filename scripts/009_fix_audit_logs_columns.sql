-- Migração: corrigir colunas da tabela audit_logs para bater com o código
-- O script 008 criou: details (JSONB), entity (TEXT NOT NULL), user_name, user_role, ip_address
-- O código usa: description (TEXT), metadata (JSONB), entity (TEXT nullable)

-- 1. Adicionar coluna description (texto legível)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Adicionar coluna metadata (dados extras em JSON)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Tornar entity nullable (o código pode enviar null)
ALTER TABLE audit_logs ALTER COLUMN entity DROP NOT NULL;

-- 4. Copiar dados antigos de details -> metadata (para não perder dados existentes)
UPDATE audit_logs SET metadata = details WHERE metadata IS NULL OR metadata = '{}'::jsonb;

-- 5. Definir description como NOT NULL com default vazio para compatibilidade
ALTER TABLE audit_logs ALTER COLUMN description SET DEFAULT '';
UPDATE audit_logs SET description = '' WHERE description IS NULL;
ALTER TABLE audit_logs ALTER COLUMN description SET NOT NULL;
