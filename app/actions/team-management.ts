'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'
import { isDeptGestor, isStaffRole } from '@/lib/roles'
import { logAudit } from '@/lib/audit'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function formatDbError(error: any, fallback: string) {
  if (!error) return fallback
  const message = typeof error.message === 'string' ? error.message : fallback
  const code = typeof error.code === 'string' ? error.code : ''
  const details = typeof error.details === 'string' ? error.details : ''
  const hint = typeof error.hint === 'string' ? error.hint : ''
  const extras = [code && `code=${code}`, details && `details=${details}`, hint && `hint=${hint}`]
    .filter(Boolean)
    .join(' | ')
  return extras ? `${message} (${extras})` : message
}

async function writeProfileDepartment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  departmentId: string | null,
) {
  const { error: deptWriteError } = await admin
    .from('profiles')
    .update({ department_id: departmentId })
    .eq('id', userId)

  if (deptWriteError) {
    if (deptWriteError.code === '23505' && departmentId) {
      const { data: collision } = await admin
        .from('profiles')
        .select('id, full_name, role')
        .eq('department_id', departmentId)
        .neq('id', userId)
        .limit(1)
        .maybeSingle()

      return {
        error: collision
          ? `Conflito de unicidade no banco para department_id. Usuario em conflito: ${collision.full_name || collision.id}. Execute a migration scripts/008_drop_unique_on_profiles_department_id.sql para remover UNIQUE indevida em profiles.department_id.`
          : `Conflito de unicidade no banco para department_id. Execute a migration scripts/008_drop_unique_on_profiles_department_id.sql para remover UNIQUE indevida em profiles.department_id.`,
      }
    }
    return { error: formatDbError(deptWriteError, 'Erro ao salvar departamento no perfil.') }
  }

  const { data: persisted, error: persistedError } = await admin
    .from('profiles')
    .select('id, department_id')
    .eq('id', userId)
    .single()

  if (persistedError || !persisted) {
    return { error: formatDbError(persistedError, 'Nao foi possivel confirmar o perfil apos salvar departamento.') }
  }

  const savedDepartmentId = (persisted.department_id as string | null) ?? null
  if ((departmentId ?? null) !== savedDepartmentId) {
    return { error: `Departamento nao persistiu no perfil. Esperado=${departmentId ?? 'null'} | Salvo=${savedDepartmentId ?? 'null'}` }
  }

  return { ok: true as const }
}

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil nao encontrado.' as const }
  return {
    userId: user.id,
    role: profile.role as AppRole,
    departmentId: profile.department_id as string | null,
  }
}

export async function createTeamDepartment(name: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  if (!isStaffRole(caller.role)) {
    return { error: 'Sem permissao para criar equipe.' }
  }
  if (!name.trim()) return { error: 'Nome da equipe obrigatorio.' }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('departments')
      .insert({ name: name.trim(), status: 'ativo' })
      .select('id, name')
      .single()

    if (error) return { error: error.message }
    return { department: data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao acessar Supabase admin.' }
  }
}

