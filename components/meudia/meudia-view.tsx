'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, Pencil, Repeat, Save, Star, Trash2, TrendingUp, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { toast } from 'sonner'
import { deleteAssignedTask, createQuickTask, markTaskDone } from '@/app/actions/assignments'
import { isStaffRole } from '@/lib/roles'
import type { AppRole } from '@/lib/types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RawTask {
  id: string
  title: string
  due_date?: string
  due_time?: string | null
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente' | null
  recurrence?: string | null
  status: string
  is_starred: boolean
  category_id?: string | null
  categories?: { name: string; color: string } | null
}

interface CategoryItem { id: string; name: string; color: string }

interface MeuDiaViewProps {
  userId: string
  userName: string
  role: AppRole
  selectedDate: string
  categories: CategoryItem[]
  todayTasks: RawTask[]
  overdueTasks: RawTask[]
}

const timeHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const timeMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function normalizeTask(row: any): RawTask {
  const category = Array.isArray(row?.categories) ? row.categories[0] ?? null : row?.categories ?? null
  return {
    ...row,
    categories: category ? { name: category.name, color: category.color } : null,
  } as RawTask
}

function triggerConfetti() {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position: fixed; inset: 0; width:100%; height:100%; pointer-events:none; z-index:9999;'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: -10, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 5 + 4,
    size: Math.random() * 4 + 2, life: 1, color: ['#00FF85', '#3B82F6', '#F59E0B', '#EC4899'][Math.floor(Math.random() * 4)],
  }))
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.vx *= 0.99; p.life -= 0.02
      if (p.life <= 0) { particles.splice(i, 1); continue }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size)
    }
    if (particles.length) requestAnimationFrame(tick); else canvas.remove()
  }
  tick()
}

function getGreeting() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }
function formatTime(v?: string | null) { return v ? v.slice(0, 5) : null }
function formatDueDate(v?: string) { return v ? format(parseISO(v), 'dd/MM', { locale: ptBR }) : null }
function pLabel(v?: string | null) { return v === 'urgente' ? 'Urgente' : v === 'alta' ? 'Alta' : v === 'baixa' ? 'Baixa' : 'Normal' }
function pStyle(v?: string | null) {
  if (v === 'urgente') return { bg: 'rgba(239,68,68,.18)', fg: '#ef4444' }
  if (v === 'alta') return { bg: 'rgba(245,158,11,.18)', fg: '#f59e0b' }
  if (v === 'baixa') return { bg: 'rgba(34,197,94,.18)', fg: '#22c55e' }
  return { bg: 'rgba(148,163,184,.18)', fg: 'var(--color-text-secondary)' }
}

function CheckboxCircle({ done, overdue, onClick }: { done: boolean; overdue?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Marcar como concluida" style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${done ? 'var(--color-primary)' : overdue ? 'var(--color-error)' : 'var(--color-text-muted)'}`, background: done ? 'var(--color-primary)' : 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {done && <Check size={11} color="#111" strokeWidth={3} />}
    </button>
  )
}

function DailyProgressCard({ total, done }: { total: number; done: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={15} style={{ color: 'var(--color-accent-blue)' }} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Andamento do dia</span></div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18, color: 'var(--color-text-primary)', fontWeight: 700 }}>{done} / {total}</span>
        <span style={{ fontSize: 18, color: pct === 100 ? 'var(--color-primary)' : 'var(--color-accent-blue)', fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--color-primary)' : 'linear-gradient(90deg,var(--color-accent-blue),var(--color-primary))', transition: 'width .4s ease' }} /></div>
    </div>
  )
}

function SectionHeader({ label, count, overdue }: { label: string; count: number; overdue?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>{overdue && <AlertCircle size={15} style={{ color: 'var(--color-error)' }} />}<h2 style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>{label}</h2><span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: overdue ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)', color: overdue ? 'var(--color-error)' : 'var(--color-accent-blue)' }}>{count}</span></div>
}

