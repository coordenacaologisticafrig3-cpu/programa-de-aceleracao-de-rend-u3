'use client'

import { Bot, User, CheckCircle2, Loader2, Wrench, Download, TrendingUp, TrendingDown, Minus, CheckCheck, Clock, AlertCircle, ListTodo } from 'lucide-react'
import type { UIMessage } from 'ai'

interface ChatMessageProps {
  message: UIMessage
}

function getToolPartMeta(tp: any) {
  const inv = tp?.toolInvocation
  const rawType = typeof tp?.type === 'string' ? tp.type : ''
  const toolNameFromType = rawType.startsWith('tool-') ? rawType.slice(5) : undefined

  const toolName = inv?.toolName ?? tp?.toolName ?? toolNameFromType ?? 'tool'
  const state = inv?.state ?? tp?.state ?? null
  const output =
    inv?.output ??
    inv?.result ??
    tp?.output ??
    tp?.result ??
    null

  const isDone =
    state === 'output-available' ||
    state === 'done' ||
    output !== null

  return { toolName, state, output, isDone }
}

function getTextFromParts(msg: UIMessage): string {
  if (msg.parts && Array.isArray(msg.parts)) {
    const fromParts = msg.parts
      .filter((p: any) => typeof p?.text === 'string')
      .map((p: any) => p.text as string)
      .join('')
    if (fromParts.trim()) return fromParts
  }

  const content = (msg as any).content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
  }
  return ''
}

// ── Tipos de dados de relatório ──────────────────────────────────────────

interface ReportData {
  period?: { start: string; end: string }
  total_tasks?: number
  done_on_time?: number
  done_late?: number
  not_done?: number
  pending?: number
  execution_rate?: number
  on_time_rate?: number
  by_user?: Array<{ name: string; done: number; late: number; pending: number; not_done: number }>
}

// ── Detecta se a tool output é um relatório ──────────────────────────────

function isReportData(data: unknown): data is ReportData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return typeof d.execution_rate === 'number' || typeof d.done_on_time === 'number'
}

// ── Formata data ISO para DD/MM/AAAA ─────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Exporta relatório para CSV ────────────────────────────────────────────