export async function createTeamUser(input: {
  fullName: string
  email: string
  password: string
  role: AppRole
  departmentId: string | null
}) {
  console.info('[createTeamUser] start', {
    email: input.email,
    role: input.role,
    hasDepartment: Boolean(input.departmentId),
  })

  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  if (!isStaffRole(caller.role)) {
    return { error: 'Sem permissao para criar usuarios.' }
  }

  if (!input.fullName.trim()) return { error: 'Nome obrigatorio.' }
  if (!input.email.trim()) return { error: 'Email obrigatorio.' }
  if (!input.password || input.password.length < 6) return { error: 'Senha deve ter no minimo 6 caracteres.' }

  let targetDepartmentId = input.departmentId?.trim() || null
  let targetRole: AppRole = input.role

  if (caller.role === 'gestor') {
    targetDepartmentId = caller.departmentId
    if (!targetDepartmentId) return { error: 'Gestor sem departamento vinculado.' }
    if (input.role === 'owner') return { error: 'Gestor nao pode criar owner.' }
    if (input.role === 'admin' || input.role === 'gestor') targetRole = 'funcionario'
  }

  if (caller.role === 'admin') {
    if (input.role === 'owner') return { error: 'Admin nao pode criar owner.' }
  }

  try {
    const admin = createAdminClient()

    // Valida se o departamento existe antes de tentar criar o usuario
    if (targetDepartmentId) {
      if (!isUuid(targetDepartmentId)) {
        return { error: `Departamento invalido (nao e UUID): ${targetDepartmentId}` }
      }
      const { data: dept, error: deptError } = await admin
        .from('departments')
        .select('id')
        .eq('id', targetDepartmentId)
        .single()

      if (deptError || !dept) {
        return { error: `Departamento selecionado nao encontrado: ${deptError?.message ?? 'sem detalhes'}` }
      }
    }

    // Não envie department_id aqui: triggers antigos (ex. 001_roles_and_profiles.sql) fazem
    // (metadata->>'department_id')::uuid e podem falhar (FK/cast), abortando o INSERT em auth.users.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName.trim(),
        role: targetRole,
      },
    })

    if (createError || !created.user) {
      console.error('[createTeamUser] auth.admin.createUser error', createError)
      const msg = formatDbError(createError, 'Erro ao criar usuario.')
      const isTriggerFailure =
        msg.includes('Database error creating new user') ||
        (createError as { code?: string })?.code === 'unexpected_failure'
      if (isTriggerFailure) {
        return {
          error:
            'Falha ao criar usuario: o banco rejeitou o cadastro (quase sempre o trigger em auth.users → profiles). Rode no Supabase o script scripts/009_handle_new_user_safe.sql e verifique Logs → Postgres.',
        }
      }
      return { error: msg }
    }

    // Aguarda o trigger `on_auth_user_created` criar a linha em profiles (ou faz upsert se ainda não existir).
    for (let attempt = 0; attempt < 15; attempt++) {
      const { data: existing } = await admin.from('profiles').select('id').eq('id', created.user.id).maybeSingle()
      if (existing?.id) break
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: created.user.id,
          full_name: input.fullName.trim(),
          role: targetRole,
          department_id: targetDepartmentId,
        },
        { onConflict: 'id' },
      )

    if (profileError) {
      console.error('[createTeamUser] profile write error', profileError)
      await admin.auth.admin.deleteUser(created.user.id)
      return { error: `Erro ao criar perfil: ${formatDbError(profileError, 'falha ao gravar perfil')}` }
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(created.user.id, {
      user_metadata: {
        full_name: input.fullName.trim(),
        role: targetRole,
        department_id: targetDepartmentId,
      },
    })
    if (metaError) {
      console.warn('[createTeamUser] auth user_metadata sync', metaError)
    }

    await logAudit({
      userId: caller.user.id,
      action: 'user.created',
      entity: 'user',
      entityId: created.user.id,
      description: `Usuario "${input.fullName.trim()}" criado com role "${targetRole}"`,
      metadata: { email: input.email.trim(), role: targetRole, departmentId: targetDepartmentId },
    })

    return {
      user: {
        id: created.user.id,
        full_name: input.fullName.trim(),
        email: input.email.trim(),
        role: targetRole,
        department_id: targetDepartmentId,
      },
    }
  } catch (error) {
    console.error('[createTeamUser] unexpected error', error)
    return { error: error instanceof Error ? error.message : 'Erro ao acessar Supabase admin.' }
  }
}

export async function getTeamUser(userId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  if (!isStaffRole(caller.role)) {
    return { error: 'Sem permissao para acessar usuarios.' }
  }
  if (!userId) return { error: 'Usuario invalido.' }

  try {
    const admin = createAdminClient()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) return { error: profileError?.message || 'Perfil nao encontrado.' }

    if (isDeptGestor(caller.role) && caller.departmentId && profile.department_id !== caller.departmentId) {
      return { error: 'Sem permissao para acessar este usuario.' }
    }

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)
    if (authError || !authData?.user) return { error: authError?.message || 'Usuario auth nao encontrado.' }

    return {
      user: {
        id: profile.id as string,
        full_name: (profile.full_name as string | null) ?? '',
        role: profile.role as AppRole,
        department_id: (profile.department_id as string | null) ?? null,
        email: authData.user.email ?? '',
      },
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao acessar Supabase admin.' }
  }
}

