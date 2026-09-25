'use client'

import { useState } from 'react'
import { Users, Building2, LogOut, Search } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import type { Profile, Department } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import type { AppRole } from '@/lib/types'

interface ProfileWithDept extends Profile {
  departments?: { name: string } | null
}

interface Props {
  currentUser: Profile
  teamProfiles: ProfileWithDept[]
  department: Department | null
}

const roleColors: Record<AppRole, string> = {
  owner: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  admin: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  gestor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  funcionario: 'bg-muted text-muted-foreground',
}

export function AdminDashboard({ currentUser, teamProfiles, department }: Props) {
  const [search, setSearch] = useState('')

  const filtered = teamProfiles.filter(p =>
    !search || (p.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalMembers = teamProfiles.length
  const gestores = teamProfiles.filter(p => p.role === 'gestor').length
  const admins = teamProfiles.filter(p => p.role === 'admin').length
  const funcionarios = teamProfiles.filter(p => p.role === 'funcionario').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-foreground" />
            <span className="font-semibold text-foreground">
              {department ? department.name : 'Painel Admin'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{currentUser.full_name ?? 'Admin'}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[currentUser.role]}`}>
              {ROLE_LABELS[currentUser.role]}
            </span>
            <form action={signOut}>
              <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="size-4" />
                <span className="hidden sm:block">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Membros no time', value: totalMembers, icon: Users },
            { label: 'Gestores', value: gestores, icon: Building2 },
            { label: 'Admins', value: admins, icon: Building2 },
            { label: 'Funcionários', value: funcionarios, icon: Users },
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

        {/* Filtro */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 w-full max-w-sm">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>

        {/* Tabela da equipe */}
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
              {filtered.map(p => (
                <tr key={p.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.full_name ?? '—'}</p>
                    {p.id === currentUser.id && (
                      <span className="text-xs text-muted-foreground">Você</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {p.departments?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[p.role]}`}>
                      {ROLE_LABELS[p.role]}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
