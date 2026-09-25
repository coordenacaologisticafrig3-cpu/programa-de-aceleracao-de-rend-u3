export type AppRole = 'owner' | 'admin' | 'gestor' | 'funcionario'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url?: string | null
  role: AppRole
  department_id: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  manager_id: string | null
  status: 'ativo' | 'inativo'
  is_active?: boolean
  created_at: string
  updated_at: string
}

// Permissões por role
export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  gestor: 'Gestor',
  funcionario: 'Funcionário',
}

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 4,
  admin: 3,
  gestor: 2,
  funcionario: 1,
}

export function hasMinRole(userRole: AppRole, minRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

// ─── Categorias ───────────────────────────────────────────

export interface Category {
  id: string
  name: string
  color: string
  user_id: string
  icon?: string
  department_id?: string | null
  order?: number
  created_at: string
}

export type TaskPriority = 'baixa' | 'normal' | 'alta' | 'urgente'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  title: string
  description?: string | null
  due_date?: string
  due_time?: string | null
  status: 'pending' | 'in_progress' | 'done' | 'overdue'
  priority?: TaskPriority
  recurrence?: TaskRecurrence
  user_id: string
  assigned_to?: string | null
  assigned_by_user_id?: string | null
  department_id?: string | null
  category_id?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

// ─── Recorrências ─────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface Recurrence {
  id: string
  user_id: string
  department_id?: string | null
  title: string
  description?: string
  category_id?: string | null
  priority: 'baixa' | 'normal' | 'alta' | 'urgente'
  frequency: RecurrenceFrequency
  start_date: string
  end_date?: string | null
  time?: string | null
  days_of_week?: number[]
  day_of_month?: string
  interval_days?: number
  is_active: boolean
  created_at: string
  updated_at: string
}