export async function updateTeamUser(input: {
  userId: string
  fullName?: string
  email?: string
  password?: string
  role?: AppRole
  departmentId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  if (!isStaffRole(caller.role)) {
    return { error: 'Sem permissao para editar usuarios.' }
  }
  if (!input.userId) return { error: 'Usuario invalido.' }

  try {
    const admin = createAdminClient()

    const { data: current, error: currentError } = await admin
      .from('profiles')
      .select('id, role, department_id')
      .eq('id', input.userId)
      .single()

    if (currentError || !current) return { error: currentError?.message || 'Perfil nao encontrado.' }

    if (caller.role === 'gestor') {
      if (!caller.departmentId) return { error: 'Gestor sem departamento vinculado.' }
      if (current.department_id !== caller.departmentId) return { error: 'Sem permissao para editar este usuario.' }
      if (input.role === 'owner') return { error: 'Gestor nao pode definir Owner.' }
      if (input.role === 'admin' || input.role === 'gestor') {
        return { error: 'Gestor so pode definir papel Funcionario.' }
      }
      if (input.departmentId && input.departmentId !== caller.departmentId) {
        return { error: 'Gestor nao pode mover usuario para outro departamento.' }
      }
    }

    if (caller.role === 'admin') {
      if (input.role === 'owner') return { error: 'Admin nao pode definir Owner.' }
    }

    const nextDepartmentId =
      caller.role === 'gestor'
        ? caller.departmentId
        : (input.departmentId === undefined ? undefined : (input.departmentId?.trim() || null))

    // Valida departamento (quando fornecido)
    if (nextDepartmentId) {
      if (!isUuid(nextDepartmentId)) return { error: `Departamento invalido (nao e UUID): ${nextDepartmentId}` }
      const { data: dept, error: deptError } = await admin
        .from('departments')
        .select('id')
        .eq('id', nextDepartmentId)
        .single()
      if (deptError || !dept) return { error: `Departamento selecionado nao encontrado: ${deptError?.message ?? 'sem detalhes'}` }
    }

    const profileUpdate: Record<string, any> = {}
    if (typeof input.fullName === 'string') profileUpdate.full_name = input.fullName.trim()
    if (input.role) profileUpdate.role = input.role

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileWriteError } = await admin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', input.userId)
      if (profileWriteError) return { error: formatDbError(profileWriteError, 'Erro ao atualizar perfil.') }
    }

    if (input.departmentId !== undefined || caller.role === 'gestor') {
      const deptWrite = await writeProfileDepartment(admin, input.userId, nextDepartmentId ?? null)
      if ('error' in deptWrite) return { error: deptWrite.error }
    }

    // Atualiza Auth (email/senha) quando fornecidos
    if (typeof input.email === 'string' || typeof input.password === 'string') {
      const authPayload: { email?: string; password?: string; user_metadata?: any } = {}
      if (typeof input.email === 'string') authPayload.email = input.email.trim()
      if (typeof input.password === 'string' && input.password.length > 0) {
        if (input.password.length < 6) return { error: 'Senha deve ter no minimo 6 caracteres.' }
        authPayload.password = input.password
      }
      if (typeof input.fullName === 'string' || input.role || input.departmentId !== undefined) {
        authPayload.user_metadata = {
          ...(typeof input.fullName === 'string' ? { full_name: input.fullName.trim() } : {}),
          ...(input.role ? { role: input.role } : {}),
          ...(input.departmentId !== undefined ? { department_id: nextDepartmentId ?? null } : {}),
        }
      }

      const { error: authUpdateError } = await admin.auth.admin.updateUserById(input.userId, authPayload)
      if (authUpdateError) return { error: formatDbError(authUpdateError, 'Erro ao atualizar usuario no Auth.') }
    }

    await logAudit({
      userId: caller.user.id,
      action: 'user.updated',
      entity: 'user',
      entityId: input.userId,
      description: `Usuario atualizado`,
      metadata: { userId: input.userId, changes: input },
    })

    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao acessar Supabase admin.' }
  }
}

