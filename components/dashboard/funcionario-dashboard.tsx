'use client'

import { LogOut, User, Building2, ShieldCheck } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import type { Profile, Department } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import type { AppRole } from '@/lib/types'

interface Props {
  currentUser: Profile
  department: Department | null
}

const roleColors: Record<AppRole, string> = {
  owner: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  admin: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  gestor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  funcionario: 'bg-muted text-muted-foreground',
}

export function FuncionarioDashboard({ currentUser, department }: Props) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <User className="size-5 text-foreground" />
            <span className="font-semibold text-foreground">Meu Painel</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{currentUser.full_name ?? 'Funcionário'}</span>
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

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        {/* Cartão de perfil */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground select-none">
              {(currentUser.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{currentUser.full_name ?? '—'}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[currentUser.role]}`}>
                {ROLE_LABELS[currentUser.role]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <InfoItem
              icon={<ShieldCheck className="size-4 text-muted-foreground" />}
              label="Nível de acesso"
              value={ROLE_LABELS[currentUser.role]}
            />
            <InfoItem
              icon={<Building2 className="size-4 text-muted-foreground" />}
              label="Departamento"
              value={department?.name ?? 'Não atribuído'}
            />
          </div>
        </div>

        {/* Informativo de permissões */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-semibold text-foreground">Suas permissões</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 rounded-full bg-foreground/40 shrink-0 mt-2" />
              Visualize e gerencie suas próprias informações de perfil
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 rounded-full bg-foreground/40 shrink-0 mt-2" />
              Acesse o seu dashboard individual
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 rounded-full bg-foreground/40 shrink-0 mt-2" />
              Visualize informações do seu departamento: <strong className="text-foreground">{department?.name ?? 'não atribuído'}</strong>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