function exportReportCSV(report: ReportData) {
  const rows: string[][] = []

  rows.push(['Relatório de Desempenho'])
  if (report.period) rows.push([`Período: ${fmtDate(report.period.start)} a ${fmtDate(report.period.end)}`])
  rows.push([])
  rows.push(['Métrica', 'Valor'])
  rows.push(['Total de tarefas', String(report.total_tasks ?? 0)])
  rows.push(['Concluídas no prazo', String(report.done_on_time ?? 0)])
  rows.push(['Concluídas com atraso', String(report.done_late ?? 0)])
  rows.push(['Não realizadas', String(report.not_done ?? 0)])
  rows.push(['Pendentes', String(report.pending ?? 0)])
  rows.push(['Taxa de execução', `${report.execution_rate ?? 0}%`])
  rows.push(['Taxa no prazo', `${report.on_time_rate ?? 0}%`])

  if (report.by_user && report.by_user.length > 0) {
    rows.push([])
    rows.push(['Colaborador', 'Concluídas no prazo', 'Com atraso', 'Pendentes', 'Não realizadas'])
    for (const u of report.by_user) {
      rows.push([u.name, String(u.done), String(u.late), String(u.pending), String(u.not_done)])
    }
  }

  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio_${report.period?.start ?? 'tetra'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Exporta lista de tarefas para CSV ─────────────────────────────────────

function exportTasksCSV(tasks: Array<Record<string, unknown>>) {
  const rows: string[][] = [
    ['Título', 'Status', 'Prioridade', 'Vencimento', 'Responsável', 'Recorrência'],
    ...tasks.map((t) => [
      String(t.title ?? ''),
      String(t.status ?? ''),
      String(t.priority ?? ''),
      t.due_date ? fmtDate(String(t.due_date)) : '',
      String(t.assigned_to_name ?? ''),
      String(t.recurrence ?? 'none'),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tarefas_tetra.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Componente de KPI card ────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid var(--color-border)`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flex: '1 1 120px',
      minWidth: '0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: '1.2' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ── Componente de relatório visual ────────────────────────────────────────

function ReportCard({ data }: { data: ReportData }) {
  const execRate = data.execution_rate ?? 0
  const onTimeRate = data.on_time_rate ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '600px' }}>
      {/* Header com período */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Relatório de Desempenho</p>
          {data.period && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {fmtDate(data.period.start)} — {fmtDate(data.period.end)}
            </p>
          )}
        </div>
        <button
          onClick={() => exportReportCSV(data)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
            cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500,
          }}
        >
          <Download size={12} />
          Baixar CSV
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <KpiCard
          label="Total de tarefas"
          value={data.total_tasks ?? 0}
          color="#6366f1"
          icon={<ListTodo size={13} color="#6366f1" />}
        />
        <KpiCard
          label="Taxa de execução"
          value={`${execRate}%`}
          sub={execRate >= 70 ? 'Bom desempenho' : 'Abaixo do esperado'}
          color={execRate >= 70 ? '#00ff85' : '#f59e0b'}
          icon={execRate >= 70 ? <TrendingUp size={13} color="#00ff85" /> : <TrendingDown size={13} color="#f59e0b" />}
        />
        <KpiCard
          label="No prazo"
          value={`${onTimeRate}%`}
          sub={`${data.done_on_time ?? 0} tarefas`}
          color="#00ff85"
          icon={<CheckCheck size={13} color="#00ff85" />}
        />
      </div>

      {/* Status breakdown */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distribuição</p>
        {[
          { label: 'Concluídas no prazo', value: data.done_on_time ?? 0, color: '#00ff85', icon: <CheckCircle2 size={12} color="#00ff85" /> },
          { label: 'Concluídas com atraso', value: data.done_late ?? 0, color: '#f59e0b', icon: <Clock size={12} color="#f59e0b" /> },
          { label: 'Não realizadas', value: data.not_done ?? 0, color: '#ef4444', icon: <AlertCircle size={12} color="#ef4444" /> },
          { label: 'Pendentes', value: data.pending ?? 0, color: '#6366f1', icon: <Minus size={12} color="#6366f1" /> },
        ].map((item) => {
          const total = data.total_tasks || 1
          const pct = Math.round((item.value / total) * 100)
          return (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {item.icon}
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)' }}>({pct}%)</span></span>
              </div>
              <div style={{ height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Por usuário */}
      {data.by_user && data.by_user.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por Colaborador</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '360px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-elevated)' }}>
                  {['Colaborador', 'No prazo', 'Atraso', 'Pendente', 'Não feito'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.by_user.map((u, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{u.name}</td>
                    <td style={{ padding: '7px 10px', color: '#00ff85', fontWeight: 600 }}>{u.done}</td>
                    <td style={{ padding: '7px 10px', color: '#f59e0b', fontWeight: 600 }}>{u.late}</td>
                    <td style={{ padding: '7px 10px', color: '#6366f1', fontWeight: 600 }}>{u.pending}</td>
                    <td style={{ padding: '7px 10px', color: '#ef4444', fontWeight: 600 }}>{u.not_done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Renderiza markdown simples ────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:13px;font-weight:600;color:var(--color-text-primary)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:14px 0 8px;font-size:14px;font-weight:700;color:var(--color-text-primary)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:16px 0 10px;font-size:16px;font-weight:700;color:var(--color-text-primary)">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:var(--color-text-primary)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:var(--color-surface-elevated);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px;overflow-x:auto;margin:8px 0;font-family:monospace;white-space:pre-wrap"><code>$1</code></pre>')
    .replace(/`(.+?)`/g, '<code style="background:var(--color-surface-elevated);border:1px solid var(--color-border);border-radius:4px;padding:1px 5px;font-size:11px;font-family:monospace">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;padding-left:4px">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:2px 0;padding-left:4px">$2</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>)/g, (match) => `<ul style="margin:6px 0;padding-left:18px;list-style:disc">${match}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

const TOOL_LABELS: Record<string, string> = {
  getProjectReport: 'Gerando relatório',
  listTeamMembers: 'Listando equipe',
  listDepartments: 'Buscando departamentos',
  queryTasks: 'Consultando tarefas',
  createBatchTasks: 'Criando tarefas em lote',
  createRecurringTask: 'Criando tarefa recorrente',
}

// ── Extrai dados de output de tool ────────────────────────────────────────

function getToolOutput(tp: any): unknown {
  const inv = tp?.toolInvocation
  if (!inv) return null
  return inv.output ?? inv.result ?? null
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const text = getTextFromParts(message)

  const toolParts = (message.parts ?? []).filter((p: any) => {
    if (p?.type === 'tool-invocation') return true
    if (typeof p?.type === 'string' && p.type.startsWith('tool-')) return true
    return false
  }) as any[]

  if (!text && toolParts.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '8px 0',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      {/* Avatar */}
      <div style={{
        width: '26px',
        height: '26px',
        borderRadius: 'var(--radius-full)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '2px',
        background: isUser ? 'var(--color-accent-blue)' : 'rgba(0,255,133,0.12)',
        border: isUser ? 'none' : '1px solid rgba(0,255,133,0.2)',
      }}>
        {isUser ? <User size={13} color="#fff" /> : <Bot size={13} color="var(--color-primary)" />}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: isUser ? '75%' : '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        minWidth: 0,
      }}>
        {/* Tool invocations */}
        {toolParts.map((tp: any, idx: number) => {
          const { toolName, isDone, output } = getToolPartMeta(tp)
          const label = TOOL_LABELS[toolName] || toolName || 'Executando ação'

          // Relatório visual
          if (isDone && toolName === 'getProjectReport' && isReportData(output)) {
            return (
              <div key={idx} style={{ width: '100%' }}>
                <ReportCard data={output} />
              </div>
            )
          }

          // Lista de tarefas com CSV
          if (isDone && toolName === 'queryTasks' && output && typeof output === 'object' && 'tasks' in (output as object)) {
            const tasks = (output as any).tasks as Array<Record<string, unknown>>
            return (
              <div key={idx} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '600px',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} color="var(--color-success)" />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} encontrada{tasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {tasks.length > 0 && (
                    <button
                      onClick={() => exportTasksCSV(tasks)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                        cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500,
                      }}
                    >
                      <Download size={11} />
                      CSV
                    </button>
                  )}
                </div>
                {tasks.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '360px' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-elevated)' }}>
                          {['Título', 'Status', 'Prioridade', 'Vencimento'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.slice(0, 20).map((t, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '6px 10px', color: 'var(--color-text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(t.title ?? '')}</td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                background: t.status === 'done' ? '#00ff8520' : t.status === 'in_progress' ? '#6366f120' : '#f59e0b20',
                                color: t.status === 'done' ? '#00ff85' : t.status === 'in_progress' ? '#818cf8' : '#f59e0b',
                              }}>
                                {t.status === 'done' ? 'Concluída' : t.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                background: t.priority === 'urgente' ? '#ef444420' : t.priority === 'alta' ? '#f59e0b20' : '#6366f120',
                                color: t.priority === 'urgente' ? '#ef4444' : t.priority === 'alta' ? '#f59e0b' : '#818cf8',
                              }}>
                                {String(t.priority ?? 'normal')}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              {t.due_date ? fmtDate(String(t.due_date)) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tasks.length > 20 && (
                      <p style={{ margin: 0, padding: '6px 10px', fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                        +{tasks.length - 20} tarefas adicionais no CSV
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          }

          // Relatório de criação em lote (checklist recorrente)
          if (isDone && toolName === 'createDailyRecurringChecklist' && output && typeof output === 'object') {
            const data = output as any
            return (
              <div key={idx} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '620px',
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Relatório de execução - Checklist recorrente
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {data.message || 'Processamento concluído.'}
                  </p>
                </div>
                <div style={{ padding: '10px 12px', display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                  {[
                    { label: 'Total', value: data.total ?? 0 },
                    { label: 'Sucessos', value: data.success ?? 0 },
                    { label: 'Falhas', value: data.failed ?? 0 },
                    { label: 'Status', value: data.ok ? 'OK' : 'Parcial' },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{String(kpi.value)}</div>
                    </div>
                  ))}
                </div>
                {Array.isArray(data.items) && data.items.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', maxHeight: '220px', overflowY: 'auto' }}>
                    {data.items.map((item: any, i: number) => (
                      <div key={i} style={{ padding: '8px 12px', borderTop: i === 0 ? 'none' : '1px solid var(--color-border-subtle)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{item.title || 'Sem título'}</div>
                        <div style={{ fontSize: '11px', color: item.error ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                          {item.error ? `Falha: ${item.error}` : `Criada • recorrência ${item.recurrenceId || '-'} • instâncias ${item.generatedCount ?? 0}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // Relatório simples para outras criações
          if (isDone && ['createBatchTasks', 'createRecurringTask', 'assignTask'].includes(toolName) && output && typeof output === 'object') {
            const data = output as any
            return (
              <div key={idx} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                width: '100%',
                maxWidth: '620px',
              }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Relatório de execução - {toolName}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {data.message || `Ação ${toolName} concluída.`}
                </p>
                {'created' in data && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Total criado: {String(data.created)}
                  </p>
                )}
                {Array.isArray(data.generatedTasks) && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Instâncias geradas: {data.generatedTasks.length}
                  </p>
                )}
              </div>
            )
          }

          if (isDone && toolName === 'listTeamMembers' && output && typeof output === 'object' && 'members' in (output as object)) {
            const members = (output as any).members as Array<{ name?: string; role?: string; department?: string | null }>
            return (
              <div key={idx} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                width: '100%',
                maxWidth: '560px',
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {members.length} membro(s) encontrados
                </p>
                <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                  {members.slice(0, 12).map((m, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                      {(m.name || 'Sem nome')} - {m.role || 'sem role'} - {m.department || 'Sem departamento'}
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          // Tool genérica (pill de status)
          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontSize: '11px', color: 'var(--color-text-muted)',
            }}>
              {isDone
                ? <CheckCircle2 size={12} color="var(--color-success)" />
                : <Loader2 size={12} color="var(--color-accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
              }
              <Wrench size={11} color="var(--color-text-muted)" />
              <span>{label}</span>
            </div>
          )
        })}

        {/* Bubble de texto */}
        {text && (
          <div style={{
            padding: '10px 14px',
            borderRadius: isUser
              ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
              : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
            background: isUser ? 'var(--color-accent-blue)' : 'var(--color-surface)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
            fontSize: '13px',
            lineHeight: '1.6',
            color: isUser ? '#fff' : 'var(--color-text-primary)',
            wordBreak: 'break-word',
          }}>
            {isUser ? (
              <p style={{ margin: 0 }}>{text}</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} style={{ margin: 0 }} />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
