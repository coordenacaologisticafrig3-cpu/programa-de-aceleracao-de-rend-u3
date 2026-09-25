'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  LayoutDashboard,
  Users,
  Building2,
  Filter,
  RefreshCw,
  Plus,
} from 'lucide-react'
import type { AppRole } from '@/lib/types'
import { canSeeCompanyDashboard, isDeptGestor } from '@/lib/roles'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { getDashboardData } from '@/app/actions/dashboard'
import { AddCardModal } from '@/components/dashboard/add-card-modal'
import { CustomCard } from '@/components/dashboard/custom-card'
import type { CardConfig } from '@/app/api/dashboard/generate-card/route'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  userId: string
  role: AppRole
  departmentId: string | null
  categories: { id: string; name: string; color: string }[]
  departments: { id: string; name: string }[]
  teamMembers: { id: string; full_name: string; department_id: string | null }[]
}

interface DashboardStats {
  total: number
  done_on_time: number
  done_late: number
  not_done: number
  execution_rate: number
  on_time_rate: number
  late_rate: number
  not_done_rate: number
}

interface DashboardTask {
  id: string
  title: string
  status: string
  due_date: string | null
  completed_at: string | null
  priority: 'baixa' | 'normal' | 'alta' | 'urgente' | null
  category_id: string | null
  categories?: { name: string; color: string } | null
  user_id: string
  assigned_to: string | null
}

type Period = 'day' | 'week' | 'month'
type Level = 'individual' | 'team' | 'company'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (period === 'day') {
    const s = fmt(now)
    return { start: s, end: s }
  }
  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: fmt(monday), end: fmt(sunday) }
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: fmt(start), end: fmt(end) }
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

