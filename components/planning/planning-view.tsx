'use client'

import { useState } from 'react'
import {
  format,
  addDays,
  parseISO,
  addMonths,
  subMonths,
  subWeeks,
  addWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Category } from '@/lib/types'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface Task {
  id: string
  title: string
  due_date?: string
  due_time?: string | null
  priority?: string
  status: string
  is_starred: boolean
  categories?: { name: string; color: string } | null
}

interface PlanningViewProps {
  userId: string
  initialTasks: Task[]
  initialCategories: Category[]
}

export function PlanningView({ userId: _userId, initialTasks, initialCategories }: PlanningViewProps) {
  const isMobile = useIsMobile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return initialTasks.filter((t) => {
      const match =
        t.due_date === dateStr &&
        (!filterCategory || t.categories?.name === filterCategory)
      return match
    })
  }

  const tasksForSelectedDate = getTasksForDate(selectedDate)

  const titleLabel =
    mode === 'daily'
      ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const goPrev = () => {
    if (mode === 'daily') {
      setSelectedDate((p) => addDays(p, -1))
      setCurrentDate((p) => addDays(p, -1))
      return
    }
    if (mode === 'weekly') {
      setCurrentDate((p) => subWeeks(p, 1))
      return
    }
    setCurrentDate((p) => subMonths(p, 1))
  }

  const goNext = () => {
    if (mode === 'daily') {
      setSelectedDate((p) => addDays(p, 1))
      setCurrentDate((p) => addDays(p, 1))
      return
    }
    if (mode === 'weekly') {
      setCurrentDate((p) => addWeeks(p, 1))
      return
    }
    setCurrentDate((p) => addMonths(p, 1))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-background)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-8)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Planejamento
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Organize tarefas para dias futuros
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          padding: isMobile ? 'var(--space-4) var(--space-5)' : 'var(--space-6) var(--space-8)',
          borderBottom: '1px solid var(--color-border)',
          gap: isMobile ? 'var(--space-3)' : 'var(--space-6)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <button
            onClick={goPrev}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: isMobile ? 0 : '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {titleLabel}
          </span>
          <button
            onClick={goNext}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 2 }}>
          {(['daily', 'weekly', 'monthly'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                if (m === 'daily') setSelectedDate(currentDate)
              }}
              style={{
                padding: '6px 12px',
                background: mode === m ? 'var(--color-primary)' : 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: mode === m ? '#111111' : 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {m === 'daily' ? 'Diário' : m === 'weekly' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          padding: isMobile ? 'var(--space-4) var(--space-5)' : 'var(--space-4) var(--space-8)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setFilterCategory(null)}
          style={{
            padding: '6px 12px',
            background: filterCategory === null ? 'var(--color-accent-blue)' : 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            color: filterCategory === null ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Todas
        </button>
        {initialCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}
            style={{
              padding: '6px 12px',
              background: filterCategory === cat.name ? cat.color + '30' : 'transparent',
              border: '1px solid ' + (filterCategory === cat.name ? cat.color : 'var(--color-border)'),
              borderRadius: 'var(--radius-full)',
              color: filterCategory === cat.name ? cat.color : 'var(--color-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 'var(--space-5)' : 'var(--space-8)', scrollbarWidth: 'none' }} className="scrollbar-hide">
        {mode === 'daily' ? (
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Hoje
              </button>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              {tasksForSelectedDate.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Nenhuma tarefa para este dia.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasksForSelectedDate.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--color-background)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid ' + (task.categories?.color || '#3B82F6'),
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{task.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {task.due_time ? task.due_time.slice(0, 5) : 'Sem horario'} {task.categories ? `- ${task.categories.name}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : mode === 'weekly' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)' }}>
            {weekDays.map((day) => {
              const tasks = getTasksForDate(day)
              const isToday = isSameDay(day, new Date())
              const dateStr = format(day, 'EEE dd', { locale: ptBR })
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    background: 'var(--color-surface)',
                    border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    minHeight: isMobile ? 150 : 220,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedDate(day)
                      setMode('daily')
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        margin: '0 0 var(--space-2)',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dateStr}
                    </h3>
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    {tasks.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', padding: '6px 0' }}>—</div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            background: 'var(--color-background)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            color: 'var(--color-text-primary)',
                            borderLeft: '3px solid ' + (task.categories?.color || '#3B82F6'),
                          }}
                        >
                          {task.title}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {day}
                </div>
              ))}
              {monthDays.map((day) => {
                const tasks = getTasksForDate(day)
                const inMonth = isSameMonth(day, currentDate)
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, new Date())
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      textAlign: 'left',
                      border: isSelected ? '1px solid var(--color-accent-blue)' : '1px solid var(--color-border)',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(59,130,246,0.10)' : 'var(--color-surface)',
                      padding: '10px',
                      minHeight: isMobile ? 76 : 110,
                      cursor: 'pointer',
                      opacity: inMonth ? 1 : 0.45,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        {format(day, 'd')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {tasks.length > 0 ? `${tasks.length}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tasks.slice(0, isMobile ? 1 : 2).map((t) => (
                        <div
                          key={t.id}
                          style={{
                            fontSize: 11,
                            color: 'var(--color-text-primary)',
                            background: 'var(--color-background)',
                            borderRadius: 8,
                            padding: '6px 8px',
                            borderLeft: '3px solid ' + (t.categories?.color || '#3B82F6'),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                      {tasks.length > (isMobile ? 1 : 2) && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          +{tasks.length - (isMobile ? 1 : 2)} mais
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Tarefas de {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
              </h3>
              {tasksForSelectedDate.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Nenhuma tarefa para o dia selecionado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasksForSelectedDate.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--color-background)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid ' + (task.categories?.color || '#3B82F6'),
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{task.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {task.due_time ? task.due_time.slice(0, 5) : 'Sem horario'} {task.categories ? `- ${task.categories.name}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
