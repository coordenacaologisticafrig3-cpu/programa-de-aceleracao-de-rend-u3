'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Trash2, Repeat, CalendarClock, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createSelfTask, deleteRecurringTasks } from '@/app/actions/assignments'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'

type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

interface CategoryOption {
  id: string
  name: string
  color?: string | null
  icon?: string | null
}

interface RecurrenceItem {
  id: string
  title: string
  frequency: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  user_id: string
  created_at?: string
}

interface RecurrencesViewProps {
  userId: string
  userRole?: string
  initialRecurrences: RecurrenceItem[]
  categories?: CategoryOption[]
}

const weekDays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terca' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sabado' },
  { value: 0, label: 'Domingo' },
]

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1)

const timeHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const timeMinutes = ['00', '15', '30', '45']

const recurrenceLabel: Record<string, string> = {
  none: 'Sem recorrencia',
  daily: 'Diario (seg-sex)',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

const priorityLabel: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export function RecurrencesView({
  userId,
  userRole = 'funcionario',
  initialRecurrences,
  categories = [],
}: RecurrencesViewProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [recurrences, setRecurrences] = useState<RecurrenceItem[]>(initialRecurrences)
  const [deleteTarget, setDeleteTarget] = useState<RecurrenceItem | null>(null)

  // Step 1
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')

  // Step 2
  const [priority, setPriority] = useState<Priority>('normal')
  const [recurrence, setRecurrence] = useState<Recurrence>('daily')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueTime, setDueTime] = useState('')
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [monthlyDays, setMonthlyDays] = useState<number[]>([])

  const dueHour = dueTime ? dueTime.split(':')[0] : ''
  const dueMinute = dueTime ? dueTime.split(':')[1] : ''

  function resetForm() {
    setStep(1)
    setTitle('')
    setDescription('')
    setCategoryId('')
    setPriority('normal')
    setRecurrence('daily')
    setDueDate(new Date().toISOString().split('T')[0])
    setDueTime('')
    setWeeklyDays([])
    setMonthlyDays([])
  }

  function toggleWeeklyDay(day: number) {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function toggleMonthlyDay(day: number) {
    setMonthlyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const canContinueStepOne = title.trim().length > 0

  function handleCreate() {
    if (recurrence === 'weekly' && weeklyDays.length === 0) {
      toast.error('Selecione ao menos um dia da semana.')
      return
    }
    if (recurrence === 'monthly' && monthlyDays.length === 0) {
      toast.error('Selecione ao menos um dia do mes.')
      return
    }

    startTransition(async () => {
      const result = await createSelfTask({
        title,
        description: description || undefined,
        categoryId: categoryId || null,
        dueDate,
        dueTime: dueTime || null,
        priority,
        recurrence,
        weeklyDays: recurrence === 'weekly' ? weeklyDays : undefined,
        monthlyDays: recurrence === 'monthly' ? monthlyDays : undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        result.totalInstances
          ? `${result.totalInstances} tarefa(s) criada(s) para os proximos 30 dias.`
          : 'Tarefa criada com sucesso.',
      )

      // Adicionar pseudo-item à lista local para feedback imediato
      if (result.recurrenceId) {
        setRecurrences((prev) => [
          {
            id: result.recurrenceId!,
            title,
            frequency: recurrence,
            start_date: dueDate,
            is_active: true,
            user_id: userId,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      setOpen(false)
      resetForm()
    })
  }

  function handleDeleteRecurrence(rec: RecurrenceItem) {
    setDeleteTarget(rec)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteRecurringTasks(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRecurrences((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Recorrencia e todas as suas tarefas foram excluidas.')
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Listas de Recorrencia</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie tarefas que se repetem automaticamente para voce.
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (!next) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nova tarefa recorrente
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-2xl overflow-x-hidden overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova tarefa recorrente</DialogTitle>
                <DialogDescription>
                  Crie uma tarefa que se repete automaticamente para voce nos proximos 30 dias.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Badge variant={step === 1 ? 'default' : 'outline'}>1. Dados da tarefa</Badge>
                <Badge variant={step === 2 ? 'default' : 'outline'}>2. Agenda e recorrencia</Badge>
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="self-title">Nome da tarefa</Label>
                    <Input
                      id="self-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Revisar planejamento semanal"
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="self-description">Descricao</Label>
                    <Textarea
                      id="self-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalhes da tarefa (opcional)"
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select
                      value={categoryId || 'none'}
                      onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}
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

              {/* Step 2 */}
              {step === 2 && (
                <div className="grid gap-5 py-2">
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
                      <Label>Recorrencia</Label>
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
                          <SelectItem value="daily">Diario (seg-sex)</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        {recurrence !== 'none' ? 'Data de inicio' : 'Data'}
                        {recurrence !== 'none' && (
                          <span className="ml-1 text-xs text-muted-foreground">(primeira ocorrencia)</span>
                        )}
                      </Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Horario <span className="text-xs text-muted-foreground">(opcional)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={dueHour || 'none'}
                          onValueChange={(v) => {
                            if (v === 'none') { setDueTime(''); return }
                            setDueTime(`${v}:${dueMinute || '00'}`)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">--</SelectItem>
                            {timeHours.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">:</span>
                        <Select
                          value={dueHour ? dueMinute || '00' : 'none'}
                          onValueChange={(v) => setDueTime(`${dueHour}:${v}`)}
                        >
                          <SelectTrigger disabled={!dueHour} className="w-full">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">--</SelectItem>
                            {timeMinutes.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
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
                          <Label
                            key={day.value}
                            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal"
                          >
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

                  {recurrence !== 'none' && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      <RefreshCw className="size-3.5 shrink-0" />
                      <span>
                        Serao geradas instâncias de tarefa para os proximos 30 dias a partir da data de inicio.
                      </span>
                    </div>
                  )}
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
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canContinueStepOne}
                    >
                      Proximo passo
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleCreate} disabled={isPending}>
                      {isPending ? 'Criando...' : 'Criar tarefa'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-8 py-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Como funciona</CardTitle>
            <CardDescription>
              Clique em <strong>Nova tarefa recorrente</strong> e siga os dois passos para criar a demanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Plus className="size-4" />
              Passo 1: nome, descricao e categoria.
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Passo 2: prioridade, data de inicio, horario e tipo de recorrencia.
            </p>
            <p className="flex items-center gap-2">
              <Repeat className="size-4" />
              Recorrencia diaria gera tarefas de segunda a sexta pelos proximos 30 dias.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Minhas recorrencias</CardTitle>
            <CardDescription>Tarefas repetitivas criadas por voce.</CardDescription>
          </CardHeader>
          <CardContent>
            {recurrences.length === 0 ? (
              <Empty
                title="Nenhuma recorrencia criada"
                description="Crie sua primeira tarefa recorrente clicando no botao acima."
              />
            ) : (
              <div className="space-y-2">
                {recurrences.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-md border bg-muted/20 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {recurrenceLabel[rec.frequency] ?? rec.frequency}
                        </Badge>
                      </div>
                      {rec.start_date && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Inicio: {rec.start_date}
                          {rec.end_date ? ` — Fim: ${rec.end_date}` : ''}
                        </p>
                      )}
                    </div>
                    {rec.user_id === userId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-3 shrink-0 text-red-500 hover:text-red-600"
                        disabled={isPending}
                        onClick={() => handleDeleteRecurrence(rec)}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir serie
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmacao de exclusao */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir serie recorrente</DialogTitle>
            <DialogDescription>
              Esta acao vai excluir a recorrencia e todas as suas tarefas pendentes. Nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{deleteTarget?.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorrencia: {deleteTarget ? (recurrenceLabel[deleteTarget.frequency] ?? deleteTarget.frequency) : ''}
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" className="w-full sm:w-auto" disabled={isPending} onClick={confirmDelete}>
              <Trash2 className="size-3.5" />
              Excluir toda a serie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
