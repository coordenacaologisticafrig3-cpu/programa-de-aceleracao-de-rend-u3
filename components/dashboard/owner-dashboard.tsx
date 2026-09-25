'use client'

import { useState, useTransition } from 'react'
import {
  Users, Building2, ShieldCheck, LogOut,
  Plus, Pencil, Trash2, ChevronDown
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { updateProfileRole, createDepartment, deleteDepartment } from '@/app/actions/admin'
import type { AppRole, Profile, Department } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

interface ProfileWithDept extends Profile {
  departments?: { name: string } | null
}

interface Props {
  currentUser: Profile
  profiles: ProfileWithDept[]
  departments: Department[]
}

const roleColors: Record<AppRole, string> = {
  owner: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  admin: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  gestor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  funcionario: 'bg-muted text-muted-foreground',
}

export function OwnerDashboard({ currentUser, profiles: initialProfiles, departments: initialDepts }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [departments, setDepartments] = useState(initialDepts)
  const [activeTab, setActiveTab] = useState<'usuarios' | 'departamentos'>('usuarios')
  const [newDeptName, setNewDeptName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  const ownerCount = profiles.filter(p => p.role === 'owner').length
  const adminCount = profiles.filter(p => p.role === 'admin').length
  const gestorCount = profiles.filter(p => p.role === 'gestor').length
  const funcCount = profiles.filter(p => p.role === 'funcionario').length

  function handleRoleChange(profileId: string, newRole: AppRole) {
    startTransition(async () => {
      const result = await updateProfileRole(profileId, newRole)
      if (result?.error) { setFeedback(result.error); return }
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      setFeedback(null)
    })
  }

  function handleCreateDept() {
    if (!newDeptName.trim()) return
    startTransition(async () => {
      const result = await createDepartment(newDeptName.trim())
      if (result?.error) { setFeedback(result.error); return }
      if (result?.department) setDepartments(prev => [...prev, result.department!])
      setNewDeptName('')
      setFeedback(null)
    })
  }

  function handleDeleteDept(id: string) {
    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result?.error) { setFeedback(result.error); return }
      setDepartments(prev => prev.filter(d => d.id !== id))
      setFeedback(null)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-foreground" />
            <span className="font-semibold text-foreground">Painel Owner</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{currentUser.full_name ?? 'Owner'}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors.owner}`}>Owner</span>
            <form action={signOut}>
              <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="size-4" />
                <span className="hidden sm:block">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total de usuários', value: profiles.length, icon: Users },
            { label: 'Owners', value: ownerCount, icon: ShieldCheck },
            { label: 'Admins', value: adminCount, icon: Pencil },
            { label: 'Gestores', value: gestorCount, icon: Building2 },
            { label: 'Funcionários', value: funcCount, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border p-1 w-fit bg-muted/30">
          {(['usuarios', 'departamentos'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab === 'usuarios' ? 'Usuários' : 'Departamentos'}
            </button>
          ))}
        </div>

        {feedback && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{feedback}</p>
        )}

        {/* Usuários */}
        {activeTab === 'usuarios' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Departamento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map(p => (
                  <tr key={p.id} className="bg-card hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{p.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {p.departments?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.id === currentUser.id ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[p.role]}`}>
                          {ROLE_LABELS[p.role]}
                        </span>
                      ) : (
                        <div className="relative inline-flex items-center">
                          <select
                            defaultValue={p.role}
                            onChange={e => handleRoleChange(p.id, e.target.value as AppRole)}
                            disabled={isPending}
                            className="appearance-none text-xs font-medium pr-6 pl-2 py-1 rounded-full border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="gestor">Gestor</option>
                            <option value="funcionario">Funcionário</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 size-3 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Departamentos */}
        {activeTab === 'departamentos' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateDept()}
                placeholder="Nome do departamento"
                className="flex h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                disabled={isPending}
              />
              <button
                onClick={handleCreateDept}
                disabled={isPending || !newDeptName.trim()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Plus className="size-4" /> Criar
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{dept.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDept(dept.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    aria-label="Excluir departamento"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                  Nenhum departamento criado ainda.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
