'use client'

import { useMemo, useState, useTransition } from 'react'
import type { AppRole } from '@/lib/types'
import { canPickAnyDepartment } from '@/lib/roles'
import { createAssignedTasks, deleteAssignedTask, deleteRecurringTasks, deleteAllTasksByUser, updateAssignedTask } from '@/app/actions/assignments'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CalendarClock, Pencil, Repeat, Trash2, UserPlus } from 'lucide-react'

type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
type AssignTarget = 'member' | 'team' | 'department'

interface UserOption { id: string; full_name: string | null; department_id: string | null; department_name?: string | null }
interface DepartmentOption { id: string; name: string }
interface CategoryOption { id: string; name: string; color: string }
interface RecentTask {
  id: string
  title: string
  description?: string | null
  category_id?: string | null
  due_date?: string
  due_time?: string | null
  priority?: Priority | null
  recurrence?: Recurrence | null
  recurrence_id?: string | null
  status: string
  assignee_name: string
}

interface AssignViewProps {
  role: AppRole
  userId: string
  defaultDepartmentId: string | null
  users: UserOption[]
  departments: DepartmentOption[]
  categories: CategoryOption[]
  recentTasks: RecentTask[]
}

export function AssignView({ role, userId, defaultDepartmentId, users, departments, categories, recentTasks: initialRecent }: AssignViewProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [assignTarget, setAssignTarget] = useState<AssignTarget>('member')
  const [memberDepartmentId, setMemberDepartmentId] = useState(defaultDepartmentId ?? '')
  const [teamDepartmentId, setTeamDepartmentId] = useState(defaultDepartmentId ?? '')
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>(defaultDepartmentId ? [defaultDepartmentId] : [])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [monthlyDays, setMonthlyDays] = useState<number[]>([])
  const [dueHour = '', dueMinute = ''] = dueTime.split(':')

  const [recentTasks, setRecentTasks] = useState(initialRecent)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<RecentTask | null>(null)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editDueDate, setEditDueDate] = useState(new Date().toISOString().split('T')[0])
  const [editDueTime, setEditDueTime] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('normal')
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>('none')
  const [isPending, startTransition] = useTransition()

  const assignableDepartments = useMemo(() => {
    if (canPickAnyDepartment(role)) return departments
    const departmentSet = new Set(users.map((u) => u.department_id).filter(Boolean))
    return departments.filter((d) => departmentSet.has(d.id))
  }, [departments, users, role])

  const visibleMembers = useMemo(() => {
    if (!canPickAnyDepartment(role)) return users
    if (!memberDepartmentId) return users
    return users.filter((u) => u.department_id === memberDepartmentId)
  }, [users, role, memberDepartmentId])

  const assigneeNameById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u.full_name || 'Sem nome']))
  }, [users])

  const resolvedAssigneeIds = useMemo(() => {
    if (assignTarget === 'member') return selectedUserIds
    if (assignTarget === 'team') {
      if (!teamDepartmentId) return []
      return users.filter((u) => u.department_id === teamDepartmentId).map((u) => u.id)
    }
    return users
      .filter((u) => u.department_id && selectedDepartmentIds.includes(u.department_id))
      .map((u) => u.id)
  }, [assignTarget, selectedUserIds, teamDepartmentId, selectedDepartmentIds, users])

  const canContinueStepOne = title.trim().length > 0

  function resetForm() {
    setStep(1)
    setTitle('')
    setDescription('')
    setCategoryId('')
    setAssignTarget('member')
    setMemberDepartmentId(defaultDepartmentId ?? '')
    setTeamDepartmentId(defaultDepartmentId ?? '')
    setSelectedDepartmentIds(defaultDepartmentId ? [defaultDepartmentId] : [])
    setSelectedUserIds([])
    setDueDate(new Date().toISOString().split('T')[0])
    setDueTime('')
    setPriority('normal')
    setRecurrence('none')
    setWeeklyDays([])
    setMonthlyDays([])
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId])
  }

  function toggleWeeklyDay(day: number) {
    setWeeklyDays((prev) => prev.includes(day) ? prev.filter((v) => v !== day) : [...prev, day].sort((a, b) => a - b))
  }

  function toggleMonthlyDay(day: number) {
    setMonthlyDays((prev) => prev.includes(day) ? prev.filter((v) => v !== day) : [...prev, day].sort((a, b) => a - b))
  }

  function toggleDepartmentSelection(departmentId: string) {
    setSelectedDepartmentIds((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId],
    )
  }

  function handleCreate() {
    if (!title.trim()) {
      toast.error('Nome da tarefa obrigatorio.')
      return
    }
    if (!resolvedAssigneeIds.length) {
      toast.error('Selecione ao menos um destino para atribuicao.')
      return
    }
    if (recurrence === 'weekly' && !weeklyDays.length) {
      toast.error('Selecione pelo menos um dia da semana para recorrencia semanal.')
      return
    }
    if (recurrence === 'monthly' && !monthlyDays.length) {
      toast.error('Selecione pelo menos um dia do mes para recorrencia mensal.')
      return
    }

    startTransition(async () => {
      const recurrenceDetails =
        recurrence === 'weekly'
          ? `Recorrencia semanal: ${weeklyDays.map((day) => weekDays.find((w) => w.value === day)?.label).filter(Boolean).join(', ')}.`
          : recurrence === 'monthly'
            ? `Recorrencia mensal: dias ${monthlyDays.join(', ')}.`
            : ''

      const fullDescription = [description.trim(), recurrenceDetails].filter(Boolean).join('\n\n')

      const resolvedDepartmentId =
        canPickAnyDepartment(role)
          ? assignTarget === 'team'
            ? teamDepartmentId || null
            : assignTarget === 'member'
              ? memberDepartmentId || null
              : null
          : defaultDepartmentId

      const result = await createAssignedTasks({
        assigneeIds: resolvedAssigneeIds,
        title,
        description: fullDescription,
        categoryId: categoryId || null,
        dueDate,
        dueTime: dueTime || null,
        priority,
        recurrence,
        departmentId: resolvedDepartmentId,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      const createdRows = (result.tasks ?? []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: fullDescription || null,
        category_id: categoryId || null,
        due_date: task.due_date,
        due_time: task.due_time,
        priority: task.priority as Priority,
        recurrence,
        status: task.status,
        assignee_name: assigneeNameById.get(task.user_id) || 'Sem nome',
      }))

      if (createdRows.length) {
        setRecentTasks((prev) => [...createdRows, ...prev].slice(0, 20))
      }

      if (result.isRecurring) {
        if (recurrence === 'daily') {
          toast.success(
            `Recorrência criada! ${result.totalInstances || createdRows.length} instâncias diárias geradas (segunda a sexta, próximos 30 dias). Visualize em /recorrencia`
          )
        } else {
          toast.success('Tarefa recorrente criada com sucesso! Visualize em /recorrencia')
        }
      } else {
        toast.success('Tarefa(s) atribuida(s) com sucesso')
      }
      setOpen(false)
      resetForm()
    })
  }

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function toggleSelectAll() {
    const eligible = recentTasks.filter((t) => t.status !== 'done')
    if (selectedIds.size === eligible.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(eligible.map((t) => t.id)))
    }
  }

  function handleDeleteClick(task: RecentTask) {
    // Sempre abre o dialog — para recorrentes vai deletar toda a série
    setDeleteTarget(task)
  }

  function confirmDeleteSingle(taskId: string) {
    const task = recentTasks.find((t) => t.id === taskId)
    startTransition(async () => {
      if (task?.recurrence && task.recurrence !== 'none' && task.recurrence_id) {
        // Deletar toda a série recorrente
        const result = await deleteRecurringTasks(task.recurrence_id)
        if (result.error) { toast.error(result.error); return }
        setRecentTasks((prev) => prev.filter((t) => t.recurrence_id !== task.recurrence_id))
        toast.success('Todas as instâncias da recorrência foram excluidas.')
      } else {
        const result = await deleteAssignedTask(taskId)
        if (result.error) { toast.error(result.error); return }
        setRecentTasks((prev) => prev.filter((t) => t.id !== taskId))
        toast.success('Tarefa excluida.')
      }
      setDeleteTarget(null)
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(taskId); return next })
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const toDelete = recentTasks.filter((t) => selectedIds.has(t.id))

      // Separar recorrentes (deletar por recurrence_id) e simples (deletar por id)
      const recurrenceIds = new Set<string>()
      const singleIds: string[] = []

      for (const task of toDelete) {
        if (task.recurrence && task.recurrence !== 'none' && task.recurrence_id) {
          recurrenceIds.add(task.recurrence_id)
        } else {
          singleIds.push(task.id)
        }
      }

      let hasError = false

      for (const recId of recurrenceIds) {
        const result = await deleteRecurringTasks(recId)
        if (result.error) { toast.error(result.error); hasError = true }
      }

      for (const id of singleIds) {
        const result = await deleteAssignedTask(id)
        if (result.error) { toast.error(result.error); hasError = true }
      }

      if (!hasError) {
        setRecentTasks((prev) =>
          prev.filter((t) => {
            if (t.recurrence_id && recurrenceIds.has(t.recurrence_id)) return false
            if (singleIds.includes(t.id)) return false
            return true
          })
        )
        toast.success(`${selectedIds.size} tarefa(s) excluida(s).`)
      }

      setSelectedIds(new Set())
    })
  }

  function handleDeleteAllByUser() {
    startTransition(async () => {
      const result = await deleteAllTasksByUser(userId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRecentTasks([])
      setShowDeleteAllDialog(false)
      toast.success('Todas as tarefas foram excluidas.')
    })
  }

  function openEdit(task: RecentTask) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditCategoryId(task.category_id || '')
    setEditDueDate(task.due_date || new Date().toISOString().split('T')[0])
    setEditDueTime(task.due_time || '')
    setEditPriority(task.priority || 'normal')
    setEditRecurrence(task.recurrence || 'none')
  }

  function closeEdit() {
    setEditingTaskId(null)
    setEditTitle('')
    setEditDescription('')
    setEditCategoryId('')
    setEditDueDate(new Date().toISOString().split('T')[0])
    setEditDueTime('')
    setEditPriority('normal')
    setEditRecurrence('none')
  }

  function handleSaveEdit() {
    if (!editingTaskId) return
    if (!editTitle.trim()) {
      toast.error('Nome da tarefa obrigatorio.')
      return
    }

    startTransition(async () => {
      const result = await updateAssignedTask(editingTaskId, {
        title: editTitle,
        description: editDescription,
        categoryId: editCategoryId || null,
        dueDate: editDueDate,
        dueTime: editDueTime || null,
        priority: editPriority,
        recurrence: editRecurrence,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }

      setRecentTasks((prev) =>
        prev.map((task) =>
          task.id === editingTaskId
            ? {
              ...task,
              title: editTitle.trim(),
              description: editDescription.trim() || null,
              category_id: editCategoryId || null,
              due_date: editDueDate,
              due_time: editDueTime || null,
              priority: editPriority,
              recurrence: editRecurrence,
            }
            : task,
        ),
      )

      toast.success('Tarefa atualizada.')
      closeEdit()
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="border-b px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Atribuir tarefas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crie atribuicoes em fluxo rapido e organizado.</p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen)
              if (!nextOpen) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="size-4" />
                Atribuir tarefa
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-4xl overflow-x-hidden overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova atribuicao</DialogTitle>
                <DialogDescription>
                  Fluxo em 2 passos para criar tarefas com destino, prioridade e recorrencia.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Badge variant={step === 1 ? 'default' : 'outline'}>1. Dados da tarefa</Badge>
                <Badge variant={step === 2 ? 'default' : 'outline'}>2. Destino e agenda</Badge>
              </div>

              {step === 1 && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="assign-title">Nome da tarefa</Label>
                    <Input
                      id="assign-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Revisar contrato do cliente"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assign-description">Descricao</Label>
                    <Textarea
                      id="assign-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalhes da demanda (opcional)"
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select
                      value={categoryId || 'none'}
                      onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem categoria</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 py-2">
                  <div className="grid gap-3">
                    <Label>Adicionar para</Label>
                    <RadioGroup
                      value={assignTarget}
                      onValueChange={(value) => setAssignTarget(value as AssignTarget)}
                      className="grid grid-cols-1 gap-2 md:grid-cols-3"
                    >
                      <Label className={targetCardClass(assignTarget === 'member')}>
                        <RadioGroupItem value="member" />
                        Membro
                      </Label>
                      <Label className={targetCardClass(assignTarget === 'team')}>
                        <RadioGroupItem value="team" />
                        Equipe
                      </Label>
                      <Label className={targetCardClass(assignTarget === 'department')}>
                        <RadioGroupItem value="department" />
                        Departamento
                      </Label>
                    </RadioGroup>

                    {assignTarget === 'member' && (
                      <div className="rounded-lg border p-3">
                        <div className="mb-3 grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
                          {canPickAnyDepartment(role) ? (
                            <>
                              <Label>Filtrar por departamento</Label>
                              <Select
                                value={memberDepartmentId || 'all'}
                                onValueChange={(value) => setMemberDepartmentId(value === 'all' ? '' : value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Todos os departamentos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos os departamentos</SelectItem>
                                  {assignableDepartments.map((department) => (
                                    <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Selecione os membros que devem receber a tarefa.</p>
                          )}
                        </div>

                        <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                          {visibleMembers.map((member) => (
                            <Label key={member.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal">
                              <Checkbox
                                checked={selectedUserIds.includes(member.id)}
                                onCheckedChange={() => toggleUser(member.id)}
                              />
                              <span className="truncate">
                                {member.full_name || 'Sem nome'}
                                {member.department_name ? ` - ${member.department_name}` : ''}
                              </span>
                            </Label>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignTarget === 'team' && (
                      <div className="rounded-lg border p-3">
                        <div className="grid gap-2">
                          <Label>Equipe / departamento</Label>
                          <Select value={teamDepartmentId} onValueChange={setTeamDepartmentId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableDepartments.map((department) => (
                                <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {assignTarget === 'department' && (
                      <div className="rounded-lg border p-3">
                        <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                          {assignableDepartments.map((department) => (
                            <Label key={department.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal">
                              <Checkbox
                                checked={selectedDepartmentIds.includes(department.id)}
                                onCheckedChange={() => toggleDepartmentSelection(department.id)}
                              />
                              {department.name}
                            </Label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Nivel de prioridade</Label>
                      <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Recorrente</Label>
                      <Select
                        value={recurrence}
                        onValueChange={(v) => {
                          const next = v as Recurrence
                          setRecurrence(next)
                          if (next !== 'weekly') setWeeklyDays([])
                          if (next !== 'monthly') setMonthlyDays([])
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem recorrencia</SelectItem>
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        {recurrence !== 'none' ? 'Data de início' : 'Data'}
                        {recurrence !== 'none' && (
                          <span className="ml-1 text-xs text-muted-foreground">(primeira ocorrência)</span>
                        )}
                      </Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Horário <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={dueHour || 'none'}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              setDueTime('')
                              return
                            }
                            setDueTime(`${value}:${dueMinute || '00'}`)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">--</SelectItem>
                            {timeHours.map((hour) => (
                              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">:</span>
                        <Select
                          value={dueHour ? dueMinute || '00' : 'none'}
                          onValueChange={(value) => {
                            setDueTime(`${dueHour}:${value}`)
                          }}
                        >
                          <SelectTrigger disabled={!dueHour} className="w-full">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">--</SelectItem>
                            {timeMinutes.map((minute) => (
                              <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {recurrence === 'weekly' && (
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label>Selecione os dias da semana</Label>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {weekDays.map((day) => (
                          <Label key={day.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal">
                            <Checkbox
                              checked={weeklyDays.includes(day.value)}
                              onCheckedChange={() => toggleWeeklyDay(day.value)}
                            />
                            {day.label}
                          </Label>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrence === 'monthly' && (
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label>Selecione os dias do mes</Label>
                      <div className="grid max-h-40 grid-cols-7 gap-2 overflow-y-auto pr-1">
                        {monthDays.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleMonthlyDay(day)}
                            className={cn(
                              'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                              monthlyDays.includes(day)
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:bg-accent',
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Destinatarios selecionados</span>
                    <Badge variant="secondary">{resolvedAssigneeIds.length}</Badge>
                  </div>
                </div>
              )}

              <DialogFooter className="justify-between gap-2 sm:justify-between">
                {step === 2 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  {step === 1 ? (
                    <Button type="button" onClick={() => setStep(2)} disabled={!canContinueStepOne}>
                      Proximo passo
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleCreate} disabled={isPending}>
                      {isPending ? 'Atribuindo...' : 'Atribuir tarefa'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-8 py-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Como funciona</CardTitle>
            <CardDescription>
              Clique em <strong>Atribuir tarefa</strong> e siga os dois passos para criar a demanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><UserPlus className="size-4" /> Passo 1: nome, descricao e categoria.</p>
            <p className="flex items-center gap-2"><CalendarClock className="size-4" /> Passo 2: destino, prioridade, data/hora e recorrencia.</p>
            <p className="flex items-center gap-2"><Repeat className="size-4" /> Semanal e mensal mostram seletores adicionais.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Atribuidas recentemente</CardTitle>
                <CardDescription>Ultimas demandas atribuidas por voce.</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedIds.size} selecionada(s)</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" />
                    Excluir selecionadas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            {recentTasks.some((t) => t.status !== 'done') && (
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === recentTasks.filter((t) => t.status !== 'done').length && recentTasks.filter((t) => t.status !== 'done').length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="cursor-pointer text-xs text-muted-foreground">
                    Selecionar todas
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="w-full justify-center text-red-500 hover:text-red-600"
                  disabled={recentTasks.length === 0 || isPending}
                >
                  <Trash2 className="size-3.5" />
                  Excluir Todas as Minhas Tarefas
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-md border p-3 transition-colors ${selectedIds.has(task.id) ? 'border-primary bg-primary/5' : 'bg-muted/20'}`}
              >
                <div className="flex items-start gap-3">
                  {task.status !== 'done' && (
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={() => toggleSelect(task.id)}
                      className="mt-0.5 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      {task.recurrence && task.recurrence !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Recorrente
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Para: {task.assignee_name} | {task.due_date} {task.due_time || ''} | {task.priority || 'normal'}
                    </p>
                    {task.status !== 'done' && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(task)}
                          disabled={isPending}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(task) }}
                          className="text-red-500 hover:text-red-600"
                          disabled={isPending}
                        >
                          <Trash2 className="size-3.5" />
                          {task.recurrence && task.recurrence !== 'none' ? 'Excluir série' : 'Excluir'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentTasks.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas atribuidas recentemente.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.recurrence && deleteTarget.recurrence !== 'none'
                ? 'Excluir série recorrente'
                : 'Excluir tarefa'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.recurrence && deleteTarget.recurrence !== 'none'
                ? 'Esta acao vai excluir todas as instâncias desta série recorrente. Esta acao nao pode ser desfeita.'
                : 'Tem certeza que deseja excluir esta tarefa? Esta acao nao pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{deleteTarget?.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Para: {deleteTarget?.assignee_name}
              {deleteTarget?.recurrence && deleteTarget.recurrence !== 'none' && (
                <> — Recorrência: {deleteTarget.recurrence}</>
              )}
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => deleteTarget && confirmDeleteSingle(deleteTarget.id)}
            >
              <Trash2 className="size-3.5" />
              {deleteTarget?.recurrence && deleteTarget.recurrence !== 'none'
                ? 'Excluir toda a série'
                : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para excluir todas as tarefas do usuário */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir Todas as Tarefas</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir TODAS as suas tarefas criadas ({recentTasks.length})? Esta acao nao pode ser desfeita e vai incluir tarefas recorrentes e suas instâncias.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowDeleteAllDialog(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={handleDeleteAllByUser}
            >
              <Trash2 className="size-3.5" />
              Sim, excluir tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingTaskId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeEdit()
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tarefa atribuida</DialogTitle>
            <DialogDescription>Atualize os dados principais da tarefa.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Nome da tarefa</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descricao</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[110px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={editCategoryId || 'none'}
                  onValueChange={(value) => setEditCategoryId(value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select value={editPriority} onValueChange={(value) => setEditPriority(value as Priority)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  {editRecurrence !== 'none' ? 'Data de início' : 'Data'}
                  {editRecurrence !== 'none' && (
                    <span className="ml-1 text-xs text-muted-foreground">(primeira ocorrência)</span>
                  )}
                </Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Horario</Label>
                <Input type="time" value={editDueTime} onChange={(e) => setEditDueTime(e.target.value)} />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label>Recorrencia</Label>
                <Select value={editRecurrence} onValueChange={(value) => setEditRecurrence(value as Recurrence)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrencia</SelectItem>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar alteracoes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const weekDays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terca' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sabado' },
]

const monthDays = Array.from({ length: 31 }, (_, index) => index + 1)
const timeHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const timeMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function targetCardClass(active: boolean) {
  return cn(
    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
    active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-accent',
  )
}