function TaskRow({ task, categories, showDate, overdue, onMarkDone, onToggleStar, onQuickSave, onDelete, canDelete, isMobile }: {
  task: RawTask; categories: CategoryItem[]; showDate: boolean; overdue?: boolean; onMarkDone: () => void; onToggleStar: () => void; isMobile: boolean; canDelete: boolean; onDelete: () => void;
  onQuickSave: (taskId: string, updates: { title: string; due_time: string | null; category_id: string | null; priority: 'baixa' | 'normal' | 'alta' | 'urgente' }) => Promise<void>
}) {
  const done = task.status === 'done'
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [time, setTime] = useState(task.due_time?.slice(0, 5) || '')
  const [categoryId, setCategoryId] = useState(task.category_id || '')
  const [priority, setPriority] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>((task.priority as any) || 'normal')
  const meta = pStyle(task.priority)
  const [selectedHour = '', selectedMinute = ''] = time.split(':')

  const save = async () => {
    if (!title.trim()) return toast.error('Titulo obrigatorio')
    await onQuickSave(task.id, { title: title.trim(), due_time: time || null, category_id: categoryId || null, priority })
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: editing && isMobile ? 'flex-start' : 'center', padding: '11px 14px', borderBottom: '1px solid var(--color-border-subtle)', opacity: done ? 0.45 : 1 }}>
      <CheckboxCircle done={done} overdue={overdue} onClick={() => { if (!done) { triggerConfetti(); onMarkDone() } }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`h-8 border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 text-xs text-[var(--color-input-text)] ${isMobile ? 'w-full' : ''}`}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
              <Select value={categoryId || 'none'} onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}>
                <SelectTrigger className={`h-8 border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 text-xs text-[var(--color-input-text)] ${isMobile ? 'w-full min-w-0' : 'min-w-[160px]'}`}>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className={`flex items-center gap-1.5 ${isMobile ? 'w-full' : ''}`}>
                <Select
                  value={selectedHour || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setTime('')
                      return
                    }
                    setTime(`${value}:${selectedMinute || '00'}`)
                  }}
                >
                  <SelectTrigger className={`h-8 border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 text-xs text-[var(--color-input-text)] ${isMobile ? 'flex-1 w-auto min-w-0' : 'w-[76px]'}`}>
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
                    <SelectItem value="none">--</SelectItem>
                    {timeHours.map((hour) => (
                      <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>:</span>
                <Select
                  value={selectedHour ? selectedMinute || '00' : 'none'}
                  onValueChange={(value) => {
                    setTime(`${selectedHour}:${value}`)
                  }}
                >
                  <SelectTrigger
                    disabled={!selectedHour}
                    className={`h-8 border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 text-xs text-[var(--color-input-text)] ${isMobile ? 'flex-1 w-auto min-w-0' : 'w-[76px]'}`}
                  >
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
                    <SelectItem value="none">--</SelectItem>
                    {timeMinutes.map((minute) => (
                      <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={priority} onValueChange={(value) => setPriority(value as 'baixa' | 'normal' | 'alta' | 'urgente')}>
                <SelectTrigger className={`h-8 border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 text-xs text-[var(--color-input-text)] ${isMobile ? 'w-full min-w-0' : 'min-w-[120px]'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={save} aria-label="Salvar edicao" style={{ border: '1px solid var(--color-border)', background: 'var(--color-primary)', color: '#111', cursor: 'pointer', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', width: 30, height: 30 }}><Save size={14} /></button>
                <button onClick={() => setEditing(false)} aria-label="Cancelar edicao" style={{ border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', width: 30, height: 30 }}><X size={14} /></button>
              </div>
            )}
          </div>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 14, color: done ? 'var(--color-text-muted)' : overdue ? 'var(--color-error)' : 'var(--color-text-primary)', textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</p>
            <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {(showDate || task.due_time) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: overdue ? 'var(--color-error)' : 'var(--color-text-muted)' }}><Clock size={11} />{showDate && formatDueDate(task.due_date)} {formatTime(task.due_time)}</span>}
              <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600, background: meta.bg, color: meta.fg }}>{pLabel(task.priority)}</span>
              {task.recurrence && task.recurrence !== 'none' && <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 10, color: 'var(--color-accent-blue)', background: 'rgba(59,130,246,.16)', display: 'inline-flex', gap: 4, alignItems: 'center' }}><Repeat size={10} />Recorrente</span>}
            </div>
          </>
        )}
      </div>
      {task.categories && !editing && <span style={{ borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 500, background: `${task.categories.color}20`, color: task.categories.color }}>{task.categories.name}</span>}
      {editing
        ? (!isMobile && <><button onClick={save} aria-label="Salvar edicao" style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Save size={14} /></button><button onClick={() => setEditing(false)} aria-label="Cancelar edicao" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={14} /></button></>)
        : <button onClick={() => setEditing(true)} aria-label="Edicao rapida" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Pencil size={14} /></button>}
      {!editing && <button onClick={onToggleStar} aria-label="Favoritar" style={{ border: 'none', background: 'transparent', color: task.is_starred ? 'var(--color-accent-orange)' : 'var(--color-text-muted)', opacity: task.is_starred ? 1 : 0.45, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Star size={15} style={{ fill: task.is_starred ? 'var(--color-accent-orange)' : 'transparent' }} /></button>}
      {!editing && canDelete && (
        <button
          onClick={onDelete}
          aria-label="Excluir tarefa"
          style={{ border: 'none', background: 'transparent', color: 'var(--color-error)', opacity: 0.6, cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'opacity 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

export function MeuDiaView({ userId, userName, role, selectedDate, categories, todayTasks: initialToday, overdueTasks: initialOverdue }: MeuDiaViewProps) {
  const isMobile = useIsMobile()
  // Qualquer usuario pode deletar suas proprias tarefas
  const canDelete = true
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [todayTasks, setTodayTasks] = useState(initialToday)
  const [overdueTasks, setOverdueTasks] = useState(initialOverdue)
  const [newTitle, setNewTitle] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const selectedDateObj = parseISO(currentDate)
  const totalToday = todayTasks.length
  const doneToday = todayTasks.filter((t) => t.status === 'done').length
  const greeting = getGreeting()
  const firstName = userName.split(' ')[0]
  const dateLabel = format(selectedDateObj, "EEEE, d 'de' MMMM", { locale: ptBR })
  const dayTitle = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
  const taskScopeFilter = `assigned_to.eq.${userId},and(user_id.eq.${userId},assigned_to.is.null)`

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const grouped = useMemo(() => {
    const g: Record<string, RawTask[]> = {}
    for (const t of todayTasks) { const label = t.categories?.name || 'Sem categoria'; if (!g[label]) g[label] = []; g[label].push(t) }
    return Object.entries(g).map(([label, tasks]) => ({ label, color: tasks[0]?.categories?.color || 'var(--color-border)', tasks: [...tasks].sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || (a.due_time || '').localeCompare(b.due_time || '')) })).sort((a, b) => a.label.localeCompare(b.label))
  }, [todayTasks])

  useEffect(() => {
    setCurrentDate(selectedDate)
    setTodayTasks(initialToday)
    setOverdueTasks(initialOverdue)
    setNewTitle('')
  }, [initialToday, initialOverdue, selectedDate])

  const patchTask = (taskId: string, changes: Partial<RawTask>) => {
    const apply = (t: RawTask): RawTask => {
      if (t.id !== taskId) return t
      const categoryId = changes.category_id === undefined ? t.category_id : changes.category_id
      const cat = categoryId ? catById.get(categoryId) : null
      return { ...t, ...changes, category_id: categoryId, categories: cat ? { name: cat.name, color: cat.color } : null }
    }
    setTodayTasks((prev) => prev.map(apply)); setOverdueTasks((prev) => prev.map(apply))
  }

  const goDate = (delta: number) => {
    const nextDate = format(addDays(selectedDateObj, delta), 'yyyy-MM-dd')
    startTransition(async () => {
      const supabase = createClient()
      const [todayResult, overdueResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_date, due_time, status, is_starred, category_id, priority, recurrence, categories(name, color)')
          .or(taskScopeFilter)
          .eq('due_date', nextDate)
          .order('due_time', { ascending: true }),
        supabase
          .from('tasks')
          .select('id, title, due_date, due_time, status, is_starred, category_id, priority, recurrence, categories(name, color)')
          .or(taskScopeFilter)
          .lt('due_date', nextDate)
          .neq('status', 'done')
          .order('due_date', { ascending: true }),
      ])

      if (todayResult.error || overdueResult.error) {
        toast.error('Nao foi possivel carregar tarefas deste dia')
        return
      }

      setCurrentDate(nextDate)
      setTodayTasks((todayResult.data ?? []).map(normalizeTask))
      setOverdueTasks((overdueResult.data ?? []).map(normalizeTask))
      setNewTitle('')
    })
  }
  const markDone = async (taskId: string, section: 'today' | 'overdue') => {
    const result = await markTaskDone(taskId)
    if (result.error) {
      toast.error('Nao foi possivel concluir a tarefa')
      return
    }
    if (section === 'today') setTodayTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: 'done' } : t))
    else setOverdueTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: 'done' } : t))
  }
  const toggleStar = async (taskId: string, current: boolean, section: 'today' | 'overdue') => { const supabase = createClient(); await supabase.from('tasks').update({ is_starred: !current }).eq('id', taskId); const updater = (p: RawTask[]) => p.map((t) => t.id === taskId ? { ...t, is_starred: !current } : t); if (section === 'today') setTodayTasks(updater); else setOverdueTasks(updater) }

  const quickSave = async (taskId: string, updates: { title: string; due_time: string | null; category_id: string | null; priority: 'baixa' | 'normal' | 'alta' | 'urgente' }) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
    if (error) {
      toast.error('Nao foi possivel atualizar tarefa')
      return
    }
    patchTask(taskId, updates)
    toast.success('Tarefa atualizada')
  }

  const deleteTask = async (taskId: string, section: 'today' | 'overdue') => {
    const res = await deleteAssignedTask(taskId)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (section === 'today') setTodayTasks((p) => p.filter((t) => t.id !== taskId))
    else setOverdueTasks((p) => p.filter((t) => t.id !== taskId))
    toast.success('Tarefa excluida')
  }

  const addTask = () => {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await createQuickTask({ title: newTitle.trim(), dueDate: currentDate })
      if (result.error) {
        toast.error('Nao foi possivel criar tarefa')
        return
      }
      setTodayTasks((p) => [...p, normalizeTask(result.data)])
      setNewTitle('')
      toast.success('Tarefa adicionada')
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-6)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{greeting}, {firstName}!</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{dayTitle}</p>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => goDate(-1)} style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{format(selectedDateObj, "dd 'de' MMMM", { locale: ptBR })}</span>
          <button onClick={() => goDate(1)} style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 'var(--space-5)' : 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', width: '100%' }} className="scrollbar-hide">
        <DailyProgressCard total={totalToday} done={doneToday} />

        <section>
          <SectionHeader label="Tarefas pendentes vencidas" count={overdueTasks.length} overdue />
          {overdueTasks.length === 0 ? <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,.35)', borderRadius: 'var(--radius-lg)', padding: '18px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>Nenhuma tarefa vencida pendente.</div> : (
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,.45)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.08)', color: 'var(--color-error)', fontSize: 12, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={14} />Atrasadas e nao concluidas</div>
              {overdueTasks.map((task) => <TaskRow key={task.id} task={task} categories={categories} showDate overdue isMobile={isMobile} canDelete={canDelete} onMarkDone={() => markDone(task.id, 'overdue')} onToggleStar={() => toggleStar(task.id, task.is_starred, 'overdue')} onQuickSave={quickSave} onDelete={() => deleteTask(task.id, 'overdue')} />)}
            </div>
          )}
        </section>

        <section>
          <SectionHeader label="Tarefas do dia" count={todayTasks.length} />
          {grouped.length === 0 ? <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>Nenhuma tarefa para este dia.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped.map((group) => {
                const isCollapsed = collapsed[group.label] === true
                return (
                  <div key={group.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <button onClick={() => setCollapsed((p) => ({ ...p, [group.label]: !isCollapsed }))} style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'var(--color-surface-elevated)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: group.color }} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{group.label}</span><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{group.tasks.length}</span></div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isCollapsed ? 'Expandir' : 'Recolher'}</span>
                    </button>
                    {!isCollapsed && group.tasks.map((task) => <TaskRow key={task.id} task={task} categories={categories} showDate={false} isMobile={isMobile} canDelete={canDelete} onMarkDone={() => markDone(task.id, 'today')} onToggleStar={() => toggleStar(task.id, task.is_starred, 'today')} onQuickSave={quickSave} onDelete={() => deleteTask(task.id, 'today')} />)}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div style={{
        flexShrink: 0,
        paddingTop: 'var(--space-4)',
        paddingLeft: isMobile ? 'var(--space-5)' : 'var(--space-8)',
        paddingRight: isMobile ? 'var(--space-5)' : 'var(--space-8)',
        paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask()
            }}
            placeholder="Adicionar nova tarefa"
            style={{
              flex: 1,
              width: isMobile ? '100%' : undefined,
              border: '1px solid var(--color-input-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-input-bg)',
              color: 'var(--color-text-primary)',
              fontSize: 14,
              padding: '10px 12px',
            }}
          />
          <button
            onClick={addTask}
            disabled={isPending}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: 'var(--color-btn-cta-bg)',
              color: 'var(--color-btn-cta-text)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              opacity: isPending ? 0.6 : 1,
              width: isMobile ? '100%' : undefined,
            }}
          >
            Criar nova tarefa
          </button>
        </div>
      </div>
    </div>
  )
}

