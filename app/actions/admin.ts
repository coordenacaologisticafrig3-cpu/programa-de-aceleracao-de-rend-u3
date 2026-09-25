'use server'

import { createClient } from '@/lib/supabase/server'
import type { AppRole, Department } from '@/lib/types'
import { logAudit } from '@/lib/audit'

export async function updateProfileRole(profileId: string, newRole: AppRole) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') return { error: 'Sem permissão para alterar roles.' }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', profileId)

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'user.role_changed',
    entity: 'user',
    entityId: profileId,
    description: `Role do usuario alterada para "${newRole}"`,
    metadata: { profileId, newRole },
  })

  return { success: true }
}

export async function getDepartments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  if (error) return { error: error.message }
  return { departments: data as Department[] }
}

export async function createDepartment(name: string, managerId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') return { error: 'Apenas owner pode criar departamentos.' }

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: name.trim(),
      manager_id: managerId || null,
      status: 'ativo',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'department.created',
    entity: 'department',
    entityId: data.id,
    description: `Departamento "${name}" criado`,
    metadata: { name, managerId },
  })

  return { department: data as Department }
}

export async function updateDepartment(id: string, name?: string, managerId?: string | null, status?: 'ativo' | 'inativo') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') return { error: 'Apenas owner pode editar departamentos.' }

  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name.trim()
  if (managerId !== undefined) updates.manager_id = managerId
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'department.updated',
    entity: 'department',
    entityId: id,
    description: `Departamento atualizado`,
    metadata: updates,
  })

  return { department: data as Department }
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') return { error: 'Apenas owner pode deletar departamentos.' }

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'department.deleted',
    entity: 'department',
    entityId: id,
    description: `Departamento excluido`,
    metadata: { id },
  })

  return { success: true }
}

export async function assignUserToDepartment(userId: string, departmentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') return { error: 'Apenas owner pode atribuir departamentos.' }

  const { data, error } = await supabase
    .from('profiles')
    .update({ department_id: departmentId })
    .eq('id', userId)
    .select()
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'department.user_assigned',
    entity: 'user',
    entityId: userId,
    description: `Usuario atribuido ao departamento`,
    metadata: { userId, departmentId },
  })

  return { profile: data }
}
