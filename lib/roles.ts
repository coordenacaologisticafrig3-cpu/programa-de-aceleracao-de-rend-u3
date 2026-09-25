import type { AppRole } from '@/lib/types'

/** Owner, Admin (visão global) ou Gestor (escopo de departamento). */
export function isStaffRole(role: AppRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'gestor'
}

/** Gestor: mesmas regras de escopo que o antigo papel "admin" no banco. */
export function isDeptGestor(role: AppRole): boolean {
  return role === 'gestor'
}

/** Nível Empresa no dashboard e filtros globais (Owner + Admin). */
export function canSeeCompanyDashboard(role: AppRole): boolean {
  return role === 'owner' || role === 'admin'
}

/** Pode escolher qualquer departamento em atribuições (como Owner). */
export function canPickAnyDepartment(role: AppRole): boolean {
  return role === 'owner' || role === 'admin'
}
