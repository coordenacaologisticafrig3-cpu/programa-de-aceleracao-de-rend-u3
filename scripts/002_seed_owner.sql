-- ============================================================
-- 002_seed_owner.sql
-- Cria o usuário owner padrão: admin@admin.com / admin123
--
-- IMPORTANTE: Execute este script no SQL Editor do Supabase.
-- Ele cria o usuário via auth.users e define o perfil como owner.
-- ============================================================

-- Passo 1: Cria o usuário na tabela auth.users (email já confirmado)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verifica se o usuário já existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@admin.com';

  IF v_user_id IS NULL THEN
    -- Insere diretamente em auth.users com senha hasheada
    -- (usa a função nativa do Supabase para gerar hash bcrypt)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      '{"full_name": "Administrador Owner"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Usuário owner criado com id: %', v_user_id;
  ELSE
    RAISE NOTICE 'Usuário admin@admin.com já existe com id: %', v_user_id;
  END IF;

  -- Passo 2: Garante que o perfil existe e tem role = owner
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (v_user_id, 'Administrador Owner', 'owner')
  ON CONFLICT (id) DO UPDATE
    SET role = 'owner', full_name = 'Administrador Owner', updated_at = NOW();

  RAISE NOTICE 'Perfil owner configurado para: admin@admin.com';
END;
$$;