const emptyStats: DashboardStats = {
  total: 0,
  done_on_time: 0,
  done_late: 0,
  not_done: 0,
  execution_rate: 0,
  on_time_rate: 0,
  late_rate: 0,
  not_done_rate: 0,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ElementType
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px 22px',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '3px',
        height: '100%',
        background: color,
        borderRadius: '12px 0 0 12px',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
      </div>
      <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: value + '%',
          background: color,
          borderRadius: '999px',
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function DonutChart({ onTime, late, notDone, isMobile }: { onTime: number; late: number; notDone: number; isMobile: boolean }) {
  const total = onTime + late + notDone || 1
  const r = 52
  const circ = 2 * Math.PI * r
  const onTimePct = onTime / total
  const latePct = late / total
  const notPct = notDone / total

  const onTimeDash = onTimePct * circ
  const lateDash = latePct * circ
  const notDash = notPct * circ

  return (
    <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '28px' }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ flexShrink: 0 }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-border)" strokeWidth="14" />
        {/* Not done */}
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke="#EF4444" strokeWidth="14"
          strokeDasharray={`${notDash} ${circ - notDash}`}
          strokeDashoffset={`${-onTimeDash - lateDash}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
        />
        {/* Late */}
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke="#F59E0B" strokeWidth="14"
          strokeDasharray={`${lateDash} ${circ - lateDash}`}
          strokeDashoffset={`${-onTimeDash}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
        />
        {/* On time */}
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke="#00FF85" strokeWidth="14"
          strokeDasharray={`${onTimeDash} ${circ - onTimeDash}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
        />
        <text x="65" y="60" textAnchor="middle" fill="var(--color-text-primary)" fontSize="20" fontWeight="700" fontFamily="Inter">
          {pct(onTime, total)}%
        </text>
        <text x="65" y="76" textAnchor="middle" fill="var(--color-text-muted)" fontSize="10" fontFamily="Inter">
          no prazo
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { label: 'No prazo', color: '#00FF85', value: onTime },
          { label: 'Fora do prazo', color: '#F59E0B', value: late },
          { label: 'Nao realizadas', color: '#EF4444', value: notDone },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, isMobile }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  isMobile: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-input-border)',
          borderRadius: '8px',
          color: 'var(--color-input-text)',
          fontSize: '13px',
          padding: '7px 12px',
          cursor: 'pointer',
          outline: 'none',
          minWidth: isMobile ? '100%' : '140px',
          width: isMobile ? '100%' : undefined,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardView({
  userId,
  role,
  departmentId,
  categories,
  departments,
  teamMembers,
}: DashboardViewProps) {
  const isMobile = useIsMobile()
  const [period, setPeriod] = useState<Period>('week')
  const [level, setLevel] = useState<Level>('individual')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [customCards, setCustomCards] = useState<{ id: string; config: CardConfig }[]>([])
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    full_name: string | null
    role: AppRole
    department_id: string | null
    department_name: string | null
    email: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const availableLevels: { value: Level; label: string; icon: React.ElementType }[] = [
    { value: 'individual', label: 'Individual', icon: TrendingUp },
    ...(role !== 'funcionario' ? [{ value: 'team' as Level, label: 'Time', icon: Users }] : []),
    ...(canSeeCompanyDashboard(role) ? [{ value: 'company' as Level, label: 'Empresa', icon: Building2 }] : []),
  ]

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of teamMembers) map.set(m.id, m.full_name || 'Sem nome')
    map.set(userId, map.get(userId) || 'Você')
    return map
  }, [teamMembers, userId])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const { start, end } = getDateRange(period)
    const userIdFilter = filterUser !== 'all' ? filterUser : null
    const departmentIdFilter = canSeeCompanyDashboard(role) && (level === 'company' || level === 'team') && filterDept !== 'all'
      ? filterDept
      : (isDeptGestor(role) && level === 'team' ? (departmentId ?? null) : null)

    const res = await getDashboardData({
      level,
      start,
      end,
      categoryId: filterCategory !== 'all' ? filterCategory : null,
      departmentIdFilter,
      userIdFilter,
    })

    if (res && 'error' in res && res.error) {
      setStats(emptyStats)
      setTasks([])
      setSelectedUser(null)
      setLoading(false)
      return
    }

    setStats(res?.stats ?? emptyStats)
    setTasks((res?.tasks ?? []) as any)
    setSelectedUser((res?.selectedUser ?? null) as any)
    setLoading(false)
  }, [period, level, filterCategory, filterUser, filterDept, userId, role, departmentId])

  useEffect(() => { fetchStats() }, [fetchStats])

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'day', label: 'Hoje' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
  ]

  const categoryOptions = [
    { value: 'all', label: 'Todas as categorias' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const userOptions = [
    { value: 'all', label: 'Todos os membros' },
    ...teamMembers.map((m) => ({ value: m.id, label: m.full_name })),
  ]

  const deptOptions = [
    { value: 'all', label: 'Todos os departamentos' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ]

  const visibleTasksForSelectedUser = useMemo(() => {
    if (role === 'funcionario') return []
    if (filterUser === 'all') return []
    const uid = filterUser
    return tasks
      .filter((t) => t.user_id === uid || t.assigned_to === uid)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
  }, [tasks, role, filterUser])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-background)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '16px 16px 14px' : '24px 32px 20px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={20} style={{ color: 'var(--color-accent-blue)' }} />
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>
                Dashboard
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                Acompanhamento de desempenho e execucao de tarefas
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : undefined }}>
            <button
              onClick={() => setShowAddCard(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: 'var(--color-accent-blue)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                flex: isMobile ? 1 : undefined,
                justifyContent: 'center',
                transition: 'opacity 0.15s',
              }}
            >
              <Plus size={13} />
              Card
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
                fontSize: '12px', fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
                flex: isMobile ? 1 : undefined,
                justifyContent: isMobile ? 'center' : undefined,
              }}
            >
              <RefreshCw size={13} style={{ opacity: loading ? 0.5 : 1, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Level tabs */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '18px', overflowX: isMobile ? 'auto' : undefined }}>
          {availableLevels.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setLevel(value); setFilterUser('all'); setFilterDept('all') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: level === value ? 'var(--color-accent-blue)' : 'var(--color-surface)',
                color: level === value ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '16px' : '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }} className="scrollbar-hide">

        {/* Filtros */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: isMobile ? '14px' : '16px 20px',
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <Filter size={14} style={{ color: 'var(--color-text-muted)', marginBottom: isMobile ? 0 : '10px', flexShrink: 0 }} />

          <FilterSelect
            label="Periodo"
            value={period}
            onChange={(v) => setPeriod(v as Period)}
            options={periodOptions}
            isMobile={isMobile}
          />

          <FilterSelect
            label="Categoria"
            value={filterCategory}
            onChange={setFilterCategory}
            options={categoryOptions}
            isMobile={isMobile}
          />

          {role !== 'funcionario' && level !== 'individual' && (
            <FilterSelect
              label="Colaborador"
              value={filterUser}
              onChange={setFilterUser}
              options={userOptions}
              isMobile={isMobile}
            />
          )}

          {canSeeCompanyDashboard(role) && level === 'company' && (
            <FilterSelect
              label="Departamento"
              value={filterDept}
              onChange={setFilterDept}
              options={deptOptions}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Total no periodo', value: stats.total, sub: 'tarefas', color: 'var(--color-accent-blue)', icon: LayoutDashboard, delay: 0 },
            { label: 'Concluidas no prazo', value: stats.done_on_time, sub: stats.on_time_rate + '%', color: '#00FF85', icon: CheckCircle2, delay: 60 },
            { label: 'Concluidas fora prazo', value: stats.done_late, sub: stats.late_rate + '%', color: '#F59E0B', icon: Clock, delay: 120 },
            { label: 'Nao realizadas', value: stats.not_done, sub: stats.not_done_rate + '%', color: '#EF4444', icon: XCircle, delay: 180 },
            { label: 'Taxa de execucao', value: stats.execution_rate + '%', color: 'var(--color-primary)', icon: TrendingUp, delay: 240 },
          ].map(({ delay, ...card }) => (
            <div key={card.label} style={{ animation: `slideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
              <StatCard {...card} />
            </div>
          ))}
        </div>

        {/* Custom Cards */}
        {customCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            {customCards.map((card, i) => (
              <CustomCard
                key={card.id}
                id={card.id}
                config={card.config}
                stats={stats}
                onRemove={(id) => setCustomCards((prev) => prev.filter((c) => c.id !== id))}
                animationDelay={i * 60}
              />
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>

          {/* Donut */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '22px 24px',
            boxShadow: 'var(--shadow-card)',
            animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) 300ms both',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
              Distribuicao de tarefas
            </h3>
            {loading ? (
              <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Carregando...</span>
              </div>
            ) : (
              <DonutChart onTime={stats.done_on_time} late={stats.done_late} notDone={stats.not_done} isMobile={isMobile} />
            )}
          </div>

          {/* Rate bars */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '22px 24px',
            boxShadow: 'var(--shadow-card)',
            animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) 360ms both',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
              Taxas de desempenho
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <RateBar label="Concluidas no prazo" value={stats.on_time_rate} color="#00FF85" />
              <RateBar label="Concluidas fora do prazo" value={stats.late_rate} color="#F59E0B" />
              <RateBar label="Nao realizadas" value={stats.not_done_rate} color="#EF4444" />
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                <RateBar label="Taxa geral de execucao" value={stats.execution_rate} color="var(--color-accent-blue)" />
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes do colaborador selecionado (Owner) */}
        {role !== 'funcionario' && filterUser !== 'all' && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '18px 20px',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  Colaborador selecionado
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {selectedUser?.full_name || memberNameById.get(filterUser) || 'Sem nome'}
                  {selectedUser?.email ? ` • ${selectedUser.email}` : ''}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {selectedUser?.department_name ? `Depto: ${selectedUser.department_name}` : 'Depto: —'}{' '}
                  • Perfil: {selectedUser?.role ?? 'funcionario'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Tarefas no periodo</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {loading ? '—' : visibleTasksForSelectedUser.length}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              {loading ? (
                <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Carregando tarefas...</div>
              ) : visibleTasksForSelectedUser.length === 0 ? (
                <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Nenhuma tarefa no periodo/filtros atuais.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {visibleTasksForSelectedUser.slice(0, 20).map((t) => (
                    <div key={t.id} style={{
                      border: '1px solid var(--color-border-subtle)',
                      background: 'var(--color-surface-elevated)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: 999,
                        background: t.status === 'done' ? '#00FF85' : (t.due_date && t.due_date < new Date().toISOString().split('T')[0] ? '#EF4444' : '#F59E0B'),
                        flexShrink: 0,
                      }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 650, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            {t.title}
                          </span>
                          {t.categories && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: `${t.categories.color}22`,
                              color: t.categories.color,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}>
                              {t.categories.name}
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Vencimento: {t.due_date ? t.due_date.split('-').reverse().slice(0, 2).join('/') : '—'} • Status: {t.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleTasksForSelectedUser.length > 20 && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', paddingTop: '4px' }}>
                      Mostrando 20 de {visibleTasksForSelectedUser.length} tarefas (use filtros para refinar).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
            Resumo do periodo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1px', background: 'var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { label: 'Total', value: stats.total, color: 'var(--color-text-primary)' },
              { label: 'Concluidas', value: stats.done_on_time + stats.done_late, color: '#00FF85' },
              { label: 'No prazo', value: stats.done_on_time, color: '#00FF85' },
              { label: 'Fora do prazo', value: stats.done_late, color: '#F59E0B' },
              { label: 'Nao realizadas', value: stats.not_done, color: '#EF4444' },
              { label: 'Execucao', value: stats.execution_rate + '%', color: 'var(--color-accent-blue)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'var(--color-surface-elevated)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {loading ? '—' : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onAdd={(config) => {
            setCustomCards((prev) => [
              ...prev,
              { id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`, config },
            ])
            setShowAddCard(false)
          }}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
