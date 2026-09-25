'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppRole } from '@/lib/types'
import { canSeeCompanyDashboard, isStaffRole } from '@/lib/roles'
import { createTeamDepartment, createTeamUser, getTeamUser, updateTeamUser } from '@/app/actions/team-management'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Plus, Users, UserPlus } from 'lucide-react'

interface DepartmentOption { id: string; name: string }
interface MemberStats {
  userId: string
  name: string
  departmentId: string | null
  departmentName: string
  pending: number
  overdue: number
  doneOnTime: number
  doneLate: number
  executionRate: number
}

interface DepartmentComparison {
  departmentId: string
  departmentName: string
  pending: number
  overdue: number
  done: number
  executionRate: number
}

interface TeamViewProps {
  role: AppRole
  departments: DepartmentOption[]
  members: MemberStats[]
  departmentComparisons: DepartmentComparison[]
  companyPending: number
  companyOverdue: number
}

export function TeamView({
  role,
  departments,
  members,
  departmentComparisons,
  companyPending,
  companyOverdue,
}: TeamViewProps) {
  const router = useRouter()
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [teamName, setTeamName] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState<AppRole>('funcionario')
  const [userDepartmentId, setUserDepartmentId] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [openCreateTeam, setOpenCreateTeam] = useState(false)
  const [openCreateUser, setOpenCreateUser] = useState(false)
  const [openEditUser, setOpenEditUser] = useState(false)
  const [loadingEditUser, setLoadingEditUser] = useState(false)
  const [savingEditUser, setSavingEditUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<AppRole>('funcionario')
  const [editDepartmentId, setEditDepartmentId] = useState('')

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (departmentFilter !== 'all' && m.departmentId !== departmentFilter) return false
      if (memberFilter !== 'all' && m.userId !== memberFilter) return false
      return true
    })
  }, [members, departmentFilter, memberFilter])

  async function handleCreateTeam() {
    setSavingTeam(true)
    const res = await createTeamDepartment(teamName)
    setSavingTeam(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setTeamName('')
    setOpenCreateTeam(false)
    toast.success('Equipe criada.')
    router.refresh()
  }

  async function handleCreateUser() {
    setSavingUser(true)
    try {
      const res = await createTeamUser({
        fullName: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        departmentId: userDepartmentId || null,
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      setUserName('')
      setUserEmail('')
      setUserPassword('')
      setUserRole('funcionario')
      setUserDepartmentId('')
      setOpenCreateUser(false)
      toast.success('Usuario criado.')
      router.refresh()
    } catch (error) {
      console.error('Falha ao chamar createTeamUser:', error)
      toast.error('Erro inesperado ao criar usuario.')
    } finally {
      setSavingUser(false)
    }
  }

  async function openEditFor(userId: string) {
    setEditingUserId(userId)
    setOpenEditUser(true)
    setLoadingEditUser(true)
    setEditPassword('')
    try {
      const res = await getTeamUser(userId)
      if (res.error || !res.user) {
        toast.error(res.error || 'Erro ao carregar usuario.')
        setOpenEditUser(false)
        setEditingUserId(null)
        return
      }
      setEditName(res.user.full_name || '')
      setEditEmail(res.user.email || '')
      setEditRole(res.user.role)
      setEditDepartmentId(res.user.department_id || '')
    } catch (error) {
      console.error(error)
      toast.error('Erro inesperado ao carregar usuario.')
      setOpenEditUser(false)
      setEditingUserId(null)
    } finally {
      setLoadingEditUser(false)
    }
  }

  async function handleSaveEditUser() {
    if (!editingUserId) return
    setSavingEditUser(true)
    try {
      const res = await updateTeamUser({
        userId: editingUserId,
        fullName: editName,
        email: editEmail,
        password: editPassword || undefined,
        role: editRole,
        departmentId: editDepartmentId || null,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Usuario atualizado.')
      setOpenEditUser(false)
      setEditingUserId(null)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Erro inesperado ao salvar usuario.')
    } finally {
      setSavingEditUser(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px 18px', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--color-text-primary)' }}>Time / Equipe</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Visao operacional de pendencias e execucao da equipe
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="scrollbar-hide">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Dialog
            open={openCreateTeam}
            onOpenChange={(nextOpen: boolean) => {
              setOpenCreateTeam(nextOpen)
              if (!nextOpen) setTeamName('')
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Users className="size-4" />
                Criar equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar equipe</DialogTitle>
                <DialogDescription>
                  Crie um novo departamento/equipe para organizar os membros.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-1">
                <Label htmlFor="team-name">Nome da equipe</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Financeiro"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreateTeam(false)}>Cancelar</Button>
                <Button type="button" onClick={handleCreateTeam} disabled={savingTeam}>
                  {savingTeam ? 'Criando...' : 'Criar equipe'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openCreateUser}
            onOpenChange={(nextOpen: boolean) => {
              setOpenCreateUser(nextOpen)
              if (!nextOpen) {
                setUserName('')
                setUserEmail('')
                setUserPassword('')
                setUserRole('funcionario')
                setUserDepartmentId('')
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="size-4" />
                Criar usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Criar usuario</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo membro da equipe.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-1">
                <div className="grid gap-2">
                  <Label htmlFor="user-name">Nome</Label>
                  <Input id="user-name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input id="user-email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email@empresa.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-password">Senha</Label>
                  <Input id="user-password" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Minimo 6 caracteres" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Perfil</Label>
                    <Select value={userRole} onValueChange={(value) => setUserRole(value as AppRole)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="funcionario">Funcionário</SelectItem>
                        {(role === 'owner' || role === 'admin') && <SelectItem value="gestor">Gestor</SelectItem>}
                        {(role === 'owner' || role === 'admin') && <SelectItem value="admin">Admin</SelectItem>}
                        {role === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Departamento</Label>
                    <Select
                      value={userDepartmentId || 'none'}
                      onValueChange={(value) => setUserDepartmentId(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem departamento</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreateUser(false)}>Cancelar</Button>
                <Button type="button" onClick={handleCreateUser} disabled={savingUser}>
                  <Plus className="size-4" />
                  {savingUser ? 'Criando...' : 'Criar usuario'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog
          open={openEditUser}
          onOpenChange={(nextOpen: boolean) => {
            setOpenEditUser(nextOpen)
            if (!nextOpen) {
              setEditingUserId(null)
              setEditName('')
              setEditEmail('')
              setEditPassword('')
              setEditRole('funcionario')
              setEditDepartmentId('')
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Atualize os dados do colaborador. (Email e senha sao opcionais.)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-1">
              <div className="grid gap-2">
                <Label htmlFor="edit-user-name">Nome</Label>
                <Input
                  id="edit-user-name"
                  value={editName}
                  onChange={(e: any) => setEditName(e.target.value)}
                  placeholder="Nome completo"
                  disabled={loadingEditUser}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editEmail}
                  onChange={(e: any) => setEditEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  disabled={loadingEditUser}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-user-password">Nova senha (opcional)</Label>
                <Input
                  id="edit-user-password"
                  type="password"
                  value={editPassword}
                  onChange={(e: any) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para nao alterar"
                  disabled={loadingEditUser}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Perfil</Label>
                  <Select
                    value={editRole}
                    onValueChange={(value: string) => setEditRole(value as AppRole)}
                    disabled={loadingEditUser}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funcionario">Funcionário</SelectItem>
                      {(role === 'owner' || role === 'admin') && <SelectItem value="gestor">Gestor</SelectItem>}
                      {(role === 'owner' || role === 'admin') && <SelectItem value="admin">Admin</SelectItem>}
                      {role === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Departamento</Label>
                  <Select
                    value={editDepartmentId || 'none'}
                    onValueChange={(value: string) => setEditDepartmentId(value === 'none' ? '' : value)}
                    disabled={loadingEditUser}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem departamento</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditUser(false)} disabled={savingEditUser || loadingEditUser}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEditUser} disabled={savingEditUser || loadingEditUser}>
                {savingEditUser ? 'Salvando...' : 'Salvar alteracoes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canSeeCompanyDashboard(role) && (
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setMemberFilter('all')
              }}
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-input-text)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: '13px' }}
            >
              <option value="all">Todos os departamentos</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-input-text)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: '13px', minWidth: '230px' }}
          >
            <option value="all">Todos os colaboradores</option>
            {members
              .filter((m) => departmentFilter === 'all' || m.departmentId === departmentFilter)
              .map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </div>

        {canSeeCompanyDashboard(role) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pendencias da empresa</span>
              <p style={{ margin: '6px 0 0', fontSize: '26px', color: 'var(--color-text-primary)', fontWeight: 700 }}>{companyPending}</p>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,.35)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Vencidas da empresa</span>
              <p style={{ margin: '6px 0 0', fontSize: '26px', color: 'var(--color-error)', fontWeight: 700 }}>{companyOverdue}</p>
            </div>
          </div>
        )}

        {canSeeCompanyDashboard(role) && departmentComparisons.length > 0 && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--color-text-primary)' }}>Comparativo entre departamentos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              {departmentComparisons.map((d) => (
                <div key={d.departmentId} style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', background: 'var(--color-surface-elevated)' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{d.departmentName}</p>
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Pend: {d.pending} | Venc: {d.overdue} | Exec: {d.executionRate}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {filteredMembers.map((m) => (
            <div key={m.userId} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{m.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>{m.departmentName}</p>
                </div>
                {isStaffRole(role) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditFor(m.userId)}
                    aria-label="Editar usuario"
                    style={{ height: 32, width: 32 }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <StatCell label="Pendentes" value={m.pending} />
                <StatCell label="Vencidas" value={m.overdue} danger />
                <StatCell label="No prazo" value={m.doneOnTime} success />
                <StatCell label="Fora prazo" value={m.doneLate} warning />
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  <span>Execucao</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{m.executionRate}%</strong>
                </div>
                <div style={{ marginTop: '4px', height: '6px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${m.executionRate}%`, height: '100%', background: 'var(--color-accent-blue)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, danger, success, warning }: { label: string; value: number; danger?: boolean; success?: boolean; warning?: boolean }) {
  let color = 'var(--color-text-primary)'
  if (danger) color = 'var(--color-error)'
  if (success) color = 'var(--color-success)'
  if (warning) color = 'var(--color-accent-orange)'
  return (
    <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-sm)', padding: '7px 8px' }}>
      <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-text-muted)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '18px', color, fontWeight: 700 }}>{value}</p>
    </div>
  )
}

